import { describe, expect, it } from 'vitest';

import { parseStaffKnowledgeArticleJson } from './articleImportSchema';
import { parseStaffKnowledgeBootstrapJson } from './bootstrapImportSchema';
import { extractJsonPayload } from './extractJsonPayload';

describe('extractJsonPayload', () => {
  it('reads fenced json', () => {
    const raw = 'Here:\n```json\n{"a":1}\n```\n';
    expect(extractJsonPayload(raw)).toBe('{"a":1}');
  });

  it('reads bare object', () => {
    expect(extractJsonPayload('intro {"a":1} outro')).toBe('{"a":1}');
  });
});

describe('parseStaffKnowledgeBootstrapJson', () => {
  it('parses valid bootstrap payload', () => {
    const result = parseStaffKnowledgeBootstrapJson(`\`\`\`json
{
  "summary": "Small hostel",
  "roles": [
    {
      "name": "Housekeeper",
      "description": "Guestrooms and laundry",
      "headcount": 2,
      "laborType": "paid",
      "checklist": ["Clean dorms", "Restock chemicals"]
    }
  ]
}
\`\`\``);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.roles).toHaveLength(1);
    expect(result.document.roles[0].name).toBe('Housekeeper');
    expect(result.document.roles[0].headcount).toBe(2);
    expect(result.document.roles[0].laborType).toBe('paid');
    expect(result.document.roles[0].checklist).toEqual([
      'Clean dorms',
      'Restock chemicals',
    ]);
  });

  it('rejects invalid shape', () => {
    const result = parseStaffKnowledgeBootstrapJson('{"roles":[]}');
    expect(result.ok).toBe(false);
  });
});

describe('parseStaffKnowledgeBootstrapContextJson', () => {
  it('parses readiness context', async () => {
    const { parseStaffKnowledgeBootstrapContextJson } = await import(
      './bootstrapImportSchema'
    );
    const result = parseStaffKnowledgeBootstrapContextJson(
      JSON.stringify({
        ready: 'yellow',
        laborModel: 'volunteers',
        constraints: ['no heavy lifting'],
        mustUse: ['volunteer mornings'],
        missing: ['who holds keys?'],
        unclear: [],
        followUpQuestions: ['Who locks the front door?'],
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.ready).toBe('yellow');
    expect(result.document.laborModel).toBe('volunteers');
    expect(result.document.missing[0]).toContain('keys');
  });
});

describe('parseStaffKnowledgeArticleJson', () => {
  it('parses article payload', () => {
    const result = parseStaffKnowledgeArticleJson(
      JSON.stringify({
        title: 'Where chemicals are',
        body: 'Shelf in laundry room.',
        videoUrl: 'https://cdn.example.com/video.mp4',
        roleName: 'Housekeeper',
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe('Where chemicals are');
    expect(result.document.videoUrl).toBe('https://cdn.example.com/video.mp4');
  });
});
