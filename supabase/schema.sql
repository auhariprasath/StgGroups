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
drop table if exists public.requirement_audit_logs     cascade;
drop table if exists public.invoice_status_history     cascade;
drop table if exists public.payment_records            cascade;
drop table if exists public.work_orders                cascade;
drop table if exists public.tax_invoices               cascade;
drop table if exists public.proforma_invoices          cascade;
drop table if exists public.lead_status_history        cascade;
drop table if exists public.lead_transfer_logs         cascade;
drop table if exists public.lead_assignment_history    cascade;
drop table if exists public.site_visits                cascade;
drop table if exists public.unserved_requests          cascade;
drop table if exists public.targets                    cascade;
drop table if exists public.not_interested             cascade;
drop table if exists public.negotiations               cascade;
drop table if exists public.follow_ups                 cascade;
drop table if exists public.payments                   cascade;
drop table if exists public.quotations                 cascade;
drop table if exists public.requirements               cascade;
drop table if exists public.activities                 cascade;
drop table if exists public.leads                      cascade;
drop table if exists public.app_users                  cascade;
drop table if exists public.product_categories         cascade;
drop table if exists public.product_alias_mapping      cascade;
drop table if exists public.lead_sources               cascade;
drop table if exists public.existing_customer_history  cascade;
drop table if exists public.duplicate_detection_logs   cascade;
drop table if exists public.followup_timeline          cascade;
drop table if exists public.followup_reminders         cascade;
drop table if exists public.negative_reason_analytics  cascade;
drop table if exists public.notifications              cascade;
drop table if exists public.companies                  cascade;
drop table if exists public.profiles                   cascade;

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
  status               text not null check (status in ('new','first_contact','followup','requirements','quote_sent','negotiation','work_order','active_project','completed','not_interested','dormant')),
  previous_status      text,
  status_changed_at    timestamptz,
  status_changed_by    text,
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

-- Phase 5: Requirement Audit Logs — tracks each change to requirement fields
create table public.requirement_audit_logs (
  id              text primary key,
  requirement_id  text not null references public.requirements(id) on delete cascade,
  action_type     text not null,
  field_key       text,
  old_value       text,
  new_value       text,
  changed_by      text not null,
  changed_at      timestamptz not null default now()
);
create index requirement_audit_logs_req_idx on public.requirement_audit_logs(requirement_id);

create table public.machines (
  id                text primary key,
  category_id       text not null references public.product_categories(id),
  company_id        text not null references public.companies(id),
  name              text not null,
  make              text not null,
  model             text not null,
  platform_height   text,
  working_height    text,
  capacity          text,
  machine_weight    text,
  engine            text,
  drive_speed       text,
  fuel_type         text,
  specifications    text,
  rental_category   text,
  safety_notes      text,
  image_url         text,
  daily_rate        integer
);
create index machines_category_idx on public.machines(category_id);
create index machines_company_idx on public.machines(company_id);

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
  status            text not null check (status in ('draft','pending_approval','sent','accepted','expired')),
  delivery_address  text not null default '',
  delivery_gstin    text not null default '',
  gst_percent       integer not null default 18,
  mobilization_charge     numeric,
  demobilization_charge   numeric,
  viewed_at               text,
  view_count              integer,
  customer_response       text,
  customer_response_note  text,
  customer_response_at    text,
  locked_at               text
);
create index quotations_lead_idx on public.quotations(lead_id);
create index quotations_no_idx   on public.quotations(quotation_no);

