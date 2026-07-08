import { describe, expect, it } from 'vitest';
import { buildPackBulkResearchPrompt } from './buildPackBulkResearchPrompt';
import { buildPackBulkJsonPrompt } from './buildPackBulkJsonPrompt';

describe('buildPackBulkResearchPrompt', () => {
  it('includes hub labels and interview questions without JSON schema', () => {
    const text = buildPackBulkResearchPrompt({
      packId: 'tivat',
      cityLabel: 'Tivat',
      notes: 'Hostel near port.',
      researchRouteIds: ['airport'],
    });

    expect(text).toContain('RESEARCH ONLY');
    expect(text).toContain('routeId: airport');
    expect(text).toContain('Airport');
    expect(text).toContain('What do they board');
    expect(text).not.toContain('OUTPUT FORMAT');
    expect(text).not.toContain('"packId"');
  });
});

describe('buildPackBulkJsonPrompt', () => {
  it('embeds research blob and JSON schema', () => {
    const research = '## airport\n- Bus 8 to town (reddit.com/r/...)';
    const text = buildPackBulkJsonPrompt({
      packId: 'tivat',
      cityLabel: 'Tivat',
      notes: 'Brief',
      research,
      researchRouteIds: ['airport'],
    });

    expect(text).toContain(research);
    expect(text).toContain('OUTPUT FORMAT');
    expect(text).toContain('"packId"');
    expect(text).toContain('Do not use web search in this step');
    expect(text).toContain('Include in routes ONLY these routeIds');
    expect(text).toContain('airport');
  });
});
