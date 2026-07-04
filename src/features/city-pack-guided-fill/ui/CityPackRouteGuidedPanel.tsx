'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RouteId, RouteMode } from '@/entities/hostel';
import type { CityPackRouteContent } from '@/entities/city-pack/model/types';
import { cn } from '@/shared/lib/utils';
import {
  canGenerateFromInterview,
  compileInterviewToSourceText,
  getGuidedInterviewQuestions,
  getInterviewProgress,
  guidedRouteFillAction,
  guidedRouteFillFieldLabel,
  isGuidedPreviewGateReady,
  isInterviewQuestionResolved,
  resolveRouteAfterGuidedPreview,
  type GuidedInterviewAnswerMap,
  type GuidedInterviewQuestion,
  type GuidedRouteFillFieldKey,
  type GuidedRouteFillPreview,
  type GuidedRouteOpenQuestion,
} from '@/features/city-pack-guided-fill';

const ERROR_LABEL: Record<string, string> = {
  unauthorized: 'Sign in to admin again.',
  not_configured: 'Set GEMINI_API_KEY or AI_GATEWAY_API_KEY + AI_GATEWAY_BASE_URL.',
  rate_limited: 'Too many requests — wait a few minutes.',
  invalid_input: 'Answer required questions or mark Don\'t know, then try again.',
  provider_error: 'AI request failed. Try again.',
};

function PreviewField({
  label,
  value,
  onRegenerate,
  busy,
}: {
  label: string;
  value?: string;
  onRegenerate: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          disabled={busy}
          onClick={onRegenerate}
          className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value?.trim() || '—'}</p>
    </div>
  );
}

