'use client';

import { useMemo, useState, useTransition } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';
import { useOwnerShell } from '@/features/owner-shell';

import {
  applyStaffKnowledgeArticleImportAction,
  applyStaffKnowledgeBootstrapAction,
  createStaffKnowledgeArticleAction,
  deleteStaffKnowledgeArticleAction,
  deleteStaffKnowledgeRoleAction,
  persistStaffKnowledgeQuestionnaireAction,
} from '../api/staffKnowledgeActions';
import {
  generateStaffKnowledgeArticleAction,
  generateStaffKnowledgeBootstrapAction,
  checkStaffKnowledgeBootstrapReadinessAction,
} from '../api/staffKnowledgeGenerateActions';
import { buildStaffKnowledgeArticlePrompt } from '../lib/buildArticlePrompt';
import {
  findMissingOtherNotes,
  isBootstrapCriticalPrefillEmpty,
} from '../lib/buildBootstrapQuestionnairePrefill';
import { buildStaffKnowledgeBootstrapPrompt } from '../lib/buildBootstrapPrompt';
import { parseStaffKnowledgeArticleJson } from '../lib/articleImportSchema';
import { parseStaffKnowledgeBootstrapJson } from '../lib/bootstrapImportSchema';
import type {
  BootstrapAuthoringMode,
  BootstrapClarificationTurn,
  BootstrapPrefillFlags,
  BootstrapQuestionnaire,
  BootstrapReadinessSession,
  StaffKnowledgeBootstrapContextDocument,
  StaffKnowledgeGenerateError,
  StaffKnowledgePanelData,
  StaffKnowledgePublicArticle,
  StaffKnowledgePublicRole,
} from '../model/types';
import { createEmptyReadinessSession } from '../model/types';
import {
  BootstrapQuestionnaireForm,
  type BootstrapQuestionnaireFormLabels,
} from './BootstrapQuestionnaireForm';
import { StaffKnowledgeVideoPlayer } from './StaffKnowledgeVideoPlayer';

export type StaffKnowledgePanelLabels = {
  title: string;
  subtitle: string;
  tabBootstrap: string;
  tabRoles: string;
  tabArticles: string;
  modeAuto: string;
  modeManual: string;
  modeAriaLabel: string;
  advancedPaste: string;
  checkReadiness: string;
  updateReadiness: string;
  checkingReadiness: string;
  readinessTitle: string;
  readinessStale: string;
  resetCycle: string;
  mustUse: string;
  missing: string;
  unclear: string;
  followUp: string;
  followUpAnswerPlaceholder: string;
  answeredClarifications: string;
  readyGreen: string;
  readyYellow: string;
  readyRed: string;
  generateYellowHint: string;
  otherNotesIncomplete: string;
  generateStructure: string;
  pipelineProgress: string;
  laborTypeLabel: string;
  copyPrompt: string;
  promptCopied: string;
  generateWithAi: string;
  generating: string;
  pasteReplyLabel: string;
  pasteReplyHint: string;
  preview: string;
  applyReplace: string;
  applyImport: string;
  applying: string;
  emptyRoles: string;
  emptyArticles: string;
  headcount: string;
  checklistTitle: string;
  deleteRole: string;
  deleteArticle: string;
  articleTitleLabel: string;
  articleBodyLabel: string;
  articleVideoUrlLabel: string;
  articleRoleLabel: string;
  articleRoleNone: string;
  addArticle: string;
  articleAiTopicLabel: string;
  saveManual: string;
  readOnly: string;
  errorUnauthorized: string;
  errorForbidden: string;
  errorInvalid: string;
  errorWrite: string;
  errorNotFound: string;
  errorNotConfigured: string;
  errorRateLimited: string;
  errorProvider: string;
  errorInvalidInput: string;
  errorNotReady: string;
  parseOkRoles: string;
  parseOkArticle: string;
  confirmReplace: string;
  questionnaire: BootstrapQuestionnaireFormLabels;
};

