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
      "transit": {
        "publicTitle": "string",
        "publicSummary": "string",
        "publicPreview": "string",
        "publicText": "string",
        "publicGetOffAt": "string",
        "tips": ["string", ... max 5]
      },
      "walk": { "... same copy fields as transit ..." },
      "taxi": {
        "taxiCost": "string or { \\"en\\": \\"...\\" }",
        "taxiPickupPoint": "string or { \\"en\\": \\"...\\" }",
        "tips": ["string", ... max 5]
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
- primaryRouteMode must match the main guest path (transit vs walk_only).
- metadata: numeric prices/durations ONLY when stated in research; eur_only → taxiEurMin/Max; local_and_eur → also taxiKmMin/Max and ticketKioskKm/ticketDriverKm when given.`;
