import { MAX_ROUTE_TIPS } from '@/entities/city-pack';
import type { GuidedRouteFillPreview } from '../model/types';

const TAXI_HINT =
  /\b(taxi|cab|uber|bolt|rideshare|ride[- ]?hail|такси)\b/i;
const TRANSIT_HINT =
  /\b(bus|autobus|minibus|tram|train|metro|subway|line|остановк|автобус|поезд|трамвай|маршрут)\b/i;
const NIGHT_OR_ALT_HINT = /\b(night|late|evening|weekend|no bus|after|ноч|поздн|выходн)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sentenceLooksTaxi(sentence: string): boolean {
  return TAXI_HINT.test(sentence);
}

function sentenceLooksTransit(sentence: string): boolean {
  return TRANSIT_HINT.test(sentence);
}

function mergeTips(existing: string[] | undefined, extra: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const tip of [...(existing ?? []), ...extra]) {
    const normalized = tip.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }
    seen.add(normalized.toLowerCase());
    merged.push(normalized);
    if (merged.length >= MAX_ROUTE_TIPS) {
      break;
    }
  }
  return merged;
}

/**
 * Keeps one primary path in gate copy; moves taxi/alternative lines to tips or open questions.
 */
export function enforceGuidedSingleScenario(
  preview: GuidedRouteFillPreview,
  rawInput: string
): GuidedRouteFillPreview {
  const rawHasTransit = TRANSIT_HINT.test(rawInput);
  const rawHasTaxi = TAXI_HINT.test(rawInput);
  const walkOnly = preview.routeMode === 'walk_only';

  if (walkOnly || (!rawHasTransit && rawHasTaxi)) {
    return preview;
  }

  if (!rawHasTransit) {
    return preview;
  }

  const next: GuidedRouteFillPreview = {
    ...preview,
    copy: { ...preview.copy },
    tips: preview.tips ? [...preview.tips] : undefined,
    openQuestions: [...preview.openQuestions],
  };

  const taxiSentencesFromSteps: string[] = [];

  for (const key of ['publicText', 'publicSummary'] as const) {
    const value = next.copy[key];
    if (!value) {
      continue;
    }

    const kept: string[] = [];
    for (const sentence of splitSentences(value)) {
      if (sentenceLooksTaxi(sentence) && !sentenceLooksTransit(sentence)) {
        taxiSentencesFromSteps.push(sentence);
      } else {
        kept.push(sentence);
      }
    }

    if (kept.length > 0) {
      next.copy[key] = kept.join(' ');
    } else {
      delete next.copy[key];
    }
  }

  if (taxiSentencesFromSteps.length > 0) {
    const tipBody =
      NIGHT_OR_ALT_HINT.test(rawInput) || rawHasTaxi
        ? taxiSentencesFromSteps.join(' ')
        : `Alternative: ${taxiSentencesFromSteps.join(' ')}`;
    next.tips = mergeTips(next.tips, [tipBody]);
  } else if (rawHasTaxi && rawHasTransit && !next.tips?.some((tip) => TAXI_HINT.test(tip))) {
    next.openQuestions.push({
      id: 'taxi-alternative',
      field: 'tips',
      question:
        'You mentioned taxi and public transport — should taxi go under Good to know (e.g. at night)?',
    });
  }

  return next;
}

export function mergeGuidedFieldPreview(
  base: GuidedRouteFillPreview,
  patch: GuidedRouteFillPreview,
  field?: keyof GuidedRouteFillPreview['copy'] | 'tips' | 'routeMode' | 'locationLabelEn'
): GuidedRouteFillPreview {
  if (!field) {
    return patch;
  }

  if (field === 'routeMode') {
    return { ...base, routeMode: patch.routeMode ?? base.routeMode, openQuestions: patch.openQuestions };
  }

  if (field === 'locationLabelEn') {
    return {
      ...base,
      locationLabelEn: patch.locationLabelEn ?? base.locationLabelEn,
      openQuestions: patch.openQuestions,
    };
  }

  if (field === 'tips') {
    return {
      ...base,
      tips: patch.tips ?? base.tips,
      openQuestions: patch.openQuestions,
    };
  }

  return {
    ...base,
    copy: {
      ...base.copy,
      [field]: patch.copy[field] ?? base.copy[field],
    },
    openQuestions: patch.openQuestions,
  };
}
