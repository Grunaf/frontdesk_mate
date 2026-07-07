import 'server-only';

import { generateObject } from 'ai';
import {
  enforceGuidedSingleScenario,
  mergeGuidedFieldPreview,
} from './enforceGuidedSingleScenario';
import {
  buildGuidedRouteFillUserPrompt,
  guidedRouteFillSystemPrompt,
} from './buildGuidedRouteFillPrompt';
import { guidedRouteFillModelSchema, modelOutputToPreview } from './guidedRouteFillSchema';
import { interviewSourceMeetsMinimumLength } from './guidedRouteInterview';
import type {
  GuidedRouteFillPreview,
  GuidedRouteFillRequest,
  GuidedRouteFillResult,
} from '../model/types';

import { createGuidedFillLanguageModel, isGuidedFillLlmConfigured } from './createGuidedFillLanguageModel';
import {
  logGuidedFillProviderError,
  resolveGuidedFillProviderError,
} from './resolveGuidedFillProviderError';

export async function runGuidedRouteFill(
  input: GuidedRouteFillRequest
): Promise<GuidedRouteFillResult> {
  const rawInput = input.rawInput.trim();
  if (!interviewSourceMeetsMinimumLength(rawInput)) {
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
      schema: guidedRouteFillModelSchema,
      system: guidedRouteFillSystemPrompt(),
      prompt: buildGuidedRouteFillUserPrompt(input),
      temperature: 0.2,
      maxRetries: 1,
    });

    let preview = enforceGuidedSingleScenario(modelOutputToPreview(object), rawInput);

    if (input.mode === 'single_field' && input.field && input.existingPreview) {
      preview = mergeGuidedFieldPreview(input.existingPreview, preview, input.field);
      preview = enforceGuidedSingleScenario(preview, rawInput);
    }

    return { ok: true, preview: normalizeOpenQuestions(preview) };
  } catch (error) {
    logGuidedFillProviderError('runGuidedRouteFill', error);
    return { ok: false, error: resolveGuidedFillProviderError(error) };
  }
}

function normalizeOpenQuestions(preview: GuidedRouteFillPreview): GuidedRouteFillPreview {
  const seen = new Set<string>();
  const openQuestions = preview.openQuestions.filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return Boolean(entry.question.trim());
  });
  return { ...preview, openQuestions };
}
