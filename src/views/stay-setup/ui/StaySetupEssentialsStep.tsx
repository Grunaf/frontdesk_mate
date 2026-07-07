'use client';

import { readGuestIntent } from '@/features/guest-check-in/lib/guestIntent';
import { resolveSettlementCopyVariant } from '@/features/guest-check-in/lib/resolveSettlementCopyVariant';
import { useGuestSession } from '@/features/guest-check-in';
import { getHouseRules } from '@/entities/house-rules';
import { HostelRules } from '@/features/hostel-rules';
import { RegistrationAlert } from '@/features/registration-alert';
import { WifiCard } from '@/features/wifi-connect';
import { useNightMode } from '@/shared/lib';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';

export function StaySetupEssentialsStep() {
  const isNight = useNightMode();
  const hostel = useHostelConfig();
  const { settings } = useTenant();
  const { currentTenantSlug } = useGuestSession();
  const settlement = useTranslations('pages.staySetup.settlement');
  const intent = currentTenantSlug ? readGuestIntent(currentTenantSlug) : null;
  const copyVariant = resolveSettlementCopyVariant(intent);

  const hasRules = getHouseRules(settings).some((rule) => rule.enabled);

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {settlement(`copy.${copyVariant}.title`)}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {settlement(`copy.${copyVariant}.description`)}
        </p>
      </div>

      {isNight ? <RegistrationAlert /> : null}
      <WifiCard wifiName={hostel.wifi.name ?? ''} wifiPassword={hostel.wifi.password ?? ''} />
      {hasRules ? <HostelRules settings={settings} /> : null}
    </div>
  );
}
