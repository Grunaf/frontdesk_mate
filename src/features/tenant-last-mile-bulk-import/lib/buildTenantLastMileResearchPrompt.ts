import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent, LocalizedField } from '@/entities/city-pack/model/types';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';
import { ROUTE_PRESETS, buildLastMileCityBoundary, formatLastMileBoundaryForPrompt } from '@/entities/city-pack';
import { formatPackBulkHubList } from '@/features/city-pack-bulk-import';

const RESEARCH_SYSTEM = `You are a travel research assistant for hostel "last mile" walking directions.

Your job in this step is RESEARCH ONLY — not JSON, not final guest copy yet.

Rules:
- Turn on web search. Prefer Google Maps walking legs and short Reddit threads.
- For each fact, cite source (URL or "Reddit: thread title + subreddit + approximate date").
- Do not invent door codes or transit lines. If not found, write "Not found".
- English only in the report body. No JSON.
- Research ONLY: from the effective get-off / city route anchor to the hostel street address.
- Do NOT research airport/bus/train steps, tickets, or taxi — city pack already covers those.
- Do not collect "tips" that belong in city pack (fares, night bus, taxi backup).
- If the hostel exits transit earlier than the city pack default, note that as a possible getOffEn override.`;

function readStoredGetOffOverrideEn(
  routeId: RouteId,
  getOffByRoute: Partial<Record<RouteId, LocalizedField>> | undefined
): string {
  const stored = getOffByRoute?.[routeId];
  if (!stored) {
    return '';
  }
  return resolveLocalizedText(stored, 'en').trim();
}

function formatHubSection(input: {
  routeId: RouteId;
  cityRoute?: CityPackRouteContent;
  hostelAddress: string;
  mapsUrl?: string;
  getOffByRoute?: Partial<Record<RouteId, LocalizedField>>;
}): string {
  const hubLabel = ROUTE_PRESETS.find((entry) => entry.id === input.routeId)?.label ?? input.routeId;
  const cityGetOffEn = resolveLocalizedText(input.cityRoute?.copy.publicGetOffAt, 'en').trim();
  const getOffOverrideEn = readStoredGetOffOverrideEn(input.routeId, input.getOffByRoute);
  const boundary = buildLastMileCityBoundary(input.cityRoute, {
    getOffOverrideEn: getOffOverrideEn || undefined,
  });
  const boundaryBlock = formatLastMileBoundaryForPrompt(boundary);

  const addressLine = input.hostelAddress.trim()
    ? `Hostel address (final destination): ${input.hostelAddress.trim()}`
    : 'Hostel address: (not set in admin — use {address} placeholder in JSON step)';
  const mapsLine = input.mapsUrl?.trim()
    ? `Google Maps link for hostel: ${input.mapsUrl.trim()}`
    : '';
  const cityGetOffLine = cityGetOffEn
    ? `City pack get-off: ${cityGetOffEn}`
    : 'City pack get-off: (not set)';
  const overrideLine = getOffOverrideEn
    ? `Hostel get-off override (already set): ${getOffOverrideEn}`
    : 'Hostel get-off override: (none — inherit city unless research shows an earlier exit)';

  const searchQuery = boundary?.hasAnchoredStart
    ? `Search: walk from "${boundary.anchorLabelEn}" to "${input.hostelAddress.trim() || 'hostel address'}"`
    : `Search: walk from ${hubLabel} get-off area to "${input.hostelAddress.trim() || 'hostel address'}"`;

  return [
    `### ${hubLabel} (routeId: ${input.routeId})`,
    boundaryBlock ?? 'City pack route missing — note gaps in report.',
    cityGetOffLine,
    overrideLine,
    addressLine,
    mapsLine,
    searchQuery,
    'Research checklist (hostel segment only):',
    '  - Turns and landmarks after the city/hostel anchor',
    '  - Whether guests should exit transit earlier than city pack (candidate getOffEn)',
    '  - Reception / side entrance (no door codes)',
    '  - Stairs or steep sections with luggage',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTenantLastMileResearchPrompt(input: {
  tenantSlug: string;
  cityLabel: string;
  hostelAddress: string;
  mapsUrl?: string;
  researchRouteIds: RouteId[];
  cityRoutes: Partial<Record<RouteId, CityPackRouteContent>>;
  getOffByRoute?: Partial<Record<RouteId, LocalizedField>>;
  notes?: string;
}): string {
  const hubList =
    input.researchRouteIds.length > 0
      ? formatPackBulkHubList(input.researchRouteIds)
      : '(none selected)';

  const notesBlock = input.notes?.trim()
    ? `Operator hints (not verified — confirm with search):\n"""\n${input.notes.trim()}\n"""`
    : 'Operator hints: (none)';

  const hubSections = input.researchRouteIds
    .map((routeId) =>
      formatHubSection({
        routeId,
        cityRoute: input.cityRoutes[routeId],
        hostelAddress: input.hostelAddress,
        mapsUrl: input.mapsUrl,
        getOffByRoute: input.getOffByRoute,
      })
    )
    .join('\n');

  const userPrompt = `Tenant slug: ${input.tenantSlug}
City: ${input.cityLabel}

Hubs to research (routeId):
${hubList}

${notesBlock}

Per-hub boundary (city vs hostel):
${hubSections}

Deliver one research report covering all listed hubs.`;

  return ['--- SYSTEM ---', RESEARCH_SYSTEM, '', '--- USER ---', userPrompt].join('\n');
}
