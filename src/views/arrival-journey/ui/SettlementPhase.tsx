'use client';

import { RoomLayout } from '@/entities/room';
import { HostelRules } from '@/features/hostel-rules';
import { RegistrationAlert } from '@/features/registration-alert';
import { WifiCard } from '@/features/wifi-connect';
import { useNightMode } from '@/shared/lib';
import { HOSTEL_CONFIG } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';

export function SettlementPhase() {
  const componentsT = useTranslations('components');
  const isNight = useNightMode();

  return (
    <div className="space-y-6 pt-5">
      {isNight && <RegistrationAlert />}
      <WifiCard
        wifiName={HOSTEL_CONFIG.wifi.name ?? ''}
        wifiPassword={HOSTEL_CONFIG.wifi.password ?? ''}
      />
      <HostelRules activeRulesKeys={['quietHours', 'alcohol']} />
      <section>
        <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {componentsT('roomSchema.title')}
        </h3>
        <RoomLayout highlightedBedId="4B" isNightMode={isNight} />
      </section>
    </div>
  );
}
