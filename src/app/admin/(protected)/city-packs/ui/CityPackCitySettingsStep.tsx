'use client';

import type { CityPackTransportCurrencyMode } from '@/entities/city-pack';
import { CityPackCityDefaultsFields } from './CityPackCityDefaultsFields';

export const CITY_PACK_SETTINGS_STEP_INTRO =
  'Pack-wide defaults for this city: currency on guest arrival chips and optional pre-trip tips. Arrival hub copy is on the next step; last-mile walk is per hostel in tenant settings.';

export function CityPackCitySettingsStep({
  transportCurrencyMode,
  onTransportCurrencyModeChange,
  preTripSundayClosure,
  onPreTripSundayClosureChange,
}: {
  transportCurrencyMode: CityPackTransportCurrencyMode;
  onTransportCurrencyModeChange: (mode: CityPackTransportCurrencyMode) => void;
  preTripSundayClosure: boolean;
  onPreTripSundayClosureChange: (enabled: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{CITY_PACK_SETTINGS_STEP_INTRO}</p>
      <CityPackCityDefaultsFields
        embeddedInCitySettingsStep
        transportCurrencyMode={transportCurrencyMode}
        onTransportCurrencyModeChange={onTransportCurrencyModeChange}
        preTripSundayClosure={preTripSundayClosure}
        onPreTripSundayClosureChange={onPreTripSundayClosureChange}
      />
      <p className="text-sm text-muted-foreground">
        Recommended taxi and bus-station warnings are under <strong>Arrival</strong> → Pack-wide
        (optional).
      </p>
    </div>
  );
}
