import type {
  TenantLastMileAnswerMap,
  TenantLastMileInterviewAnswer,
  TenantLastMileInterviewQuestion,
} from '../model/types';

export function getTenantLastMileInterviewQuestions(hubLabel: string): TenantLastMileInterviewQuestion[] {
  const hub = hubLabel.trim() || 'the drop-off point';

  return [
    {
      id: 'start-point',
      required: true,
      multiline: true,
      label: `Where does the last walk begin for guests coming from ${hub}?`,
      hint: 'Use the city pack get-off / arrival point if you are not sure.',
    },
    {
      id: 'walk-directions',
      required: true,
      multiline: true,
      label: 'How do they walk from there to your hostel door?',
      hint: 'Include {address} where the street address should appear.',
    },
    {
      id: 'building-notes',
      required: false,
      multiline: true,
      label: 'Building-specific notes (optional)',
      hint: 'Side entrance, stairs, luggage — not door codes (use Arrival access).',
    },
  ];
}

export function isTenantLastMileQuestionResolved(
  question: TenantLastMileInterviewQuestion,
  answer: TenantLastMileInterviewAnswer | undefined
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
  return answer.status === 'answered' && answer.value.trim().length > 0;
}

export function canGenerateTenantLastMile(
  questions: TenantLastMileInterviewQuestion[],
  answers: TenantLastMileAnswerMap
): boolean {
  return questions
    .filter((q) => q.required)
    .every((q) => isTenantLastMileQuestionResolved(q, answers[q.id]));
}

export function getTenantLastMileProgress(
  questions: TenantLastMileInterviewQuestion[],
  answers: TenantLastMileAnswerMap
): { resolvedRequired: number; requiredTotal: number } {
  const required = questions.filter((q) => q.required);
  return {
    resolvedRequired: required.filter((q) => isTenantLastMileQuestionResolved(q, answers[q.id]))
      .length,
    requiredTotal: required.length,
  };
}

const UNKNOWN = '(hostel operator does not know — leave empty)';

export function compileTenantLastMileSource(input: {
  hubLabel: string;
  cityContext?: string;
  questions: TenantLastMileInterviewQuestion[];
  answers: TenantLastMileAnswerMap;
}): string {
  const lines: string[] = [
    `Arrival hub: ${input.hubLabel}`,
    'Task: hostel-specific last-mile walk only (not transit steps).',
  ];

  if (input.cityContext?.trim()) {
    lines.push('', 'City pack context (do not rewrite transit):', input.cityContext.trim());
  }

  lines.push('', 'Hostel operator answers:');

  for (const question of input.questions) {
    const answer = input.answers[question.id];
    if (!answer || answer.status === 'unanswered') {
      if (question.required) {
        lines.push(`- ${question.label}`, `  ${UNKNOWN}`);
      }
      continue;
    }
    if (answer.status === 'unknown') {
      lines.push(`- ${question.label}`, `  ${UNKNOWN}`);
      continue;
    }
    const value = answer.value.trim();
    if (value) {
      lines.push(`- ${question.label}`, `  ${value}`);
    }
  }

  return lines.join('\n');
}

export function tenantLastMileSourceMeetsMinimum(compiled: string): boolean {
  return compiled.trim().length >= 20;
}
