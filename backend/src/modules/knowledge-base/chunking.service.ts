export class ChunkingService {
    /**
     * Splits text into overlapping chunks of roughly the target token size.
     * We'll approximate tokens using word counts (1 word ~ 1.3 tokens).
     */
    chunkText(text: string, targetTokens: number = 500, overlapTokens: number = 50): string[] {
        const cleanText = text.replace(/\n{3,}/g, '\n\n').trim();
        
        const targetWords = Math.floor(targetTokens / 1.3);
        const overlapWords = Math.floor(overlapTokens / 1.3);
        
        const words = cleanText.split(/\s+/);
        const chunks: string[] = [];
        
        let startIndex = 0;
        
        while (startIndex < words.length) {
            const endIndex = Math.min(startIndex + targetWords, words.length);
            const chunkWords = words.slice(startIndex, endIndex);
            chunks.push(chunkWords.join(' '));
            
            startIndex += targetWords - overlapWords;
            // Prevent infinite loops if overlap >= target
            if (targetWords - overlapWords <= 0) break;
        }
        
        return chunks;
    }
}

export const chunkingService = new ChunkingService();
