-- ============================================================================
--  STG Groups CRM — Supabase schema  (clean-slate, run once)
--
--  Paste the ENTIRE file into:
--    Supabase Dashboard → SQL Editor → New query → Run
--
--  Safe to re-run: the DROP block resets everything cleanly.
--  IDs are TEXT so mock seed values transfer verbatim.
-- ============================================================================

-- ---------- 0. Clean slate (drop in reverse FK order) ----------------------
drop table if exists public.tax_invoices        cascade;
drop table if exists public.proforma_invoices   cascade;
drop table if exists public.lead_status_history cascade;
drop table if exists public.site_visits         cascade;
drop table if exists public.unserved_requests   cascade;
drop table if exists public.targets             cascade;
drop table if exists public.not_interested      cascade;
drop table if exists public.negotiations        cascade;
drop table if exists public.follow_ups          cascade;
drop table if exists public.payments            cascade;
drop table if exists public.quotations          cascade;
drop table if exists public.requirements        cascade;
drop table if exists public.activities          cascade;
drop table if exists public.leads               cascade;
drop table if exists public.app_users           cascade;
drop table if exists public.product_categories  cascade;
drop table if exists public.companies           cascade;
drop table if exists public.profiles            cascade;

-- ---------- 1. Core lookup tables -------------------------------------------

create table public.companies (
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

create table public.product_categories (
  id         text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  name       text not null,
  synonyms   jsonb not null default '[]'::jsonb
);

create table public.app_users (
  id         text primary key,
  name       text not null,
  email      text not null,
  phone      text not null,
  role       text not null check (role in ('super_admin','exec')),
  company_id text references public.companies(id) on delete set null,
  title      text not null
);

-- ---------- 2. Auth bridge (links Supabase Auth uid → app_users) ------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  app_user_id text not null references public.app_users(id) on delete cascade,
  role        text not null check (role in ('super_admin','exec')),
  company_id  text references public.companies(id) on delete set null
);

-- ---------- 3. Leads & CRM tables -------------------------------------------

