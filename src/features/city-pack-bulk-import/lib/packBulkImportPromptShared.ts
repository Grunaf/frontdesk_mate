import { ROUTE_PRESETS } from '@/entities/city-pack';
import type { RouteId } from '@/entities/hostel';

export function formatPackBulkHubCatalog(): string {
  return ROUTE_PRESETS.map((preset) => `- ${preset.id}: ${preset.label}`).join('\n');
}

export function formatPackBulkHubList(routeIds: RouteId[]): string {
  return routeIds
    .map((id) => {
      const label = ROUTE_PRESETS.find((entry) => entry.id === id)?.label ?? id;
      return `- ${id} (${label})`;
    })
    .join('\n');
}

export const PACK_BULK_JSON_SCHEMA = `Reply with a single JSON object only (no markdown fences):
{
  "packId": "<same as pack id>",
  "suggestedEnabledRoutes": ["airport" | "bus_central" | "bus_istochno" | "train_station", ...],
  "routes": {
    "<routeId>": {
      "primaryRouteMode": "transit" | "walk_only",
      "hubArrivalKind": "city_shared" | "tenant_local" (optional, default city_shared),
      "transit": {
        "publicTitle": "string",
        "publicSummary": "string",
        "publicPreview": "string",
        "publicText": "string",
        "publicGetOffAt": "string",
        "transitScheduleAdvice": ["string", ... 1 line, max 15 words],
        "transitTicketPayment": ["string", ... 1 line, max 15 words],
        "tips": ["string", ... max 2, highest-impact only, no prices/currencies]
      },
      "walk": { "... same copy fields as transit ..." },
      "taxi": {
        "taxiCost": "string or { \\"en\\": \\"...\\" } — guest taxi card headline price/range",
        "taxiPickupPoint": "string or { \\"en\\": \\"...\\" } — short hub line for zone A (desk, stand, curb); must match WhatsApp pickup wording",
        "tips": ["string", ... max 2, no prices/currencies] — slot [0] = where at this hub (no fares, no calling a taxi); slot [1] = deal before boarding (meter/fixed/scam); never phone numbers or \"call/book taxi\""
      },
      "metadata": {
        "transitDurationMin": number,
        "ticketKioskKm": number,
        "ticketDriverKm": number,
        "taxiEur": number,
        "taxiKm": number,
        "taxiDuration": number,
        "taxiEurMin": number,
        "taxiEurMax": number,
        "taxiKmMin": number,
        "taxiKmMax": number,
        "taxiDurationMin": number,
        "taxiDurationMax": number
      },
      "openQuestions": [{ "id": "stable-id", "field": "publicText|tips|...", "question": "string" }]
    }
  }
}

Rules for routes object:
- Include ONLY hubs that exist for this city (omit irrelevant RouteIds).
- routeId keys must be one of: airport, bus_central, bus_istochno, train_station.
- English only in all string fields.
- Do not invent stops, prices, durations, or line numbers unless stated in the research report or operator notes with a source.
- One primary scenario in transit publicText/publicSummary (bus OR walk steps — not taxi). Put taxi backup in tips[] or taxi.tips[], never mixed into transit steps.
- transitScheduleAdvice/transitTicketPayment must be research-specific, concise (max 15 words), and non-generic.
- Keep tips[] to max 2 items, prioritized by guest impact/severity.
- Never duplicate the same fact between tips[] and transitScheduleAdvice/transitTicketPayment.
- Never put prices, currency markers, fare ranges, or distance-priced hints (KM, EUR, €, "$", "price range", etc.) into any tips[] field (including taxi.tips). Price data belongs only in metadata numeric fields and taxiCost headline string.
- Taxi card block: fill taxi.taxiCost, taxi.taxiPickupPoint, taxi.tips when research mentions taxi; keep taxi out of transit.publicText and out of transit.tips[] (Good to know).
- taxi.tips: exactly up to 2 lines with fixed slots — [0] where at this hub, [1] deal before boarding (meter/fixed/scam). No fares in tips (use taxiCost/metadata). No calling or booking a taxi service in tips (guest calls in the taxi sheet footer).
- taxi.tips: do not duplicate taxiPickupPoint or pack-wide city taxi rules; hub-specific only.
- primaryRouteMode must match the main guest path (transit vs walk_only).
- hubArrivalKind: city_shared (default) — city owns transit/get-off; tenant_local — city meta only, tenants own full hub→door (soft city copy gate).
- metadata: numeric prices/durations ONLY when stated in research; prefer single values (taxiEur/taxiKm/taxiDuration). Min/Max variants are accepted for compatibility. Taxi numbers live in metadata only — not in copy strings.`;
