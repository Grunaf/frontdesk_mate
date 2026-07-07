'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RouteId, RouteMode } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { cn } from '@/shared/lib/utils';
import { getGuidedInterviewQuestions, type GuidedInterviewQuestion } from '../lib/guidedRouteInterview';
import { buildExternalGuidedRouteFillClipboard } from '../lib/buildExternalGuidedRouteFillClipboard';
import {
  compileGuidedRouteNotesToSourceText,
  guidedRouteNotesMeetMinimum,
} from '../lib/compileGuidedRouteNotes';
import { buildGuidedRoutePreviewFromPastedJson } from '../lib/buildGuidedRoutePreviewFromPastedJson';
import { guidedRouteFillFieldLabel } from '../lib/buildGuidedRouteFillPrompt';
import {
  isGuidedPreviewGateReady,
  resolveRouteAfterGuidedPreview,
} from '../lib/guidedPreviewGate';
import { guidedRouteFillAction } from '../api/guidedRouteFillAction';
import { getGuidedFillLlmConfiguredAction } from '../api/getGuidedFillLlmConfiguredAction';
import type {
  GuidedRouteFillFieldKey,
  GuidedRouteFillPreview,
  GuidedRouteOpenQuestion,
} from '../model/types';

const ERROR_LABEL: Record<string, string> = {
  unauthorized: 'Sign in to admin again.',
  not_configured: 'API key not set — use Copy prompt + Paste JSON instead.',
  rate_limited: 'OpenRouter rate limit (429) — wait or use Paste JSON.',
  invalid_input: 'Add enough notes (at least a few sentences), then try again.',
  invalid_json: 'Could not parse JSON — check the model returned one object only, no markdown fences.',
  provider_error: 'AI request failed. Try Paste JSON from your chat.',
};

function PreviewField({
  label,
  value,
  onRegenerate,
  busy,
  showRegenerate,
}: {
  label: string;
  value?: string;
  onRegenerate: () => void;
  busy: boolean;
  showRegenerate: boolean;
}) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {showRegenerate ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRegenerate}
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            Regenerate (API)
          </button>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value?.trim() || '—'}</p>
    </div>
  );
}

function QuestionNavItem({
  question,
  active,
  onSelect,
}: {
  question: GuidedInterviewQuestion;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-violet-400 bg-violet-100/80'
          : 'border-transparent bg-background/60 hover:border-violet-200 hover:bg-background'
      )}
    >
      <p className="text-[11px] font-medium leading-snug text-foreground">
        {question.label}
        {question.required ? (
          <span className="ml-1 text-[9px] font-normal text-amber-800">· cover</span>
        ) : null}
      </p>
      {question.hint ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{question.hint}</p>
      ) : null}
    </button>
  );
}

