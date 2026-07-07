'use client';

import type { CityPackTransportCurrencyMode } from '@/entities/city-pack';

export const TRANSPORT_CURRENCY_OPTIONS = [
  {
    value: 'eur_only' as const,
    label: 'Euro only (Montenegro-style guest chips)',
    description: 'Controls taxi backup chips and which price fields appear per hub.',
  },
  {
    value: 'local_and_eur' as const,
    label: 'KM + Euro (Bosnia-style)',
    description: 'Controls taxi backup chips and which price fields appear per hub.',
  },
] as const;

export const SUNDAY_CLOSURE_PRE_TRIP_LABEL = 'Sunday closure pre-trip tip';

export function CityPackCityDefaultsFields({
  embeddedInCitySettingsStep = false,
  transportCurrencyMode,
  onTransportCurrencyModeChange,
  preTripSundayClosure,
  onPreTripSundayClosureChange,
}: {
  /** When true, section title is omitted (parent City settings wizard step). */
  embeddedInCitySettingsStep?: boolean;
  transportCurrencyMode: CityPackTransportCurrencyMode;
  onTransportCurrencyModeChange: (mode: CityPackTransportCurrencyMode) => void;
  preTripSundayClosure: boolean;
  onPreTripSundayClosureChange: (enabled: boolean) => void;
}) {
  const currencyHelp =
    TRANSPORT_CURRENCY_OPTIONS.find((option) => option.value === transportCurrencyMode)
      ?.description ?? TRANSPORT_CURRENCY_OPTIONS[0].description;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      {!embeddedInCitySettingsStep ? (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            City transport defaults
          </p>
          <p className="text-[11px] text-muted-foreground">
            Applies to all arrival hubs in this pack. Last-mile walk directions are set per hostel in
            tenant settings.
          </p>
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Transport currency</span>
        <select
          value={transportCurrencyMode}
          onChange={(event) =>
            onTransportCurrencyModeChange(
              event.target.value === 'local_and_eur' ? 'local_and_eur' : 'eur_only'
            )
          }
          className="w-full max-w-md rounded-md border bg-background px-2.5 py-1.5 text-sm"
        >
          {TRANSPORT_CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{currencyHelp}</p>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={preTripSundayClosure}
          onChange={(event) => onPreTripSundayClosureChange(event.target.checked)}
        />
        {SUNDAY_CLOSURE_PRE_TRIP_LABEL}
      </label>
    </div>
  );
}
