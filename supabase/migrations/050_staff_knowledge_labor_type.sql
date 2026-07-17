-- Optional labor type on staff knowledge roles (paid vs volunteer).

alter table public.staff_knowledge_roles
  add column if not exists labor_type text
    check (labor_type is null or labor_type in ('paid', 'volunteer'));
