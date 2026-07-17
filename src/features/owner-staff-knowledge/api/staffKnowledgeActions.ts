'use server';

import { revalidatePath } from 'next/cache';

import {
  assertOwnerAuthenticated,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import {
  createStaffKnowledgeArticle,
  deleteStaffKnowledgeArticle,
  deleteStaffKnowledgeRole,
  getStaffKnowledgeSnapshot,
  replaceStaffKnowledgeBootstrap,
} from '@/entities/staff-knowledge/server';
import { insertTenantAuditEvent } from '@/entities/tenant-audit';
import { diffTenantSettingsForAudit } from '@/entities/tenant/lib/diffTenantSettingsForAudit';
import { toDateInputValue } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { getTenantRecord, upsertTenant } from '@/entities/tenant/server';

import { applyQuestionnaireToTenantSettings } from '../lib/applyQuestionnaireToTenantSettings';
import { parseStaffKnowledgeArticleJson } from '../lib/articleImportSchema';
import { parseStaffKnowledgeBootstrapJson } from '../lib/bootstrapImportSchema';
import type {
  BootstrapQuestionnaire,
  StaffKnowledgeMutateResult,
} from '../model/types';

async function resolveOwnerWriter(): Promise<
  | { ok: true; slug: string; locale: string; tenantId: string; userId: string }
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

  return {
    ok: true,
    slug: context.slug,
    locale: 'en',
    tenantId: context.tenantId,
    userId: context.userId,
  };
}

function revalidateKnowledge(locale: string) {
  revalidatePath(`/${locale}/knowledge`);
}

export async function persistStaffKnowledgeQuestionnaireAction(input: {
  locale: string;
  questionnaire: BootstrapQuestionnaire;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  if (
    input.questionnaire.laborModel !== 'paid' &&
    input.questionnaire.laborModel !== 'volunteers' &&
    input.questionnaire.laborModel !== 'mix'
  ) {
    return { ok: false, error: 'invalid' };
  }

  const previous = await getTenantRecord(actor.slug);
  if (!previous || previous.id !== actor.tenantId) {
    return { ok: false, error: 'not_found' };
  }

  const nextSettings = applyQuestionnaireToTenantSettings(
    previous.settings,
    input.questionnaire
  );

  const result = await upsertTenant({
    slug: previous.slug,
    originalSlug: previous.slug,
    name: previous.name,
    cityPackId: previous.city_pack_id,
    settings: nextSettings,
    subscriptionStartsAt: toDateInputValue(previous.subscription_starts_at ?? ''),
    subscriptionEndsAt: toDateInputValue(previous.subscription_ends_at ?? ''),
  });

  if (!result.ok) {
    return { ok: false, error: 'write_failed' };
  }

  const { changedKeys } = diffTenantSettingsForAudit(previous.settings, nextSettings);
  if (changedKeys.length > 0) {
    await insertTenantAuditEvent({
      tenantId: previous.id,
      actorKind: 'owner',
      actorUserId: actor.userId,
      eventType: 'settings_updated',
      changedKeys,
      flags: { source: 'staff_knowledge_questionnaire' },
    });
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  revalidatePath(`/${locale}/settings`, 'layout');
  return { ok: true };
}

export async function applyStaffKnowledgeBootstrapAction(input: {
  locale: string;
  pastedAiReply: string;
  questionnaire?: BootstrapQuestionnaire;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const parsed = parseStaffKnowledgeBootstrapJson(input.pastedAiReply);
  if (!parsed.ok) {
    return { ok: false, error: 'invalid' };
  }

  if (input.questionnaire) {
    const persist = await persistStaffKnowledgeQuestionnaireAction({
      locale: input.locale,
      questionnaire: input.questionnaire,
    });
    if (!persist.ok) {
      return persist;
    }
  }

  const result = await replaceStaffKnowledgeBootstrap(
    actor.slug,
    parsed.document.roles.map((role) => ({
      name: role.name,
      description: role.description,
      headcount: role.headcount,
      laborType: role.laborType ?? null,
      checklist: role.checklist,
    }))
  );

  if (!result.ok) {
    return { ok: false, error: 'write_failed' };
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  return { ok: true };
}

export async function applyStaffKnowledgeArticleImportAction(input: {
  locale: string;
  pastedAiReply: string;
  roleId?: string | null;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const parsed = parseStaffKnowledgeArticleJson(input.pastedAiReply);
  if (!parsed.ok) {
    return { ok: false, error: 'invalid' };
  }

  let roleId = input.roleId ?? null;
  if (!roleId && parsed.document.roleName) {
    const snapshot = await getStaffKnowledgeSnapshot(actor.slug);
    const match = snapshot.roles.find(
      (role) => role.name.toLowerCase() === parsed.document.roleName!.toLowerCase()
    );
    roleId = match?.id ?? null;
  }

  const result = await createStaffKnowledgeArticle(actor.slug, {
    title: parsed.document.title,
    body: parsed.document.body,
    videoUrl: parsed.document.videoUrl,
    roleId,
  });

  if (!result.ok) {
    return { ok: false, error: 'write_failed' };
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  return { ok: true };
}

export async function createStaffKnowledgeArticleAction(input: {
  locale: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  roleId?: string | null;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    return { ok: false, error: 'invalid' };
  }

  const result = await createStaffKnowledgeArticle(actor.slug, {
    title,
    body,
    videoUrl: input.videoUrl,
    roleId: input.roleId ?? null,
  });

  if (!result.ok) {
    return { ok: false, error: 'write_failed' };
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  return { ok: true };
}

export async function deleteStaffKnowledgeArticleAction(input: {
  locale: string;
  articleId: string;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const result = await deleteStaffKnowledgeArticle(actor.slug, input.articleId);
  if (!result.ok) {
    return { ok: false, error: result.error === 'not_found' ? 'not_found' : 'write_failed' };
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  return { ok: true };
}

export async function deleteStaffKnowledgeRoleAction(input: {
  locale: string;
  roleId: string;
}): Promise<StaffKnowledgeMutateResult> {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false, error: actor.error };
  }

  const result = await deleteStaffKnowledgeRole(actor.slug, input.roleId);
  if (!result.ok) {
    return { ok: false, error: result.error === 'not_found' ? 'not_found' : 'write_failed' };
  }

  const locale = input.locale.trim() || actor.locale;
  revalidateKnowledge(locale);
  return { ok: true };
}
