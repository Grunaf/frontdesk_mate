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
        "transitScheduleAdvice": ["string", ... 1-2 lines, max 10 words each],
        "transitTicketPayment": ["string", ... 1-2 lines, max 10 words each],
        "tips": ["string", ... max 2, highest-impact only, no prices/currencies]
      },
      "walk": { "... same copy fields as transit ..." },
      "taxi": {
        "taxiCost": "string or { \\"en\\": \\"...\\" } — guest taxi card headline price/range",
        "taxiPickupPoint": "string or { \\"en\\": \\"...\\" } — where guests queue (desk, stand, arrivals curb)",
        "tips": ["string", ... max 2, no prices/currencies] — general how-taxi-works in this city/hub only (official stand/desk, meter, payment); NOT step-by-step transit, NOT fare amounts"
      },
      "metadata": {
        "transitDurationMin": number,
        "ticketKioskKm": number,
        "ticketDriverKm": number,
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
- transitScheduleAdvice/transitTicketPayment must be research-specific, concise (max 10 words per line), and non-generic.
- Keep tips[] to max 2 items, prioritized by guest impact/severity.
- Never duplicate the same fact between tips[] and transitScheduleAdvice/transitTicketPayment.
- Never put prices, currency markers, fare ranges, or distance-priced hints (KM, EUR, €, "$", "price range", etc.) into any tips[] field (including taxi.tips). Price data belongs only in metadata numeric fields and taxiCost headline string.
- Taxi card block: fill taxi.taxiCost, taxi.taxiPickupPoint, taxi.tips when research mentions taxi; keep taxi out of transit.publicText and out of transit.tips[] (Good to know).
- taxi.tips: max 2 short operational bullets (how taxis work here — stand, meter, payment). Never duplicate transit.tips[] or prices.
- primaryRouteMode must match the main guest path (transit vs walk_only).
- hubArrivalKind: city_shared (default) — city owns transit/get-off; tenant_local — city meta only, tenants own full hub→door (soft city copy gate).
- metadata: numeric prices/durations ONLY when stated in research; eur_only → taxiEurMin/Max; local_and_eur → also taxiKmMin/Max and ticketKioskKm/ticketDriverKm when given. Taxi numbers live in metadata only — not in copy strings.`;
