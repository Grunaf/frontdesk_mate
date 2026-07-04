'use client';

import { useMemo, useState } from 'react';
import type { RouteId } from '@/entities/hostel';
import { cn } from '@/shared/lib/utils';
import {
  canGenerateTenantLastMile,
  compileTenantLastMileSource,
  getTenantLastMileInterviewQuestions,
  getTenantLastMileProgress,
  isTenantLastMileQuestionResolved,
} from '../lib/guidedTenantLastMileInterview';
import type {
  TenantLastMileAnswerMap,
  TenantLastMileInterviewQuestion,
} from '../model/types';
import { guidedTenantLastMileFillAction } from '@/features/tenant-arrival-guided-fill';

const ERROR_LABEL: Record<string, string> = {
  unauthorized: 'Sign in to admin again.',
  not_configured: 'Set GEMINI_API_KEY to use Guided fill.',
  rate_limited: 'Too many requests — wait a few minutes.',
  invalid_input: 'Answer required questions or mark Don\'t know.',
  provider_error: 'AI request failed. Try again.',
};

function QuestionRow({
  question,
  answer,
  onChange,
  onDontKnow,
}: {
  question: TenantLastMileInterviewQuestion;
  answer: TenantLastMileAnswerMap[typeof question.id];
  onChange: (value: string) => void;
  onDontKnow: () => void;
}) {
  const isUnknown = answer?.status === 'unknown';
  const value = isUnknown ? '' : (answer?.value ?? '');

  return (
    <div
      className={cn(
        'space-y-1.5 rounded-md border px-2.5 py-2',
        question.required && !isTenantLastMileQuestionResolved(question, answer) && 'border-amber-200 bg-amber-50/40'
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
        <p className="text-[11px] text-muted-foreground">Marked unknown — walk text stays empty.</p>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={question.multiline ? 2 : 1}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder={question.required ? 'Type what you remember…' : 'Optional'}
        />
      )}
    </div>
  );
}

export function TenantRouteLastMileGuidedPanel({
  tenantSlug,
  routeId,
  hubLabel,
  cityContext,
  onApply,
}: {
  tenantSlug: string;
  routeId: RouteId;
  hubLabel: string;
  cityContext?: string;
  onApply: (payload: { walkEn: string; tipsEn?: string[] }) => void;
}) {
  const [answers, setAnswers] = useState<TenantLastMileAnswerMap>({});
  const [followUp, setFollowUp] = useState<Record<string, string>>({});
  const [skippedFollowUp, setSkippedFollowUp] = useState<string[]>([]);
  const [walkPreview, setWalkPreview] = useState<string | null>(null);
  const [previewTips, setPreviewTips] = useState<string[] | null>(null);
  const [openQuestions, setOpenQuestions] = useState<{ id: string; question: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(() => getTenantLastMileInterviewQuestions(hubLabel), [hubLabel]);
  const progress = useMemo(() => getTenantLastMileProgress(questions, answers), [questions, answers]);
  const canGenerate = canGenerateTenantLastMile(questions, answers);

  const compiled = useMemo(
    () =>
      compileTenantLastMileSource({
        hubLabel,
        cityContext,
        questions,
        answers,
      }),
    [hubLabel, cityContext, questions, answers]
  );

  const visibleFollowUps = openQuestions.filter((q) => !skippedFollowUp.includes(q.id));

  const patchAnswer = (id: TenantLastMileInterviewQuestion['id'], value: string) => {
    setAnswers((current: TenantLastMileAnswerMap) => ({
      ...current,
      [id]: { status: 'answered', value },
    }));
  };

  const markDontKnow = (id: TenantLastMileInterviewQuestion['id']) => {
    setAnswers((current: TenantLastMileAnswerMap) => ({
      ...current,
      [id]: { status: 'unknown', value: '' },
    }));
  };

  const runGenerate = async () => {
    if (!canGenerate) {
      setError(ERROR_LABEL.invalid_input);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await guidedTenantLastMileFillAction({
      tenantSlug,
      routeId,
      hubLabel,
      cityContext,
      rawInput: compiled,
      followUpAnswers: followUp,
      mode: 'full',
    });

    setBusy(false);

    if (!result.ok) {
      setError(ERROR_LABEL[result.error] ?? 'Something went wrong.');
      return;
    }

    setWalkPreview(result.preview.walkEn || null);
    setPreviewTips(result.preview.tipsEn ?? null);
    setOpenQuestions(result.preview.openQuestions);
  };

  const apply = () => {
    if (!walkPreview?.trim()) {
      return;
    }
    onApply({ walkEn: walkPreview.trim(), tipsEn: previewTips ?? undefined });
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-violet-200/70 bg-violet-50/20 p-2.5">
      <p className="text-[11px] text-muted-foreground">
        Guided last mile — only this hostel&apos;s walk. City pack transit copy is not changed.
      </p>
      <p className="text-[11px] text-muted-foreground">
        Required: {progress.resolvedRequired}/{progress.requiredTotal}
      </p>
      {questions.map((question) => (
        <QuestionRow
          key={question.id}
          question={question}
          answer={answers[question.id]}
          onChange={(value) => patchAnswer(question.id, value)}
          onDontKnow={() => markDontKnow(question.id)}
        />
      ))}
      {visibleFollowUps.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/50 p-2">
          {visibleFollowUps.map((q) => (
            <div key={q.id} className="flex gap-2">
              <input
                value={followUp[q.id] ?? ''}
                onChange={(event) => setFollowUp((c) => ({ ...c, [q.id]: event.target.value }))}
                placeholder={q.question}
                className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => setSkippedFollowUp((ids) => [...ids, q.id])}
                className="text-[10px] text-muted-foreground"
              >
                Skip
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canGenerate}
          onClick={runGenerate}
          className="rounded-md bg-violet-700 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Generate walk preview'}
        </button>
        {walkPreview ? (
          <button
            type="button"
            onClick={apply}
            className="rounded-md border px-2.5 py-1 text-[11px] font-medium text-violet-900"
          >
            Apply to this route
          </button>
        ) : null}
      </div>
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
      {walkPreview ? (
        <div className="space-y-1">
          <p className="whitespace-pre-wrap rounded-md border bg-background p-2 text-sm">{walkPreview}</p>
          {previewTips?.length ? (
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {previewTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
