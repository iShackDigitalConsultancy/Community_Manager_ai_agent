import { ToolsRegistry } from '../modules/agent/tools.registry';

// Mock the retrieval service to avoid DB + OpenAI calls
jest.mock('../modules/knowledge-base/retrieval.service', () => ({
  retrievalService: {
    retrieveContext:          jest.fn(),
    retrieveByDocumentType:   jest.fn(),
    multiQueryRetrieve:       jest.fn(),
    formatResults:            jest.fn((chunks: any[]) =>
      chunks.map(c => `[Source: ${c.source} | Type: ${c.type} | Relevance: ${c.similarity}]\n${c.text}`).join('\n\n---\n\n')
    ),
  },
}));

// Mock pg pool so DB-touching tools don't blow up
jest.mock('../config/database', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
}));

import { retrievalService } from '../modules/knowledge-base/retrieval.service';

const SCHEME = 'scheme-123';

// ─── Helper: build a fake chunk ───────────────────────────────────────────────
const makeChunk = (overrides: Partial<ReturnType<typeof Object.assign>> = {}) => ({
  chunkId: 'chunk-1',
  source: 'Conduct Rules (Part 1)',
  type: 'conduct_rules',
  similarity: 0.9,
  text: 'No noise after 22:00.',
  ...overrides,
});

