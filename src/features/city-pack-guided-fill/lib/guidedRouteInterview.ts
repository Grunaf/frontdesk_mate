import type { RouteMode } from '@/entities/hostel';
import type { GuidedRouteFillFieldKey } from '../model/types';

export type GuidedInterviewQuestionId =
  | 'walk-to-stop'
  | 'board-and-ride'
  | 'get-off'
  | 'payment-tips'
  | 'taxi-backup'
  | 'extra-notes'
  | 'walk-path';

export type GuidedInterviewAnswerStatus = 'unanswered' | 'answered' | 'unknown';

export type GuidedInterviewQuestion = {
  id: GuidedInterviewQuestionId;
  field: GuidedRouteFillFieldKey | 'general';
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Must be answered or marked "Don't know" before Generate. */
  required: boolean;
};

export type GuidedInterviewAnswer = {
  status: GuidedInterviewAnswerStatus;
  value: string;
};

export type GuidedInterviewAnswerMap = Partial<
  Record<GuidedInterviewQuestionId, GuidedInterviewAnswer>
>;

export function getGuidedInterviewQuestions(
  routeMode: RouteMode,
  hubLabel: string
): GuidedInterviewQuestion[] {
  const hub = hubLabel.trim() || 'this hub';

  if (routeMode === 'walk_only') {
    return [
      {
        id: 'walk-path',
        field: 'publicText',
        required: true,
        multiline: true,
        label: `How do guests walk from ${hub} to the hostel area?`,
        hint: 'Streets, signs, approximate time — only what you know.',
      },
      {
        id: 'extra-notes',
        field: 'general',
        required: false,
        multiline: true,
        label: 'Anything else guests should know?',
        hint: 'Optional tips (steep hill, Sunday closures, etc.).',
      },
    ];
  }

  return [
    {
      id: 'walk-to-stop',
      field: 'publicPreview',
      required: true,
      multiline: true,
      label: `How do guests walk from ${hub} to the stop or platform?`,
    },
    {
      id: 'board-and-ride',
      field: 'publicText',
      required: true,
      multiline: true,
      label: 'What do they board (line number, train, direction)?',
      hint: 'Only include facts you are sure about.',
    },
    {
      id: 'get-off',
      field: 'publicGetOffAt',
      required: true,
      multiline: false,
      label: 'Where should they get off?',
      hint: 'Stop name, station, or landmark.',
    },
    {
      id: 'payment-tips',
      field: 'tips',
      required: false,
      multiline: true,
      label: 'Tickets or payment (optional)',
      hint: 'Kiosk vs driver, cash, apps — if relevant.',
    },
    {
      id: 'taxi-backup',
      field: 'tips',
      required: false,
      multiline: true,
      label: 'When is taxi a backup (optional)?',
      hint: 'Night, no service — not the main route in steps.',
    },
    {
      id: 'extra-notes',
      field: 'general',
      required: false,
      multiline: true,
      label: 'Any other «Good to know» tips?',
    },
  ];
}

export function isInterviewQuestionResolved(
  question: GuidedInterviewQuestion,
  answer: GuidedInterviewAnswer | undefined
): boolean {
  if (!question.required) {
    return true;
  }
  if (!answer) {
    return false;
  }
  if (answer.status === 'unknown') {
    return true;
  }
  if (answer.status === 'answered') {
    return answer.value.trim().length > 0;
  }
  return false;
}

export function getInterviewProgress(
  questions: GuidedInterviewQuestion[],
  answers: GuidedInterviewAnswerMap
): { resolvedRequired: number; requiredTotal: number; optionalAnswered: number; optionalTotal: number } {
  const required = questions.filter((q) => q.required);
  const optional = questions.filter((q) => !q.required);

  const resolvedRequired = required.filter((q) =>
    isInterviewQuestionResolved(q, answers[q.id])
  ).length;

  const optionalAnswered = optional.filter((q) => {
    const a = answers[q.id];
    return a?.status === 'answered' && a.value.trim().length > 0;
  }).length;

  return {
    resolvedRequired,
    requiredTotal: required.length,
    optionalAnswered,
    optionalTotal: optional.length,
  };
}

export function canGenerateFromInterview(
  questions: GuidedInterviewQuestion[],
  answers: GuidedInterviewAnswerMap
): boolean {
  return questions
    .filter((q) => q.required)
    .every((q) => isInterviewQuestionResolved(q, answers[q.id]));
}

const UNKNOWN_PHRASE = '(operator does not know — leave field empty)';

export function compileInterviewToSourceText(input: {
  hubLabel: string;
  routeMode: RouteMode;
  questions: GuidedInterviewQuestion[];
  answers: GuidedInterviewAnswerMap;
  extraNotes?: string;
}): string {
  const lines: string[] = [
    `Hub: ${input.hubLabel}`,
    `Primary path: ${input.routeMode === 'walk_only' ? 'Walk only' : 'Public transit'}`,
    '',
    'Structured operator answers (source of truth — do not invent beyond this):',
  ];

  for (const question of input.questions) {
    const answer = input.answers[question.id];
    if (!answer || answer.status === 'unanswered') {
      if (question.required) {
        lines.push(`- ${question.label}`, `  ${UNKNOWN_PHRASE}`);
      }
      continue;
    }

    if (answer.status === 'unknown') {
      lines.push(`- ${question.label}`, `  ${UNKNOWN_PHRASE}`);
      continue;
    }

    const value = answer.value.trim();
    if (!value) {
      continue;
    }
    lines.push(`- ${question.label}`, `  ${value}`);
  }

  const extra = input.extraNotes?.trim();
  if (extra) {
    lines.push('', 'Additional paste (same rules — no inventing):', extra);
  }

  return lines.join('\n');
}

export function interviewSourceMeetsMinimumLength(compiled: string): boolean {
  return compiled.trim().length >= 20;
}
