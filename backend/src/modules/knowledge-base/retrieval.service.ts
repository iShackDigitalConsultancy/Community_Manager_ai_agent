import { pool } from '../../config/database';
import { embeddingService } from './embedding.service';

/**
 * A single retrieved chunk with provenance metadata.
 */
export interface RetrievedChunk {
    chunkId: string;
    text: string;
    source: string;
    type: string;
    similarity: number;
    /** RRF fusion score — higher = more relevant across multiple queries */
    fusionScore?: number;
    documentId: string;
}

// ─── Base retrieval ───────────────────────────────────────────────────────────

export class RetrievalService {

    /** Original single-query retrieval — unchanged for backwards compatibility */
    async retrieveContext(schemeId: string, query: string, topK: number = 5): Promise<RetrievedChunk[]> {
        const queryEmbedding = await embeddingService.generateEmbedding(query);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        const result = await pool.query(
            `SELECT 
                c.id::text as chunk_id,
                c.chunk_text, 
                c.chunk_index,
                d.title, 
                d.id::text as document_id,
                d.document_type,
                1 - (c.embedding <=> $2::vector) as similarity
             FROM knowledge_chunks c
             JOIN knowledge_documents d ON c.document_id = d.id
             WHERE c.scheme_id = $1 AND d.is_active = true
             ORDER BY c.embedding <=> $2::vector
             LIMIT $3`,
            [schemeId, embeddingStr, topK]
        );

        return result.rows.map(row => ({
            chunkId: row.chunk_id,
            text: row.chunk_text,
            source: `${row.title} (Part ${row.chunk_index + 1})`,
            type: row.document_type,
            similarity: parseFloat(row.similarity),
            documentId: row.document_id
        }));
    }

    // ─── Multi-query fusion with Reciprocal Rank Fusion (RRF) ─────────────────

    /**
     * AutoResearch multi-query retrieval.
     *
     * Runs N queries in parallel, then fuses results using Reciprocal Rank Fusion (RRF):
     *   RRF(d) = Σ 1 / (k + rank_i(d))   where k = 60 (standard RRF constant)
     *
     * This ensures a chunk that ranks top-5 in ALL queries scores much higher than
     * one that ranks #1 in only one query — perfect for synthesising multiple angles.
     *
     * @param schemeId  The scheme to search within
     * @param queries   Array of query strings (different angles on the same question)
     * @param topK      How many results to fetch per individual query (default 6)
     * @param finalK    How many fused results to return (default 8)
     */
    async multiQueryRetrieve(
        schemeId: string,
        queries: string[],
        topK = 6,
        finalK = 8
    ): Promise<RetrievedChunk[]> {
        if (queries.length === 0) return [];
        if (queries.length === 1) return this.retrieveContext(schemeId, queries[0], finalK);

        // Run all queries in parallel
        const allResults = await Promise.all(
            queries.map(q => this.retrieveContext(schemeId, q, topK))
        );

        // Apply RRF — k=60 is the well-established constant from the original RRF paper
        const K = 60;
        const scores = new Map<string, { chunk: RetrievedChunk; score: number }>();

        for (const results of allResults) {
            results.forEach((chunk, rank) => {
                const rrfScore = 1 / (K + rank + 1);
                const existing = scores.get(chunk.chunkId);
                if (existing) {
                    existing.score += rrfScore;
                    // Keep the highest similarity for display
                    if (chunk.similarity > existing.chunk.similarity) {
                        existing.chunk.similarity = chunk.similarity;
                    }
                } else {
                    scores.set(chunk.chunkId, { chunk, score: rrfScore });
                }
            });
        }

        // Sort by fused score, return top finalK with fusionScore attached
        return Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, finalK)
            .map(({ chunk, score }) => ({ ...chunk, fusionScore: score }));
    }

    // ─── Document-type filtered retrieval ─────────────────────────────────────

    /**
     * Retrieves chunks filtered to specific document types.
     * Use for focused dives (Pass 2) where you know which document category is authoritative.
     *
     * @param docTypes  e.g. ['conduct_rules', 'moi'] — must match document_type column values
     */
    async retrieveByDocumentType(
        schemeId: string,
        query: string,
        docTypes: string[],
        topK = 5
    ): Promise<RetrievedChunk[]> {
        if (docTypes.length === 0) return this.retrieveContext(schemeId, query, topK);

        const queryEmbedding = await embeddingService.generateEmbedding(query);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        const result = await pool.query(
            `SELECT 
                c.id::text as chunk_id,
                c.chunk_text, 
                c.chunk_index,
                d.title, 
                d.id::text as document_id,
                d.document_type,
                1 - (c.embedding <=> $2::vector) as similarity
             FROM knowledge_chunks c
             JOIN knowledge_documents d ON c.document_id = d.id
             WHERE c.scheme_id = $1 
               AND d.is_active = true
               AND d.document_type = ANY($3::text[])
             ORDER BY c.embedding <=> $2::vector
             LIMIT $4`,
            [schemeId, embeddingStr, docTypes, topK]
        );

        return result.rows.map(row => ({
            chunkId: row.chunk_id,
            text: row.chunk_text,
            source: `${row.title} (Part ${row.chunk_index + 1})`,
            type: row.document_type,
            similarity: parseFloat(row.similarity),
            documentId: row.document_id
        }));
    }

    /**
     * Formats a list of RetrievedChunks into the string the agent receives from the tool.
     * Includes source provenance so the agent can cite documents in its response.
     */
    formatResults(chunks: RetrievedChunk[]): string {
        if (chunks.length === 0) return '';
        return chunks.map(r => {
            const fusionNote = r.fusionScore !== undefined ? ` | Fusion: ${r.fusionScore.toFixed(4)}` : '';
            return `[Source: ${r.source} | Type: ${r.type} | DocumentID: ${r.documentId} | Relevance: ${r.similarity.toFixed(4)}${fusionNote}]\n${r.text}`;
        }).join('\n\n---\n\n');
    }
}

export const retrievalService = new RetrievalService();
