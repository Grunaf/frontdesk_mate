import type { RouteId } from '@/entities/hostel';
import { guidedRouteFillSystemPrompt } from '@/features/city-pack-guided-fill/lib/buildGuidedRouteFillPrompt';
import {
  formatPackBulkHubCatalog,
  formatPackBulkHubList,
  PACK_BULK_JSON_SCHEMA,
} from './packBulkImportPromptShared';

export function buildPackBulkJsonPrompt(input: {
  packId: string;
  cityLabel: string;
  notes: string;
  research: string;
  researchRouteIds: RouteId[];
  transportCurrencyMode?: 'eur_only' | 'local_and_eur';
}): string {
  const notesBlock = input.notes.trim()
    ? `Operator notes (secondary — prefer research report for facts):\n"""\n${input.notes.trim()}\n"""`
    : 'Operator notes: (none)';

  const researchBlock = input.research.trim()
    ? `Research report (primary source of truth for facts — do not add facts beyond this and notes):\n"""\n${input.research.trim()}\n"""`
    : 'Research report: (empty — only fill fields explicitly supported by operator notes; otherwise leave empty + openQuestions)';

  const scopeList =
    input.researchRouteIds.length > 0
      ? formatPackBulkHubList(input.researchRouteIds)
      : formatPackBulkHubCatalog();

  const scopeRule =
    input.researchRouteIds.length > 0
      ? `Include in routes ONLY these routeIds (omit every other hub key even if mentioned in research): ${input.researchRouteIds.join(', ')}.`
      : 'Include ONLY hubs that exist for this city (omit irrelevant RouteIds).';

  const userPrompt = `City pack: ${input.cityLabel} (id: ${input.packId})
Transport currency profile: ${input.transportCurrencyMode ?? 'eur_only'}

Research scope — hubs for this import:
${scopeList}

${scopeRule}

Arrival hub presets (routeId keys):
${formatPackBulkHubCatalog()}

${researchBlock}

${notesBlock}

Convert the research into one pack JSON object for the hostel admin app.`;

  return [
    '--- SYSTEM ---',
    guidedRouteFillSystemPrompt(),
    '',
    'Pack-level: output multiple hubs in routes{}. Each hub follows the same single-scenario rules independently.',
    'Fill taxi{} as a separate guest taxi card (cost, pickup, tips) plus metadata taxiEur*/taxiKm*/taxiDuration* when research states numbers.',
    'Fill transitScheduleAdvice/transitTicketPayment from research; each line max 10 words, non-generic, no duplication with tips.',
    'tips[] must be max 2 and sorted by importance (highest guest impact first).',
    'Use ONLY the research report (+ operator notes) for factual content. Do not use web search in this step.',
    '',
    '--- USER ---',
    userPrompt,
    '',
    '--- OUTPUT FORMAT ---',
    PACK_BULK_JSON_SCHEMA,
  ].join('\n');
}
