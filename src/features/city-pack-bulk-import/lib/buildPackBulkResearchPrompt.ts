import type { RouteId } from '@/entities/hostel';
import {
  formatPackBulkHubCatalog,
  formatPackBulkHubList,
} from './packBulkImportPromptShared';
import { formatPackBulkInterviewChecklist } from './formatPackBulkInterviewChecklist';

const RESEARCH_SYSTEM = `You are a travel research assistant for hostel arrival directions.

Your job in this step is RESEARCH ONLY — not JSON, not guest-facing copy yet.

Rules:
- Turn on web search. Prefer recent Reddit threads, official transit sites, and airport/station pages.
- For each fact, cite source (URL or "Reddit: thread title + subreddit + approximate date").
- Do not invent line numbers, stops, prices, or durations. If not found, write "Not found" for that item.
- Structure your answer in clear sections per arrival hub (use routeId in headings).
- Cover the checklist questions; mark gaps explicitly.
- Capture facts needed for:
  - transitScheduleAdvice (service frequency, delays, schedule reliability),
  - transitTicketPayment (where/how to buy, onboard vs kiosk/app, validation).
- English only in the report body.
- Output: structured markdown report (headings, bullet lists). No JSON.`;

export function buildPackBulkResearchPrompt(input: {
  packId: string;
  cityLabel: string;
  notes: string;
  researchRouteIds: RouteId[];
}): string {
  const hubList =
    input.researchRouteIds.length > 0
      ? formatPackBulkHubList(input.researchRouteIds)
      : formatPackBulkHubCatalog();

  const notesBlock = input.notes.trim()
    ? `Operator hints (not verified facts — use search to confirm or refute):\n"""\n${input.notes.trim()}\n"""`
    : 'Operator hints: (none)';

  const userPrompt = `City: ${input.cityLabel}
City pack id: ${input.packId}

Hubs to research (use these routeId values in section headings):
${hubList}

${notesBlock}

Checklist — answer every item you can verify; say "Not found" otherwise:
${formatPackBulkInterviewChecklist(
  input.researchRouteIds.length > 0
    ? input.researchRouteIds
    : (['airport', 'bus_central', 'bus_istochno', 'train_station'] as RouteId[])
)}

Deliver one research report covering all listed hubs.`;

  return ['--- SYSTEM ---', RESEARCH_SYSTEM, '', '--- USER ---', userPrompt].join('\n');
}
