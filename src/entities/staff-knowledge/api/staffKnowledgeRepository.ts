import 'server-only';

import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/shared/lib/db/admin';

import type {
  DeleteStaffKnowledgeResult,
  ReplaceStaffKnowledgeBootstrapResult,
  StaffKnowledgeArticleInput,
  StaffKnowledgeArticleRecord,
  StaffKnowledgeBootstrapRoleInput,
  StaffKnowledgeChecklistItemRecord,
  StaffKnowledgeRoleRecord,
  StaffKnowledgeSnapshot,
  UpsertStaffKnowledgeArticleResult,
} from '../model/types';

const ROLE_COLUMNS =
  'id, tenant_id, name, description, headcount, labor_type, sort_order, created_at, updated_at';
const CHECKLIST_COLUMNS = 'id, tenant_id, role_id, body, sort_order, created_at';
const ARTICLE_COLUMNS =
  'id, tenant_id, role_id, title, body, video_url, sort_order, created_at, updated_at';

function mapLaborType(value: unknown): StaffKnowledgeRoleRecord['labor_type'] {
  if (value === 'paid' || value === 'volunteer') return value;
  return null;
}

function mapRole(row: Record<string, unknown>): StaffKnowledgeRoleRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    name: String(row.name),
    description: String(row.description ?? ''),
    headcount: Number(row.headcount) || 1,
    labor_type: mapLaborType(row.labor_type),
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapChecklist(row: Record<string, unknown>): StaffKnowledgeChecklistItemRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    role_id: String(row.role_id),
    body: String(row.body),
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
  };
}

function mapArticle(row: Record<string, unknown>): StaffKnowledgeArticleRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    role_id: row.role_id ? String(row.role_id) : null,
    title: String(row.title),
    body: String(row.body ?? ''),
    video_url: row.video_url ? String(row.video_url) : null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const tenant = await getTenantRecord(tenantSlug);
  return tenant?.id ?? null;
}

export async function getStaffKnowledgeSnapshot(
  tenantSlug: string
): Promise<StaffKnowledgeSnapshot> {
  const empty: StaffKnowledgeSnapshot = { roles: [], articles: [] };
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId || !isSupabaseAdminConfigured()) return empty;

  const admin = getSupabaseAdmin();
  if (!admin) return empty;

  const [rolesResult, checklistResult, articlesResult] = await Promise.all([
    admin
      .from('staff_knowledge_roles')
      .select(ROLE_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    admin
      .from('staff_knowledge_checklist_items')
      .select(CHECKLIST_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
    admin
      .from('staff_knowledge_articles')
      .select(ARTICLE_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true }),
  ]);

  if (rolesResult.error) {
    console.error('getStaffKnowledgeSnapshot roles:', rolesResult.error.message);
  }
  if (checklistResult.error) {
    console.error('getStaffKnowledgeSnapshot checklist:', checklistResult.error.message);
  }
  if (articlesResult.error) {
    console.error('getStaffKnowledgeSnapshot articles:', articlesResult.error.message);
  }

  const roles = (rolesResult.data ?? []).map((row) => mapRole(row as Record<string, unknown>));
  const checklist = (checklistResult.data ?? []).map((row) =>
    mapChecklist(row as Record<string, unknown>)
  );
  const articles = (articlesResult.data ?? []).map((row) =>
    mapArticle(row as Record<string, unknown>)
  );

  return {
    roles: roles.map((role) => ({
      ...role,
      checklist: checklist.filter((item) => item.role_id === role.id),
    })),
    articles,
  };
}

