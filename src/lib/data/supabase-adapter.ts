import { supabase } from "@/lib/supabase";
import type {
  Db, Company, ProductCategory, User, Lead, Activity, Requirement,
  Quotation, ProformaInvoice, TaxInvoice, Payment, FollowUp, SiteVisit,
  NegotiationRecord, NotInterestedRecord, Target, UnservedRequest, StatusHistoryEntry,
} from "./types";

/**
 * Translation layer between the camelCase app model and the snake_case
 * Postgres rows. Nested collections (synonyms / fields / lines) are JSONB, so
 * they pass through untouched. This is the ONLY file that knows column names —
 * keeping the store and routes database-agnostic.
 */

export function emptyDb(): Db {
  return {
    companies: [], categories: [], users: [], leads: [], activities: [],
    requirements: [], quotations: [], proformaInvoices: [], taxInvoices: [],
    payments: [], followUps: [], siteVisits: [], negotiations: [], notInterested: [],
    targets: [], unserved: [], statusHistory: [],
  };
}

/* ---- row → model ---- */
const fromCompany = (r: any): Company => ({ id: r.id, name: r.name, legalName: r.legal_name, gstin: r.gstin, sharesGstWith: r.shares_gst_with ?? undefined, quotePrefix: r.quote_prefix, accent: r.accent, billingAddress: r.billing_address, bankDetails: r.bank_details });
const fromCategory = (r: any): ProductCategory => ({ id: r.id, companyId: r.company_id, name: r.name, synonyms: r.synonyms ?? [] });
const fromUser = (r: any): User => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role, companyId: r.company_id ?? null, title: r.title });
const fromLead = (r: any): Lead => ({ id: r.id, name: r.name, phone: r.phone, email: r.email ?? undefined, customerCompany: r.customer_company ?? undefined, location: r.location ?? undefined, gstNumber: r.gst_number ?? undefined, source: r.source, status: r.status, priority: r.priority, companyId: r.company_id, categoryId: r.category_id ?? null, assignedToUserId: r.assigned_to_user_id ?? null, requestText: r.request_text ?? "", needsManualRouting: r.needs_manual_routing, unservedRequest: r.unserved_request ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at });
const fromActivity = (r: any): Activity => ({ id: r.id, leadId: r.lead_id, at: r.at, byUserId: r.by_user_id, kind: r.kind, text: r.text });
const fromRequirement = (r: any): Requirement => ({ id: r.id, leadId: r.lead_id, companyId: r.company_id, categoryId: r.category_id ?? null, requestText: r.request_text ?? "", status: r.status, fields: r.fields ?? [], createdAt: r.created_at, deliveryDate: r.delivery_date ?? undefined });
const fromQuotation = (r: any): Quotation => ({ id: r.id, requirementId: r.requirement_id, leadId: r.lead_id, companyId: r.company_id, quotationNo: r.quotation_no, projectNo: r.project_no, version: r.version, date: r.date, validityDate: r.validity_date, lines: r.lines ?? [], advancePercent: r.advance_percent, balanceTerms: r.balance_terms, ratePerDayNote: r.rate_per_day_note ?? undefined, workOrderRef: r.work_order_ref ?? undefined, approvedBy: r.approved_by ?? undefined, status: r.status, deliveryAddress: r.delivery_address ?? "", deliveryGstin: r.delivery_gstin ?? "", gstPercent: r.gst_percent ?? 18 });
const fromProformaInvoice = (r: any): ProformaInvoice => ({ id: r.id, proformaNo: r.proforma_no, leadId: r.lead_id, quotationId: r.quotation_id, quotationNo: r.quotation_no, companyId: r.company_id, date: r.date, validUntil: r.valid_until, subtotal: Number(r.subtotal), gstPercent: r.gst_percent ?? 0, gstAmount: Number(r.gst_amount), total: Number(r.total), advancePercent: r.advance_percent, advanceAmount: Number(r.advance_amount), balanceAmount: Number(r.balance_amount), clientName: r.client_name, clientCompany: r.client_company ?? undefined, clientAddress: r.client_address ?? undefined, clientGstin: r.client_gstin ?? undefined, clientContactPerson: r.client_contact_person ?? undefined, deliveryAddress: r.delivery_address ?? undefined, deliveryGstin: r.delivery_gstin ?? undefined, note: r.note ?? undefined, status: r.status });
const fromTaxInvoice = (r: any): TaxInvoice => ({ id: r.id, invoiceNo: r.invoice_no, leadId: r.lead_id, quotationId: r.quotation_id ?? undefined, quotationNo: r.quotation_no ?? undefined, proformaId: r.proforma_id ?? undefined, proformaNo: r.proforma_no ?? undefined, companyId: r.company_id, date: r.date, dueDate: r.due_date, lines: r.lines ?? [], placeOfSupply: r.place_of_supply ?? "", gstPercent: r.gst_percent ?? 0, subtotal: Number(r.subtotal), gstAmount: Number(r.gst_amount), total: Number(r.total), advanceReceived: Number(r.advance_received), balanceDue: Number(r.balance_due), clientName: r.client_name, clientCompany: r.client_company ?? undefined, clientAddress: r.client_address ?? undefined, clientGstin: r.client_gstin ?? undefined, clientContactPerson: r.client_contact_person ?? undefined, deliveryAddress: r.delivery_address ?? undefined, deliveryGstin: r.delivery_gstin ?? undefined, note: r.note ?? undefined, status: r.status });
const fromPayment = (r: any): Payment => ({ id: r.id, quotationId: r.quotation_id, leadId: r.lead_id, stage: r.stage, total: Number(r.total), advanceAmount: Number(r.advance_amount), balanceAmount: Number(r.balance_amount), copyToAdmin: r.copy_to_admin, updatedAt: r.updated_at });
const fromFollowUp = (r: any): FollowUp => ({ id: r.id, leadId: r.lead_id, dueAt: r.due_at, reason: r.reason, note: r.note ?? undefined, done: r.done, callAttemptCount: r.call_attempt_count ?? 1, outcome: r.outcome ?? undefined, nextAction: r.next_action ?? undefined, negativeReason: r.negative_reason ?? undefined, competitorName: r.competitor_name ?? undefined, competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined, callbackAt: r.callback_at ?? undefined });
const fromSiteVisit = (r: any): SiteVisit => ({ id: r.id, leadId: r.lead_id, scheduledAt: r.scheduled_at, purpose: r.purpose, location: r.location ?? undefined, note: r.note ?? undefined, status: r.status });
const fromNegotiation = (r: any): NegotiationRecord => ({ leadId: r.lead_id, quotedAmount: Number(r.quoted_amount), expectedAmount: Number(r.expected_amount), competitorName: r.competitor_name ?? undefined, competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined, note: r.note ?? undefined });
const fromNotInterested = (r: any): NotInterestedRecord => ({ leadId: r.lead_id, reason: r.reason, competitorName: r.competitor_name ?? undefined, competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined, whatWouldChange: r.what_would_change ?? undefined, note: r.note ?? undefined });
const fromTarget = (r: any): Target => ({ userId: r.user_id, period: r.period, goal: r.goal, achieved: r.achieved });
const fromUnserved = (r: any): UnservedRequest => ({ id: r.id, text: r.text, phone: r.phone ?? "", loggedByUserId: r.logged_by_user_id, at: r.at });
const fromStatusHistory = (r: any): StatusHistoryEntry => ({ id: r.id, leadId: r.lead_id, oldStatus: r.old_status, newStatus: r.new_status, changedByUserId: r.changed_by_user_id, changedAt: r.changed_at, reason: r.reason ?? undefined });

