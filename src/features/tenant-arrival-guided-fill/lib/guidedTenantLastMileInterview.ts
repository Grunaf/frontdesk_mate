import type { LastMileCityBoundary } from '@/entities/city-pack';
import type {
  TenantLastMileAnswerMap,
  TenantLastMileInterviewAnswer,
  TenantLastMileInterviewQuestion,
} from '../model/types';

export function getTenantLastMileInterviewQuestions(
  hubLabel: string,
  boundary?: LastMileCityBoundary
): TenantLastMileInterviewQuestion[] {
  const hub = hubLabel.trim() || 'the drop-off point';
  const questions: TenantLastMileInterviewQuestion[] = [];

  if (!boundary?.hasAnchoredStart) {
    questions.push({
      id: 'start-point',
      required: true,
      multiline: true,
      label: `Where does the last walk begin for guests coming from ${hub}?`,
      hint: 'City pack get-off is empty — set it in the city pack or describe the start here.',
    });
  }

  const anchorHint = boundary?.hasAnchoredStart
    ? `Last mile starts at: "${boundary.anchorLabelEn}". Write only new turns to the door.`
    : 'Include {address} where the street address should appear.';

  questions.push({
    id: 'walk-directions',
    required: true,
    multiline: true,
    label: boundary?.hasAnchoredStart
      ? `From the get-off / route end point, how do guests walk to your door?`
      : 'How do they walk from the start point to your hostel door?',
    hint: anchorHint,
  });

  questions.push({
    id: 'building-notes',
    required: false,
    multiline: true,
    label: 'Building-only notes (optional, max 2 short tips)',
    hint:
      boundary?.cityTipsEn.length
        ? 'City pack already has route tips — only side door, stairs, reception entrance. No tickets or transit.'
        : 'Side entrance, stairs, luggage — not door codes (use Arrival access).',
  });

  return questions;
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
  cityBoundaryBlock?: string;
  questions: TenantLastMileInterviewQuestion[];
  answers: TenantLastMileAnswerMap;
}): string {
  const lines: string[] = [
    `Arrival hub: ${input.hubLabel}`,
    'Task: one short paragraph — hostel door only. No transit, tickets, or taxi.',
  ];

  if (input.cityBoundaryBlock?.trim()) {
    lines.push('', input.cityBoundaryBlock.trim());
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
