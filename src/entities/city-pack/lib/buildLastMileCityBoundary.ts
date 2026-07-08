import type { CityPackRouteContent } from '../model/types';
import { resolveLocalizedText } from '../model/localized';

const EXCERPT_MAX = 220;

export type LastMileCityBoundary = {
  routeMode: 'transit' | 'walk_only';
  /** Guest-visible anchor where hostel last mile begins. */
  anchorLabelEn: string;
  /** City pack supplies a start anchor (get-off or end of city walk). */
  hasAnchoredStart: boolean;
  cityStepsSummaryEn?: string;
  cityTipsEn: string[];
  doNotRepeat: string[];
};

function truncate(value: string, max = EXCERPT_MAX): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function lastSentenceExcerpt(publicText: string): string {
  const trimmed = publicText.trim();
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  const last = parts[parts.length - 1]?.trim();
  if (last && last.length >= 20) {
    return last;
  }
  return truncate(trimmed, 120);
}

function readTipEn(tip: { en: string; ru?: string }): string {
  return resolveLocalizedText(tip, 'en').trim();
}

export function buildLastMileCityBoundary(
  cityRoute: CityPackRouteContent | undefined,
  options?: { getOffOverrideEn?: string }
): LastMileCityBoundary | undefined {
  if (!cityRoute) {
    return undefined;
  }

  const routeMode = cityRoute.routeMode === 'walk_only' ? 'walk_only' : 'transit';
  const cityGetOff = resolveLocalizedText(cityRoute.copy.publicGetOffAt, 'en').trim();
  const overrideGetOff = options?.getOffOverrideEn?.trim() ?? '';
  const getOff = overrideGetOff || cityGetOff;
  const publicText = resolveLocalizedText(cityRoute.copy.publicText, 'en').trim();
  const summary = resolveLocalizedText(cityRoute.copy.publicSummary, 'en').trim();
  const preview = resolveLocalizedText(cityRoute.copy.publicPreview, 'en').trim();

  const cityTipsEn = cityRoute.tips?.map(readTipEn).filter(Boolean).slice(0, 5) ?? [];

  const doNotRepeat: string[] = [];
  if (routeMode === 'transit') {
    if (preview) {
      doNotRepeat.push(`Walk to stop: ${truncate(preview, 160)}`);
    }
    if (publicText) {
      doNotRepeat.push(`Board & ride: ${truncate(publicText)}`);
    }
    if (getOff) {
      const getOffLabel = overrideGetOff
        ? `Get-off (hostel override — shown to guest): ${getOff}`
        : `Get-off (shown to guest): ${getOff}`;
      doNotRepeat.push(getOffLabel);
    }
  } else if (publicText) {
    doNotRepeat.push(`On-foot route from hub: ${truncate(publicText)}`);
  }
  for (const tip of cityTipsEn) {
    doNotRepeat.push(`City Good to know tip: ${tip}`);
  }

  let anchorLabelEn = '';
  let hasAnchoredStart = false;

  if (routeMode === 'walk_only') {
    if (publicText) {
      hasAnchoredStart = true;
      anchorLabelEn = lastSentenceExcerpt(publicText);
    }
  } else if (getOff) {
    hasAnchoredStart = true;
    anchorLabelEn = getOff;
  }

  const cityStepsSummaryEn =
    routeMode === 'walk_only'
      ? truncate(publicText) || summary || undefined
      : summary || truncate(publicText) || undefined;

  return {
    routeMode,
    anchorLabelEn,
    hasAnchoredStart,
    cityStepsSummaryEn,
    cityTipsEn,
    doNotRepeat,
  };
}

export function formatLastMileBoundaryForPrompt(
  boundary: LastMileCityBoundary | undefined
): string | undefined {
  if (!boundary) {
    return undefined;
  }

  const lines = [
    `City route mode: ${boundary.routeMode}`,
    boundary.hasAnchoredStart
      ? `Last mile starts at (anchor — do not rewrite): ${boundary.anchorLabelEn}`
      : 'Last mile start: operator must specify (city get-off missing).',
  ];

  if (boundary.cityStepsSummaryEn) {
    lines.push(`City route gist: ${boundary.cityStepsSummaryEn}`);
  }

  if (boundary.doNotRepeat.length > 0) {
    lines.push('', 'Already covered by city pack (DO NOT repeat in walkEn or tipsEn):');
    for (const item of boundary.doNotRepeat) {
      lines.push(`- ${item}`);
    }
  }

  if (boundary.cityTipsEn.length > 0) {
    lines.push(
      '',
      `City pack already has ${boundary.cityTipsEn.length} tip(s) in Good to know — leave tipsEn empty unless entrance/stairs/side door only (max 2).`
    );
  }

  return lines.join('\n');
}

export function detectLastMileWalkOverlap(
  walkEn: string,
  boundary: LastMileCityBoundary | undefined
): string[] {
  if (!boundary || !walkEn.trim()) {
    return [];
  }

  const warnings: string[] = [];
  const lower = walkEn.toLowerCase();

  if (boundary.routeMode === 'transit' && boundary.anchorLabelEn.length >= 14) {
    const probe = boundary.anchorLabelEn.toLowerCase().slice(0, 36);
    if (lower.includes(probe)) {
      warnings.push(
        'Walk text may repeat the city get-off — start with turns after get-off only.'
      );
    }
  }

  for (const block of boundary.doNotRepeat) {
    const payload = block.includes(':') ? block.split(':').slice(1).join(':').trim() : block;
    if (payload.length < 24) {
      continue;
    }
    const probe = payload.slice(0, 40).toLowerCase();
    if (probe.length >= 24 && lower.includes(probe)) {
      warnings.push('Walk text may duplicate city pack route steps.');
      break;
    }
  }

  return warnings;
}
