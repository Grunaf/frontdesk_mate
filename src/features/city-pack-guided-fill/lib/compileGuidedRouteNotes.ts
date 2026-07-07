import type { RouteMode } from '@/entities/hostel';
import { interviewSourceMeetsMinimumLength } from './guidedRouteInterview';

export function compileGuidedRouteNotesToSourceText(input: {
  hubLabel: string;
  routeMode: RouteMode;
  notes: string;
}): string {
  const notes = input.notes.trim();
  return [
    `Hub: ${input.hubLabel.trim() || 'this hub'}`,
    `Primary path: ${input.routeMode === 'walk_only' ? 'Walk only' : 'Public transit'}`,
    '',
    'Operator notes (source of truth — do not invent beyond this):',
    notes,
  ].join('\n');
}

export function guidedRouteNotesMeetMinimum(notes: string, hubLabel: string, routeMode: RouteMode): boolean {
  if (notes.trim().length < 12) {
    return false;
  }
  return interviewSourceMeetsMinimumLength(
    compileGuidedRouteNotesToSourceText({ hubLabel, routeMode, notes })
  );
}
