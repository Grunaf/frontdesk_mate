import type { GuidedRouteFillFieldKey, GuidedRouteFillRequest } from '../model/types';

const SYSTEM_PROMPT = `You format hostel arrival directions for guests. You never invent facts.

Rules:
- Output JSON only, matching the schema.
- English only in string fields.
- One primary scenario per hub: either public transit steps OR walk-only — never mix "take the bus" and "take a taxi" in publicText or publicSummary.
- If the operator mentions taxi as backup (night, no service), put that in tips[], not in step-by-step.
- Do not add line numbers, stop names, prices, or durations unless explicitly stated in the operator input or follow-up answers.
- If information is missing for a field, leave that field empty and add an openQuestions entry (stable id, field key, short question).
- If the operator says they do not know, leave the field empty and keep the question in openQuestions.
- publicText: imperative steps for boarding and riding only (not get-off — use publicGetOffAt).
- publicGetOffAt: where to exit transit; omit for walk-only (set routeMode to walk_only).
- publicPreview: walk from hub to stop/platform only (not final walk to hostel — tenant settings).
- transitScheduleAdvice: 1-2 short lines (each max 10 words) with schedule reliability/frequency notes.
- transitTicketPayment: 1-2 short lines (each max 10 words) with where/how to buy/validate tickets.
- tips: up to 2 short optional bullets, ranked by guest impact/severity (highest first).
- Never duplicate facts between tips and transitScheduleAdvice/transitTicketPayment.
- locationLabelEn: short hub name if obvious from input (e.g. "Airport", "Main bus station").
- metadata: numeric fields ONLY when explicitly stated in operator input (prices, durations, ticket kiosk/driver KM). Never guess. For eur_only packs use taxiEurMin/Max; for local_and_eur also taxiKmMin/Max and ticketKioskKm/ticketDriverKm when given.`;

function formatFollowUps(followUpAnswers?: Record<string, string>): string {
  if (!followUpAnswers || Object.keys(followUpAnswers).length === 0) {
    return '';
  }

  const lines = Object.entries(followUpAnswers)
    .map(([id, answer]) => `- ${id}: ${answer.trim()}`)
    .join('\n');

  return `\n\nFollow-up answers:\n${lines}`;
}

export function buildGuidedRouteFillUserPrompt(input: GuidedRouteFillRequest): string {
  const currencyLine = input.transportCurrencyMode
    ? `Transport currency profile: ${input.transportCurrencyMode}\n`
    : '';

  const base = `${currencyLine}Hub: ${input.hubLabel} (${input.routeId})
Pack: ${input.packId}
Current route mode: ${input.currentRouteMode ?? 'transit'}

Operator notes (source of truth — do not add facts):
"""
${input.rawInput.trim()}
"""
${formatFollowUps(input.followUpAnswers)}`;

  if (input.mode === 'single_field' && input.field) {
    const existing = input.existingPreview;
    return `${base}

Regenerate ONLY the field "${input.field}" in JSON. Keep other fields absent from the JSON object except openQuestions you still need. Current preview for context:
${JSON.stringify(existing ?? {}, null, 2)}`;
  }

  return `${base}

Fill all applicable fields for this hub.`;
}

export function guidedRouteFillSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function guidedRouteFillFieldLabel(field: GuidedRouteFillFieldKey): string {
  const labels: Record<GuidedRouteFillFieldKey, string> = {
    publicTitle: 'Card title',
    publicSummary: 'Card summary',
    publicText: 'Step-by-step (ride)',
    publicGetOffAt: 'Get off at',
    publicPreview: 'Walk to stop',
    transitScheduleAdvice: 'Schedule advice',
    transitTicketPayment: 'Ticket payment',
    tips: 'Good to know tips',
  };
  return labels[field];
}