function InterviewQuestionRow({
  question,
  answer,
  onChange,
  onDontKnow,
}: {
  question: GuidedInterviewQuestion;
  answer: GuidedInterviewAnswerMap[typeof question.id];
  onChange: (value: string) => void;
  onDontKnow: () => void;
}) {
  const isUnknown = answer?.status === 'unknown';
  const value = isUnknown ? '' : (answer?.value ?? '');

  return (
    <div
      className={cn(
        'space-y-1.5 rounded-md border px-2.5 py-2',
        question.required && !isInterviewQuestionResolved(question, answer) && 'border-amber-200 bg-amber-50/40',
        isUnknown && 'border-dashed bg-muted/20'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-foreground">
            {question.label}
            {question.required ? (
              <span className="ml-1 text-[10px] font-normal text-amber-800">Required</span>
            ) : null}
          </p>
          {question.hint ? (
            <p className="text-[11px] text-muted-foreground">{question.hint}</p>
          ) : null}
        </div>
        {question.required ? (
          <button
            type="button"
            onClick={onDontKnow}
            className={cn(
              'shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium',
              isUnknown
                ? 'border-amber-400 bg-amber-100 text-amber-950'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            Don&apos;t know
          </button>
        ) : null}
      </div>
      {isUnknown ? (
        <p className="text-[11px] text-muted-foreground">
          Marked unknown — field stays empty until you know.
        </p>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={question.multiline ? 3 : 1}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder={question.required ? 'Type what you remember…' : 'Optional'}
        />
      )}
    </div>
  );
}

export function CityPackRouteGuidedPanel({
  packId,
  routeId,
  hubLabel,
  route,
  onApply,
}: {
  packId: string;
  routeId: RouteId;
  hubLabel: string;
  route: CityPackRouteContent;
  onApply: (next: CityPackRouteContent) => void;
}) {
  const [routeMode, setRouteMode] = useState<RouteMode>(route.routeMode ?? 'transit');
  const [answers, setAnswers] = useState<GuidedInterviewAnswerMap>({});
  const [extraPaste, setExtraPaste] = useState('');
  const [showExtraPaste, setShowExtraPaste] = useState(false);
  const [followUp, setFollowUp] = useState<Record<string, string>>({});
  const [skippedFollowUpIds, setSkippedFollowUpIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<GuidedRouteFillPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(
    () => getGuidedInterviewQuestions(routeMode, hubLabel),
    [routeMode, hubLabel]
  );

  useEffect(() => {
    setAnswers({});
    setPreview(null);
    setFollowUp({});
    setSkippedFollowUpIds([]);
  }, [routeMode, routeId]);

  const progress = useMemo(() => getInterviewProgress(questions, answers), [questions, answers]);
  const canGenerate = canGenerateFromInterview(questions, answers);

  const compiledSource = useMemo(
    () =>
      compileInterviewToSourceText({
        hubLabel,
        routeMode,
        questions,
        answers,
        extraNotes: extraPaste,
      }),
    [hubLabel, routeMode, questions, answers, extraPaste]
  );

  const visibleFollowUps = useMemo(() => {
    const list = preview?.openQuestions ?? [];
    return list.filter((q) => !skippedFollowUpIds.includes(q.id));
  }, [preview, skippedFollowUpIds]);

  const patchAnswer = (id: GuidedInterviewQuestion['id'], value: string) => {
    setAnswers((current) => ({
      ...current,
      [id]: {
        status: 'answered',
        value,
      },
    }));
  };

  const markDontKnow = (id: GuidedInterviewQuestion['id']) => {
    setAnswers((current) => ({
      ...current,
      [id]: { status: 'unknown', value: '' },
    }));
  };

  const runGenerate = async (mode: 'full' | 'single_field', field?: GuidedRouteFillFieldKey) => {
    if (mode === 'full' && !canGenerate) {
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
    });

    setBusy(false);

    if (!result.ok) {
      setError(ERROR_LABEL[result.error] ?? 'Something went wrong.');
      return;
    }

    setPreview(result.preview);
  };

  const gateStatus = preview
    ? isGuidedPreviewGateReady(packId, routeId, route, preview)
    : null;

  const applyPreview = (force = false) => {
    if (!preview) {
      return;
    }
    const status = isGuidedPreviewGateReady(packId, routeId, route, preview);
    if (!status.ready && !force) {
      setError(`Publish gate not ready: ${status.statusLabel}. Use Apply anyway or fix in Manual.`);
      return;
    }
    setError(null);
    onApply(resolveRouteAfterGuidedPreview(packId, routeId, route, preview));
  };

  const copyFields: GuidedRouteFillFieldKey[] = [
    'publicTitle',
    'publicSummary',
    'publicText',
    'publicGetOffAt',
    'publicPreview',
    'publicWalkToHostel',
  ];

  const openFollowUpCount = visibleFollowUps.length;

  return (
    <div className="space-y-3 rounded-md border border-violet-200/80 bg-violet-50/20 p-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">Guided fill</p>
        <p className="text-[11px] text-muted-foreground">
          Answer from memory — we format guest copy. We won&apos;t invent lines, stops, or prices.
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Required: {progress.resolvedRequired}/{progress.requiredTotal} answered
        </span>
        {progress.optionalTotal > 0 ? (
          <span>
            Optional tips: {progress.optionalAnswered}/{progress.optionalTotal}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {questions.map((question) => (
          <InterviewQuestionRow
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onChange={(value) => patchAnswer(question.id, value)}
            onDontKnow={() => markDontKnow(question.id)}
          />
        ))}
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setShowExtraPaste((open) => !open)}
          className="text-[11px] font-medium text-violet-900 underline-offset-2 hover:underline"
        >
          {showExtraPaste ? 'Hide' : 'Add'} extra notes (optional paste)
        </button>
        {showExtraPaste ? (
          <textarea
            value={extraPaste}
            onChange={(event) => setExtraPaste(event.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            placeholder="Only if something did not fit above — same no-invent rules."
          />
        ) : null}
      </div>

      {openFollowUpCount > 0 ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
          <p className="text-[11px] font-medium text-amber-950">
            Still unclear ({openFollowUpCount}) — answer if you can
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
                  placeholder="Answer or Don't know"
                />
                <button
                  type="button"
                  onClick={() => setSkippedFollowUpIds((ids) => [...ids, question.id])}
                  className="shrink-0 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => runGenerate('full')}
            className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            Update preview
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canGenerate}
          onClick={() => runGenerate('full')}
          className={cn(
            'rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50'
          )}
        >
          {busy ? 'Working…' : 'Generate preview'}
        </button>
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

      {!canGenerate ? (
        <p className="text-[11px] text-amber-800">
          Fill each required question or use Don&apos;t know — then Generate preview.
        </p>
      ) : null}

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
              onRegenerate={() => runGenerate('single_field', field)}
            />
          ))}
          <PreviewField
            label={guidedRouteFillFieldLabel('tips')}
            value={preview.tips?.join('\n')}
            busy={busy}
            onRegenerate={() => runGenerate('single_field', 'tips')}
          />
        </div>
      ) : null}
    </div>
  );
}
