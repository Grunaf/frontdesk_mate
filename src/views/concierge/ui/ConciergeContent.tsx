'use client';

import { useNightMode } from '@/shared/lib';
import { NightAccessCard } from '@/features/night-access';
import { GuestAccessPanel, useIsGuestRegistered } from '@/features/guest-check-in';
import { GuestIssueReportCard } from '@/features/guest-issue-report';
import { GuestExtrasBlock } from '@/features/guest-services';
import { ConciergeReceptionStrip } from '@/features/reception-contact';
import { conciergeContentStripOffsetClass } from '@/features/reception-contact/lib/conciergeStripLayout';
import { WifiCompactRow } from '@/features/wifi-connect';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/shared/i18n';
import { Button, ConciergeModuleSection, FeatureGate, Icon } from '@/shared/ui';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { cn } from '@/shared/lib/utils';
import { ArrowRight } from 'lucide-react';

function ArrivalGuideButton() {
  const t = useTranslations('pages.concierge');
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        router.push(SITE_CONFIG.routes.app.welcome.path);
      }}
      className="h-auto w-full justify-between p-3 text-left text-xs font-medium"
    >
      <span>{t('arrivalGuideButton')}</span>
      <Icon icon={ArrowRight} className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

export function ConciergeContent() {
  const isNightMode = useNightMode();
  const isRegistered = useIsGuestRegistered();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'min-h-0 flex-1 space-y-4 overflow-x-hidden px-4 py-6',
          isRegistered && conciergeContentStripOffsetClass
        )}
      >
        {/* Zone: guest access */}
        {!isRegistered ? <GuestAccessPanel /> : null}

        {/* Zone: arrival essentials */}
        <ArrivalGuideButton />
        {isRegistered ? <WifiCompactRow /> : null}

        {/* Zone: services */}
        <ConciergeModuleSection
          title="Services"
          seeAllHref={SITE_CONFIG.routes.app.services.path}
        >
          <GuestExtrasBlock />
        </ConciergeModuleSection>

        {/* Zone: support */}
        {isRegistered ? <GuestIssueReportCard /> : null}

        {/* Zone: local guide — compact stub until Chat 2 */}
        <FeatureGate module="localGuide">
          <ConciergeModuleSection
            title="Local guide"
            seeAllHref={SITE_CONFIG.routes.app.guide.path}
          />
        </FeatureGate>

        {/* Zone: night access */}
        {isRegistered ? (
          <FeatureGate module="nightAccess">
            {isNightMode ? <NightAccessCard /> : null}
          </FeatureGate>
        ) : null}

        {/* Zone: FAQ — compact stub until Chat 4 */}
        <FeatureGate module="faq">
          <ConciergeModuleSection
            title="FAQ"
            seeAllHref={SITE_CONFIG.routes.app.faq.path}
          />
        </FeatureGate>
      </div>

      {isRegistered ? <ConciergeReceptionStrip /> : null}
    </div>
  );
}
