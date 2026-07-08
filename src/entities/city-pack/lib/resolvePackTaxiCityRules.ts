import type { AppLocale, CityPackContentWarnings, LocalizedText } from '../model/types';
import { resolveLocalizedText } from '../model/localized';

export function splitTaxiCityRulesParagraphs(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isLocalizedFilled(value: LocalizedText | undefined): boolean {
  return Boolean(value?.en?.trim() || value?.ru?.trim());
}

/** Guest zone B lines: taxiCityRules OR legacy stand + meter (deduped exact matches). */
export function resolvePackTaxiCityRulesLines(
  warnings: CityPackContentWarnings,
  locale: AppLocale
): string[] {
  if (isLocalizedFilled(warnings.taxiCityRules)) {
    const text = resolveLocalizedText(warnings.taxiCityRules!, locale);
    return splitTaxiCityRulesParagraphs(text);
  }

  const lines: string[] = [];
  for (const key of ['taxiStand', 'taxiMeter'] as const) {
    const block = warnings[key];
    if (!block) {
      continue;
    }
    const text = resolveLocalizedText(block, locale).trim();
    if (!text) {
      continue;
    }
    const normalized = text.toLowerCase();
    if (lines.some((line) => line.toLowerCase() === normalized)) {
      continue;
    }
    lines.push(text);
  }
  return lines;
}

/** Admin UI: show one field when only legacy stand/meter exist in DB/code seed. */
export function coalesceCityPackTaxiCityRulesForAdmin(
  warnings: CityPackContentWarnings
): LocalizedText {
  if (isLocalizedFilled(warnings.taxiCityRules)) {
    return warnings.taxiCityRules ?? { en: '' };
  }

  const enParts = [warnings.taxiStand?.en?.trim(), warnings.taxiMeter?.en?.trim()].filter(
    Boolean
  ) as string[];
  const ruParts = [warnings.taxiStand?.ru?.trim(), warnings.taxiMeter?.ru?.trim()].filter(
    Boolean
  ) as string[];

  if (enParts.length === 0 && ruParts.length === 0) {
    return { en: '' };
  }

  const en = enParts.length > 0 ? enParts.join('\n\n') : '';
  const ru = ruParts.length > 0 ? ruParts.join('\n\n') : undefined;
  return ru ? { en, ru } : { en };
}