type StaffKnowledgePanelProps = {
  locale: string;
  hostelName: string;
  data: StaffKnowledgePanelData;
  labels: StaffKnowledgePanelLabels;
  aiConfigured: boolean;
  initialQuestionnaire: BootstrapQuestionnaire;
  initialPrefillFlags: BootstrapPrefillFlags;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(
  error: 'unauthorized' | 'forbidden' | 'invalid' | 'write_failed' | 'not_found',
  labels: StaffKnowledgePanelLabels
): string {
  if (error === 'unauthorized') return labels.errorUnauthorized;
  if (error === 'forbidden') return labels.errorForbidden;
  if (error === 'invalid') return labels.errorInvalid;
  if (error === 'not_found') return labels.errorNotFound;
  return labels.errorWrite;
}

function generateErrorMessage(
  error: StaffKnowledgeGenerateError,
  labels: StaffKnowledgePanelLabels,
  message?: string
): string {
  if (error === 'unauthorized') return labels.errorUnauthorized;
  if (error === 'forbidden') return labels.errorForbidden;
  if (error === 'not_configured') return labels.errorNotConfigured;
  if (error === 'rate_limited') return labels.errorRateLimited;
  if (error === 'provider_error') return labels.errorProvider;
  if (error === 'invalid_input') return labels.errorInvalidInput;
  if (error === 'not_ready') return message?.trim() || labels.errorNotReady;
  if (error === 'invalid') return message?.trim() || labels.errorInvalid;
  return labels.errorWrite;
}

const DEFAULT_PREFILL_FLAGS: BootstrapPrefillFlags = {
  checkInTime: false,
  checkOutTime: false,
  receptionOpen: false,
  receptionClose: false,
  receptionHint: false,
  roomMap: false,
  laundry: false,
  quietHours: false,
};

function readyLabel(
  ready: StaffKnowledgeBootstrapContextDocument['ready'],
  labels: StaffKnowledgePanelLabels
): string {
  if (ready === 'green') return labels.readyGreen;
  if (ready === 'yellow') return labels.readyYellow;
  return labels.readyRed;
}

function mergePendingIntoTranscript(
  session: BootstrapReadinessSession
): BootstrapClarificationTurn[] {
  const context = session.context;
  if (!context || context.followUpQuestions.length === 0) {
    return session.transcript;
  }

  const nextTurns: BootstrapClarificationTurn[] = [];
  for (const question of context.followUpQuestions) {
    const answer = session.pendingAnswers[question]?.trim() ?? '';
    if (!answer) continue;
    nextTurns.push({ question, answer });
  }

  if (nextTurns.length === 0) return session.transcript;

  const existingKeys = new Set(
    session.transcript.map((turn) => `${turn.question}::${turn.answer}`)
  );
  const appended = nextTurns.filter(
    (turn) => !existingKeys.has(`${turn.question}::${turn.answer}`)
  );
  return [...session.transcript, ...appended];
}

export function StaffKnowledgePanel({
  locale,
  hostelName,
  data,
  labels,
  aiConfigured,
  initialQuestionnaire,
  initialPrefillFlags = DEFAULT_PREFILL_FLAGS,
}: StaffKnowledgePanelProps) {
  const { canEditSettings } = useOwnerShell();
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [authoringMode, setAuthoringMode] = useState<BootstrapAuthoringMode>('auto');
  const [questionnaire, setQuestionnaire] =
    useState<BootstrapQuestionnaire>(initialQuestionnaire);
  const [prefillFlags] = useState<BootstrapPrefillFlags>(initialPrefillFlags);
  const [readiness, setReadiness] = useState<BootstrapReadinessSession>(
    createEmptyReadinessSession
  );
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [bootstrapPaste, setBootstrapPaste] = useState('');
  const [bootstrapPreview, setBootstrapPreview] = useState<ReturnType<
    typeof parseStaffKnowledgeBootstrapJson
  > | null>(null);
  const [showAdvancedPaste, setShowAdvancedPaste] = useState(false);

  const [articleTopic, setArticleTopic] = useState('');
  const [articlePaste, setArticlePaste] = useState('');
  const [articlePreview, setArticlePreview] = useState<ReturnType<
    typeof parseStaffKnowledgeArticleJson
  > | null>(null);

  const [manualTitle, setManualTitle] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [manualVideoUrl, setManualVideoUrl] = useState('');
  const [manualRoleId, setManualRoleId] = useState('');

  const roleNames = useMemo(() => data.roles.map((role) => role.name), [data.roles]);
  const criticalPrefillEmpty = isBootstrapCriticalPrefillEmpty(questionnaire);
  const bootstrapContext = readiness.context;
  const generateBlocked =
    !bootstrapContext || bootstrapContext.ready === 'red' || readiness.contextStale;
  const showYellowGenerateHint = bootstrapContext?.ready === 'yellow';

  const resetFeedback = () => {
    setStatus(null);
    setError(null);
  };

  const assertOtherNotesComplete = (): boolean => {
    if (findMissingOtherNotes(questionnaire).length === 0) return true;
    setError(labels.otherNotesIncomplete);
    return false;
  };

  const handleCopyBootstrapPrompt = async () => {
    resetFeedback();
    if (!assertOtherNotesComplete()) return;
    startTransition(async () => {
      await persistStaffKnowledgeQuestionnaireAction({
        locale,
        questionnaire,
      });
      const prompt = buildStaffKnowledgeBootstrapPrompt({
        hostelName,
        intake: questionnaire,
        clarifications: readiness.transcript,
      });
      const ok = await copyText(prompt);
      setStatus(ok ? labels.promptCopied : labels.errorWrite);
    });
  };

  const handleCheckReadiness = () => {
    if (!canEditSettings || !aiConfigured) return;
    resetFeedback();
    if (!assertOtherNotesComplete()) return;

    const transcript = mergePendingIntoTranscript(readiness);
    const nextIteration = readiness.iteration + 1;

    setGenerating(true);
    setPipelineStep('context');
    startTransition(async () => {
      try {
        const result = await checkStaffKnowledgeBootstrapReadinessAction({
          hostelName,
          intake: questionnaire,
          clarifications: transcript,
          iteration: nextIteration,
          locale,
        });
        if (!result.ok) {
          setError(generateErrorMessage(result.error, labels, result.message));
          return;
        }
        const pendingAnswers: Record<string, string> = {};
        for (const question of result.document.followUpQuestions) {
          pendingAnswers[question] = '';
        }
        setReadiness({
          context: result.document,
          contextStale: false,
          pendingAnswers,
          transcript,
          iteration: nextIteration,
        });
        setStatus(readyLabel(result.document.ready, labels));
      } finally {
        setGenerating(false);
        setPipelineStep(null);
      }
    });
  };

  const handleResetReadinessCycle = () => {
    setReadiness(createEmptyReadinessSession());
    resetFeedback();
  };

  const handleGenerateBootstrap = () => {
    if (!canEditSettings || !aiConfigured) return;
    if (bootstrapContext?.ready === 'red') {
      setError(labels.errorNotReady);
      return;
    }
    resetFeedback();
    if (!assertOtherNotesComplete()) return;

    const transcript = mergePendingIntoTranscript(readiness);

    setGenerating(true);
    setPipelineStep(bootstrapContext ? 'roles' : 'context');
    startTransition(async () => {
      try {
        setPipelineStep(bootstrapContext ? 'roles → duties' : 'context → roles → duties');
        const result = await generateStaffKnowledgeBootstrapAction({
          hostelName,
          intake: questionnaire,
          context: bootstrapContext ?? undefined,
          clarifications: transcript,
          iteration: readiness.iteration || 1,
          locale,
        });
        if (!result.ok) {
          setError(generateErrorMessage(result.error, labels, result.message));
          if (result.error === 'not_ready' && result.message) {
            setStatus(labels.errorNotReady);
          }
          return;
        }
        if (result.context) {
          setReadiness((prev) => ({
            ...prev,
            context: result.context ?? prev.context,
            contextStale: false,
            transcript,
          }));
        } else {
          setReadiness((prev) => ({ ...prev, transcript }));
        }
        setBootstrapPaste(result.rawText);
        setBootstrapPreview({ ok: true, document: result.document });
        setStatus(
          labels.parseOkRoles.replace('{count}', String(result.document.roles.length))
        );
      } finally {
        setGenerating(false);
        setPipelineStep(null);
      }
    });
  };

  const handlePreviewBootstrap = () => {
    resetFeedback();
    const parsed = parseStaffKnowledgeBootstrapJson(bootstrapPaste);
    setBootstrapPreview(parsed);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setStatus(
      labels.parseOkRoles.replace('{count}', String(parsed.document.roles.length))
    );
  };

  const handleApplyBootstrap = () => {
    if (!canEditSettings) return;
    if (!window.confirm(labels.confirmReplace)) return;
    resetFeedback();
    startTransition(async () => {
      const result = await applyStaffKnowledgeBootstrapAction({
        locale,
        pastedAiReply: bootstrapPaste,
        questionnaire,
      });
      if (!result.ok) {
        setError(errorMessage(result.error, labels));
        return;
      }
      setStatus(labels.applyReplace);
      setBootstrapPaste('');
      setBootstrapPreview(null);
      setReadiness(createEmptyReadinessSession());
    });
  };

  const handleCopyArticlePrompt = async () => {
    resetFeedback();
    const prompt = buildStaffKnowledgeArticlePrompt({
      hostelName,
      topicNotes: articleTopic,
      existingRoles: roleNames,
    });
    const ok = await copyText(prompt);
    setStatus(ok ? labels.promptCopied : labels.errorWrite);
  };

  const handleGenerateArticle = () => {
    if (!canEditSettings || !aiConfigured) return;
    resetFeedback();
    setGenerating(true);
    startTransition(async () => {
      try {
        const result = await generateStaffKnowledgeArticleAction({
          hostelName,
          topicNotes: articleTopic,
          existingRoles: roleNames,
        });
        if (!result.ok) {
          setError(generateErrorMessage(result.error, labels, result.message));
          return;
        }
        setArticlePaste(result.rawText);
        setArticlePreview({ ok: true, document: result.document });
        setStatus(labels.parseOkArticle);
      } finally {
        setGenerating(false);
      }
    });
  };

  const handlePreviewArticle = () => {
    resetFeedback();
    const parsed = parseStaffKnowledgeArticleJson(articlePaste);
    setArticlePreview(parsed);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setStatus(labels.parseOkArticle);
  };

  const handleApplyArticleImport = () => {
    if (!canEditSettings) return;
    resetFeedback();
    startTransition(async () => {
      const result = await applyStaffKnowledgeArticleImportAction({
        locale,
        pastedAiReply: articlePaste,
      });
      if (!result.ok) {
        setError(errorMessage(result.error, labels));
        return;
      }
      setStatus(labels.applyImport);
      setArticlePaste('');
      setArticlePreview(null);
      setArticleTopic('');
    });
  };

  const handleSaveManualArticle = () => {
    if (!canEditSettings) return;
    resetFeedback();
    startTransition(async () => {
      const result = await createStaffKnowledgeArticleAction({
        locale,
        title: manualTitle,
        body: manualBody,
        videoUrl: manualVideoUrl,
        roleId: manualRoleId || null,
      });
      if (!result.ok) {
        setError(errorMessage(result.error, labels));
        return;
      }
      setStatus(labels.saveManual);
      setManualTitle('');
      setManualBody('');
      setManualVideoUrl('');
      setManualRoleId('');
    });
  };

  const handleDeleteRole = (role: StaffKnowledgePublicRole) => {
    if (!canEditSettings) return;
    resetFeedback();
    startTransition(async () => {
      const result = await deleteStaffKnowledgeRoleAction({
        locale,
        roleId: role.id,
      });
      if (!result.ok) {
        setError(errorMessage(result.error, labels));
      }
    });
  };

  const handleDeleteArticle = (article: StaffKnowledgePublicArticle) => {
    if (!canEditSettings) return;
    resetFeedback();
    startTransition(async () => {
      const result = await deleteStaffKnowledgeArticleAction({
        locale,
        articleId: article.id,
      });
      if (!result.ok) {
        setError(errorMessage(result.error, labels));
      }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4">
      <div>
        <h1 className="text-lg font-semibold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      {!canEditSettings ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {labels.readOnly}
        </p>
      ) : null}

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="bootstrap">
        <TabsList>
          <TabsTrigger value="bootstrap">{labels.tabBootstrap}</TabsTrigger>
          <TabsTrigger value="roles">{labels.tabRoles}</TabsTrigger>
          <TabsTrigger value="articles">{labels.tabArticles}</TabsTrigger>
        </TabsList>

        <TabsContent value="bootstrap" className="space-y-4 pt-3">
          <div
            className="inline-flex rounded-md border p-0.5"
            role="tablist"
            aria-label={labels.modeAriaLabel}
          >
            <button
              type="button"
              role="tab"
              aria-selected={authoringMode === 'auto'}
              disabled={!canEditSettings || pending}
              onClick={() => {
                setAuthoringMode('auto');
              }}
              className={
                authoringMode === 'auto'
                  ? 'rounded-sm bg-foreground px-3 py-1.5 text-xs font-medium text-background'
                  : 'rounded-sm px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted'
              }
            >
              {labels.modeAuto}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authoringMode === 'manual'}
              disabled={!canEditSettings || pending}
              onClick={() => {
                setAuthoringMode('manual');
                setReadiness(createEmptyReadinessSession());
              }}
              className={
                authoringMode === 'manual'
                  ? 'rounded-sm bg-foreground px-3 py-1.5 text-xs font-medium text-background'
                  : 'rounded-sm px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted'
              }
            >
              {labels.modeManual}
            </button>
          </div>

          <BootstrapQuestionnaireForm
            value={questionnaire}
            fromSettings={prefillFlags}
            locale={locale}
            disabled={!canEditSettings || pending}
            showCriticalPrefillHint={criticalPrefillEmpty}
            labels={labels.questionnaire}
            onChange={(next) => {
              setQuestionnaire(next);
              setReadiness((prev) =>
                prev.context
                  ? { ...prev, contextStale: true }
                  : prev
              );
            }}
          />

          {authoringMode === 'auto' && aiConfigured ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{labels.readinessTitle}</p>
                  {bootstrapContext ? (
                    <p className="text-sm text-muted-foreground">
                      {readyLabel(bootstrapContext.ready, labels)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {labels.checkReadiness}
                    </p>
                  )}
                </div>
                {bootstrapContext || readiness.transcript.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!canEditSettings || pending}
                    onClick={handleResetReadinessCycle}
                  >
                    {labels.resetCycle}
                  </Button>
                ) : null}
              </div>

              {readiness.contextStale && bootstrapContext ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  {labels.readinessStale}
                </p>
              ) : null}

              {bootstrapContext?.mustUse.length ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.mustUse}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {bootstrapContext.mustUse.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {bootstrapContext?.missing.length ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.missing}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {bootstrapContext.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {bootstrapContext?.unclear.length ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.unclear}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {bootstrapContext.unclear.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {bootstrapContext && bootstrapContext.followUpQuestions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.followUp}
                  </p>
                  {bootstrapContext.followUpQuestions.map((question, index) => (
                    <div key={`${index}-${question}`} className="space-y-1">
                      <Label htmlFor={`sk-follow-up-${index}`}>{question}</Label>
                      <textarea
                        id={`sk-follow-up-${index}`}
                        className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={readiness.pendingAnswers[question] ?? ''}
                        placeholder={labels.followUpAnswerPlaceholder}
                        disabled={!canEditSettings || pending}
                        onChange={(event) => {
                          const answer = event.target.value;
                          setReadiness((prev) => ({
                            ...prev,
                            pendingAnswers: {
                              ...prev.pendingAnswers,
                              [question]: answer,
                            },
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {readiness.transcript.length > 0 ? (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.answeredClarifications}
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {readiness.transcript.map((turn, index) => (
                      <li key={`${index}-${turn.question}`}>
                        <span className="font-medium text-foreground">Q:</span>{' '}
                        {turn.question}
                        <br />
                        <span className="font-medium text-foreground">A:</span>{' '}
                        {turn.answer}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEditSettings || pending}
                  onClick={handleCheckReadiness}
                >
                  {pending && generating && pipelineStep === 'context'
                    ? labels.checkingReadiness
                    : bootstrapContext
                      ? labels.updateReadiness
                      : labels.checkReadiness}
                </Button>
                <Button
                  type="button"
                  disabled={!canEditSettings || pending || generateBlocked}
                  onClick={handleGenerateBootstrap}
                >
                  {pending && generating
                    ? labels.generating
                    : labels.generateStructure}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canEditSettings || pending}
                  onClick={() => void handleCopyBootstrapPrompt()}
                >
                  {labels.copyPrompt}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!canEditSettings || pending}
                  onClick={() => setShowAdvancedPaste((prev) => !prev)}
                >
                  {labels.advancedPaste}
                </Button>
              </div>

              {showYellowGenerateHint ? (
                <p className="text-xs text-muted-foreground">
                  {labels.generateYellowHint}
                </p>
              ) : null}

              {pipelineStep ? (
                <p className="text-xs text-muted-foreground">
                  {labels.pipelineProgress}: {pipelineStep}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!canEditSettings || pending}
                onClick={() => void handleCopyBootstrapPrompt()}
              >
                {labels.copyPrompt}
              </Button>
            </div>
          )}

          {authoringMode === 'manual' || showAdvancedPaste || !aiConfigured ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="sk-bootstrap-paste">{labels.pasteReplyLabel}</Label>
                <p className="text-xs text-muted-foreground">{labels.pasteReplyHint}</p>
                <textarea
                  id="sk-bootstrap-paste"
                  className="min-h-36 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  value={bootstrapPaste}
                  onChange={(event) => setBootstrapPaste(event.target.value)}
                  disabled={!canEditSettings || pending}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEditSettings || pending || !bootstrapPaste.trim()}
                  onClick={handlePreviewBootstrap}
                >
                  {labels.preview}
                </Button>
                <Button
                  type="button"
                  disabled={
                    !canEditSettings ||
                    pending ||
                    !bootstrapPreview ||
                    !bootstrapPreview.ok
                  }
                  onClick={handleApplyBootstrap}
                >
                  {pending && !generating ? labels.applying : labels.applyReplace}
                </Button>
              </div>
            </>
          ) : bootstrapPreview?.ok ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  !canEditSettings ||
                  pending ||
                  !bootstrapPreview ||
                  !bootstrapPreview.ok
                }
                onClick={handleApplyBootstrap}
              >
                {pending && !generating ? labels.applying : labels.applyReplace}
              </Button>
            </div>
          ) : null}

          {bootstrapPreview?.ok ? (
            <div className="space-y-3 rounded-lg border p-3">
              {bootstrapPreview.document.summary ? (
                <p className="text-sm text-muted-foreground">
                  {bootstrapPreview.document.summary}
                </p>
              ) : null}
              {bootstrapPreview.document.roles.map((role) => (
                <div key={role.name} className="space-y-1">
                  <p className="text-sm font-medium">
                    {role.name} · {labels.headcount}: {role.headcount}
                    {role.laborType
                      ? ` · ${labels.laborTypeLabel}: ${role.laborType}`
                      : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {role.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="roles" className="space-y-3 pt-3">
          {data.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.emptyRoles}</p>
          ) : (
            data.roles.map((role) => (
              <article key={role.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">{role.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {labels.headcount}: {role.headcount}
                      {role.laborType
                        ? ` · ${labels.laborTypeLabel}: ${role.laborType}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!canEditSettings || pending}
                    onClick={() => handleDeleteRole(role)}
                  >
                    {labels.deleteRole}
                  </Button>
                </div>
                {role.description ? (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                ) : null}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.checklistTitle}
                  </p>
                  {role.checklist.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {role.checklist.map((item) => (
                        <li key={item.id}>{item.body}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-6 pt-3">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-2">
              <Label htmlFor="sk-article-topic">{labels.articleAiTopicLabel}</Label>
              <textarea
                id="sk-article-topic"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={articleTopic}
                onChange={(event) => setArticleTopic(event.target.value)}
                disabled={!canEditSettings || pending}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {aiConfigured ? (
                <Button
                  type="button"
                  disabled={
                    !canEditSettings || pending || articleTopic.trim().length < 8
                  }
                  onClick={handleGenerateArticle}
                >
                  {pending && generating ? labels.generating : labels.generateWithAi}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={!canEditSettings || pending}
                onClick={() => void handleCopyArticlePrompt()}
              >
                {labels.copyPrompt}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-article-paste">{labels.pasteReplyLabel}</Label>
              <textarea
                id="sk-article-paste"
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                value={articlePaste}
                onChange={(event) => setArticlePaste(event.target.value)}
                disabled={!canEditSettings || pending}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canEditSettings || pending || !articlePaste.trim()}
                onClick={handlePreviewArticle}
              >
                {labels.preview}
              </Button>
              <Button
                type="button"
                disabled={
                  !canEditSettings || pending || !articlePreview || !articlePreview.ok
                }
                onClick={handleApplyArticleImport}
              >
                {pending && !generating ? labels.applying : labels.applyImport}
              </Button>
            </div>
            {articlePreview?.ok ? (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <p className="text-sm font-medium">{articlePreview.document.title}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {articlePreview.document.body}
                </p>
                {articlePreview.document.videoUrl ? (
                  <StaffKnowledgeVideoPlayer url={articlePreview.document.videoUrl} />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">{labels.addArticle}</p>
            <div className="space-y-2">
              <Label htmlFor="sk-manual-title">{labels.articleTitleLabel}</Label>
              <Input
                id="sk-manual-title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                disabled={!canEditSettings || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-manual-body">{labels.articleBodyLabel}</Label>
              <textarea
                id="sk-manual-body"
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={manualBody}
                onChange={(event) => setManualBody(event.target.value)}
                disabled={!canEditSettings || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-manual-video">{labels.articleVideoUrlLabel}</Label>
              <Input
                id="sk-manual-video"
                value={manualVideoUrl}
                onChange={(event) => setManualVideoUrl(event.target.value)}
                disabled={!canEditSettings || pending}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-manual-role">{labels.articleRoleLabel}</Label>
              <select
                id="sk-manual-role"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={manualRoleId}
                onChange={(event) => setManualRoleId(event.target.value)}
                disabled={!canEditSettings || pending}
              >
                <option value="">{labels.articleRoleNone}</option>
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={!canEditSettings || pending || !manualTitle.trim() || !manualBody.trim()}
              onClick={handleSaveManualArticle}
            >
              {pending ? labels.applying : labels.saveManual}
            </Button>
          </div>

          {data.articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.emptyArticles}</p>
          ) : (
            data.articles.map((article) => {
              const roleName =
                data.roles.find((role) => role.id === article.roleId)?.name ?? null;
              return (
                <article key={article.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">{article.title}</h2>
                      {roleName ? (
                        <p className="text-xs text-muted-foreground">{roleName}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!canEditSettings || pending}
                      onClick={() => handleDeleteArticle(article)}
                    >
                      {labels.deleteArticle}
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {article.body}
                  </p>
                  {article.videoUrl ? (
                    <StaffKnowledgeVideoPlayer url={article.videoUrl} title={article.title} />
                  ) : null}
                </article>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
