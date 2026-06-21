'use client';

import { getHouseRules } from '@/entities/house-rules';
import { FindYourBedPanel } from '@/features/find-your-bed';
import { HostelRules } from '@/features/hostel-rules';
import { RegistrationAlert } from '@/features/registration-alert';
import { WifiCard } from '@/features/wifi-connect';
import { useNightMode } from '@/shared/lib';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { FeatureGate } from '@/shared/ui';

export function SettlementPhase() {
  const isNight = useNightMode();
  const hostel = useHostelConfig();
  const { settings } = useTenant();

  const hasRules = getHouseRules(settings).some((rule) => rule.enabled);

  return (
    <div className="space-y-6 pt-5">
      {isNight && <RegistrationAlert />}
      <WifiCard
        wifiName={hostel.wifi.name ?? ''}
        wifiPassword={hostel.wifi.password ?? ''}
      />
      {hasRules ? <HostelRules settings={settings} /> : null}
      <FeatureGate module="roomMap">
        <FindYourBedPanel />
      </FeatureGate>
    </div>
  );
}