create table public.leads (
  id                   text primary key,
  name                 text not null,
  phone                text not null,
  email                text,
  customer_company     text,
  location             text,
  gst_number           text,
  source               text not null check (source in ('justdial','indiamart','phone','whatsapp','walkin','reference','existing_customer','manual')),
  status               text not null check (status in ('new','followup','interested','negotiation','quote_sent','confirmed','completed','not_interested','dormant')),
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
create index leads_company_idx on public.leads(company_id);
create index leads_phone_idx   on public.leads(phone);

create table public.activities (
  id         text primary key,
  lead_id    text not null references public.leads(id) on delete cascade,
  at         timestamptz not null default now(),
  by_user_id text not null,
  kind       text not null,
  text       text not null
);
create index activities_lead_idx on public.activities(lead_id);

create table public.requirements (
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
create index requirements_lead_idx on public.requirements(lead_id);

create table public.quotations (
  id                text primary key,
  requirement_id    text references public.requirements(id) on delete set null,
  lead_id           text not null references public.leads(id) on delete cascade,
  company_id        text not null references public.companies(id),
  quotation_no      text not null,
  project_no        text not null,
  version           integer not null default 1,
  date              text not null,
  validity_date     text not null,
  lines             jsonb not null default '[]'::jsonb,
  advance_percent   integer not null default 0,
  balance_terms     text not null default '',
  rate_per_day_note text,
  work_order_ref    text,
  approved_by       text,
  status            text not null check (status in ('draft','sent','accepted','expired')),
  delivery_address  text not null default '',
  delivery_gstin    text not null default '',
  gst_percent       integer not null default 18
);
create index quotations_lead_idx on public.quotations(lead_id);
create index quotations_no_idx   on public.quotations(quotation_no);

create table public.payments (
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

create table public.follow_ups (
  id                 text primary key,
  lead_id            text not null references public.leads(id) on delete cascade,
  due_at             timestamptz not null,
  reason             text not null,
  note               text,
  done               boolean not null default false,
  call_attempt_count integer not null default 1,
  outcome            text check (outcome in ('positive','negative','neutral','no_response')),
  next_action        text,
  negative_reason    text,
  competitor_name    text,
  competitor_amount  numeric,
  callback_at        timestamptz
);
create index follow_ups_lead_idx on public.follow_ups(lead_id);

create table public.negotiations (
  lead_id           text primary key references public.leads(id) on delete cascade,
  quoted_amount     numeric not null,
  expected_amount   numeric not null,
  competitor_name   text,
  competitor_amount numeric,
  note              text
);

create table public.not_interested (
  lead_id           text primary key references public.leads(id) on delete cascade,
  reason            text not null check (reason in ('price_too_high','already_purchased','competitor_selected','no_requirement','budget_issue','wrong_contact','no_response','timing_issue','product_not_available','other','funds','low_offer','competitor')),
  competitor_name   text,
  competitor_amount numeric,
  what_would_change text,
  note              text
);

create table public.targets (
  user_id  text not null references public.app_users(id) on delete cascade,
  period   text not null,
  goal     integer not null default 0,
  achieved integer not null default 0,
  primary key (user_id, period)
);

create table public.unserved_requests (
  id                text primary key,
  text              text not null,
  phone             text not null default '',
  logged_by_user_id text not null,
  at                timestamptz not null default now()
);

create table public.lead_status_history (
  id                 text primary key,
  lead_id            text not null references public.leads(id) on delete cascade,
  old_status         text not null,
  new_status         text not null,
  changed_by_user_id text not null,
  changed_at         timestamptz not null default now(),
  reason             text
);
create index lead_status_history_lead_idx on public.lead_status_history(lead_id);

create table public.site_visits (
  id           text primary key,
  lead_id      text not null references public.leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  purpose      text not null,
  location     text,
  note         text,
  status       text not null check (status in ('scheduled','completed','cancelled')) default 'scheduled'
);
create index site_visits_lead_idx on public.site_visits(lead_id);

-- proforma_invoices MUST come before tax_invoices (FK dependency)
create table public.proforma_invoices (
  id                    text primary key,
  proforma_no           text not null,
  lead_id               text not null references public.leads(id) on delete cascade,
  quotation_id          text references public.quotations(id) on delete set null,
  quotation_no          text not null default '',
  company_id            text not null references public.companies(id),
  date                  text not null,
  valid_until           text not null,
  subtotal              numeric not null default 0,
  gst_percent           integer not null default 0,
  gst_amount            numeric not null default 0,
  total                 numeric not null default 0,
  advance_percent       integer not null default 50,
  advance_amount        numeric not null default 0,
  balance_amount        numeric not null default 0,
  client_name           text not null,
  client_company        text,
  client_address        text,
  client_gstin          text,
  client_contact_person text,
  delivery_address      text,
  delivery_gstin        text,
  note                  text,
  status                text not null check (status in ('draft','sent','paid')) default 'draft'
);
create index proforma_invoices_lead_idx on public.proforma_invoices(lead_id);

create table public.tax_invoices (
  id                    text primary key,
  invoice_no            text not null,
  lead_id               text not null references public.leads(id) on delete cascade,
  quotation_id          text references public.quotations(id) on delete set null,
  quotation_no          text,
  proforma_id           text references public.proforma_invoices(id) on delete set null,
  proforma_no           text,
  company_id            text not null references public.companies(id),
  date                  text not null,
  due_date              text not null,
  lines                 jsonb not null default '[]'::jsonb,
  place_of_supply       text not null default '',
  gst_percent           integer not null default 0,
  subtotal              numeric not null default 0,
  gst_amount            numeric not null default 0,
  total                 numeric not null default 0,
  advance_received      numeric not null default 0,
  balance_due           numeric not null default 0,
  client_name           text not null,
  client_company        text,
  client_address        text,
  client_gstin          text,
  client_contact_person text,
  delivery_address      text,
  delivery_gstin        text,
  note                  text,
  status                text not null check (status in ('draft','sent','paid')) default 'draft'
);
create index tax_invoices_lead_idx on public.tax_invoices(lead_id);

-- ---------- 4. Row-Level Security (Stage 1: open anon + authenticated) ------
--  Every table gets RLS enabled + one permissive "allow all" policy.
--  Replace with company-scoped policies before go-live.

do $$
declare t text;
begin
  foreach t in array array[
    'companies','product_categories','app_users','profiles','leads','activities',
    'requirements','quotations','payments','follow_ups','site_visits','negotiations',
    'not_interested','targets','unserved_requests','lead_status_history',
    'proforma_invoices','tax_invoices'
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
