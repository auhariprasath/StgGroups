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
  email                text,
  customer_company     text,
  location             text,
  gst_number           text,
  source               text not null check (source in ('justdial','indiamart','phone','whatsapp','walkin','reference','existing_customer','manual')),
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
  delivery_gstin   text not null default '',
  gst_percent      integer not null default 18
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
  id                  text primary key,
  lead_id             text not null references public.leads(id) on delete cascade,
  due_at              timestamptz not null,
  reason              text not null,
  note                text,
  done                boolean not null default false,
  call_attempt_count  integer not null default 1,
  outcome             text check (outcome in ('positive','negative','neutral','no_response')),
  next_action         text,
  negative_reason     text,
  competitor_name     text,
  competitor_amount   numeric,
  callback_at         timestamptz
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
  reason             text not null check (reason in ('price_too_high','already_purchased','competitor_selected','no_requirement','budget_issue','wrong_contact','no_response','timing_issue','product_not_available','other','funds','low_offer','competitor')),
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

create table if not exists public.lead_status_history (
  id                text primary key,
  lead_id           text not null references public.leads(id) on delete cascade,
  old_status        text not null,
  new_status        text not null,
  changed_by_user_id text not null,
  changed_at        timestamptz not null default now(),
  reason            text
);
create index if not exists lead_status_history_lead_idx on public.lead_status_history(lead_id);

create table if not exists public.site_visits (
  id           text primary key,
  lead_id      text not null references public.leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  purpose      text not null,
  location     text,
  note         text,
  status       text not null check (status in ('scheduled','completed','cancelled')) default 'scheduled'
);
create index if not exists site_visits_lead_idx on public.site_visits(lead_id);

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
    'requirements','quotations','payments','follow_ups','site_visits','negotiations',
    'not_interested','targets','unserved_requests','lead_status_history'
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

-- ---------- Phase 4 migrations (run once on existing databases) -------------
-- Add dormant to the lead status constraint.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new','followup','interested','negotiation','quote_sent','confirmed','completed','not_interested','dormant'));

-- Create status history table if it doesn't exist via this path.
create table if not exists public.lead_status_history (
  id                text primary key,
  lead_id           text not null references public.leads(id) on delete cascade,
  old_status        text not null,
  new_status        text not null,
  changed_by_user_id text not null,
  changed_at        timestamptz not null default now(),
  reason            text
);
create index if not exists lead_status_history_lead_idx on public.lead_status_history(lead_id);
alter table public.lead_status_history enable row level security;
drop policy if exists "anon_all_lead_status_history" on public.lead_status_history;
create policy "anon_all_lead_status_history" on public.lead_status_history for all to anon, authenticated using (true) with check (true);

-- ---------- Phase 3 migrations (run once on existing databases) -------------
-- Extend follow_ups with outcome tracking fields.
alter table public.follow_ups add column if not exists call_attempt_count integer not null default 1;
alter table public.follow_ups add column if not exists outcome text;
alter table public.follow_ups add column if not exists next_action text;
alter table public.follow_ups add column if not exists negative_reason text;
alter table public.follow_ups add column if not exists competitor_name text;
alter table public.follow_ups add column if not exists competitor_amount numeric;
alter table public.follow_ups add column if not exists callback_at timestamptz;

-- Extend not_interested reason constraint to include all 10 Phase 3 reasons.
alter table public.not_interested drop constraint if exists not_interested_reason_check;
alter table public.not_interested add constraint not_interested_reason_check
  check (reason in ('price_too_high','already_purchased','competitor_selected','no_requirement','budget_issue','wrong_contact','no_response','timing_issue','product_not_available','other','funds','low_offer','competitor'));

-- ---------- Phase 8 migrations (run once on existing databases) -------------
create table if not exists public.tax_invoices (
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
create index if not exists tax_invoices_lead_idx on public.tax_invoices(lead_id);
alter table public.tax_invoices enable row level security;
drop policy if exists "anon_all_tax_invoices" on public.tax_invoices;
create policy "anon_all_tax_invoices" on public.tax_invoices
  for all to anon, authenticated using (true) with check (true);

-- ---------- Phase 7 migrations (run once on existing databases) -------------
create table if not exists public.proforma_invoices (
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
create index if not exists proforma_invoices_lead_idx on public.proforma_invoices(lead_id);
alter table public.proforma_invoices enable row level security;
drop policy if exists "anon_all_proforma_invoices" on public.proforma_invoices;
create policy "anon_all_proforma_invoices" on public.proforma_invoices
  for all to anon, authenticated using (true) with check (true);

-- ---------- Phase 6 migrations (run once on existing databases) -------------
-- Add GST rate column to quotations (default 18% for all existing rows).
alter table public.quotations add column if not exists gst_percent integer not null default 18;

-- ---------- Phase 1 migrations (run once on existing databases) -------------
-- Add optional contact/company fields to leads.
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists customer_company text;
alter table public.leads add column if not exists location text;
alter table public.leads add column if not exists gst_number text;

-- Extend lead source constraint to include new sources.
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('justdial','indiamart','phone','whatsapp','walkin','reference','existing_customer','manual'));
