-- Owner portal: staff knowledge base (roles, static checklists, instructions + video URL).
-- Content is authored in owner dashboard; staff delivery lives in other modules later.

create table public.staff_knowledge_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  headcount integer not null default 1 check (headcount >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_knowledge_roles_tenant_name_unique unique (tenant_id, name)
);

create index staff_knowledge_roles_tenant_id_idx
  on public.staff_knowledge_roles (tenant_id);

create table public.staff_knowledge_checklist_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role_id uuid not null references public.staff_knowledge_roles (id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index staff_knowledge_checklist_items_role_id_idx
  on public.staff_knowledge_checklist_items (role_id);

create index staff_knowledge_checklist_items_tenant_id_idx
  on public.staff_knowledge_checklist_items (tenant_id);

create table public.staff_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role_id uuid references public.staff_knowledge_roles (id) on delete set null,
  title text not null,
  body text not null default '',
  video_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_knowledge_articles_tenant_id_idx
  on public.staff_knowledge_articles (tenant_id);

create index staff_knowledge_articles_role_id_idx
  on public.staff_knowledge_articles (role_id);

alter table public.staff_knowledge_roles enable row level security;
alter table public.staff_knowledge_checklist_items enable row level security;
alter table public.staff_knowledge_articles enable row level security;

grant all on table public.staff_knowledge_roles to postgres, service_role;
grant all on table public.staff_knowledge_checklist_items to postgres, service_role;
grant all on table public.staff_knowledge_articles to postgres, service_role;
