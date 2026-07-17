import 'server-only';

import { generateText } from 'ai';

import { parseStaffKnowledgeArticleJson } from './articleImportSchema';
import { buildStaffKnowledgeArticlePrompt } from './buildArticlePrompt';
import {
  createStaffKnowledgeLanguageModel,
  isStaffKnowledgeLlmConfigured,
} from './createStaffKnowledgeLanguageModel';
import {
  logStaffKnowledgeProviderError,
  resolveStaffKnowledgeProviderError,
} from './resolveStaffKnowledgeProviderError';
import type { StaffKnowledgeArticleGenerateResult } from '../model/types';

const MIN_TOPIC_LENGTH = 8;

export async function runStaffKnowledgeArticleGenerate(input: {
  hostelName: string;
  topicNotes: string;
  existingRoles: string[];
  roleName?: string;
}): Promise<StaffKnowledgeArticleGenerateResult> {
  const topicNotes = input.topicNotes.trim();
  if (topicNotes.length < MIN_TOPIC_LENGTH) {
    return { ok: false, error: 'invalid_input' };
  }

  if (!(await isStaffKnowledgeLlmConfigured())) {
    return { ok: false, error: 'not_configured' };
  }

  const model = await createStaffKnowledgeLanguageModel();
  if (!model) {
    return { ok: false, error: 'not_configured' };
  }

  const prompt = buildStaffKnowledgeArticlePrompt({
    hostelName: input.hostelName,
    topicNotes,
    existingRoles: input.existingRoles,
    roleName: input.roleName,
  });

  try {
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.2,
      maxRetries: 1,
    });

    const parsed = parseStaffKnowledgeArticleJson(text);
    if (!parsed.ok) {
      return { ok: false, error: 'invalid', message: parsed.message };
    }

    return { ok: true, rawText: text, document: parsed.document };
  } catch (error) {
    logStaffKnowledgeProviderError('runStaffKnowledgeArticleGenerate', error);
    return { ok: false, error: resolveStaffKnowledgeProviderError(error) };
  }
}