/* ---- model → row ---- */
const toCompany = (c: Company) => ({ id: c.id, name: c.name, legal_name: c.legalName, gstin: c.gstin, shares_gst_with: c.sharesGstWith ?? null, quote_prefix: c.quotePrefix, accent: c.accent, billing_address: c.billingAddress, bank_details: c.bankDetails });
const toCategory = (c: ProductCategory) => ({ id: c.id, company_id: c.companyId, name: c.name, synonyms: c.synonyms });
const toUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, company_id: u.companyId, title: u.title });
const toLead = (l: Lead) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email ?? null, customer_company: l.customerCompany ?? null, location: l.location ?? null, gst_number: l.gstNumber ?? null, source: l.source, status: l.status, priority: l.priority, company_id: l.companyId, category_id: l.categoryId, assigned_to_user_id: l.assignedToUserId, request_text: l.requestText, needs_manual_routing: l.needsManualRouting, unserved_request: l.unservedRequest ?? null, created_at: l.createdAt, updated_at: l.updatedAt });
const toActivity = (a: Activity) => ({ id: a.id, lead_id: a.leadId, at: a.at, by_user_id: a.byUserId, kind: a.kind, text: a.text });
const toRequirement = (r: Requirement) => ({ id: r.id, lead_id: r.leadId, company_id: r.companyId, category_id: r.categoryId, request_text: r.requestText, status: r.status, fields: r.fields, created_at: r.createdAt, delivery_date: r.deliveryDate ?? null });
const toQuotation = (q: Quotation) => ({ id: q.id, requirement_id: q.requirementId, lead_id: q.leadId, company_id: q.companyId, quotation_no: q.quotationNo, project_no: q.projectNo, version: q.version, date: q.date, validity_date: q.validityDate, lines: q.lines, advance_percent: q.advancePercent, balance_terms: q.balanceTerms, rate_per_day_note: q.ratePerDayNote ?? null, work_order_ref: q.workOrderRef ?? null, approved_by: q.approvedBy ?? null, status: q.status, delivery_address: q.deliveryAddress, delivery_gstin: q.deliveryGstin, gst_percent: q.gstPercent });
const toProformaInvoice = (p: ProformaInvoice) => ({ id: p.id, proforma_no: p.proformaNo, lead_id: p.leadId, quotation_id: p.quotationId, quotation_no: p.quotationNo, company_id: p.companyId, date: p.date, valid_until: p.validUntil, subtotal: p.subtotal, gst_percent: p.gstPercent, gst_amount: p.gstAmount, total: p.total, advance_percent: p.advancePercent, advance_amount: p.advanceAmount, balance_amount: p.balanceAmount, client_name: p.clientName, client_company: p.clientCompany ?? null, client_address: p.clientAddress ?? null, client_gstin: p.clientGstin ?? null, client_contact_person: p.clientContactPerson ?? null, delivery_address: p.deliveryAddress ?? null, delivery_gstin: p.deliveryGstin ?? null, note: p.note ?? null, status: p.status });
const toTaxInvoice = (t: TaxInvoice) => ({ id: t.id, invoice_no: t.invoiceNo, lead_id: t.leadId, quotation_id: t.quotationId ?? null, quotation_no: t.quotationNo ?? null, proforma_id: t.proformaId ?? null, proforma_no: t.proformaNo ?? null, company_id: t.companyId, date: t.date, due_date: t.dueDate, lines: t.lines, place_of_supply: t.placeOfSupply, gst_percent: t.gstPercent, subtotal: t.subtotal, gst_amount: t.gstAmount, total: t.total, advance_received: t.advanceReceived, balance_due: t.balanceDue, client_name: t.clientName, client_company: t.clientCompany ?? null, client_address: t.clientAddress ?? null, client_gstin: t.clientGstin ?? null, client_contact_person: t.clientContactPerson ?? null, delivery_address: t.deliveryAddress ?? null, delivery_gstin: t.deliveryGstin ?? null, note: t.note ?? null, status: t.status });
const toPayment = (p: Payment) => ({ id: p.id, quotation_id: p.quotationId, lead_id: p.leadId, stage: p.stage, total: p.total, advance_amount: p.advanceAmount, balance_amount: p.balanceAmount, copy_to_admin: p.copyToAdmin, updated_at: p.updatedAt });
const toFollowUp = (f: FollowUp) => ({ id: f.id, lead_id: f.leadId, due_at: f.dueAt, reason: f.reason, note: f.note ?? null, done: f.done, call_attempt_count: f.callAttemptCount, outcome: f.outcome ?? null, next_action: f.nextAction ?? null, negative_reason: f.negativeReason ?? null, competitor_name: f.competitorName ?? null, competitor_amount: f.competitorAmount ?? null, callback_at: f.callbackAt ?? null });
const toSiteVisit = (sv: SiteVisit) => ({ id: sv.id, lead_id: sv.leadId, scheduled_at: sv.scheduledAt, purpose: sv.purpose, location: sv.location ?? null, note: sv.note ?? null, status: sv.status });
const toNegotiation = (n: NegotiationRecord) => ({ lead_id: n.leadId, quoted_amount: n.quotedAmount, expected_amount: n.expectedAmount, competitor_name: n.competitorName ?? null, competitor_amount: n.competitorAmount ?? null, note: n.note ?? null });
const toNotInterested = (n: NotInterestedRecord) => ({ lead_id: n.leadId, reason: n.reason, competitor_name: n.competitorName ?? null, competitor_amount: n.competitorAmount ?? null, what_would_change: n.whatWouldChange ?? null, note: n.note ?? null });
const toTarget = (t: Target) => ({ user_id: t.userId, period: t.period, goal: t.goal, achieved: t.achieved });
const toUnserved = (u: UnservedRequest) => ({ id: u.id, text: u.text, phone: u.phone, logged_by_user_id: u.loggedByUserId, at: u.at });
const toStatusHistory = (s: StatusHistoryEntry) => ({ id: s.id, lead_id: s.leadId, old_status: s.oldStatus, new_status: s.newStatus, changed_by_user_id: s.changedByUserId, changed_at: s.changedAt, reason: s.reason ?? null });

