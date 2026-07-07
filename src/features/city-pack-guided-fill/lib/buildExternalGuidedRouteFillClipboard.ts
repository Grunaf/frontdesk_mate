import type { RouteId, RouteMode } from '@/entities/hostel';
import {
  buildGuidedRouteFillUserPrompt,
  guidedRouteFillSystemPrompt,
} from './buildGuidedRouteFillPrompt';
import { compileGuidedRouteNotesToSourceText } from './compileGuidedRouteNotes';

const JSON_OUTPUT_HINT = `Reply with a single JSON object only (no markdown fences). Fields (all optional except follow schema types):
{
  "routeMode": "transit" | "walk_only",
  "locationLabelEn": "string",
  "publicTitle": "string",
  "publicSummary": "string",
  "publicText": "string",
  "publicGetOffAt": "string",
  "publicPreview": "string",
  "tips": ["string", ... max 5],
  "openQuestions": [{ "id": "stable-id", "field": "publicText|publicGetOffAt|...", "question": "string" }]
}`;

export function buildExternalGuidedRouteFillClipboard(input: {
  packId: string;
  routeId: RouteId;
  hubLabel: string;
  routeMode: RouteMode;
  notes: string;
}): string {
  const rawInput = compileGuidedRouteNotesToSourceText({
    hubLabel: input.hubLabel,
    routeMode: input.routeMode,
    notes: input.notes,
  });

  const userPrompt = buildGuidedRouteFillUserPrompt({
    packId: input.packId,
    routeId: input.routeId,
    hubLabel: input.hubLabel,
    rawInput,
    mode: 'full',
    currentRouteMode: input.routeMode,
  });

  return [
    '--- SYSTEM ---',
    guidedRouteFillSystemPrompt(),
    '',
    '--- USER ---',
    userPrompt,
    '',
    '--- OUTPUT FORMAT ---',
    JSON_OUTPUT_HINT,
  ].join('\n');
}
