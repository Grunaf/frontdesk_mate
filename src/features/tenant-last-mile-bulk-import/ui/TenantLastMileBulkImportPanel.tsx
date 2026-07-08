'use client';

import { useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import type { LocalizedField, LocalizedText } from '@/entities/city-pack/model/types';
import type { TenantLocalArrivalPath } from '@/entities/tenant';
import { cn } from '@/shared/lib/utils';
import {
  applyTenantLastMileBulkPreview,
  buildTenantLastMileBulkPreviewState,
} from '../lib/applyTenantLastMileBulkPreview';
import { buildTenantLastMileJsonPrompt } from '../lib/buildTenantLastMileJsonPrompt';
import { buildTenantLastMileResearchPrompt } from '../lib/buildTenantLastMileResearchPrompt';
import { parseTenantLastMileBulkJson } from '../lib/tenantLastMileBulkImportSchema';
import type { TenantLastMileBulkHubPreview, TenantLastMileBulkPreviewState } from '../model/types';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TenantLastMileBulkImportPanel({
  tenantSlug,
  cityLabel,
  hostelAddress,
  mapsUrl,
  enabledRoutes,
  cityRoutes,
  walkByRoute,
  tipsByRoute,
  getOffByRoute,
  localByRoute,
  onApply,
}: {
  tenantSlug: string;
  cityLabel: string;
  hostelAddress: string;
  mapsUrl?: string;
  enabledRoutes: RouteId[];
  cityRoutes: Partial<Record<RouteId, CityPackRouteContent>>;
  walkByRoute: Partial<Record<RouteId, LocalizedField>>;
  tipsByRoute: Partial<Record<RouteId, LocalizedText[]>>;
  getOffByRoute?: Partial<Record<RouteId, LocalizedField>>;
  localByRoute?: Partial<Record<RouteId, TenantLocalArrivalPath>>;
  onApply: (patch: {
    arrivalWalkToHostelByRoute: Partial<Record<RouteId, LocalizedText>>;
    arrivalRouteTipsByRoute: Partial<Record<RouteId, LocalizedText[]>>;
    arrivalGetOffAtByRoute?: Partial<Record<RouteId, LocalizedField>>;
    arrivalLocalByRoute?: Partial<Record<RouteId, TenantLocalArrivalPath>>;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [researchRouteIds, setResearchRouteIds] = useState<RouteId[]>(() => [...enabledRoutes]);
  const [pastedResearch, setPastedResearch] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TenantLastMileBulkPreviewState | null>(null);
  const [selectedRouteIds, setSelectedRouteIds] = useState<RouteId[]>([]);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const hubPresets = useMemo(
    () => ROUTE_PRESETS.filter((preset) => enabledRoutes.includes(preset.id)),
    [enabledRoutes]
  );

  const showCopyHint = (message: string) => {
    setCopyHint(message);
    window.setTimeout(() => setCopyHint(null), 4500);
  };

  const toggleResearchHub = (routeId: RouteId) => {
    setResearchRouteIds((current) =>
      current.includes(routeId)
        ? current.filter((id) => id !== routeId)
        : [...current, routeId]
    );
  };

  const handleParsePreview = () => {
    setParseError(null);
    const parsed = parseTenantLastMileBulkJson(pastedJson);
    if (!parsed.ok) {
      setPreview(null);
      setParseError(parsed.message);
      return;
    }

    const state = buildTenantLastMileBulkPreviewState({
      tenantSlug,
      document: parsed.document,
      researchRouteIds,
      hostelAddress,
      cityRoutes,
      currentGetOffByRoute: getOffByRoute,
    });
    setPreview(state);
    setSelectedRouteIds(state.hubs.map((hub) => hub.routeId));
  };

  const handleCopyResearchPrompt = async () => {
    if (researchRouteIds.length === 0) {
      showCopyHint('Select at least one hub to research.');
      return;
    }
    const text = buildTenantLastMileResearchPrompt({
      tenantSlug,
      cityLabel,
      hostelAddress,
      mapsUrl,
      researchRouteIds,
      cityRoutes,
      getOffByRoute,
      notes,
    });
    const ok = await copyText(text);
    showCopyHint(ok ? 'Step 1 copied — paste into ChatGPT / Gemini with search on.' : 'Could not copy.');
  };

  const handleCopyJsonPrompt = async () => {
    const text = buildTenantLastMileJsonPrompt({
      tenantSlug,
      cityLabel,
      hostelAddress,
      research: pastedResearch,
      researchRouteIds,
      notes,
    });
    const ok = await copyText(text);
    showCopyHint(ok ? 'Step 2 copied — new chat, paste, get JSON only.' : 'Could not copy.');
  };

  const handleApply = () => {
    if (!preview) {
      return;
    }
    const result = applyTenantLastMileBulkPreview({
      document: preview.document,
      routeIdsToApply: selectedRouteIds,
      hostelAddress,
      currentWalkByRoute: walkByRoute,
      currentTipsByRoute: tipsByRoute,
      currentGetOffByRoute: getOffByRoute,
      currentLocalByRoute: localByRoute,
      cityRoutes,
    });
    onApply(result);
    setPreview(null);
    setPastedJson('');
    setParseError(null);
  };

  const toggleRoute = (routeId: RouteId) => {
    setSelectedRouteIds((current) =>
      current.includes(routeId) ? current.filter((id) => id !== routeId) : [...current, routeId]
    );
  };

  if (enabledRoutes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-violet-200/80 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-900">
            Bulk import last mile (AI)
          </p>
          <p className="text-[11px] text-violet-900/70">
            Research → JSON → apply per hub (hostel address + city get-off in prompts).
          </p>
        </div>
        <span className="text-[11px] text-violet-800">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-violet-200/80 px-3 py-3">
          {!hostelAddress.trim() ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-950">
              Set hostel address in Contacts first — prompts and apply use it as the walk destination.
            </p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Building hints (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            />
          </label>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold">Step 1 — Research</p>
            <div className="flex flex-wrap gap-2">
              {hubPresets.map((preset) => {
                const checked = researchRouteIds.includes(preset.id);
                return (
                  <label
                    key={preset.id}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                      checked ? 'border-violet-400 bg-violet-50' : 'border-border'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleResearchHub(preset.id)}
                    />
                    {preset.label}
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => void handleCopyResearchPrompt()}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/40"
            >
              Copy research prompt
            </button>
            <textarea
              value={pastedResearch}
              onChange={(event) => setPastedResearch(event.target.value)}
              rows={5}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              placeholder="Paste research report…"
            />
          </div>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold">Step 2 — JSON</p>
            <button
              type="button"
              onClick={() => void handleCopyJsonPrompt()}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/40"
            >
              Copy JSON prompt
            </button>
          </div>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold">Step 3 — Import</p>
            <textarea
              value={pastedJson}
              onChange={(event) => setPastedJson(event.target.value)}
              rows={6}
              className="w-full rounded-md border bg-background px-2.5 py-2 font-mono text-[11px]"
            />
            {parseError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-900">
                {parseError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleParsePreview}
              disabled={!pastedJson.trim()}
              className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Validate & preview
            </button>
          </div>

          {copyHint ? <p className="text-[11px] text-muted-foreground">{copyHint}</p> : null}

          {preview?.tenantSlugMismatch ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-950">
              JSON tenantSlug does not match <code className="text-xs">{tenantSlug}</code>.
            </p>
          ) : null}

          {preview?.ignoredOutOfScopeRouteIds.length ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-950">
              Ignored (not in research scope): {preview.ignoredOutOfScopeRouteIds.join(', ')}
            </p>
          ) : null}

          {preview ? (
            <div className="space-y-2">
              {preview.hubs.map((hub) => (
                <TenantHubPreviewCard
                  key={hub.routeId}
                  hub={hub}
                  selected={selectedRouteIds.includes(hub.routeId)}
                  onToggle={() => toggleRoute(hub.routeId)}
                />
              ))}
              <button
                type="button"
                onClick={handleApply}
                disabled={selectedRouteIds.length === 0}
                className="rounded-md border border-violet-700 bg-background px-3 py-1.5 text-sm font-medium text-violet-900 disabled:opacity-50"
              >
                Apply to tenant draft ({selectedRouteIds.length} hub
                {selectedRouteIds.length === 1 ? '' : 's'})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TenantHubPreviewCard({
  hub,
  selected,
  onToggle,
}: {
  hub: TenantLastMileBulkHubPreview;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-background px-2.5 py-2',
        selected ? 'border-violet-400' : 'border-border opacity-80'
      )}
    >
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{hub.hubLabel}</p>
            <span className="text-[10px] uppercase text-muted-foreground">{hub.mode}</span>
          </div>
          {hub.anchorLabelEn ? (
            <p className="text-[11px] text-muted-foreground">
              City anchor: {hub.anchorLabelEn}
            </p>
          ) : null}
          {hub.walkPreview ? (
            <p className="line-clamp-3 text-[11px] text-muted-foreground">{hub.walkPreview}</p>
          ) : null}
          {hub.warnings.map((warning) => (
            <p key={warning} className="text-[11px] text-amber-900">
              {warning}
            </p>
          ))}
        </div>
      </label>
    </div>
  );
}