/** Pull the whole CRM from Supabase into the in-memory model. */
export async function fetchAll(): Promise<Db> {
  if (!supabase) return emptyDb();
  const sb = supabase;

  // Fetch each table independently so one missing/erroring table never blocks the rest.
  const q = async (table: string): Promise<any[]> => {
    const { data, error } = await sb.from(table).select("*");
    if (error) console.warn(`[fetchAll] ${table}:`, error.message);
    return data ?? [];
  };

  const [companies, categories, users, leads, activities, requirements, quotations, proformaInvoices, taxInvoices, payments, followUps, siteVisits, negotiations, notInterested, targets, unserved, statusHistory] = await Promise.all([
    q("companies"), q("product_categories"), q("app_users"), q("leads"), q("activities"),
    q("requirements"), q("quotations"), q("proforma_invoices"), q("tax_invoices"), q("payments"),
    q("follow_ups"), q("site_visits"), q("negotiations"), q("not_interested"), q("targets"),
    q("unserved_requests"), q("lead_status_history"),
  ]);

  return {
    companies: companies.map(fromCompany),
    categories: categories.map(fromCategory),
    users: users.map(fromUser),
    leads: leads.map(fromLead),
    activities: activities.map(fromActivity),
    requirements: requirements.map(fromRequirement),
    quotations: quotations.map(fromQuotation),
    proformaInvoices: proformaInvoices.map(fromProformaInvoice),
    taxInvoices: taxInvoices.map(fromTaxInvoice),
    payments: payments.map(fromPayment),
    followUps: followUps.map(fromFollowUp),
    siteVisits: siteVisits.map(fromSiteVisit),
    negotiations: negotiations.map(fromNegotiation),
    notInterested: notInterested.map(fromNotInterested),
    targets: targets.map(fromTarget),
    unserved: unserved.map(fromUnserved),
    statusHistory: statusHistory.map(fromStatusHistory),
  };
}

