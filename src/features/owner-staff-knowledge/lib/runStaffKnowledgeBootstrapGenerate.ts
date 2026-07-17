import 'server-only';

import { generateText } from 'ai';
import type { LanguageModel } from 'ai';

import {
  parseStaffKnowledgeBootstrapContextJson,
  parseStaffKnowledgeBootstrapJson,
  parseStaffKnowledgeBootstrapRolesJson,
} from './bootstrapImportSchema';
import {
  buildStaffKnowledgeBootstrapChecklistsPrompt,
  buildStaffKnowledgeBootstrapContextPrompt,
  buildStaffKnowledgeBootstrapRolesPrompt,
} from './buildBootstrapPrompt';
import {
  createStaffKnowledgeLanguageModel,
  isStaffKnowledgeLlmConfigured,
} from './createStaffKnowledgeLanguageModel';
import {
  logStaffKnowledgeProviderError,
  resolveStaffKnowledgeProviderError,
} from './resolveStaffKnowledgeProviderError';
import type {
  BootstrapClarificationTurn,
  StaffKnowledgeBootstrapContextDocument,
  StaffKnowledgeBootstrapContextGenerateResult,
  StaffKnowledgeBootstrapGenerateResult,
  StaffKnowledgeBootstrapIntake,
  StaffKnowledgeBootstrapRoleDraft,
} from '../model/types';

function isValidLaborModel(
  value: StaffKnowledgeBootstrapIntake['laborModel']
): boolean {
  return value === 'paid' || value === 'volunteers' || value === 'mix';
}

async function resolveModel(): Promise<
  | { ok: true; model: LanguageModel }
  | { ok: false; error: 'not_configured' }
> {
  if (!(await isStaffKnowledgeLlmConfigured())) {
    return { ok: false, error: 'not_configured' };
  }
  const model = await createStaffKnowledgeLanguageModel();
  if (!model) {
    return { ok: false, error: 'not_configured' };
  }
  return { ok: true, model };
}

export async function runStaffKnowledgeBootstrapContextGenerate(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  clarifications?: BootstrapClarificationTurn[];
  iteration?: number;
}): Promise<StaffKnowledgeBootstrapContextGenerateResult> {
  if (!isValidLaborModel(input.intake.laborModel)) {
    return { ok: false, error: 'invalid_input' };
  }

  const modelResult = await resolveModel();
  if (!modelResult.ok) return modelResult;

  const prompt = buildStaffKnowledgeBootstrapContextPrompt({
    hostelName: input.hostelName,
    intake: input.intake,
    clarifications: input.clarifications,
    iteration: input.iteration,
  });

  try {
    const { text } = await generateText({
      model: modelResult.model,
      prompt,
      temperature: 0.2,
      maxRetries: 1,
    });

    const parsed = parseStaffKnowledgeBootstrapContextJson(text);
    if (!parsed.ok) {
      return { ok: false, error: 'invalid', message: parsed.message };
    }

    return { ok: true, rawText: text, document: parsed.document };
  } catch (error) {
    logStaffKnowledgeProviderError('runStaffKnowledgeBootstrapContextGenerate', error);
    return { ok: false, error: resolveStaffKnowledgeProviderError(error) };
  }
}

export async function runStaffKnowledgeBootstrapPipeline(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  /** If provided from a prior Check readiness, skip step A. */
  context?: StaffKnowledgeBootstrapContextDocument;
  clarifications?: BootstrapClarificationTurn[];
  iteration?: number;
}): Promise<StaffKnowledgeBootstrapGenerateResult> {
  if (!isValidLaborModel(input.intake.laborModel)) {
    return { ok: false, error: 'invalid_input' };
  }

  const modelResult = await resolveModel();
  if (!modelResult.ok) return modelResult;

  let context = input.context;
  const clarifications = input.clarifications ?? [];

  try {
    if (!context) {
      const contextPrompt = buildStaffKnowledgeBootstrapContextPrompt({
        hostelName: input.hostelName,
        intake: input.intake,
        clarifications,
        iteration: input.iteration,
      });
      const contextText = await generateText({
        model: modelResult.model,
        prompt: contextPrompt,
        temperature: 0.2,
        maxRetries: 1,
      });
      const parsedContext = parseStaffKnowledgeBootstrapContextJson(contextText.text);
      if (!parsedContext.ok) {
        return { ok: false, error: 'invalid', message: parsedContext.message };
      }
      context = parsedContext.document;
    }

    if (context.ready === 'red') {
      return {
        ok: false,
        error: 'not_ready',
        message: context.followUpQuestions[0] || context.missing[0] || 'Not enough information yet.',
      };
    }

    const rolesPrompt = buildStaffKnowledgeBootstrapRolesPrompt({
      hostelName: input.hostelName,
      intake: input.intake,
      context,
      clarifications,
    });
    const rolesText = await generateText({
      model: modelResult.model,
      prompt: rolesPrompt,
      temperature: 0.2,
      maxRetries: 1,
    });
    const parsedRoles = parseStaffKnowledgeBootstrapRolesJson(rolesText.text);
    if (!parsedRoles.ok) {
      return { ok: false, error: 'invalid', message: parsedRoles.message };
    }

    const rolesDocument: {
      summary?: string;
      roles: StaffKnowledgeBootstrapRoleDraft[];
    } = parsedRoles.document;

    const checklistsPrompt = buildStaffKnowledgeBootstrapChecklistsPrompt({
      hostelName: input.hostelName,
      intake: input.intake,
      context,
      rolesDocument,
    });
    const checklistsText = await generateText({
      model: modelResult.model,
      prompt: checklistsPrompt,
      temperature: 0.2,
      maxRetries: 1,
    });
    const parsedFinal = parseStaffKnowledgeBootstrapJson(checklistsText.text);
    if (!parsedFinal.ok) {
      return { ok: false, error: 'invalid', message: parsedFinal.message };
    }

    return {
      ok: true,
      rawText: checklistsText.text,
      document: parsedFinal.document,
      context,
      step: 'checklists',
    };
  } catch (error) {
    logStaffKnowledgeProviderError('runStaffKnowledgeBootstrapPipeline', error);
    return { ok: false, error: resolveStaffKnowledgeProviderError(error) };
  }
}

/** @deprecated Prefer runStaffKnowledgeBootstrapPipeline — kept for single-shot paste flows. */
export async function runStaffKnowledgeBootstrapGenerate(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  hostelNotes?: string;
}): Promise<StaffKnowledgeBootstrapGenerateResult> {
  return runStaffKnowledgeBootstrapPipeline({
    hostelName: input.hostelName,
    intake: input.intake,
  });
}
