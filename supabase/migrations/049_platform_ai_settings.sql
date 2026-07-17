-- Platform singleton: which LLM provider powers owner Staff knowledge generate (and future AI surfaces).
-- API keys stay in env; only non-secret preference lives here.

create table public.platform_ai_settings (
  id smallint primary key default 1 check (id = 1),
  provider text not null default 'openrouter'
    check (provider in ('openrouter', 'gemini')),
  updated_at timestamptz not null default now()
);

insert into public.platform_ai_settings (id, provider)
values (1, 'openrouter')
on conflict (id) do nothing;

alter table public.platform_ai_settings enable row level security;

grant all on table public.platform_ai_settings to postgres, service_role;
