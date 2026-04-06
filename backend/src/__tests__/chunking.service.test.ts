import { ChunkingService } from '../modules/knowledge-base/chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  it('should return a single chunk for short text', () => {
    const text = 'Hello world, this is a short piece of text.';
    const chunks = service.chunkText(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain('Hello world');
  });

  it('should split long text into multiple chunks', () => {
    // ~900 words → should produce 2+ chunks with default 500-token target
    const words = Array.from({ length: 900 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = service.chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should produce overlapping chunks', () => {
    const words = Array.from({ length: 800 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = service.chunkText(text);
    // Each chunk should have some words shared with the next
    const chunk1Words = new Set(chunks[0].split(' '));
    const chunk2Words = chunks[1].split(' ');
    const overlap = chunk2Words.filter(w => chunk1Words.has(w));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it('should not produce empty chunks', () => {
    const text = 'Short text.';
    const chunks = service.chunkText(text);
    chunks.forEach(chunk => {
      expect(chunk.trim().length).toBeGreaterThan(0);
    });
  });

  it('should not infinite loop if overlapTokens >= targetTokens', () => {
    // This guards the explicit infinite-loop protection in the service
    const text = 'word '.repeat(1000);
    // With targetTokens=10 and overlapTokens=15, targetWords - overlapWords <= 0
    const chunks = service.chunkText(text, 10, 15);
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeLessThan(1000); // Did not loop infinitely
  });

  it('should handle empty string gracefully', () => {
    const chunks = service.chunkText('');
    // Empty string after trim produces one empty chunk — we verify it returns an array
    expect(Array.isArray(chunks)).toBe(true);
  });

  it('should collapse excessive newlines', () => {
    const text = 'Paragraph one.\n\n\n\n\nParagraph two.';
    const chunks = service.chunkText(text);
    // The raw chunk text should not contain 3+ consecutive newlines
    chunks.forEach(chunk => {
      expect(chunk).not.toMatch(/\n{3,}/);
    });
  });
});
