'use client';

import { useEffect } from 'react';
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
import { cn } from '@/shared/lib/utils';

type StaySetupEssentialsStepProps = {
  rulesAcknowledged: boolean;
  onRulesAcknowledgedChange: (value: boolean) => void;
  onHasHouseRulesChange?: (hasRules: boolean) => void;
  /** Guest already confirmed house rules for this stay — show checked, non-interactive. */
  rulesAckLocked?: boolean;
};

export function StaySetupEssentialsStep({
  rulesAcknowledged,
  onRulesAcknowledgedChange,
  onHasHouseRulesChange,
  rulesAckLocked = false,
}: StaySetupEssentialsStepProps) {
  const isNight = useNightMode();
  const hostel = useHostelConfig();
  const { settings } = useTenant();
  const { currentTenantSlug } = useGuestSession();
  const settlement = useTranslations('pages.staySetup.settlement');
  const tEssentials = useTranslations('pages.staySetup.essentials');
  const intent = currentTenantSlug ? readGuestIntent(currentTenantSlug) : null;
  const copyVariant = resolveSettlementCopyVariant(intent);

  const hasRules = getHouseRules(settings).some((rule) => rule.enabled);

  useEffect(() => {
    onHasHouseRulesChange?.(hasRules);
  }, [hasRules, onHasHouseRulesChange]);

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

      {hasRules ? (
        <label
          className={cn(
            'flex items-start gap-3 text-sm leading-relaxed text-foreground',
            rulesAckLocked ? 'cursor-default' : 'cursor-pointer'
          )}
        >
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border border-input accent-primary disabled:cursor-default disabled:opacity-100"
            checked={rulesAckLocked ? true : rulesAcknowledged}
            disabled={rulesAckLocked}
            onChange={(event) => {
              onRulesAcknowledgedChange(event.target.checked);
            }}
          />
          <span className={cn(rulesAckLocked && 'text-muted-foreground')}>
            {tEssentials('rulesAckLabel')}
          </span>
        </label>
      ) : null}
    </div>
  );
}
