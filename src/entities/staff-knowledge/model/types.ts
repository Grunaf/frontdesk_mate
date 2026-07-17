export type StaffKnowledgeLaborType = 'paid' | 'volunteer';

export type StaffKnowledgeRoleRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  headcount: number;
  labor_type: StaffKnowledgeLaborType | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StaffKnowledgeChecklistItemRecord = {
  id: string;
  tenant_id: string;
  role_id: string;
  body: string;
  sort_order: number;
  created_at: string;
};

export type StaffKnowledgeArticleRecord = {
  id: string;
  tenant_id: string;
  role_id: string | null;
  title: string;
  body: string;
  video_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StaffKnowledgeRoleWithChecklist = StaffKnowledgeRoleRecord & {
  checklist: StaffKnowledgeChecklistItemRecord[];
};

export type StaffKnowledgeSnapshot = {
  roles: StaffKnowledgeRoleWithChecklist[];
  articles: StaffKnowledgeArticleRecord[];
};

export type StaffKnowledgeBootstrapRoleInput = {
  name: string;
  description: string;
  headcount: number;
  laborType?: StaffKnowledgeLaborType | null;
  checklist: string[];
};

export type StaffKnowledgeArticleInput = {
  title: string;
  body: string;
  videoUrl?: string | null;
  roleId?: string | null;
};

export type ReplaceStaffKnowledgeBootstrapResult =
  | { ok: true; roleCount: number }
  | { ok: false; error: 'not_configured' | 'tenant_not_found' | 'write_failed' };

export type UpsertStaffKnowledgeArticleResult =
  | { ok: true; article: StaffKnowledgeArticleRecord }
  | { ok: false; error: 'not_configured' | 'tenant_not_found' | 'write_failed' | 'not_found' };

export type DeleteStaffKnowledgeResult =
  | { ok: true }
  | { ok: false; error: 'not_configured' | 'tenant_not_found' | 'write_failed' | 'not_found' };
