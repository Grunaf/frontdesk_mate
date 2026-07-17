'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

type OwnerPortalNavLabels = {
  setup: string;
  settings: string;
  knowledge: string;
  activity: string;
};

type OwnerPortalNavProps = {
  locale: string;
  labels: OwnerPortalNavLabels;
};

type OwnerPortalNavKey = 'setup' | 'settings' | 'knowledge' | 'activity';

function resolveActiveNav(pathname: string, locale: string): OwnerPortalNavKey | null {
  const prefix = `/${locale}`;
  if (pathname === `${prefix}/activity` || pathname.startsWith(`${prefix}/activity/`)) {
    return 'activity';
  }
  if (pathname === `${prefix}/knowledge` || pathname.startsWith(`${prefix}/knowledge/`)) {
    return 'knowledge';
  }
  if (pathname === `${prefix}/setup` || pathname.startsWith(`${prefix}/setup/`)) {
    return 'setup';
  }
  if (pathname === `${prefix}/settings` || pathname.startsWith(`${prefix}/settings/`)) {
    return 'settings';
  }
  return null;
}

export function OwnerPortalNav({ locale, labels }: OwnerPortalNavProps) {
  const pathname = usePathname() || '';
  const activeNav = resolveActiveNav(pathname, locale);

  const navLinkClass = (key: OwnerPortalNavKey) =>
    cn(
      'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-muted hover:text-foreground',
      activeNav === key ? 'bg-muted text-foreground' : 'text-muted-foreground'
    );

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Owner portal">
      <Link href={`/${locale}/setup`} className={navLinkClass('setup')}>
        {labels.setup}
      </Link>
      <Link href={`/${locale}/settings`} className={navLinkClass('settings')}>
        {labels.settings}
      </Link>
      <Link href={`/${locale}/knowledge`} className={navLinkClass('knowledge')}>
        {labels.knowledge}
      </Link>
      <Link href={`/${locale}/activity`} className={navLinkClass('activity')}>
        {labels.activity}
      </Link>
    </nav>
  );
}
