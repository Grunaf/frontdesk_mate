'use client';

import type { LocalizedText } from '@/entities/city-pack/model/types';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { isLocalizedFilled } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import { cn } from '@/shared/lib/utils';
import { useAdminEditingLocale } from './AdminLocaleEditContext';

export function readLocalizedValue(value: LocalizedText | undefined, locale: AppLocale): string {
  if (!value) {
    return '';
  }

  if (locale === 'ru') {
    return value.ru ?? '';
  }

  return value.en ?? '';
}

export function writeLocalizedValue(
  value: LocalizedText | undefined,
  locale: AppLocale,
  next: string
): LocalizedText {
  const current = value ?? { en: '' };

  if (locale === 'ru') {
    return { ...current, ru: next };
  }

  return { ...current, en: next };
}

export function AdminLocalizedInput({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
  hint,
  required = false,
  /** EN publish-gate field: Required badge only in EN; amber when EN empty. */
  gateRequired = false,
  compact = true,
}: {
  label: string;
  value?: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  gateRequired?: boolean;
  compact?: boolean;
}) {
  const { locale } = useAdminEditingLocale();
  const currentValue = readLocalizedValue(value, locale);
  const enMissing = gateRequired && !isLocalizedFilled(value, 'en');
  const showRequiredMark = gateRequired ? locale === 'en' : required;
  const inputClass = cn(
    'w-full rounded-md border bg-background px-2.5 text-sm',
    compact ? 'py-1.5' : 'py-2',
    enMissing && 'border-amber-400 bg-amber-50/40'
  );

  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-1.5')}>
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
        {label}
        {showRequiredMark ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
            Required
          </span>
        ) : null}
        {gateRequired && locale === 'ru' ? (
          <span className="text-[10px] font-normal text-muted-foreground">
            {enMissing ? 'EN still needed for publish' : 'EN ok · RU optional'}
          </span>
        ) : null}
      </span>
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
      {multiline ? (
        <textarea
          value={currentValue}
          onChange={(event) => onChange(writeLocalizedValue(value, locale, event.target.value))}
          rows={rows}
          placeholder={placeholder}
          className={inputClass}
        />
      ) : (
        <input
          value={currentValue}
          onChange={(event) => onChange(writeLocalizedValue(value, locale, event.target.value))}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function AdminLocalizedPreview({
  label,
  value,
  locale = 'en',
}: {
  label: string;
  value?: LocalizedText | string;
  locale?: AppLocale;
}) {
  const text =
    typeof value === 'string'
      ? value
      : locale === 'ru'
        ? value?.ru || value?.en || ''
        : value?.en || value?.ru || '';

  if (!text) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
      <p className="font-medium text-foreground/80">{label}</p>
      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
