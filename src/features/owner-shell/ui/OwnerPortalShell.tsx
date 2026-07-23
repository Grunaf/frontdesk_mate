import type { OwnerTenantContext } from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import { getTranslations } from 'next-intl/server';
import { OwnerShellProvider } from '../model/OwnerShellContext';
import { OwnerLifecycleBanner, OwnerSubscriptionReadOnly } from './OwnerShellBlocks';
import { OwnerPortalNav } from './OwnerPortalNav';
import { OwnerReadOnlyNotice } from './OwnerReadOnlyNotice';

export type OwnerPortalChromeMode = 'full' | 'minimal';

interface OwnerPortalShellProps {
  locale: string;
  context: OwnerTenantContext;
  children: React.ReactNode;
  chrome?: OwnerPortalChromeMode;
}

export async function OwnerPortalShell({
  locale,
  context,
  children,
  chrome = 'full',
}: OwnerPortalShellProps) {
  const t = await getTranslations('pages.owner.nav');
  const editAccess = resolveOwnerEditAccess(context.lifecycleStatus);

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
          <OwnerPortalNav
            locale={locale}
            labels={{
              setup: t('setup'),
              settings: t('settings'),
              knowledge: t('knowledge'),
              volunteers: t('volunteers'),
              activity: t('activity'),
            }}
          />
        </div>

        {chrome === 'full' ? (
          <>
            <OwnerLifecycleBanner status={context.lifecycleStatus} />
            <OwnerReadOnlyNotice />
            <OwnerSubscriptionReadOnly context={context} />
          </>
        ) : null}

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
