import { getTranslations } from 'next-intl/server';
import { getOwnerDashboardFrameClasses } from '../config/ownerDashboardUi';
import { OwnerDesktopRequiredBlocker } from './OwnerDesktopRequiredBlocker';
import { OwnerDesktopRequiredGate } from './OwnerDesktopRequiredGate';
import { OwnerLocaleSwitcher } from './OwnerLocaleSwitcher';

interface OwnerPortalChromeProps {
  locale: string;
  children: React.ReactNode;
}

/** Root owner-site chrome: header + desktop gate around page content. */
export async function OwnerPortalChrome({ locale, children }: OwnerPortalChromeProps) {
  const t = await getTranslations('pages.owner.portal');
  const frame = getOwnerDashboardFrameClasses();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-4 py-3">
        <div className={frame.headerInner}>
          <div>
            <p className="text-sm font-medium text-foreground">{t('title')}</p>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
          <OwnerLocaleSwitcher locale={locale} />
        </div>
      </header>
      <OwnerDesktopRequiredGate blocker={<OwnerDesktopRequiredBlocker />}>
        <main className={frame.main}>{children}</main>
      </OwnerDesktopRequiredGate>
    </div>
  );
}
