import { PromptBuilder } from '../modules/agent/prompt.builder';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  it('should return a base prompt with no arguments', () => {
    const prompt = builder.buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(20);
    expect(prompt).toContain('SchemeAssist');
  });

  it('should include scheme name when provided', () => {
    const prompt = builder.buildSystemPrompt('Sunset Gardens');
    expect(prompt).toContain('Sunset Gardens');
  });

  it('should include custom rules when provided', () => {
    const rules = 'No pets allowed. Quiet hours after 22:00.';
    const prompt = builder.buildSystemPrompt('My Estate', rules);
    expect(prompt).toContain('No pets allowed');
    expect(prompt).toContain('Quiet hours after 22:00');
  });

  it('should not include custom rules placeholder when customRules is omitted', () => {
    const prompt = builder.buildSystemPrompt('My Scheme');
    expect(prompt).not.toContain('custom rules');
  });
});
