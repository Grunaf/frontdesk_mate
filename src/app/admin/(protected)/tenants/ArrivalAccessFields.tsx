'use client';

import { useMemo, useState } from 'react';
import type { AccessPoint, ArrivalLayoutKind, TenantSettings } from '@/entities/tenant';
import { isArrivalAccessMissing } from '@/entities/tenant/lib/resolveTenantReadiness';
import { normalizeAccessPoints } from '@/entities/tenant/lib/normalizeAccessPoints';
import { AdminField } from './ui/AdminField';

interface ArrivalAccessFieldsProps {
  settings?: TenantSettings;
}

const LAYOUT_OPTIONS: { value: ArrivalLayoutKind; label: string; hint: string }[] = [
  {
    value: 'building_then_zones',
    label: 'Building entrance, then hostel zones',
    hint: 'One outside door (stairwell), then floor/zone doors inside — e.g. Balkan Han.',
  },
  {
    value: 'direct_to_floor',
    label: 'Direct to floor / zone',
    hint: 'No shared hostel entrance — guests go straight to their floor. e.g. Kotor house.',
  },
];

function emptyPoint(index: number, layoutKind: ArrivalLayoutKind): AccessPoint {
  if (index === 0 && layoutKind === 'building_then_zones') {
    return {
      id: 'building_entrance',
      kind: 'outside',
      label: 'Building entrance',
      sortOrder: 0,
    };
  }

  return {
    id: `floor_${index}`,
    kind: 'zone',
    label: `Floor ${index}`,
    sortOrder: index,
  };
}

function AccessPointRow({
  point,
  index,
  onChange,
  onRemove,
}: {
  point: AccessPoint;
  index: number;
  onChange: (next: AccessPoint) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Access point {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">ID</span>
          <input
            value={point.id}
            onChange={(event) => onChange({ ...point, id: event.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Kind</span>
          <select
            value={point.kind ?? 'zone'}
            onChange={(event) =>
              onChange({ ...point, kind: event.target.value as AccessPoint['kind'] })
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="outside">Outside / building entrance</option>
            <option value="zone">Hostel zone / floor door</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Label (guest-facing title)</span>
        <input
          value={point.label ?? ''}
          onChange={(event) => onChange({ ...point, label: event.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Photo URL</span>
        <input
          value={point.image ?? ''}
          onChange={(event) => onChange({ ...point, image: event.target.value })}
          placeholder="/images/floor-1-door.jpg"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Night code</span>
        <span className="block text-xs text-muted-foreground">
          Leave empty if no lock yet or staff opens manually.
        </span>
        <input
          value={point.code ?? ''}
          onChange={(event) => onChange({ ...point, code: event.target.value })}
          placeholder="1234#"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">For floors</span>
          <span className="block text-xs text-muted-foreground">Comma-separated. Empty = all guests.</span>
          <input
            value={point.forFloors?.join(', ') ?? ''}
            onChange={(event) =>
              onChange({
                ...point,
                forFloors: event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            placeholder="1"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Also for floors</span>
          <span className="block text-xs text-muted-foreground">Cross-access, e.g. kitchen on floor 1 for floor 2.</span>
          <input
            value={point.alsoForFloors?.join(', ') ?? ''}
            onChange={(event) =>
              onChange({
                ...point,
                alsoForFloors: event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            placeholder="2"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}

export function ArrivalAccessFields({ settings }: ArrivalAccessFieldsProps) {
  const initialPoints = useMemo(() => normalizeAccessPoints(settings ?? {}), [settings]);
  const showAccessGap = isArrivalAccessMissing(settings ?? {});
  const [layoutKind, setLayoutKind] = useState<ArrivalLayoutKind>(
    settings?.arrivalAccess?.layoutKind ??
      (initialPoints.some((point) => point.kind === 'outside' || point.id === 'building_entrance')
        ? 'building_then_zones'
        : 'direct_to_floor')
  );
  const [points, setPoints] = useState<AccessPoint[]>(
    initialPoints.length > 0 ? initialPoints : [emptyPoint(0, layoutKind)]
  );

  return (
    <div className="space-y-4">
      {showAccessGap ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Door access is not configured yet. Add access points with codes or a landmark photo so guests
          can enter the hostel.
        </p>
      ) : null}
      <input type="hidden" name="accessPointsJson" value={JSON.stringify(points)} />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Arrival layout</span>
        <select
          name="arrivalLayoutKind"
          value={layoutKind}
          onChange={(event) => setLayoutKind(event.target.value as ArrivalLayoutKind)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted-foreground">
          {LAYOUT_OPTIONS.find((option) => option.value === layoutKind)?.hint}
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Day check-in mode</span>
        <select
          name="arrivalDayMode"
          defaultValue={settings?.arrivalAccess?.dayMode ?? ''}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Auto</option>
          <option value="walk_in">Walk in / self check-in online</option>
          <option value="doorbell">Doorbell / WhatsApp to open</option>
          <option value="reception">Reception desk</option>
        </select>
      </label>

      <AdminField
        label="Landmark photo — find the hostel"
        name="arrivalLandmark"
        defaultValue={settings?.arrivalAccess?.landmark}
        placeholder="/images/facade.jpg"
        hint="Exterior / how to find the building. No codes here."
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Access points</p>
            <p className="text-xs text-muted-foreground">
              Ordered path: outside door first, then zones/floors. Add a code only where guests need one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPoints((current) => [...current, emptyPoint(current.length, layoutKind)])}
            className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Add point
          </button>
        </div>

        {points.map((point, index) => (
          <AccessPointRow
            key={`point-${index}`}
            point={point}
            index={index}
            onChange={(next) =>
              setPoints((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)))
            }
            onRemove={() =>
              setPoints((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)))
            }
          />
        ))}
      </div>

      <AdminField
        label="Bed → floor map (JSON)"
        name="bedFloorMapJson"
        defaultValue={
          settings?.arrivalAccess?.bedFloorMap
            ? JSON.stringify(settings.arrivalAccess.bedFloorMap, null, 2)
            : ''
        }
        placeholder='{"4B": "2"}'
        hint="Filters access points by highlightedBedId until booking provides floor."
      />
    </div>
  );
}