describe('ToolsRegistry', () => {
  let registry: ToolsRegistry;

  beforeEach(() => {
    registry = new ToolsRegistry();
    jest.clearAllMocks();
  });

  // ── search_knowledgebase ───────────────────────────────────────────────────

  describe('search_knowledgebase', () => {
    it('returns formatted context when results are found (no docTypes)', async () => {
      (retrievalService.retrieveContext as jest.Mock).mockResolvedValue([
        makeChunk({ text: 'No noise after 22:00.' }),
        makeChunk({ source: 'Conduct Rules (Part 2)', text: 'Pets must be leashed.', chunkId: 'chunk-2' }),
      ]);

      const result = await registry.executeTool('search_knowledgebase', { query: 'noise rules' }, SCHEME);
      expect(result).toContain('No noise after 22:00.');
      expect(result).toContain('Pets must be leashed.');
      expect(result).toContain('[Source: Conduct Rules (Part 1)');
    });

    it('returns fallback when results are empty', async () => {
      (retrievalService.retrieveContext as jest.Mock).mockResolvedValue([]);
      const result = await registry.executeTool('search_knowledgebase', { query: 'unparseable query' }, SCHEME);
      expect(result).toContain('No relevant information found');
      expect(result).toContain('unparseable query');
    });

    it('uses retrieveByDocumentType when documentTypes are provided', async () => {
      (retrievalService.retrieveByDocumentType as jest.Mock).mockResolvedValue([makeChunk()]);
      await registry.executeTool(
        'search_knowledgebase',
        { query: 'parking rules', documentTypes: ['conduct_rules'] },
        SCHEME
      );
      expect(retrievalService.retrieveByDocumentType).toHaveBeenCalledWith(
        SCHEME, 'parking rules', ['conduct_rules'], 5
      );
      expect(retrievalService.retrieveContext).not.toHaveBeenCalled();
    });

    it('defaults to topK=5 when not specified', async () => {
      (retrievalService.retrieveContext as jest.Mock).mockResolvedValue([]);
      await registry.executeTool('search_knowledgebase', { query: 'levy rules' }, SCHEME);
      expect(retrievalService.retrieveContext).toHaveBeenCalledWith(SCHEME, 'levy rules', 5);
    });

    it('clamps topK to 8 maximum', async () => {
      (retrievalService.retrieveContext as jest.Mock).mockResolvedValue([]);
      await registry.executeTool('search_knowledgebase', { query: 'test', topK: 999 }, SCHEME);
      expect(retrievalService.retrieveContext).toHaveBeenCalledWith(SCHEME, 'test', 8);
    });
  });

  // ── decompose_query ────────────────────────────────────────────────────────

  describe('decompose_query', () => {
    it('returns a valid JSON research plan', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'Can I play music at night?', residentRole: 'tenant' },
        SCHEME
      );
      const plan = JSON.parse(result);
      expect(plan).toHaveProperty('researchPlan');
      expect(Array.isArray(plan.researchPlan)).toBe(true);
      expect(plan.researchPlan.length).toBeGreaterThanOrEqual(2);
    });

    it('matches the noise pattern and returns conduct_rules as a document type', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'What are the noise rules after 9pm?', residentRole: 'tenant' },
        SCHEME
      );
      const plan = JSON.parse(result);
      const allDocTypes: string[] = plan.researchPlan.flatMap((sq: any) => sq.documentTypes);
      expect(allDocTypes).toContain('conduct_rules');
    });

    it('matches the pet pattern', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'Am I allowed to keep a dog in my unit?', residentRole: 'tenant' },
        SCHEME
      );
      const plan = JSON.parse(result);
      const allDocTypes: string[] = plan.researchPlan.flatMap((sq: any) => sq.documentTypes);
      expect(allDocTypes).toContain('conduct_rules');
    });

    it('matches the levy/payment pattern', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'When is my levy payment due and what is the penalty for arrears?', residentRole: 'owner' },
        SCHEME
      );
      const plan = JSON.parse(result);
      const allDocTypes: string[] = plan.researchPlan.flatMap((sq: any) => sq.documentTypes);
      expect(allDocTypes).toContain('financial');
    });

    it('falls back gracefully for unrecognised question patterns', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'Who do I call about the garden?', residentRole: 'unknown' },
        SCHEME
      );
      const plan = JSON.parse(result);
      expect(plan.researchPlan.length).toBeGreaterThanOrEqual(1);
      expect(plan).toHaveProperty('instructions');
    });

    it('includes role in the output', async () => {
      const result = await registry.executeTool(
        'decompose_query',
        { question: 'What is the trustee quorum?', residentRole: 'trustee' },
        SCHEME
      );
      const plan = JSON.parse(result);
      expect(plan.residentRole).toBe('trustee');
    });
  });

  // ── synthesise_research ────────────────────────────────────────────────────

  describe('synthesise_research', () => {
    const question = 'Can I install a satellite dish on my balcony?';

    it('returns a JSON object with coverage_score, recommendation, and conflicts', async () => {
      const findings = [
        '[Source: Conduct Rules (Part 3) | Type: conduct_rules | Relevance: 0.92]\nResidents must obtain permission before installing any external fixtures. The committee may approve or deny based on aesthetic guidelines. Applications must include a R500 processing fee.',
      ];
      const result = await registry.executeTool('synthesise_research', { question, findings }, SCHEME);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('coverage_score');
      expect(parsed).toHaveProperty('recommendation');
      expect(parsed).toHaveProperty('conflicts');
      expect(parsed).toHaveProperty('gaps');
      expect(typeof parsed.coverage_score).toBe('number');
    });

    it('returns low coverage score for empty findings', async () => {
      const result = await registry.executeTool('synthesise_research', { question, findings: [] }, SCHEME);
      const parsed = JSON.parse(result);
      expect(parsed.coverage_score).toBeLessThan(6);
      expect(parsed.recommendation).toMatch(/LOW CONFIDENCE|escalate/i);
    });

    it('gives higher coverage when multiple sources are provided', async () => {
      const richFindings = [
        '[Source: Conduct Rules (Part 1) | Type: conduct_rules | Relevance: 0.95]\nExternal fixtures are prohibited without written permission from the trustees. The process requires submitting a formal application.',
        '[Source: MOI (Part 2) | Type: moi | Relevance: 0.88]\nSections 12 and 13 define owner rights regarding common property usage. Any alteration must be approved at a trustee meeting within 30 days.',
        '[Source: Policy Doc (Part 1) | Type: policy | Relevance: 0.82]\nPenalties for unauthorised installations include removal at owner\'s cost and a fine of R2000.',
      ];
      const result = await registry.executeTool('synthesise_research', { question, findings: richFindings }, SCHEME);
      const parsed = JSON.parse(result);
      expect(parsed.coverage_score).toBeGreaterThanOrEqual(4); // rich multi-source findings
      expect(parsed.source_count).toBeGreaterThanOrEqual(3);
    });

    it('detects potential conflicts when contradictory language is present', async () => {
      const conflictingFindings = [
        '[Source: Old Rules (Part 1) | Type: conduct_rules | Relevance: 0.80]\nThis installation is not allowed under any circumstances.',
        '[Source: New Notice (Part 1) | Type: notice | Relevance: 0.85]\nResidents may now apply for permission to install approved equipment.',
      ];
      const result = await registry.executeTool('synthesise_research', { question, findings: conflictingFindings }, SCHEME);
      const parsed = JSON.parse(result);
      // Conflicts should be detected (permission conflict pattern matches both "not allowed" and "may")
      expect(parsed.conflicts).toBeDefined();
    });
  });

  // ── escalate_to_human ──────────────────────────────────────────────────────

  describe('escalate_to_human', () => {
    it('includes reason and priority in the response', async () => {
      const result = await registry.executeTool(
        'escalate_to_human',
        { reason: 'Resident is very angry about water leak.', priority: 'urgent', summary: 'Water leak unresolved.' },
        SCHEME
      );
      expect(result).toContain('Resident is very angry about water leak.');
      expect(result).toContain('URGENT');
      expect(result).toContain('2 hours');
    });

    it('uses "1 business day" SLA for normal priority', async () => {
      const result = await registry.executeTool(
        'escalate_to_human',
        { reason: 'KB coverage too low.', priority: 'normal', summary: 'Unable to answer levy question.' },
        SCHEME
      );
      expect(result).toContain('1 business day');
    });
  });

  // ── unknown tool ───────────────────────────────────────────────────────────

  describe('unknown tool', () => {
    it('returns a descriptive error message listing available tools', async () => {
      const result = await registry.executeTool('fly_to_moon', {}, SCHEME);
      expect(result).toContain('Error');
      expect(result).toContain('fly_to_moon');
      expect(result).toContain('decompose_query');
      expect(result).toContain('synthesise_research');
    });
  });
});
