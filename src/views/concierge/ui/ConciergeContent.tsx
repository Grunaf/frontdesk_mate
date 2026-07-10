'use client';

import { useMemo } from 'react';
import { resolveGuestExtrasLayout } from '@/entities/guest-extra';
import { getHouseRules, resolveHouseRulesForDisplay } from '@/entities/house-rules';
import { useTenant } from '@/entities/tenant';
import { CrossHostelStrip, useIsGuestRegistered } from '@/features/guest-check-in';
import { GuestIssueReportCard } from '@/features/guest-issue-report';
import { GuestExtrasBlock } from '@/features/guest-services';
import { HostelRules } from '@/features/hostel-rules';
import { ConciergeReceptionStrip } from '@/features/reception-contact';
import { conciergeContentStripOffsetClass } from '@/features/reception-contact/lib/conciergeStripLayout';
import { StayEssentialsBridges, StayEssentialsPreCheckInBanner } from '@/features/stay-essentials';
import { LocalGuide } from '@/features/welcome';
import { useTranslations } from '@/shared/i18n';
import { ConciergeModuleSection, FeatureGate } from '@/shared/ui';
import { SITE_CONFIG } from '@/shared/config';
import { cn } from '@/shared/lib/utils';

const CONCIERGE_RULES_SEE_ALL_THRESHOLD = 4;

const CONCIERGE_EXCLUDED_GUEST_EXTRA_PRESETS = ['late_checkout'] as const;

export function ConciergeContent() {
  const t = useTranslations('pages.concierge');
  const isRegistered = useIsGuestRegistered();
  const { settings } = useTenant();
  const extrasLayout = useMemo(
    () =>
      resolveGuestExtrasLayout(settings, isRegistered, {
        excludePresetIds: CONCIERGE_EXCLUDED_GUEST_EXTRA_PRESETS,
      }),
    [settings, isRegistered]
  );
  const servicesCount = extrasLayout.standard.length + extrasLayout.featured.length;
  const compactStandardLimit = extrasLayout.featured.length > 0 ? 2 : 4;
  const servicesSeeAll =
    extrasLayout.featured.length > 2 || extrasLayout.standard.length > compactStandardLimit;
  const ruleDisplays = useMemo(
    () => resolveHouseRulesForDisplay(getHouseRules(settings)),
    [settings]
  );
  const hasRules = ruleDisplays.length > 0;
  const rulesSeeAll = ruleDisplays.length > CONCIERGE_RULES_SEE_ALL_THRESHOLD;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'min-h-0 flex-1 space-y-8 overflow-x-hidden px-4 py-6',
          isRegistered && conciergeContentStripOffsetClass
        )}
      >
        {/* Zone: guest access */}
        {!isRegistered ? <CrossHostelStrip /> : null}

        {/* Zone: arrival essentials */}
        <div className="space-y-2">
          <StayEssentialsPreCheckInBanner />
          <StayEssentialsBridges />
        </div>

        {/* Zone: services */}
        {servicesCount > 0 ? (
          <ConciergeModuleSection
            title={t('sections.services')}
            seeAllHref={servicesSeeAll ? SITE_CONFIG.routes.app.services.path : undefined}
            seeAllLabel={t('viewAllServices', { count: servicesCount })}
          >
            <GuestExtrasBlock
              variant="compact"
              excludePresetIds={CONCIERGE_EXCLUDED_GUEST_EXTRA_PRESETS}
            />
          </ConciergeModuleSection>
        ) : null}

        {/* Zone: support */}
        {isRegistered ? <GuestIssueReportCard /> : null}

        {/* Zone: local guide */}
        <FeatureGate module="localGuide">
          <ConciergeModuleSection
            title={t('sections.localGuide')}
            seeAllHref={SITE_CONFIG.routes.app.guide.path}
            seeAllLabel={t('seeAllGuide')}
          >
            <LocalGuide variant="compact" />
          </ConciergeModuleSection>
        </FeatureGate>

        {/* Zone: house rules */}
        {hasRules ? (
          <FeatureGate module="faq">
            <ConciergeModuleSection
              title={t('sections.houseRules')}
              seeAllHref={rulesSeeAll ? SITE_CONFIG.routes.app.faq.path : undefined}
              seeAllLabel={t('seeAllRules')}
            >
              <HostelRules settings={settings} variant="compact" />
            </ConciergeModuleSection>
          </FeatureGate>
        ) : null}
      </div>

      {isRegistered ? <ConciergeReceptionStrip /> : null}
    </div>
  );
}