/**
 * Write the full in-memory model back to Supabase via upserts.
 * The app only ever inserts/updates rows (never row deletes), so a full upsert
 * keeps Postgres in sync without diffing.
 */
export async function upsertAll(db: Db): Promise<void> {
  if (!supabase) return;
  const sb = supabase;
  const ops: Promise<any>[] = [];
  const up = (table: string, rows: any[], onConflict?: string) => {
    if (rows.length) ops.push(sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined) as unknown as Promise<any>);
  };
  // Parent tables first (FK order), though upsert tolerates existing rows.
  up("companies", db.companies.map(toCompany));
  up("product_categories", db.categories.map(toCategory));
  up("app_users", db.users.map(toUser));
  up("leads", db.leads.map(toLead));
  up("activities", db.activities.map(toActivity));
  up("requirements", db.requirements.map(toRequirement));
  up("quotations", db.quotations.map(toQuotation));
  up("proforma_invoices", (db.proformaInvoices ?? []).map(toProformaInvoice));
  up("tax_invoices", (db.taxInvoices ?? []).map(toTaxInvoice));
  up("payments", db.payments.map(toPayment));
  up("follow_ups", db.followUps.map(toFollowUp));
  up("site_visits", db.siteVisits.map(toSiteVisit));
  up("negotiations", db.negotiations.map(toNegotiation), "lead_id");
  up("not_interested", db.notInterested.map(toNotInterested), "lead_id");
  up("targets", db.targets.map(toTarget), "user_id,period");
  up("unserved_requests", db.unserved.map(toUnserved));
  up("lead_status_history", (db.statusHistory ?? []).map(toStatusHistory));
  const settled = await Promise.allSettled(ops);
  for (const r of settled) {
    if (r.status === "rejected") console.error("[supabase] upsert failed:", r.reason);
  }
}

/** True if the backend has no companies yet (needs first-time seeding). */
export async function isEmpty(): Promise<boolean> {
  if (!supabase) return false;
  const { count } = await supabase.from("companies").select("id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}
