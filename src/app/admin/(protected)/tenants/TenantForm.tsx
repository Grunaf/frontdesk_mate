import { Suspense } from 'react';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { TenantFormAccordion } from './TenantFormAccordion';

interface TenantFormProps {
  originalSlug: string;
  justSaved?: boolean;
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContentsById: Record<string, CityPackContent>;
  initial: {
    slug: string;
    name: string;
    cityPackId: CityPackId;
    settings?: TenantSettings;
    subscriptionStartsAt: string;
    subscriptionEndsAt: string;
    archived: boolean;
  };
}

export function TenantForm({
  originalSlug,
  justSaved,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: TenantFormProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tenant form…</p>}>
      <TenantFormAccordion
        originalSlug={originalSlug}
        justSaved={justSaved}
        cityPackOptions={cityPackOptions}
        cityPackGateSnapshot={cityPackGateSnapshot}
        cityPackContentsById={cityPackContentsById}
        initial={initial}
      />
    </Suspense>
  );
}
