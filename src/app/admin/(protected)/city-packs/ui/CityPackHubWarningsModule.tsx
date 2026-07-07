'use client';

import type { CityPackContentWarnings } from '@/entities/city-pack/model/types';
import { AdminLocalizedInput } from './AdminLocalizedInput';

export const CITY_PACK_HUB_WARNINGS_INTRO =
  'Optional question or note when the city has more than one bus hub and guests must choose the right station on arrival.';

export const BUS_HUB_CLARIFICATION_LABEL = 'Bus hub clarification';

export function CityPackHubWarningsModule({
  warnings,
  onWarningsChange,
}: {
  warnings: CityPackContentWarnings;
  onWarningsChange: (warnings: CityPackContentWarnings) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{CITY_PACK_HUB_WARNINGS_INTRO}</p>
      <AdminLocalizedInput
        label={BUS_HUB_CLARIFICATION_LABEL}
        value={warnings.busClarification}
        onChange={(busClarification) => onWarningsChange({ ...warnings, busClarification })}
        multiline
        rows={3}
      />
    </div>
  );
}