export async function replaceStaffKnowledgeBootstrap(
  tenantSlug: string,
  roles: StaffKnowledgeBootstrapRoleInput[]
): Promise<ReplaceStaffKnowledgeBootstrapResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'not_configured' };
  }

  const { error: deleteError } = await admin
    .from('staff_knowledge_roles')
    .delete()
    .eq('tenant_id', tenantId);

  if (deleteError) {
    console.error('replaceStaffKnowledgeBootstrap delete:', deleteError.message);
    return { ok: false, error: 'write_failed' };
  }

  if (roles.length === 0) {
    return { ok: true, roleCount: 0 };
  }

  const roleRows = roles.map((role, index) => ({
    tenant_id: tenantId,
    name: role.name.trim(),
    description: role.description.trim(),
    headcount: Math.max(1, Math.floor(role.headcount) || 1),
    labor_type:
      role.laborType === 'paid' || role.laborType === 'volunteer' ? role.laborType : null,
    sort_order: index,
  }));

  const { data: insertedRoles, error: insertRolesError } = await admin
    .from('staff_knowledge_roles')
    .insert(roleRows)
    .select(ROLE_COLUMNS);

  if (insertRolesError || !insertedRoles) {
    console.error('replaceStaffKnowledgeBootstrap roles:', insertRolesError?.message);
    return { ok: false, error: 'write_failed' };
  }

  const mappedRoles = insertedRoles.map((row) => mapRole(row as Record<string, unknown>));
  const checklistRows: Array<{
    tenant_id: string;
    role_id: string;
    body: string;
    sort_order: number;
  }> = [];

  for (let i = 0; i < roles.length; i += 1) {
    const input = roles[i];
    const saved = mappedRoles[i];
    if (!saved) continue;

    input.checklist.forEach((body, sortOrder) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      checklistRows.push({
        tenant_id: tenantId,
        role_id: saved.id,
        body: trimmed,
        sort_order: sortOrder,
      });
    });
  }

  if (checklistRows.length > 0) {
    const { error: checklistError } = await admin
      .from('staff_knowledge_checklist_items')
      .insert(checklistRows);

    if (checklistError) {
      console.error('replaceStaffKnowledgeBootstrap checklist:', checklistError.message);
      return { ok: false, error: 'write_failed' };
    }
  }

  return { ok: true, roleCount: mappedRoles.length };
}

export async function createStaffKnowledgeArticle(
  tenantSlug: string,
  input: StaffKnowledgeArticleInput
): Promise<UpsertStaffKnowledgeArticleResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'not_configured' };
  }

  const videoUrl = input.videoUrl?.trim() || null;

  const { data, error } = await admin
    .from('staff_knowledge_articles')
    .insert({
      tenant_id: tenantId,
      role_id: input.roleId ?? null,
      title: input.title.trim(),
      body: input.body.trim(),
      video_url: videoUrl,
      sort_order: 0,
    })
    .select(ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createStaffKnowledgeArticle:', error?.message);
    return { ok: false, error: 'write_failed' };
  }

  return { ok: true, article: mapArticle(data as Record<string, unknown>) };
}

export async function updateStaffKnowledgeArticle(
  tenantSlug: string,
  articleId: string,
  input: StaffKnowledgeArticleInput
): Promise<UpsertStaffKnowledgeArticleResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'not_configured' };
  }

  const videoUrl = input.videoUrl?.trim() || null;

  const { data, error } = await admin
    .from('staff_knowledge_articles')
    .update({
      role_id: input.roleId ?? null,
      title: input.title.trim(),
      body: input.body.trim(),
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .eq('tenant_id', tenantId)
    .select(ARTICLE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('updateStaffKnowledgeArticle:', error.message);
    return { ok: false, error: 'write_failed' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, article: mapArticle(data as Record<string, unknown>) };
}

export async function deleteStaffKnowledgeArticle(
  tenantSlug: string,
  articleId: string
): Promise<DeleteStaffKnowledgeResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'not_configured' };
  }

  const { data, error } = await admin
    .from('staff_knowledge_articles')
    .delete()
    .eq('id', articleId)
    .eq('tenant_id', tenantId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('deleteStaffKnowledgeArticle:', error.message);
    return { ok: false, error: 'write_failed' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}

export async function deleteStaffKnowledgeRole(
  tenantSlug: string,
  roleId: string
): Promise<DeleteStaffKnowledgeResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'not_configured' };
  }

  const { data, error } = await admin
    .from('staff_knowledge_roles')
    .delete()
    .eq('id', roleId)
    .eq('tenant_id', tenantId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('deleteStaffKnowledgeRole:', error.message);
    return { ok: false, error: 'write_failed' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
