import { buildPackBulkJsonPrompt } from './buildPackBulkJsonPrompt';

/** @deprecated Use buildPackBulkResearchPrompt + buildPackBulkJsonPrompt (two-step BYO flow). */
export function buildPackBulkImportPrompt(input: {
  packId: string;
  cityLabel: string;
  notes: string;
}): string {
  return buildPackBulkJsonPrompt({ ...input, research: '' });
}
