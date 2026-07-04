import { z } from 'zod';
import type { GuidedRouteFillPreview, GuidedRouteOpenQuestion } from '../model/types';

const openQuestionSchema = z.object({
  id: z.string().min(1),
  field: z.enum([
    'publicTitle',
    'publicSummary',
    'publicText',
    'publicGetOffAt',
    'publicPreview',
    'publicWalkToHostel',
    'tips',
    'routeMode',
  ]),
  question: z.string().min(1),
});

export const guidedRouteFillModelSchema = z.object({
  routeMode: z.enum(['transit', 'walk_only']).optional(),
  locationLabelEn: z.string().optional(),
  publicTitle: z.string().optional(),
  publicSummary: z.string().optional(),
  publicText: z.string().optional(),
  publicGetOffAt: z.string().optional(),
  publicPreview: z.string().optional(),
  publicWalkToHostel: z.string().optional(),
  tips: z.array(z.string()).max(5).optional(),
  openQuestions: z.array(openQuestionSchema).optional(),
});

export type GuidedRouteFillModelOutput = z.infer<typeof guidedRouteFillModelSchema>;

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function modelOutputToPreview(output: GuidedRouteFillModelOutput): GuidedRouteFillPreview {
  const copy: GuidedRouteFillPreview['copy'] = {};
  const fields = [
    'publicTitle',
    'publicSummary',
    'publicText',
    'publicGetOffAt',
    'publicPreview',
    'publicWalkToHostel',
  ] as const;

  for (const key of fields) {
    const value = trimOrUndefined(output[key]);
    if (value) {
      copy[key] = value;
    }
  }

  const tips = output.tips?.map((tip) => tip.trim()).filter(Boolean).slice(0, 5);

  return {
    routeMode: output.routeMode,
    locationLabelEn: trimOrUndefined(output.locationLabelEn),
    copy,
    tips: tips?.length ? tips : undefined,
    openQuestions: (output.openQuestions ?? []) as GuidedRouteOpenQuestion[],
  };
}

export function parseGuidedRouteFillModelJson(raw: string): GuidedRouteFillModelOutput | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = guidedRouteFillModelSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
