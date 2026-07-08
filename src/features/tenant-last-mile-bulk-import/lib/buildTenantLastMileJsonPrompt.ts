import type { RouteId } from '@/entities/hostel';
import { formatPackBulkHubList } from '@/features/city-pack-bulk-import';

export const TENANT_LAST_MILE_BULK_JSON_SCHEMA = `Reply with a single JSON object only (no markdown fences):
{
  "tenantSlug": "<same as tenant slug>",
  "routes": {
    "<routeId>": {
      "mode": "from_get_off" | "walk_only_hub" | "tenant_local_full",
      "walkEn": "Shared: last-mile walk. Local walk: full hub→door. Use {address} once if needed.",
      "tipsEn": ["optional building-only tips", ... max 2],
      "getOffEn": "Shared: optional override. Local transit_lite: get-off for hostel path.",
      "localMode": "walk | transit_lite — only for tenant_local_full (default walk)",
      "titleEn": "optional Local card title",
      "summaryEn": "optional Local card summary",
      "primaryEn": "Local transit_lite: board/ride text (else walkEn)",
      "walkToHostelEn": "Local transit_lite: walk after get-off",
      "mapsOriginLabel": "optional plain-text origin for Maps (get-off or hub name)",
      "openQuestions": [{ "id": "stable-id", "question": "string" }]
    }
  }
}

Rules:
- routeId keys: airport, bus_central, bus_istochno, train_station.
- English only in text fields.
- Shared hubs (city hubArrivalKind city_shared): use from_get_off or walk_only_hub — do NOT change city pack.
- Local hubs (city hubArrivalKind tenant_local): MUST use mode tenant_local_full; city copy unused for guest legs.
- from_get_off: walk starts after effective get-off (hostel override if getOffEn set, else city pack).
- walk_only_hub: walk continues from hub area; do not duplicate city pack publicText.
- tenant_local_full + localMode walk: put full path in walkEn (or primaryEn).
- tenant_local_full + localMode transit_lite: primaryEn (board/ride), optional getOffEn, walkToHostelEn.
- tipsEn: omit unless entrance/stairs/side door; never repeat city Good to know tips on Shared hubs.
- If facts missing, leave walkEn/primaryEn empty and add openQuestions.`;

export function buildTenantLastMileJsonPrompt(input: {
  tenantSlug: string;
  cityLabel: string;
  hostelAddress: string;
  research: string;
  researchRouteIds: RouteId[];
  notes?: string;
}): string {
  const scopeList =
    input.researchRouteIds.length > 0
      ? formatPackBulkHubList(input.researchRouteIds)
      : '(none)';

  const scopeRule =
    input.researchRouteIds.length > 0
      ? `Include in routes ONLY: ${input.researchRouteIds.join(', ')}.`
      : 'Include only hubs from the research report.';

  const researchBlock = input.research.trim()
    ? `Research report (primary source):\n"""\n${input.research.trim()}\n"""`
    : 'Research report: (empty)';

  const notesBlock = input.notes?.trim()
    ? `Operator notes:\n"""\n${input.notes.trim()}\n"""`
    : 'Operator notes: (none)';

  const userPrompt = `Tenant: ${input.tenantSlug} (${input.cityLabel})
Hostel address for final steps: ${input.hostelAddress.trim() || '(use {address} placeholder)'}

Research scope:
${scopeList}
${scopeRule}

${researchBlock}

${notesBlock}

Convert research into tenant last-mile JSON. Do not use web search in this step.`;

  return [
    '--- SYSTEM ---',
    'You format hostel-specific last-mile walking directions into strict JSON for the admin app.',
    'Output JSON only in the final message.',
    '',
    '--- USER ---',
    userPrompt,
    '',
    '--- OUTPUT FORMAT ---',
    TENANT_LAST_MILE_BULK_JSON_SCHEMA,
  ].join('\n');
}
