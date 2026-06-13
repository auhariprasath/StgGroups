-- ============================================================================
--  STG Groups CRM — Stage 2: real roles + company-scoped Row-Level Security
--
--  Run AFTER schema.sql, in Supabase → SQL Editor.
--  This replaces the permissive Stage-1 anon policies with authenticated,
--  company-scoped access:
--     • super_admin (MD)  → sees & edits everything
--     • exec              → only their own company's leads/quotations/etc.
--
--  Auth users + profile rows are created by  scripts/provision.mjs
--  (which uses the service_role key). Run that script after this SQL.
-- ============================================================================

-- ---------- profiles: link auth.users → role + company ----------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  app_user_id text,                       -- matches app_users.id (e.g. "u-sanjay")
  role        text not null check (role in ('super_admin','exec')),
  company_id  text references public.companies(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select to authenticated using (id = auth.uid());

-- ---------- helpers (SECURITY DEFINER so they can read profiles) -------------
create or replace function public.auth_is_super() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.auth_company() returns text
  language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_app_user() returns text
  language sql stable security definer set search_path = public as $$
  select app_user_id from public.profiles where id = auth.uid();
$$;

-- ---------- drop Stage-1 permissive anon policies ---------------------------
do $$ declare t text; begin
  foreach t in array array[
    'companies','product_categories','app_users','leads','activities',
    'requirements','quotations','payments','follow_ups','negotiations',
    'not_interested','targets','unserved_requests'
  ]
  loop execute format('drop policy if exists "anon_all_%1$s" on public.%1$I;', t); end loop;
end $$;

-- ---------- reference data: all authenticated read; super_admin writes -------
do $$ declare t text; begin
  foreach t in array array['companies','product_categories','app_users'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$I;', t);
    execute format('create policy "%1$s_read" on public.%1$I for select to authenticated using (true);', t);
    execute format('create policy "%1$s_write" on public.%1$I for all to authenticated using (public.auth_is_super()) with check (public.auth_is_super());', t);
  end loop;
end $$;

-- ---------- company-scoped tables (direct company_id) -----------------------
do $$ declare t text; begin
  foreach t in array array['leads','requirements','quotations'] loop
    execute format('drop policy if exists "%1$s_scope" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_scope" on public.%1$I for all to authenticated '
      'using (public.auth_is_super() or company_id = public.auth_company()) '
      'with check (public.auth_is_super() or company_id = public.auth_company());', t);
  end loop;
end $$;

-- ---------- lead-linked tables (company derived via leads) ------------------
-- payments has no company_id of its own — scope it through its lead.
do $$ declare t text; begin
  foreach t in array array['activities','follow_ups','negotiations','not_interested','payments'] loop
    execute format('drop policy if exists "%1$s_scope" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_scope" on public.%1$I for all to authenticated '
      'using (public.auth_is_super() or exists (select 1 from public.leads l where l.id = %1$I.lead_id and l.company_id = public.auth_company())) '
      'with check (public.auth_is_super() or exists (select 1 from public.leads l where l.id = %1$I.lead_id and l.company_id = public.auth_company()));', t);
  end loop;
end $$;

-- ---------- targets: owner or super -----------------------------------------
drop policy if exists targets_scope on public.targets;
create policy targets_scope on public.targets for all to authenticated
  using (public.auth_is_super() or user_id = public.auth_app_user())
  with check (public.auth_is_super() or user_id = public.auth_app_user());

-- ---------- common requests: visible to all authenticated -------------------
drop policy if exists unserved_all on public.unserved_requests;
create policy unserved_all on public.unserved_requests for all to authenticated
  using (true) with check (true);
