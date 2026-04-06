import OpenAI from 'openai';
import { env } from '../../config/env';

export class EmbeddingService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.startsWith('sk-mock')) {
            console.warn('Using mock OpenAI embedding...');
            return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
        }

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("OpenAI Embedding Timeout after 20s")), 20000);
        });
        
        try {
            const response = await Promise.race([
                this.openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: text.replace(/\n/g, ' '),
                    encoding_format: 'float'
                }),
                timeoutPromise
            ]);
            return response.data[0].embedding;
        } catch (e: any) {
            console.error(`[Embedding] Error:`, e);
            throw new Error(`Embedding generation failed: ${e.message}`);
        } finally {
            clearTimeout(timeoutId!);
        }
    }

    async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
        if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.startsWith('sk-mock')) {
            return texts.map(() => new Array(1536).fill(0).map(() => Math.random() * 2 - 1));
        }

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("OpenAI Batch Embedding Timeout after 30s")), 30000);
        });

        try {
            const response = await Promise.race([
                this.openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: texts.map(t => t.replace(/\n/g, ' ')),
                    encoding_format: 'float'
                }),
                timeoutPromise
            ]);
            return response.data.map(d => d.embedding);
        } catch (e: any) {
            console.error(`[Embedding] Batch Error:`, e);
            throw new Error(`Batch embedding generation failed: ${e.message}`);
        } finally {
            clearTimeout(timeoutId!);
        }
    }
}

export const embeddingService = new EmbeddingService();
