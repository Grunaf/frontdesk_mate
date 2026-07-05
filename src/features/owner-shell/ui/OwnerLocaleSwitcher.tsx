'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/utils';

const OWNER_LOCALES = ['en', 'sr'] as const;

interface OwnerLocaleSwitcherProps {
  locale: string;
}

export function OwnerLocaleSwitcher({ locale }: OwnerLocaleSwitcherProps) {
  const pathname = usePathname();
  const t = useTranslations('pages.owner.locale');

  function hrefFor(targetLocale: string): string {
    if (!pathname) {
      return `/${targetLocale}`;
    }
    const segments = pathname.split('/');
    if (segments.length > 1 && OWNER_LOCALES.includes(segments[1] as (typeof OWNER_LOCALES)[number])) {
      segments[1] = targetLocale;
      return segments.join('/') || `/${targetLocale}`;
    }
    return `/${targetLocale}${pathname}`;
  }

  return (
    <div className="flex items-center gap-1 text-xs" role="navigation" aria-label="Language">
      {OWNER_LOCALES.map((code) => (
        <Link
          key={code}
          href={hrefFor(code)}
          className={cn(
            'rounded px-2 py-1 font-medium uppercase tracking-wide',
            code === locale ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-current={code === locale ? 'page' : undefined}
        >
          {t(code)}
        </Link>
      ))}
    </div>
  );
}
