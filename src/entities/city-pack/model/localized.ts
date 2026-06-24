export type AppLocale = 'en' | 'ru';

/** Inline copy stored in city_packs.content (and optionally tenant settings). */
export interface LocalizedText {
  en: string;
  ru?: string;
}

export type LocalizedField = string | LocalizedText;

export function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as LocalizedText).en === 'string'
  );
}

export function toLocalizedText(value: LocalizedField | undefined): LocalizedText | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed } : undefined;
  }

  const en = value.en?.trim();
  if (!en) {
    return undefined;
  }

  const ru = value.ru?.trim();
  return ru ? { en, ru } : { en };
}

export function resolveLocalizedText(
  value: LocalizedField | undefined,
  locale: AppLocale
): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (locale === 'ru' && value.ru?.trim()) {
    return value.ru.trim();
  }

  return value.en.trim();
}

export function applyTemplate(
  template: string,
  values: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value == null ? '' : String(value);
  });
}
