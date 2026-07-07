import { guidedRouteFillSystemPrompt } from '@/features/city-pack-guided-fill/lib/buildGuidedRouteFillPrompt';
import {
  formatPackBulkHubCatalog,
  PACK_BULK_JSON_SCHEMA,
} from './packBulkImportPromptShared';

export function buildPackBulkJsonPrompt(input: {
  packId: string;
  cityLabel: string;
  notes: string;
  research: string;
  transportCurrencyMode?: 'eur_only' | 'local_and_eur';
}): string {
  const notesBlock = input.notes.trim()
    ? `Operator notes (secondary — prefer research report for facts):\n"""\n${input.notes.trim()}\n"""`
    : 'Operator notes: (none)';

  const researchBlock = input.research.trim()
    ? `Research report (primary source of truth for facts — do not add facts beyond this and notes):\n"""\n${input.research.trim()}\n"""`
    : 'Research report: (empty — only fill fields explicitly supported by operator notes; otherwise leave empty + openQuestions)';

  const userPrompt = `City pack: ${input.cityLabel} (id: ${input.packId})
Transport currency profile: ${input.transportCurrencyMode ?? 'eur_only'}

Arrival hub presets (routeId keys — include only hubs relevant to this city):
${formatPackBulkHubCatalog()}

${researchBlock}

${notesBlock}

Convert the research into one pack JSON object for the hostel admin app. Omit hubs that do not apply to this city.`;

  return [
    '--- SYSTEM ---',
    guidedRouteFillSystemPrompt(),
    '',
    'Pack-level: output multiple hubs in routes{}. Each hub follows the same single-scenario rules independently.',
    'Use ONLY the research report (+ operator notes) for factual content. Do not use web search in this step.',
    '',
    '--- USER ---',
    userPrompt,
    '',
    '--- OUTPUT FORMAT ---',
    PACK_BULK_JSON_SCHEMA,
  ].join('\n');
}
