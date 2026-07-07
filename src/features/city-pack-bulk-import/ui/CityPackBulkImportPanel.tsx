'use client';

import { useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { cn } from '@/shared/lib/utils';
import { applyPackBulkImportPreview, buildPackBulkImportPreviewState } from '../lib/applyPackBulkImportPreview';
import { buildPackBulkJsonPrompt } from '../lib/buildPackBulkJsonPrompt';
import { buildPackBulkResearchPrompt } from '../lib/buildPackBulkResearchPrompt';
import { parsePackBulkImportJson } from '../lib/packBulkImportSchema';
import type { PackBulkImportHubPreview, PackBulkImportPreviewState } from '../model/types';

const ALL_ROUTE_IDS = ROUTE_PRESETS.map((preset) => preset.id);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CityPackBulkImportPanel({
  packId,
  cityLabel,
  enabledRoutes,
  routes,
  transportCurrencyMode = 'eur_only',
  onEnabledRoutesChange,
  onRoutesChange,
}: {
  packId: string;
  cityLabel: string;
  enabledRoutes: RouteId[];
  routes: Partial<Record<RouteId, CityPackRouteContent>>;
  transportCurrencyMode?: 'eur_only' | 'local_and_eur';
  onEnabledRoutesChange: (next: RouteId[]) => void;
  onRoutesChange: (next: Partial<Record<RouteId, CityPackRouteContent>>) => void;
}) {
  const currencyContent = useMemo(
    () => ({ mode: transportCurrencyMode }) as const,
    [transportCurrencyMode]
  );
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [researchRouteIds, setResearchRouteIds] = useState<RouteId[]>(() => [...ALL_ROUTE_IDS]);
  const [pastedResearch, setPastedResearch] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PackBulkImportPreviewState | null>(null);
  const [selectedRouteIds, setSelectedRouteIds] = useState<RouteId[]>([]);
  const [applySuggestedEnabled, setApplySuggestedEnabled] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const suggestedRoutes = preview?.document.suggestedEnabledRoutes ?? [];

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
    const parsed = parsePackBulkImportJson(pastedJson);
    if (!parsed.ok) {
      setPreview(null);
      setParseError(parsed.message);
      return;
    }

    const state = buildPackBulkImportPreviewState({
      packId,
      notes: [notes, pastedResearch].filter(Boolean).join('\n\n'),
      document: parsed.document,
      currentRoutes: routes,
      transportCurrencyMode: currencyContent,
    });
    setPreview(state);
    setSelectedRouteIds(state.hubs.map((hub) => hub.routeId));
  };

  const handleCopyResearchPrompt = async () => {
    if (researchRouteIds.length === 0) {
      showCopyHint('Select at least one hub to research.');
      return;
    }
    const text = buildPackBulkResearchPrompt({
      packId,
      cityLabel,
      notes,
      researchRouteIds,
    });
    const ok = await copyText(text);
    showCopyHint(
      ok
        ? 'Step 1 copied — paste into ChatGPT / Gemini with search on.'
        : 'Could not copy research prompt.'
    );
  };

  const handleCopyJsonPrompt = async () => {
    const text = buildPackBulkJsonPrompt({
      packId,
      cityLabel,
      notes,
      research: pastedResearch,
      transportCurrencyMode,
    });
    const ok = await copyText(text);
    showCopyHint(
      ok
        ? pastedResearch.trim()
          ? 'Step 2 copied — new chat/message, paste, get JSON only.'
          : 'Step 2 copied (research empty — fill paste research first for best results).'
        : 'Could not copy JSON prompt.'
    );
  };

  const handleApply = () => {
    if (!preview) {
      return;
    }
    const result = applyPackBulkImportPreview({
      packId,
      notes: [notes, pastedResearch].filter(Boolean).join('\n\n'),
      document: preview.document,
      currentRoutes: routes,
      routeIdsToApply: selectedRouteIds,
      currentEnabledRoutes: enabledRoutes,
      applySuggestedEnabledRoutes: applySuggestedEnabled,
      transportCurrencyMode: currencyContent,
    });
    onRoutesChange(result.routes);
    onEnabledRoutesChange(result.enabledRoutes);
    setPreview(null);
    setPastedJson('');
    setParseError(null);
  };

  const toggleRoute = (routeId: RouteId) => {
    setSelectedRouteIds((current) =>
      current.includes(routeId) ? current.filter((id) => id !== routeId) : [...current, routeId]
    );
  };

  const previewSummary = useMemo(() => {
    if (!preview) {
      return null;
    }
    const ready = preview.hubs.filter((hub) => hub.gateReady).length;
    return `${preview.hubs.length} hub(s) · ${ready} gate-ready`;
  }, [preview]);

  return (
    <div className="rounded-lg border border-violet-200/80 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-900">
            Bulk import (AI)
          </p>
          <p className="text-[11px] text-violet-900/70">
            1 Research prompt → paste report → 2 JSON prompt → paste JSON → apply (no server LLM).
          </p>
        </div>
        <span className="text-[11px] text-violet-800">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-violet-200/80 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Arrival brief (optional hints for research — not verified facts)
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              placeholder="Hostel area, links you already have, …"
            />
          </label>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold text-foreground">Step 1 — Research (web / Reddit)</p>
            <p className="text-[11px] text-muted-foreground">
              Hubs to include in the research prompt (omit ones that do not exist in this city):
            </p>
            <div className="flex flex-wrap gap-2">
              {ROUTE_PRESETS.map((preset) => {
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
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCopyResearchPrompt()}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/40"
              >
                Copy research prompt
              </button>
            </div>
            <label className="block space-y-1 pt-1">
              <span className="text-xs font-medium text-muted-foreground">Paste research report</span>
              <textarea
                value={pastedResearch}
                onChange={(event) => setPastedResearch(event.target.value)}
                rows={6}
                className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
                placeholder="Markdown report from your AI (with sources / Reddit links)…"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold text-foreground">Step 2 — Format as pack JSON</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyJsonPrompt()}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/40"
              >
                Copy JSON prompt
              </button>
              {!pastedResearch.trim() ? (
                <span className="text-[11px] text-amber-800">Paste research first for accurate JSON.</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-background/80 px-2.5 py-2">
            <p className="text-xs font-semibold text-foreground">Step 3 — Import into draft</p>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Paste pack JSON</span>
              <textarea
                value={pastedJson}
                onChange={(event) => setPastedJson(event.target.value)}
                rows={8}
                className="w-full rounded-md border bg-background px-2.5 py-2 font-mono text-[11px]"
                placeholder='{ "packId": "...", "routes": { "airport": { ... } } }'
              />
            </label>

            {parseError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-900">
                {parseError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleParsePreview}
                disabled={!pastedJson.trim()}
                className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
              >
                Validate & preview
              </button>
              {previewSummary ? (
                <span className="self-center text-[11px] text-muted-foreground">{previewSummary}</span>
              ) : null}
            </div>
          </div>

          {copyHint ? (
            <p className="text-[11px] text-muted-foreground">{copyHint}</p>
          ) : null}

          {preview?.packIdMismatch ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-950">
              JSON packId is &quot;{preview.document.packId}&quot; but you are editing{' '}
              <code className="text-xs">{packId}</code>. You can still apply merge to this pack.
            </p>
          ) : null}

          {preview ? (
            <div className="space-y-2">
              {preview.hubs.map((hub) => (
                <HubPreviewCard
                  key={hub.routeId}
                  hub={hub}
                  selected={selectedRouteIds.includes(hub.routeId)}
                  onToggle={() => toggleRoute(hub.routeId)}
                />
              ))}

              {suggestedRoutes.length > 0 ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applySuggestedEnabled}
                    onChange={(event) => setApplySuggestedEnabled(event.target.checked)}
                  />
                  Also enable suggested hubs: {suggestedRoutes.join(', ')}
                </label>
              ) : null}

              <button
                type="button"
                onClick={handleApply}
                disabled={selectedRouteIds.length === 0}
                className="rounded-md border border-violet-700 bg-background px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                Apply to pack draft ({selectedRouteIds.length} hub
                {selectedRouteIds.length === 1 ? '' : 's'})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HubPreviewCard({
  hub,
  selected,
  onToggle,
}: {
  hub: PackBulkImportHubPreview;
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
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {hub.primaryRouteMode}
            </span>
            {hub.blocksPresent.map((block) => (
              <span
                key={block}
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {block}
              </span>
            ))}
            <span
              className={cn(
                'text-[10px] font-medium',
                hub.gateReady ? 'text-green-700' : 'text-amber-800'
              )}
            >
              {hub.gateStatusLabel}
            </span>
          </div>
          {hub.warnings.map((warning) => (
            <p key={warning} className="text-[11px] text-amber-900">
              {warning}
            </p>
          ))}
          {hub.openQuestions.length > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Open questions: {hub.openQuestions.length}
            </p>
          ) : null}
        </div>
      </label>
    </div>
  );
}
