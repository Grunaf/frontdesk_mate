'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppLocale } from '@/entities/city-pack/model/types';
import { cn } from '@/shared/lib/utils';

interface AdminEditingLocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const AdminEditingLocaleContext = createContext<AdminEditingLocaleContextValue | null>(null);

export function AdminEditingLocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <AdminEditingLocaleContext.Provider value={value}>{children}</AdminEditingLocaleContext.Provider>
  );
}

export function useAdminEditingLocale(): AdminEditingLocaleContextValue {
  const context = useContext(AdminEditingLocaleContext);
  if (!context) {
    return { locale: 'en', setLocale: () => undefined };
  }

  return context;
}

export function AdminEditingLocaleSwitcher({
  label = 'Editing language',
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { locale, setLocale } = useAdminEditingLocale();

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
        {(['en', 'ru'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setLocale(tab)}
            className={cn(
              'rounded px-2.5 py-1 font-medium uppercase',
              locale === tab ? 'bg-foreground text-background' : 'text-muted-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LocaleStatusDots({ en, ru }: { en: boolean; ru: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
      <span className={cn(en ? 'text-green-700' : 'text-amber-700')}>EN{en ? ' ✓' : ' ○'}</span>
      <span className={cn(ru ? 'text-green-700' : 'text-muted-foreground')}>RU{ru ? ' ✓' : ' ○'}</span>
    </span>
  );
}
