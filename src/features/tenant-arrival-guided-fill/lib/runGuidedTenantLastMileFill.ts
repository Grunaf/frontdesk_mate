import 'server-only';

import { generateObject } from 'ai';
import {
  createGuidedFillLanguageModel,
  isGuidedFillLlmConfigured,
} from '@/features/city-pack-guided-fill/lib/createGuidedFillLanguageModel';
import {
  logGuidedFillProviderError,
  resolveGuidedFillProviderError,
} from '@/features/city-pack-guided-fill/lib/resolveGuidedFillProviderError';
import {
  buildTenantLastMileUserPrompt,
  tenantLastMileSystemPrompt,
} from './buildTenantLastMilePrompt';
import {
  modelOutputToTenantLastMilePreview,
  tenantLastMileModelSchema,
} from './guidedTenantLastMileSchema';
import { tenantLastMileSourceMeetsMinimum } from './guidedTenantLastMileInterview';
import type { TenantLastMileFillRequest, TenantLastMileFillResult } from '../model/types';

export async function runGuidedTenantLastMileFill(
  input: TenantLastMileFillRequest
): Promise<TenantLastMileFillResult> {
  const rawInput = input.rawInput.trim();
  if (!tenantLastMileSourceMeetsMinimum(rawInput)) {
    return { ok: false, error: 'invalid_input' };
  }

  if (!isGuidedFillLlmConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const model = createGuidedFillLanguageModel();
  if (!model) {
    return { ok: false, error: 'not_configured' };
  }

  try {
    const { object } = await generateObject({
      model,
      schema: tenantLastMileModelSchema,
      system: tenantLastMileSystemPrompt(),
      prompt: buildTenantLastMileUserPrompt(input),
      temperature: 0.2,
      maxRetries: 1,
    });

    const preview = modelOutputToTenantLastMilePreview(object);
    return { ok: true, preview: normalizeOpenQuestions(preview) };
  } catch (error) {
    logGuidedFillProviderError('runGuidedTenantLastMileFill', error);
    return { ok: false, error: resolveGuidedFillProviderError(error) };
  }
}

function normalizeOpenQuestions(
  preview: ReturnType<typeof modelOutputToTenantLastMilePreview>
): ReturnType<typeof modelOutputToTenantLastMilePreview> {
  const seen = new Set<string>();
  return {
    ...preview,
    openQuestions: preview.openQuestions.filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return Boolean(entry.question.trim());
    }),
  };
}