export function CityPackRouteGuidedPanel({
  packId,
  routeId,
  hubLabel,
  route,
  onApply,
  transportCurrencyMode = 'eur_only',
}: {
  packId: string;
  routeId: RouteId;
  hubLabel: string;
  route: CityPackRouteContent;
  onApply: (next: CityPackRouteContent) => void;
  transportCurrencyMode?: 'eur_only' | 'local_and_eur';
}) {
  const [routeMode, setRouteMode] = useState<RouteMode>(route.routeMode ?? 'transit');
  const [notes, setNotes] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [followUp, setFollowUp] = useState<Record<string, string>>({});
  const [skippedFollowUpIds, setSkippedFollowUpIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<GuidedRouteFillPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [llmConfigured, setLlmConfigured] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement>(null);

  const questions = useMemo(
    () => getGuidedInterviewQuestions(routeMode, hubLabel),
    [routeMode, hubLabel]
  );

  useEffect(() => {
    void getGuidedFillLlmConfiguredAction().then(setLlmConfigured);
  }, []);

  useEffect(() => {
    setNotes('');
    setPreview(null);
    setFollowUp({});
    setSkippedFollowUpIds([]);
    setPastedJson('');
    setActiveQuestionId(questions[0]?.id ?? null);
  }, [routeMode, routeId, questions]);

  const canProceed = guidedRouteNotesMeetMinimum(notes, hubLabel, routeMode);

  const compiledSource = useMemo(
    () => compileGuidedRouteNotesToSourceText({ hubLabel, routeMode, notes }),
    [hubLabel, routeMode, notes]
  );

  const visibleFollowUps = useMemo(() => {
    const list = preview?.openQuestions ?? [];
    return list.filter((q) => !skippedFollowUpIds.includes(q.id));
  }, [preview, skippedFollowUpIds]);

  const focusNotes = () => {
    notesRef.current?.focus();
  };

  const selectQuestion = (question: GuidedInterviewQuestion) => {
    setActiveQuestionId(question.id);
    focusNotes();
  };

  const copyExternalPrompt = async () => {
    if (!canProceed) {
      setError(ERROR_LABEL.invalid_input);
      return;
    }
    setError(null);
    const text = buildExternalGuidedRouteFillClipboard({
      packId,
      routeId,
      hubLabel,
      routeMode,
      notes,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint('Prompt copied — paste into Gemini (or any chat), then paste JSON below.');
      window.setTimeout(() => setCopyHint(null), 5000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const applyPastedJson = () => {
    if (!canProceed) {
      setError(ERROR_LABEL.invalid_input);
      return;
    }
    setError(null);
    const next = buildGuidedRoutePreviewFromPastedJson(pastedJson, compiledSource);
    if (!next) {
      setError(ERROR_LABEL.invalid_json);
      return;
    }
    setPreview(next);
  };

  const runGenerate = async (mode: 'full' | 'single_field', field?: GuidedRouteFillFieldKey) => {
    if (mode === 'full' && !canProceed) {
      setError(ERROR_LABEL.invalid_input);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await guidedRouteFillAction({
      packId,
      routeId,
      hubLabel,
      rawInput: compiledSource,
      followUpAnswers: followUp,
      mode,
      field,
      existingPreview: preview ?? undefined,
      currentRouteMode: routeMode,
      transportCurrencyMode,
    });

    setBusy(false);

    if (!result.ok) {
      setError(ERROR_LABEL[result.error] ?? 'Something went wrong.');
      return;
    }

    setPreview(result.preview);
  };

  const guidedContent = useMemo(
    () => ({ transportCurrency: { mode: transportCurrencyMode } }),
    [transportCurrencyMode]
  );

  const gateStatus = preview
    ? isGuidedPreviewGateReady(packId, routeId, route, preview, guidedContent)
    : null;

  const applyPreview = (force = false) => {
    if (!preview) {
      return;
    }
    const status = isGuidedPreviewGateReady(packId, routeId, route, preview, guidedContent);
    if (!status.ready && !force) {
      setError(`Publish gate not ready: ${status.statusLabel}. Use Apply anyway or fix in Manual.`);
      return;
    }
    setError(null);
    onApply(resolveRouteAfterGuidedPreview(packId, routeId, route, preview, guidedContent));
  };

  const copyFields: GuidedRouteFillFieldKey[] = [
    'publicTitle',
    'publicSummary',
    'publicText',
    'publicGetOffAt',
    'publicPreview',
  ];

  const openFollowUpCount = visibleFollowUps.length;

  return (
    <div className="space-y-3 rounded-md border border-violet-200/80 bg-violet-50/20 p-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">Guided fill</p>
        <p className="text-[11px] text-muted-foreground">
          Write notes in one box (use topics as a checklist), copy the prompt into your own AI, paste
          JSON back — or use API if configured.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">How do most guests arrive?</p>
        <div className="inline-flex rounded-md border bg-background p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setRouteMode('transit')}
            className={cn(
              'rounded px-2.5 py-1 font-medium',
              routeMode === 'transit' ? 'bg-violet-700 text-white' : 'text-muted-foreground'
            )}
          >
            Public transit
          </button>
          <button
            type="button"
            onClick={() => setRouteMode('walk_only')}
            className={cn(
              'rounded px-2.5 py-1 font-medium',
              routeMode === 'walk_only' ? 'bg-violet-700 text-white' : 'text-muted-foreground'
            )}
          >
            Walk only
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,12rem)_1fr]">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Topics
          </p>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto md:max-h-none">
            {questions.map((question) => (
              <QuestionNavItem
                key={question.id}
                question={question}
                active={activeQuestionId === question.id}
                onSelect={() => selectQuestion(question)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Your notes (one place)</p>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={10}
            className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            placeholder="Cover the topics on the left — only facts you know. No invented line numbers, stops, or prices."
          />
          {!canProceed ? (
            <p className="text-[11px] text-amber-800">Add a bit more detail before copy or paste.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-dashed border-violet-300/80 bg-background/80 p-2.5">
        <p className="text-[11px] font-medium text-foreground">Paste AI JSON</p>
        <textarea
          value={pastedJson}
          onChange={(event) => setPastedJson(event.target.value)}
          rows={5}
          className="w-full rounded-md border bg-background px-2.5 py-2 font-mono text-[11px]"
          placeholder='{ "publicTitle": "...", "publicText": "...", ... }'
        />
      </div>

      {openFollowUpCount > 0 ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
          <p className="text-[11px] font-medium text-amber-950">
            Still unclear ({openFollowUpCount}) — add to notes and re-copy, or answer here for API
          </p>
          {visibleFollowUps.map((question: GuidedRouteOpenQuestion) => (
            <div key={question.id} className="space-y-1">
              <p className="text-xs text-amber-950">{question.question}</p>
              <div className="flex gap-2">
                <input
                  value={followUp[question.id] ?? ''}
                  onChange={(event) =>
                    setFollowUp((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  placeholder="Answer or skip"
                />
                <button
                  type="button"
                  onClick={() => setSkippedFollowUpIds((ids) => [...ids, question.id])}
                  className="shrink-0 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
          {llmConfigured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runGenerate('full')}
              className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              Update preview (API)
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canProceed}
          onClick={() => void copyExternalPrompt()}
          className={cn(
            'rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50'
          )}
        >
          Copy prompt for external AI
        </button>
        <button
          type="button"
          disabled={busy || !pastedJson.trim()}
          onClick={applyPastedJson}
          className="rounded-md border border-violet-400 bg-background px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        >
          Apply pasted JSON
        </button>
        {llmConfigured ? (
          <button
            type="button"
            disabled={busy || !canProceed}
            onClick={() => runGenerate('full')}
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Generate preview (API)'}
          </button>
        ) : null}
        {preview ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => applyPreview(false)}
              className="rounded-md border border-violet-300 bg-background px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
            >
              Apply to hub draft
            </button>
            {gateStatus && !gateStatus.ready ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => applyPreview(true)}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              >
                Apply anyway
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {copyHint ? <p className="text-[11px] text-violet-900">{copyHint}</p> : null}
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}

      {preview ? (
        <div className="space-y-2 border-t border-dashed pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Preview (EN)
          </p>
          {preview.routeMode ? (
            <p className="text-xs text-muted-foreground">Route mode: {preview.routeMode}</p>
          ) : null}
          {gateStatus && !gateStatus.ready ? (
            <p className="text-[11px] text-amber-800">
              Gate EN: {gateStatus.statusLabel}. Apply anyway only if you will fix in Manual.
            </p>
          ) : null}
          {copyFields.map((field) => (
            <PreviewField
              key={field}
              label={guidedRouteFillFieldLabel(field)}
              value={preview.copy[field as keyof typeof preview.copy]}
              busy={busy}
              showRegenerate={llmConfigured}
              onRegenerate={() => runGenerate('single_field', field)}
            />
          ))}
          <PreviewField
            label={guidedRouteFillFieldLabel('tips')}
            value={preview.tips?.join('\n')}
            busy={busy}
            showRegenerate={llmConfigured}
            onRegenerate={() => runGenerate('single_field', 'tips')}
          />
        </div>
      ) : null}
    </div>
  );
}
