'use client';

import type { CityPackContentWarnings } from '@/entities/city-pack/model/types';
import type { PhoneDisplayPresetId } from '@/shared/lib/phoneDisplay';
import { AdminPhoneFieldInline } from '../../tenants/ui/AdminPhoneField';
import { AdminLocalizedInput } from './AdminLocalizedInput';

export const CITY_PACK_TAXI_SERVICE_INTRO =
  'Shown on guest arrival taxi backup (name, phone) and as stand/meter warnings in the direction flow. Per-hostel taxi phone overrides live in tenant Reception settings.';

export const TAXI_NAME_LABEL = 'Taxi name';
export const TAXI_PHONE_LABEL = 'Taxi phone';
export const TAXI_STAND_WARNING_LABEL = 'Taxi stand warning';
export const TAXI_METER_WARNING_LABEL = 'Taxi meter warning';

export function CityPackTaxiServiceModule({
  taxiName,
  taxiPhone,
  taxiMask,
  taxiPreset,
  warnings,
  onTaxiNameChange,
  onTaxiPhoneChange,
  onTaxiMaskChange,
  onTaxiPresetChange,
  onWarningsChange,
}: {
  taxiName: string;
  taxiPhone: string;
  taxiMask: string;
  taxiPreset: PhoneDisplayPresetId;
  warnings: CityPackContentWarnings;
  onTaxiNameChange: (value: string) => void;
  onTaxiPhoneChange: (value: string) => void;
  onTaxiMaskChange: (value: string) => void;
  onTaxiPresetChange: (value: PhoneDisplayPresetId) => void;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{CITY_PACK_TAXI_SERVICE_INTRO}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">{TAXI_NAME_LABEL}</span>
          <input
            value={taxiName}
            onChange={(event) => onTaxiNameChange(event.target.value)}
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <AdminPhoneFieldInline
          label={TAXI_PHONE_LABEL}
          raw={taxiPhone}
          mask={taxiMask}
          preset={taxiPreset}
          onRawChange={onTaxiPhoneChange}
          onMaskChange={onTaxiMaskChange}
          onPresetChange={onTaxiPresetChange}
        />
      </div>
      <AdminLocalizedInput
        label={TAXI_STAND_WARNING_LABEL}
        value={warnings.taxiStand}
        onChange={(taxiStand) => onWarningsChange({ ...warnings, taxiStand })}
        multiline
        rows={2}
      />
      <AdminLocalizedInput
        label={TAXI_METER_WARNING_LABEL}
        value={warnings.taxiMeter}
        onChange={(taxiMeter) => onWarningsChange({ ...warnings, taxiMeter })}
        multiline
        rows={2}
      />
    </div>
  );
}