create table public.payments (
  id             text primary key,
  quotation_id   text references public.quotations(id) on delete set null,
  lead_id        text not null references public.leads(id) on delete cascade,
  stage          text not null check (stage in ('none','proforma_sent','advance_paid','partially_paid','fully_paid')),
  total          numeric not null default 0,
  advance_amount numeric not null default 0,
  balance_amount numeric not null default 0,
  tds_percent    numeric not null default 0,
  tds_amount     numeric not null default 0,
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
  note              text,
  rounds            integer not null default 1
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

-- Phase 7: Work Order table (between quotation acceptance and proforma)
create table public.work_orders (
  id                    text primary key,
  work_order_no         text not null,
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
  po_reference          text,
  acceptance_remark     text,
  note                  text,
  status                text not null check (status in ('draft','sent','accepted')) default 'draft'
);
create index work_orders_lead_idx on public.work_orders(lead_id);

-- Phase 7: Payment Records (individual payment receipts)
create table public.payment_records (
  id            text primary key,
  lead_id       text not null references public.leads(id) on delete cascade,
  invoice_id    text not null,
  invoice_type  text not null check (invoice_type in ('proforma','tax')),
  amount        numeric not null,
  date          text not null,
  mode          text not null check (mode in ('NEFT','RTGS','UPI','Cheque','Cash','Card','Other')),
  reference     text not null,
  remarks       text,
  tds_deducted  numeric not null default 0,
  net_amount    numeric not null,
  utr_proof     text,
  verified_by   text,
  verified_at   timestamptz,
  status        text not null check (status in ('pending','verified','approved','rejected')) default 'pending',
  created_by    text not null,
  created_at    timestamptz not null default now()
);
create index payment_records_lead_idx on public.payment_records(lead_id);
create index payment_records_invoice_idx on public.payment_records(invoice_id);

-- Phase 7: Payment Instalments
create table public.payment_instalments (
  id            text primary key,
  lead_id       text not null references public.leads(id) on delete cascade,
  invoice_id    text not null,
  invoice_type  text not null check (invoice_type in ('proforma','tax')),
  due_date      text not null,
  due_amount    numeric not null,
  paid_status   text not null check (paid_status in ('pending','paid','overdue')) default 'pending',
  paid_date     text,
  late_days     integer not null default 0,
  created_at    timestamptz not null default now()
);
create index payment_instalments_lead_idx on public.payment_instalments(lead_id);

-- Phase 7/8: Communication Logs (WhatsApp/Email send tracking)
create table public.communication_logs (
  id              text primary key,
  lead_id         text not null references public.leads(id) on delete cascade,
  invoice_id      text not null,
  invoice_type    text not null check (invoice_type in ('proforma','tax')),
  method          text not null check (method in ('whatsapp','email')),
  recipient       text not null,
  subject         text not null default '',
  body            text not null default '',
  delivery_status text not null check (delivery_status in ('sent','delivered','read','failed')) default 'sent',
  sent_at         timestamptz not null default now(),
  sent_by         text not null
);
create index communication_logs_lead_idx on public.communication_logs(lead_id);

-- Phase 7/8: Invoice Status History
create table public.invoice_status_history (
  id            text primary key,
  invoice_id    text not null,
  invoice_type  text not null check (invoice_type in ('proforma','tax')),
  old_status    text not null,
  new_status    text not null,
  changed_by    text not null,
  changed_at    timestamptz not null default now(),
  remarks       text
);
create index invoice_status_history_invoice_idx on public.invoice_status_history(invoice_id);

-- ---------- 4. Auxiliary & support tables (must come after leads) -----------

create table public.lead_sources (
  source_name     text primary key,
  source_type     text not null default 'manual',
  webhook_enabled boolean not null default false,
  status          text not null default 'active' check (status in ('active','inactive'))
);

create table public.product_alias_mapping (
  id               text primary key,
  keyword          text not null,
  actual_product   text not null,
  company          text not null references public.companies(id),
  confidence_score integer not null default 85 check (confidence_score between 0 and 100),
  created_at       timestamptz not null default now()
);
create index product_alias_keyword_idx on public.product_alias_mapping(keyword);

create table public.lead_assignment_history (
  id          text primary key,
  lead_id     text not null references public.leads(id) on delete cascade,
  old_owner   text references public.app_users(id) on delete set null,
  new_owner   text not null references public.app_users(id) on delete cascade,
  reason      text not null default '',
  assigned_by text not null references public.app_users(id),
  created_at  timestamptz not null default now()
);
create index lead_assignment_lead_idx on public.lead_assignment_history(lead_id);

create table public.existing_customer_history (
  id                  text primary key,
  customer_mobile     text not null,
  previous_quotations  jsonb not null default '[]'::jsonb,
  previous_invoices    jsonb not null default '[]'::jsonb,
  previous_payments    jsonb not null default '[]'::jsonb,
  previous_followups   jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);
create index existing_customer_mobile_idx on public.existing_customer_history(customer_mobile);

create table public.duplicate_detection_logs (
  id               text primary key,
  lead_id          text not null references public.leads(id) on delete cascade,
  matched_lead_id  text references public.leads(id) on delete set null,
  match_type       text not null check (match_type in ('mobile','gst','company','fuzzy','email')),
  confidence_score integer not null default 0,
  action_taken     text not null check (action_taken in ('merged','ignored','linked')),
  actioned_by      text not null,
  created_at       timestamptz not null default now()
);
create index dup_detection_lead_idx on public.duplicate_detection_logs(lead_id);

create table public.lead_transfer_logs (
  id                  text primary key,
  lead_id             text not null references public.leads(id) on delete cascade,
  from_company_id     text not null references public.companies(id),
  to_company_id       text not null references public.companies(id),
  from_user_id        text not null references public.app_users(id),
  to_user_id          text not null references public.app_users(id),
  reason_type         text not null check (reason_type in ('wrong_product','wrong_company','customer_changed','business_decision')),
  note                text not null default '',
  transferred_by      text not null,
  created_at          timestamptz not null default now()
);
create index lead_transfer_lead_idx on public.lead_transfer_logs(lead_id);

create table public.notifications (
  id              text primary key,
  user_id         text not null,
  type            text not null default 'info',
  title           text not null,
  message         text not null default '',
  priority        text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  read            boolean not null default false,
  link_to         text,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(read);

-- ---------- 5. Phase 3 — Follow-up Management tables ------------------------

create table public.followup_timeline (
  id          text primary key,
  lead_id     text not null references public.leads(id) on delete cascade,
  action_type text not null,
  description text not null default '',
  created_by  text not null,
  timestamp   timestamptz not null default now()
);
create index followup_timeline_lead_idx on public.followup_timeline(lead_id);

create table public.followup_reminders (
  id                text primary key,
  lead_id           text not null references public.leads(id) on delete cascade,
  handler_name      text not null,
  reminder_date     date not null,
  reminder_time     time not null,
  status            text not null default 'pending' check (status in ('pending','sent','cancelled')),
  notification_sent boolean not null default false,
  created_at        timestamptz not null default now()
);
create index followup_reminders_lead_idx on public.followup_reminders(lead_id);

create table public.negative_reason_analytics (
  id              text primary key,
  lead_id         text not null references public.leads(id) on delete cascade,
  company_name    text not null,
  reason_type     text not null,
  competitor_name text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index negative_reason_lead_idx on public.negative_reason_analytics(lead_id);

-- ---------- 6. Row-Level Security (Stage 1: open anon + authenticated) ------
--  Every table gets RLS enabled + one permissive "allow all" policy.
--  Replace with company-scoped policies before go-live.

do $$
declare t text;
begin
  foreach t in array array[
    'companies','product_categories','app_users','profiles','leads','activities',
    'requirements','quotations','payments','follow_ups','site_visits','negotiations',
    'not_interested','targets','unserved_requests','lead_status_history',
    'proforma_invoices','tax_invoices','work_orders','payment_records','invoice_status_history',
    'payment_instalments','communication_logs',
    'lead_transfer_logs','lead_sources',
    'product_alias_mapping','lead_assignment_history','existing_customer_history',
    'duplicate_detection_logs','notifications',
    'followup_timeline','followup_reminders','negative_reason_analytics',
    'requirement_audit_logs'
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
