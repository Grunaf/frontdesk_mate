'use server';

import {
  assertOwnerAuthenticated,
  getOwnerSession,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';

import { isStaffKnowledgeLlmConfigured } from '../lib/createStaffKnowledgeLanguageModel';
import { runStaffKnowledgeArticleGenerate } from '../lib/runStaffKnowledgeArticleGenerate';
import {
  runStaffKnowledgeBootstrapContextGenerate,
  runStaffKnowledgeBootstrapPipeline,
} from '../lib/runStaffKnowledgeBootstrapGenerate';
import { checkStaffKnowledgeRateLimit } from '../lib/staffKnowledgeRateLimit';
import type {
  BootstrapClarificationTurn,
  StaffKnowledgeArticleGenerateResult,
  StaffKnowledgeBootstrapContextDocument,
  StaffKnowledgeBootstrapContextGenerateResult,
  StaffKnowledgeBootstrapGenerateResult,
  StaffKnowledgeBootstrapIntake,
} from '../model/types';

async function resolveOwnerGenerator(): Promise<
  | { ok: true; rateKey: string }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  await assertOwnerAuthenticated();
  const context = await getOwnerTenantContext();
  if (!context) {
    return { ok: false, error: 'unauthorized' };
  }

  const access = resolveOwnerEditAccess(context.lifecycleStatus);
  if (!access.canEditSettings) {
    return { ok: false, error: 'forbidden' };
  }

  const session = await getOwnerSession();
  const rateKey = session?.id ?? context.slug;
  return { ok: true, rateKey };
}

export async function isStaffKnowledgeAiConfiguredAction(): Promise<boolean> {
  return isStaffKnowledgeLlmConfigured();
}

export async function checkStaffKnowledgeBootstrapReadinessAction(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  clarifications?: BootstrapClarificationTurn[];
  iteration?: number;
  persistQuestionnaire?: boolean;
  locale?: string;
}): Promise<StaffKnowledgeBootstrapContextGenerateResult> {
  const actor = await resolveOwnerGenerator();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  if (!checkStaffKnowledgeRateLimit(actor.rateKey)) {
    return { ok: false, error: 'rate_limited' };
  }

  if (input.persistQuestionnaire !== false) {
    const { persistStaffKnowledgeQuestionnaireAction } = await import(
      './staffKnowledgeActions'
    );
    const persist = await persistStaffKnowledgeQuestionnaireAction({
      locale: input.locale ?? 'en',
      questionnaire: input.intake,
    });
    if (!persist.ok) {
      if (persist.error === 'unauthorized') return { ok: false, error: 'unauthorized' };
      if (persist.error === 'forbidden') return { ok: false, error: 'forbidden' };
      if (persist.error === 'invalid') return { ok: false, error: 'invalid_input' };
      return { ok: false, error: 'invalid', message: 'Could not save questionnaire.' };
    }
  }

  return runStaffKnowledgeBootstrapContextGenerate({
    hostelName: input.hostelName,
    intake: input.intake,
    clarifications: input.clarifications,
    iteration: input.iteration,
  });
}

export async function generateStaffKnowledgeBootstrapAction(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  context?: StaffKnowledgeBootstrapContextDocument;
  clarifications?: BootstrapClarificationTurn[];
  iteration?: number;
  persistQuestionnaire?: boolean;
  locale?: string;
}): Promise<StaffKnowledgeBootstrapGenerateResult> {
  const actor = await resolveOwnerGenerator();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  if (!checkStaffKnowledgeRateLimit(actor.rateKey)) {
    return { ok: false, error: 'rate_limited' };
  }

  if (input.persistQuestionnaire !== false) {
    const { persistStaffKnowledgeQuestionnaireAction } = await import(
      './staffKnowledgeActions'
    );
    const persist = await persistStaffKnowledgeQuestionnaireAction({
      locale: input.locale ?? 'en',
      questionnaire: input.intake,
    });
    if (!persist.ok) {
      if (persist.error === 'unauthorized') return { ok: false, error: 'unauthorized' };
      if (persist.error === 'forbidden') return { ok: false, error: 'forbidden' };
      if (persist.error === 'invalid') return { ok: false, error: 'invalid_input' };
      return { ok: false, error: 'invalid', message: 'Could not save questionnaire.' };
    }
  }

  return runStaffKnowledgeBootstrapPipeline({
    hostelName: input.hostelName,
    intake: input.intake,
    context: input.context,
    clarifications: input.clarifications,
    iteration: input.iteration,
  });
}

export async function generateStaffKnowledgeArticleAction(input: {
  hostelName: string;
  topicNotes: string;
  existingRoles: string[];
  roleName?: string;
}): Promise<StaffKnowledgeArticleGenerateResult> {
  const actor = await resolveOwnerGenerator();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  if (!checkStaffKnowledgeRateLimit(actor.rateKey)) {
    return { ok: false, error: 'rate_limited' };
  }

  return runStaffKnowledgeArticleGenerate({
    hostelName: input.hostelName,
    topicNotes: input.topicNotes,
    existingRoles: input.existingRoles,
    roleName: input.roleName,
  });
}
