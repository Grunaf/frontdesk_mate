import type { OwnerTenantContext } from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { OwnerShellProvider } from '../model/OwnerShellContext';
import { OwnerLifecycleBanner, OwnerSubscriptionReadOnly } from './OwnerShellBlocks';
import { OwnerReadOnlyNotice } from './OwnerReadOnlyNotice';

interface OwnerPortalShellProps {
  locale: string;
  context: OwnerTenantContext;
  children: React.ReactNode;
}

export async function OwnerPortalShell({ locale, context, children }: OwnerPortalShellProps) {
  const t = await getTranslations('pages.owner.nav');
  const editAccess = resolveOwnerEditAccess(context.lifecycleStatus);

  const navLinkClass =
    'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <OwnerShellProvider
      value={{
        canEditSettings: editAccess.canEditSettings,
        lifecycleStatus: context.lifecycleStatus,
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <p className="text-sm font-semibold">{context.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{context.slug}</p>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Owner portal">
            <Link href={`/${locale}/setup`} className={navLinkClass}>
              {t('setup')}
            </Link>
            <Link href={`/${locale}/settings`} className={navLinkClass}>
              {t('settings')}
            </Link>
          </nav>
        </div>

        <OwnerLifecycleBanner status={context.lifecycleStatus} />
        <OwnerReadOnlyNotice />
        <OwnerSubscriptionReadOnly context={context} />

        <div>{children}</div>

        <form action={`/${locale}/auth/logout`} method="post">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('signOut')}
          </button>
        </form>
      </div>
    </OwnerShellProvider>
  );
}
