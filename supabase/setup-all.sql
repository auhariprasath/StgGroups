-- ============================================================
--  STG Groups CRM — FULL backend setup (run once in SQL Editor)
--  Combines schema.sql + auth-roles.sql.
-- ============================================================

-- ============================================================================
--  STG Groups CRM — Supabase schema
--  Run this once in:  Supabase Dashboard → SQL Editor → New query → Run
--
--  Design: columns map 1:1 to src/lib/mock/types.ts. Nested collections
--  (category synonyms, requirement fields, quotation lines) are stored as JSONB
--  so the data layer swap is a thin adapter, not a relational redesign.
--
--  IDs are TEXT to preserve the app's existing string ids (e.g. "stg-rentals",
--  "l-1001") so the mock seed transfers verbatim.
-- ============================================================================

-- ---------- Tables ----------------------------------------------------------

create table if not exists public.companies (
  id              text primary key,
  name            text not null,
  legal_name      text not null,
  gstin           text not null,
  shares_gst_with text,
  quote_prefix    text not null,
  accent          text not null,
  billing_address text not null,
  bank_details    text not null
);

create table if not exists public.product_categories (
  id         text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  name       text not null,
  synonyms   jsonb not null default '[]'::jsonb
);

create table if not exists public.app_users (
  id         text primary key,
  name       text not null,
  email      text not null,
  phone      text not null,
  role       text not null check (role in ('super_admin','exec')),
  company_id text references public.companies(id) on delete set null,
  title      text not null
);

create table if not exists public.leads (
  id                   text primary key,
  name                 text not null,
  phone                text not null,
  source               text not null check (source in ('justdial','indiamart','phone','manual')),
  status               text not null check (status in ('new','followup','interested','negotiation','quote_sent','confirmed','completed','not_interested')),
  priority             text not null check (priority in ('hot','warm','cold')),
  company_id           text not null references public.companies(id),
  category_id          text references public.product_categories(id) on delete set null,
  assigned_to_user_id  text references public.app_users(id) on delete set null,
  request_text         text not null default '',
  needs_manual_routing boolean not null default false,
  unserved_request     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists leads_company_idx on public.leads(company_id);
create index if not exists leads_phone_idx on public.leads(phone);

create table if not exists public.activities (
  id          text primary key,
  lead_id     text not null references public.leads(id) on delete cascade,
  at          timestamptz not null default now(),
  by_user_id  text not null,
  kind        text not null,
  text        text not null
);
create index if not exists activities_lead_idx on public.activities(lead_id);

create table if not exists public.requirements (
  id            text primary key,
  lead_id       text not null references public.leads(id) on delete cascade,
  company_id    text not null references public.companies(id),
  category_id   text references public.product_categories(id) on delete set null,
  request_text  text not null default '',
  status        text not null check (status in ('draft','open','closed')),
  fields        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  delivery_date timestamptz
);
create index if not exists requirements_lead_idx on public.requirements(lead_id);

create table if not exists public.quotations (
  id               text primary key,
  requirement_id   text references public.requirements(id) on delete set null,
  lead_id          text not null references public.leads(id) on delete cascade,
  company_id       text not null references public.companies(id),
  quotation_no     text not null,
  project_no       text not null,
  version          integer not null default 1,
  date             text not null,
  validity_date    text not null,
  lines            jsonb not null default '[]'::jsonb,
  advance_percent  integer not null default 0,
  balance_terms    text not null default '',
  rate_per_day_note text,
  work_order_ref   text,
  approved_by      text,
  status           text not null check (status in ('draft','sent','accepted','expired')),
  delivery_address text not null default '',
  delivery_gstin   text not null default ''
);
create index if not exists quotations_lead_idx on public.quotations(lead_id);
create index if not exists quotations_no_idx on public.quotations(quotation_no);

create table if not exists public.payments (
  id             text primary key,
  quotation_id   text references public.quotations(id) on delete set null,
  lead_id        text not null references public.leads(id) on delete cascade,
  stage          text not null check (stage in ('none','proforma_sent','advance_paid','fully_paid')),
  total          numeric not null default 0,
  advance_amount numeric not null default 0,
  balance_amount numeric not null default 0,
  copy_to_admin  boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id      text primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  due_at  timestamptz not null,
  reason  text not null,
  note    text,
  done    boolean not null default false
);
create index if not exists follow_ups_lead_idx on public.follow_ups(lead_id);

create table if not exists public.negotiations (
  lead_id           text primary key references public.leads(id) on delete cascade,
  quoted_amount     numeric not null,
  expected_amount   numeric not null,
  competitor_name   text,
  competitor_amount numeric,
  note              text
);

create table if not exists public.not_interested (
  lead_id            text primary key references public.leads(id) on delete cascade,
  reason             text not null check (reason in ('funds','low_offer','competitor','other')),
  competitor_name    text,
  competitor_amount  numeric,
  what_would_change  text,
  note               text
);

create table if not exists public.targets (
  user_id  text not null references public.app_users(id) on delete cascade,
  period   text not null,
  goal     integer not null default 0,
  achieved integer not null default 0,
  primary key (user_id, period)
);

create table if not exists public.unserved_requests (
  id                text primary key,
  text              text not null,
  phone             text not null default '',
  logged_by_user_id text not null,
  at                timestamptz not null default now()
);

-- ---------- Row-Level Security ---------------------------------------------
--  ⚠️  STAGE 1 (current): the app uses the anon key with a MOCK role switcher
--  and NO Supabase Auth yet, so these policies allow anon read+write to get the
--  CRM running end-to-end. This is fine for development/demo on a private
--  project, but is NOT production-safe.
--
--  STAGE 2 (before go-live): introduce Supabase Auth, map auth.uid() → app_users,
--  and replace the policies below with company-scoped ones, e.g. execs can only
--  see/modify rows where company_id = their company, super_admin sees all.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'companies','product_categories','app_users','leads','activities',
    'requirements','quotations','payments','follow_ups','negotiations',
    'not_interested','targets','unserved_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$I;', t);
    execute format(
      'create policy "anon_all_%1$s" on public.%1$I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;


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
