'use client';

import { useMemo } from 'react';
import {
  CITY_PACK_HUB_TYPE_OPTIONS,
  listAdminCityPackHubRouteIds,
} from '@/entities/city-pack';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { resolveAdminCityPackRoutes } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import type { HubTransferCategory } from '@/entities/guest-hub-transfer/model/types';
import type { RouteCategory, RouteId } from '@/entities/hostel';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { AdminCheckbox } from '../ui/AdminField';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';

function resolveHubCategoryOptionsPresentInPack(
  cityPackId: CityPackId,
  cityPackContent?: CityPackContent
): { category: RouteCategory; label: string }[] {
  const routes = resolveAdminCityPackRoutes(cityPackId, cityPackContent);
  const hubRouteIds = listAdminCityPackHubRouteIds(routes);
  const presentCategories = new Set<RouteCategory>();

  for (const routeId of hubRouteIds) {
    const category = routes[routeId as RouteId]?.category;
    if (category) {
      presentCategories.add(category);
    }
  }

  return CITY_PACK_HUB_TYPE_OPTIONS.filter((option) => presentCategories.has(option.category));
}

interface HubTransferFieldsProps {
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
}

export function HubTransferFields({
  settings,
  cityPackId,
  cityPackContent,
}: HubTransferFieldsProps) {
  const { updateDraft } = useTenantFormDraft();

  const hubOptions = useMemo(
    () => resolveHubCategoryOptionsPresentInPack(cityPackId, cityPackContent),
    [cityPackContent, cityPackId]
  );

  const enabledSet = useMemo(() => {
    return new Set(settings?.hubTransfer?.enabledHubCategories ?? []);
  }, [settings?.hubTransfer?.enabledHubCategories]);

  const setCategoryEnabled = (category: HubTransferCategory, enabled: boolean) => {
    const current = settings?.hubTransfer?.enabledHubCategories ?? [];
    const next = enabled
      ? [...current.filter((entry) => entry !== category), category]
      : current.filter((entry) => entry !== category);

    updateDraft({
      hubTransfer: {
        enabledHubCategories: next,
      },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Guests can request availability via WhatsApp; you configure which arrival hubs offer transfer.
      </p>
      {hubOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No arrival hubs in this city pack yet. Add hubs in the city pack admin first.
        </p>
      ) : (
        <div className="space-y-3">
          {hubOptions.map((option) => (
            <AdminCheckbox
              key={option.category}
              label={option.label}
              checked={enabledSet.has(option.category)}
              onCheckedChange={(checked) => setCategoryEnabled(option.category, checked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
