'use client';

import { useCallback, useMemo, useState } from 'react';
import type { AccessPoint, ArrivalLayoutKind, TenantSettings } from '@/entities/tenant';
import type { ArrivalAccessConfig } from '@/entities/tenant/model/accessPoints';
import { isArrivalAccessMissing } from '@/entities/tenant/lib/resolveTenantReadiness';
import { normalizeAccessPoints } from '@/entities/tenant/lib/normalizeAccessPoints';
import { AdminImageField } from './ui/AdminImageField';
import { AdminLabelHelp } from './ui/AdminLabelHelp';
import { useTenantFormDraft } from './ui/TenantFormDraftContext';

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

function AccessPointRow({
  point,
  index,
  tenantSlug,
  onChange,
  onRemove,
}: {
  point: AccessPoint;
  index: number;
  tenantSlug: string;
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

interface ArrivalAccessFormState {
  layoutKind: ArrivalLayoutKind;
  dayMode: '' | NonNullable<TenantSettings['arrivalAccess']>['dayMode'];
  landmark: string;
  points: AccessPoint[];
}

function toArrivalAccessDraft(state: ArrivalAccessFormState): ArrivalAccessConfig {
  return {
    layoutKind: state.layoutKind,
    dayMode: state.dayMode || undefined,
    landmark: state.landmark || undefined,
    accessPoints: state.points,
  };
}

export function ArrivalAccessFields({ tenantSlug, settings }: ArrivalAccessFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const initialPoints = useMemo(() => normalizeAccessPoints(settings ?? {}), [settings]);
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
      setLayoutKind(next.layoutKind);
      setDayMode(next.dayMode);
      setLandmark(next.landmark);
      setPoints(next.points);
      updateDraft({ arrivalAccess: toArrivalAccessDraft(next) });
    },
    [updateDraft]
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
            Existing access points unchanged; review IDs/kinds if needed.
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
            tenantSlug={tenantSlug}
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
