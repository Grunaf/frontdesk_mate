'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessPoint, ArrivalLayoutKind, StayFloor, TenantSettings } from '@/entities/tenant';
import type { ArrivalAccessConfig } from '@/entities/tenant/model/accessPoints';
import { isArrivalAccessMissing } from '@/entities/tenant/lib/resolveTenantReadiness';
import { normalizeAccessPoints } from '@/entities/tenant/lib/normalizeAccessPoints';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui';
import {
  ensureAccessPointIds,
  mergeAccessPointDisplayFloors,
} from './lib/ensureAccessPointIds';
import { AdminImageField } from './ui/AdminImageField';
import { AdminLabelHelp } from './ui/AdminLabelHelp';
import { mergeDraftSettings, useTenantFormDraft } from './ui/TenantFormDraftContext';

interface ArrivalAccessFieldsProps {
  tenantSlug: string;
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

const LAYOUT_GUEST_EFFECT_HINT =
  'Affects guest door-access steps: order of doors, outside vs zone steps, and night banner copy. Changing this does not reorder existing access points — only new “Add point” defaults.';

const DAY_MODE_GUEST_EFFECT_HINT =
  'Affects daytime banner and instructions in the guest arrival guide (who opens / self check-in). Does not change the list of doors below.';

const AUTO_DAY_MODE_BY_LAYOUT: Record<ArrivalLayoutKind, string> = {
  building_then_zones: 'Auto → Doorbell / WhatsApp (daytime) for this layout.',
  direct_to_floor: 'Auto → Walk in / self check-in (daytime) for this layout.',
};

function getLayoutHelpParagraphs(layoutKind: ArrivalLayoutKind): string[] {
  const variantHint = LAYOUT_OPTIONS.find((option) => option.value === layoutKind)?.hint;
  return [LAYOUT_GUEST_EFFECT_HINT, variantHint ?? ''].filter(Boolean);
}

function getDayModeHelpParagraphs(
  layoutKind: ArrivalLayoutKind,
  dayMode: '' | NonNullable<TenantSettings['arrivalAccess']>['dayMode']
): string[] {
  const autoHint =
    dayMode === '' ? AUTO_DAY_MODE_BY_LAYOUT[layoutKind] : 'Overrides Auto.';
  return [DAY_MODE_GUEST_EFFECT_HINT, autoHint];
}

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

function sanitizeAccessPointForDraft(point: AccessPoint): AccessPoint {
  const code = point.code?.trim();
  const guideNote = point.guideNote?.trim();
  const forFloors = point.forFloors?.map((floor) => floor.trim()).filter(Boolean);
  return {
    ...point,
    code: code || undefined,
    guideNote: guideNote || undefined,
    forFloors: forFloors?.length ? forFloors : undefined,
    alsoForFloors: undefined,
  };
}

function applyAccessPointFloors(point: AccessPoint, floorIds: string[]): AccessPoint {
  const unique = [...new Set(floorIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ...point, forFloors: undefined, alsoForFloors: undefined };
  }
  return { ...point, forFloors: unique, alsoForFloors: undefined };
}

function AccessPointRow({
  point,
  index,
  layoutKind,
  tenantSlug,
  floorOptions,
  onChange,
  onRemove,
}: {
  point: AccessPoint;
  index: number;
  layoutKind: ArrivalLayoutKind;
  tenantSlug: string;
  floorOptions: StayFloor[];
  onChange: (next: AccessPoint) => void;
  onRemove: () => void;
}) {
  const isOutside = (point.kind ?? 'zone') === 'outside';
  const [nightCodeOn, setNightCodeOn] = useState(() => Boolean(point.code?.trim()));

  useEffect(() => {
    if (point.code?.trim()) {
      setNightCodeOn(true);
    }
  }, [point.code]);

  const selectedFloorIds = mergeAccessPointDisplayFloors(point);
  const floorsDisabled = floorOptions.length === 0;
  const availableFloors = floorOptions.filter((floor) => !selectedFloorIds.includes(floor.id));

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

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {isOutside ? 'Building / outside entrance' : 'Floor / zone door'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOutside
              ? 'Shared entrance before hostel zones (stairwell, street door).'
              : 'Door to a floor or zone inside the building.'}
          </p>
          {layoutKind === 'direct_to_floor' && isOutside ? (
            <p className="text-xs text-muted-foreground">
              Usually all points are zone doors for this layout.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOutside}
          aria-label={
            isOutside
              ? 'Building or outside entrance (on). Switch off for floor or zone door.'
              : 'Floor or zone door (off). Switch on for building or outside entrance.'
          }
          onClick={() => onChange({ ...point, kind: isOutside ? 'zone' : 'outside' })}
          className={cn(
            'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors',
            isOutside ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-background shadow transition-transform',
              isOutside ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Label (guest-facing title)</span>
        <input
          value={point.label ?? ''}
          onChange={(event) => onChange({ ...point, label: event.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <AdminImageField
        label="Door / access photo"
        tenantSlug={tenantSlug}
        kind="misc"
        value={point.image ?? ''}
        onChange={(next) => onChange({ ...point, image: next })}
        placeholder="/images/floor-1-door.jpg"
        previewAlt={point.label ?? `Access point ${index + 1}`}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">How to reach (optional)</span>
        <textarea
          value={point.guideNote ?? ''}
          onChange={(event) => onChange({ ...point, guideNote: event.target.value })}
          placeholder="e.g. Stairs on the left of the main entrance, basement door."
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <span className="block text-xs text-muted-foreground">
          Short note shown before the access point — how to find this door.
        </span>
      </label>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Night code</p>
          <p className="text-xs text-muted-foreground">
            Leave off if doors are unlocked or staff opens manually.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={nightCodeOn}
          aria-label={
            nightCodeOn
              ? 'Night code enabled. Switch off to remove code from this door.'
              : 'Night code disabled. Switch on to add a code for this door.'
          }
          onClick={() => {
            if (nightCodeOn) {
              setNightCodeOn(false);
              onChange({ ...point, code: undefined });
              return;
            }
            setNightCodeOn(true);
          }}
          className={cn(
            'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors',
            nightCodeOn ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-background shadow transition-transform',
              nightCodeOn ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
      {nightCodeOn ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Code</span>
          <input
            value={point.code ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ ...point, code: value.trim() ? value : undefined });
            }}
            placeholder="1234#"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Applies to floors</p>
          <p className="text-xs text-muted-foreground">
            Empty = all guests see this step. Pick floors to limit who sees this door.
          </p>
        </div>
        {floorsDisabled ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Add floors in Guest stay first.
          </p>
        ) : null}
        {selectedFloorIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedFloorIds.map((floorId) => {
              const floor = floorOptions.find((item) => item.id === floorId);
              const label = floor?.label?.trim() || floorId;
              return (
                <Badge key={floorId} variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                  {label}
                  <button
                    type="button"
                    disabled={floorsDisabled}
                    aria-label={`Remove floor ${label}`}
                    onClick={() =>
                      onChange(
                        applyAccessPointFloors(
                          point,
                          selectedFloorIds.filter((id) => id !== floorId)
                        )
                      )
                    }
                    className="min-h-5 min-w-5 rounded-sm text-sm leading-none text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        ) : null}
        {!floorsDisabled && availableFloors.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Available floors</p>
            <div className="flex flex-wrap gap-2">
              {availableFloors.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() =>
                    onChange(applyAccessPointFloors(point, [...selectedFloorIds, floor.id]))
                  }
                  className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
                >
                  {floor.label?.trim() || floor.id}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ArrivalAccessFormState {
  layoutKind: ArrivalLayoutKind;
  dayMode: '' | NonNullable<TenantSettings['arrivalAccess']>['dayMode'];
  landmark: string;
  points: AccessPoint[];
}

function toArrivalAccessDraft(
  state: ArrivalAccessFormState,
  stablePointIds: ReadonlySet<string>
): ArrivalAccessConfig {
  return {
    layoutKind: state.layoutKind,
    dayMode: state.dayMode || undefined,
    landmark: state.landmark || undefined,
    accessPoints: ensureAccessPointIds(state.points, state.layoutKind, stablePointIds).map(
      sanitizeAccessPointForDraft
    ),
  };
}

export function ArrivalAccessFields({ tenantSlug, settings }: ArrivalAccessFieldsProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const floorOptions = useMemo(() => {
    const merged = mergeDraftSettings(settings ?? {}, draft);
    return merged.guestStay?.floors?.filter((floor) => floor.id?.trim()) ?? [];
  }, [settings, draft]);
  const initialPoints = useMemo(() => normalizeAccessPoints(settings ?? {}), [settings]);
  const stablePointIds = useMemo(
    () => new Set(initialPoints.map((point) => point.id)),
    [initialPoints]
  );
  const showAccessGap = isArrivalAccessMissing(settings ?? {});
  const initialLayoutKind =
    settings?.arrivalAccess?.layoutKind ??
    (initialPoints.some((point) => point.kind === 'outside' || point.id === 'building_entrance')
      ? 'building_then_zones'
      : 'direct_to_floor');

  const [landmark, setLandmark] = useState(settings?.arrivalAccess?.landmark ?? '');
  const [layoutKind, setLayoutKind] = useState<ArrivalLayoutKind>(initialLayoutKind);
  const [dayMode, setDayMode] = useState<
    '' | NonNullable<TenantSettings['arrivalAccess']>['dayMode']
  >(settings?.arrivalAccess?.dayMode ?? '');
  const [points, setPoints] = useState<AccessPoint[]>(
    initialPoints.length > 0 ? initialPoints : [emptyPoint(0, initialLayoutKind)]
  );
  const [layoutChangeNote, setLayoutChangeNote] = useState(false);

  const readFormState = useCallback(
    (): ArrivalAccessFormState => ({
      layoutKind,
      dayMode,
      landmark,
      points,
    }),
    [dayMode, landmark, layoutKind, points]
  );

  const commitArrivalAccess = useCallback(
    (next: ArrivalAccessFormState) => {
      const ensuredPoints = ensureAccessPointIds(
        next.points,
        next.layoutKind,
        stablePointIds
      );
      const ensured: ArrivalAccessFormState = { ...next, points: ensuredPoints };
      setLayoutKind(ensured.layoutKind);
      setDayMode(ensured.dayMode);
      setLandmark(ensured.landmark);
      setPoints(ensured.points);
      updateDraft({ arrivalAccess: toArrivalAccessDraft(ensured, stablePointIds) });
    },
    [stablePointIds, updateDraft]
  );

  const applyArrivalAccess = useCallback(
    (updater: (current: ArrivalAccessFormState) => ArrivalAccessFormState) => {
      commitArrivalAccess(updater(readFormState()));
    },
    [commitArrivalAccess, readFormState]
  );

  return (
    <div className="space-y-4">
      {showAccessGap ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Door access is not configured yet. Add access points with codes or a landmark photo so guests
          can enter the hostel.
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          Arrival layout
          <AdminLabelHelp fieldLabel="Arrival layout">
            {getLayoutHelpParagraphs(layoutKind).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </AdminLabelHelp>
        </span>
        <select
          value={layoutKind}
          onChange={(event) => {
            const next = event.target.value as ArrivalLayoutKind;
            if (next !== layoutKind) {
              setLayoutChangeNote(true);
            }
            applyArrivalAccess((current) => ({ ...current, layoutKind: next }));
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {layoutChangeNote ? (
          <span className="block text-xs text-muted-foreground">
            Existing access points unchanged; review access point types and order.
          </span>
        ) : null}
      </label>

      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          Day check-in mode
          <AdminLabelHelp fieldLabel="Day check-in mode">
            {getDayModeHelpParagraphs(layoutKind, dayMode).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </AdminLabelHelp>
        </span>
        <select
          value={dayMode}
          onChange={(event) =>
            applyArrivalAccess((current) => ({
              ...current,
              dayMode: event.target.value as '' | NonNullable<TenantSettings['arrivalAccess']>['dayMode'],
            }))
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Auto</option>
          <option value="walk_in">Walk in / self check-in online</option>
          <option value="doorbell">Doorbell / WhatsApp to open</option>
          <option value="reception">Reception desk</option>
        </select>
      </label>

      <AdminImageField
        label="Landmark photo — find the hostel"
        tenantSlug={tenantSlug}
        kind="misc"
        value={landmark}
        onChange={(next) => applyArrivalAccess((current) => ({ ...current, landmark: next }))}
        placeholder="/images/facade.jpg"
        hint="Exterior / how to find the building. No codes here."
        previewAlt="Hostel landmark"
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
            onClick={() =>
              applyArrivalAccess((current) => ({
                ...current,
                points: [...current.points, emptyPoint(current.points.length, current.layoutKind)],
              }))
            }
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
            layoutKind={layoutKind}
            tenantSlug={tenantSlug}
            floorOptions={floorOptions}
            onChange={(next) =>
              applyArrivalAccess((current) => ({
                ...current,
                points: current.points.map((item, itemIndex) => (itemIndex === index ? next : item)),
              }))
            }
            onRemove={() =>
              applyArrivalAccess((current) => ({
                ...current,
                points:
                  current.points.length <= 1
                    ? current.points
                    : current.points.filter((_, i) => i !== index),
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}
