import { z } from 'zod';
import type { TenantLastMileFillPreview, TenantLastMileOpenQuestion } from '../model/types';

export const tenantLastMileModelSchema = z.object({
  walkEn: z.string().optional(),
  tipsEn: z.array(z.string()).max(2).optional(),
  openQuestions: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().min(1),
      })
    )
    .optional(),
});

export type TenantLastMileModelOutput = z.infer<typeof tenantLastMileModelSchema>;

export function modelOutputToTenantLastMilePreview(
  output: TenantLastMileModelOutput
): TenantLastMileFillPreview {
  const tips = output.tipsEn?.map((tip) => tip.trim()).filter(Boolean).slice(0, 2);
  return {
    walkEn: output.walkEn?.trim() ?? '',
    tipsEn: tips?.length ? tips : undefined,
    openQuestions: (output.openQuestions ?? []) as TenantLastMileOpenQuestion[],
  };
}
