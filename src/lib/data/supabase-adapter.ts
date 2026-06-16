import { supabase } from "@/lib/supabase";
import type {
  Db,
  Company,
  ProductCategory,
  User,
  Lead,
  Activity,
  Requirement,
  Quotation,
  ProformaInvoice,
  TaxInvoice,
  Payment,
  WorkOrder,
  PaymentRecord,
  InvoiceStatusHistoryEntry,
  FollowUp,
  SiteVisit,
  NegotiationRecord,
  NotInterestedRecord,
  Target,
  UnservedRequest,
  StatusHistoryEntry,
  TransferLog,
  LeadSourceRecord,
  ProductAliasMapping,
  LeadAssignmentHistory,
  ExistingCustomerHistory,
  AppNotification,
  DuplicateDetectionLog,
  FollowupTimelineEntry,
  FollowupReminder,
  NegativeReasonAnalytic,
  CommunicationLog,
} from "./types";

/**
 * Translation layer between the camelCase app model and the snake_case
 * Postgres rows. Nested collections (synonyms / fields / lines) are JSONB, so
 * they pass through untouched. This is the ONLY file that knows column names —
 * keeping the store and routes database-agnostic.
 */

export function emptyDb(): Db {
  return {
    companies: [],
    categories: [],
    machines: [],
    users: [],
    leads: [],
    activities: [],
    requirements: [],
    quotations: [],
    proformaInvoices: [],
    taxInvoices: [],
    payments: [],
    workOrders: [],
    paymentRecords: [],
    invoiceStatusHistory: [],
    followUps: [],
    siteVisits: [],
    negotiations: [],
    notInterested: [],
    targets: [],
    unserved: [],
    statusHistory: [],
    transferLogs: [],
    leadSources: [],
    aliasMappings: [],
    assignmentHistory: [],
    existingCustomerHistory: [],
    duplicateLogs: [],
    notifications: [],
    followupTimeline: [],
    followupReminders: [],
    negativeReasonAnalytics: [],
    requirementAuditLogs: [],
    communicationLogs: [],
  };
}

/* ---- row → model ---- */
const fromCompany = (r: any): Company => ({
  id: r.id,
  name: r.name,
  legalName: r.legal_name,
  gstin: r.gstin,
  sharesGstWith: r.shares_gst_with ?? undefined,
  quotePrefix: r.quote_prefix,
  accent: r.accent,
  billingAddress: r.billing_address,
  bankDetails: r.bank_details,
});
const fromCategory = (r: any): ProductCategory => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  synonyms: r.synonyms ?? [],
});
const fromUser = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  role: r.role,
  companyId: r.company_id ?? null,
  title: r.title,
});
const fromLead = (r: any): Lead => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email ?? undefined,
  customerCompany: r.customer_company ?? undefined,
  location: r.location ?? undefined,
  gstNumber: r.gst_number ?? undefined,
  source: r.source,
  status: r.status,
  priority: r.priority,
  companyId: r.company_id,
  categoryId: r.category_id ?? null,
  assignedToUserId: r.assigned_to_user_id ?? null,
  requestText: r.request_text ?? "",
  needsManualRouting: r.needs_manual_routing,
  unservedRequest: r.unserved_request ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const fromActivity = (r: any): Activity => ({
  id: r.id,
  leadId: r.lead_id,
  at: r.at,
  byUserId: r.by_user_id,
  kind: r.kind,
  text: r.text,
});
const fromRequirement = (r: any): Requirement => ({
  id: r.id,
  leadId: r.lead_id,
  companyId: r.company_id,
  categoryId: r.category_id ?? null,
  requestText: r.request_text ?? "",
  status: r.status,
  fields: r.fields ?? [],
  createdAt: r.created_at,
  deliveryDate: r.delivery_date ?? undefined,
});
const fromQuotation = (r: any): Quotation => ({
  id: r.id,
  requirementId: r.requirement_id,
  leadId: r.lead_id,
  companyId: r.company_id,
  quotationNo: r.quotation_no,
  projectNo: r.project_no,
  version: r.version,
  date: r.date,
  validityDate: r.validity_date,
  lines: r.lines ?? [],
  advancePercent: r.advance_percent,
  balanceTerms: r.balance_terms,
  ratePerDayNote: r.rate_per_day_note ?? undefined,
  workOrderRef: r.work_order_ref ?? undefined,
  approvedBy: r.approved_by ?? undefined,
  status: r.status,
  deliveryAddress: r.delivery_address ?? "",
  deliveryGstin: r.delivery_gstin ?? "",
  gstPercent: r.gst_percent ?? 18,
  mobilizationCharge: r.mobilization_charge != null ? Number(r.mobilization_charge) : undefined,
  demobilizationCharge:
    r.demobilization_charge != null ? Number(r.demobilization_charge) : undefined,
  viewedAt: r.viewed_at ?? undefined,
  viewCount: r.view_count != null ? Number(r.view_count) : undefined,
  customerResponse: r.customer_response ?? undefined,
  customerResponseNote: r.customer_response_note ?? undefined,
  customerResponseAt: r.customer_response_at ?? undefined,
  lockedAt: r.locked_at ?? undefined,
});
const fromProformaInvoice = (r: any): ProformaInvoice => ({
  id: r.id,
  proformaNo: r.proforma_no,
  leadId: r.lead_id,
  quotationId: r.quotation_id,
  quotationNo: r.quotation_no,
  companyId: r.company_id,
  date: r.date,
  validUntil: r.valid_until,
  subtotal: Number(r.subtotal),
  gstPercent: r.gst_percent ?? 0,
  gstAmount: Number(r.gst_amount),
  total: Number(r.total),
  advancePercent: r.advance_percent,
  advanceAmount: Number(r.advance_amount),
  balanceAmount: Number(r.balance_amount),
  clientName: r.client_name,
  clientCompany: r.client_company ?? undefined,
  clientAddress: r.client_address ?? undefined,
  clientGstin: r.client_gstin ?? undefined,
  clientContactPerson: r.client_contact_person ?? undefined,
  deliveryAddress: r.delivery_address ?? undefined,
  deliveryGstin: r.delivery_gstin ?? undefined,
  note: r.note ?? undefined,
  status: r.status,
});
const fromTaxInvoice = (r: any): TaxInvoice => ({
  id: r.id,
  invoiceNo: r.invoice_no,
  leadId: r.lead_id,
  quotationId: r.quotation_id ?? undefined,
  quotationNo: r.quotation_no ?? undefined,
  proformaId: r.proforma_id ?? undefined,
  proformaNo: r.proforma_no ?? undefined,
  companyId: r.company_id,
  date: r.date,
  dueDate: r.due_date,
  lines: r.lines ?? [],
  placeOfSupply: r.place_of_supply ?? "",
  gstPercent: r.gst_percent ?? 0,
  subtotal: Number(r.subtotal),
  gstAmount: Number(r.gst_amount),
  total: Number(r.total),
  advanceReceived: Number(r.advance_received),
  balanceDue: Number(r.balance_due),
  clientName: r.client_name,
  clientCompany: r.client_company ?? undefined,
  clientAddress: r.client_address ?? undefined,
  clientGstin: r.client_gstin ?? undefined,
  clientContactPerson: r.client_contact_person ?? undefined,
  deliveryAddress: r.delivery_address ?? undefined,
  deliveryGstin: r.delivery_gstin ?? undefined,
  note: r.note ?? undefined,
  status: r.status,
});
const fromPayment = (r: any): Payment => ({
  id: r.id,
  quotationId: r.quotation_id,
  leadId: r.lead_id,
  stage: r.stage,
  total: Number(r.total),
  advanceAmount: Number(r.advance_amount),
  balanceAmount: Number(r.balance_amount),
  tdsPercent: r.tds_percent ?? 0,
  tdsAmount: r.tds_amount ?? 0,
  copyToAdmin: r.copy_to_admin,
  updatedAt: r.updated_at,
});
const fromFollowUp = (r: any): FollowUp => ({
  id: r.id,
  leadId: r.lead_id,
  dueAt: r.due_at,
  reason: r.reason,
  note: r.note ?? undefined,
  done: r.done,
  callAttemptCount: r.call_attempt_count ?? 1,
  outcome: r.outcome ?? undefined,
  nextAction: r.next_action ?? undefined,
  negativeReason: r.negative_reason ?? undefined,
  competitorName: r.competitor_name ?? undefined,
  competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined,
  callbackAt: r.callback_at ?? undefined,
});
const fromSiteVisit = (r: any): SiteVisit => ({
  id: r.id,
  leadId: r.lead_id,
  scheduledAt: r.scheduled_at,
  purpose: r.purpose,
  location: r.location ?? undefined,
  note: r.note ?? undefined,
  status: r.status,
});
const fromNegotiation = (r: any): NegotiationRecord => ({
  leadId: r.lead_id,
  quotedAmount: Number(r.quoted_amount),
  expectedAmount: Number(r.expected_amount),
  competitorName: r.competitor_name ?? undefined,
  competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined,
  note: r.note ?? undefined,
  rounds: r.rounds != null ? Number(r.rounds) : undefined,
});
const fromNotInterested = (r: any): NotInterestedRecord => ({
  leadId: r.lead_id,
  reason: r.reason,
  competitorName: r.competitor_name ?? undefined,
  competitorAmount: r.competitor_amount != null ? Number(r.competitor_amount) : undefined,
  whatWouldChange: r.what_would_change ?? undefined,
  note: r.note ?? undefined,
});
const fromTarget = (r: any): Target => ({
  userId: r.user_id,
  period: r.period,
  goal: r.goal,
  achieved: r.achieved,
});
const fromUnserved = (r: any): UnservedRequest => ({
  id: r.id,
  text: r.text,
  phone: r.phone ?? "",
  loggedByUserId: r.logged_by_user_id,
  at: r.at,
});
const fromStatusHistory = (r: any): StatusHistoryEntry => ({
  id: r.id,
  leadId: r.lead_id,
  oldStatus: r.old_status,
  newStatus: r.new_status,
  changedByUserId: r.changed_by_user_id,
  changedAt: r.changed_at,
  reason: r.reason ?? undefined,
});
const fromTransferLog = (r: any): TransferLog => ({
  id: r.id,
  leadId: r.lead_id,
  fromCompanyId: r.from_company_id,
  toCompanyId: r.to_company_id,
  fromUserId: r.from_user_id,
  toUserId: r.to_user_id,
  reasonType: r.reason_type,
  note: r.note,
  transferredBy: r.transferred_by,
  createdAt: r.created_at,
});

const fromLeadSource = (r: any): LeadSourceRecord => ({
  sourceName: r.source_name,
  sourceType: r.source_type,
  webhookEnabled: r.webhook_enabled,
  status: r.status,
});
const fromAliasMapping = (r: any): ProductAliasMapping => ({
  id: r.id,
  keyword: r.keyword,
  actualProduct: r.actual_product,
  company: r.company,
  confidenceScore: r.confidence_score,
  createdAt: r.created_at,
});
const fromAssignmentHistory = (r: any): LeadAssignmentHistory => ({
  id: r.id,
  leadId: r.lead_id,
  oldOwner: r.old_owner ?? null,
  newOwner: r.new_owner,
  reason: r.reason ?? "",
  assignedBy: r.assigned_by,
  createdAt: r.created_at,
});
const fromExistingCustomerHistory = (r: any): ExistingCustomerHistory => ({
  id: r.id,
  customerMobile: r.customer_mobile,
  previousQuotations: r.previous_quotations ?? [],
  previousInvoices: r.previous_invoices ?? [],
  previousPayments: r.previous_payments ?? [],
  previousFollowups: r.previous_followups ?? [],
});
const fromCommunicationLog = (r: any): CommunicationLog => ({
  id: r.id,
  leadId: r.lead_id,
  invoiceId: r.invoice_id,
  invoiceType: r.invoice_type,
  method: r.method,
  recipient: r.recipient,
  subject: r.subject,
  body: r.body,
  deliveryStatus: r.delivery_status,
  sentAt: r.sent_at,
  sentBy: r.sent_by,
});
const fromNotification = (r: any): AppNotification => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  title: r.title,
  message: r.message ?? "",
  priority: r.priority,
  read: r.read,
  linkTo: r.link_to ?? undefined,
  createdAt: r.created_at,
});
const fromFollowupTimeline = (r: any): FollowupTimelineEntry => ({
  id: r.id,
  leadId: r.lead_id,
  actionType: r.action_type,
  description: r.description ?? "",
  createdBy: r.created_by,
  timestamp: r.timestamp,
});
const fromFollowupReminder = (r: any): FollowupReminder => ({
  id: r.id,
  leadId: r.lead_id,
  handlerName: r.handler_name,
  reminderDate: r.reminder_date,
  reminderTime: r.reminder_time,
  status: r.status,
  notificationSent: r.notification_sent,
  createdAt: r.created_at,
});
const fromNegativeReasonAnalytic = (r: any): NegativeReasonAnalytic => ({
  id: r.id,
  leadId: r.lead_id,
  companyName: r.company_name,
  reasonType: r.reason_type,
  competitorName: r.competitor_name ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});
const fromDuplicateLog = (r: any): DuplicateDetectionLog => ({
  id: r.id,
  leadId: r.lead_id,
  matchedLeadId: r.matched_lead_id ?? null,
  matchType: r.match_type,
  confidenceScore: r.confidence_score,
  actionTaken: r.action_taken,
  actionedBy: r.actioned_by,
  createdAt: r.created_at,
});
const fromWorkOrder = (r: any): WorkOrder => ({
  id: r.id,
  workOrderNo: r.work_order_no,
  leadId: r.lead_id,
  quotationId: r.quotation_id,
  quotationNo: r.quotation_no,
  companyId: r.company_id,
  date: r.date,
  validUntil: r.valid_until,
  subtotal: Number(r.subtotal),
  gstPercent: r.gst_percent ?? 0,
  gstAmount: Number(r.gst_amount),
  total: Number(r.total),
  advancePercent: r.advance_percent,
  advanceAmount: Number(r.advance_amount),
  balanceAmount: Number(r.balance_amount),
  clientName: r.client_name,
  clientCompany: r.client_company ?? undefined,
  clientAddress: r.client_address ?? undefined,
  clientGstin: r.client_gstin ?? undefined,
  clientContactPerson: r.client_contact_person ?? undefined,
  deliveryAddress: r.delivery_address ?? undefined,
  deliveryGstin: r.delivery_gstin ?? undefined,
  poReference: r.po_reference ?? undefined,
  acceptanceRemark: r.acceptance_remark ?? undefined,
  note: r.note ?? undefined,
  status: r.status,
});
const fromPaymentRecord = (r: any): PaymentRecord => ({
  id: r.id,
  leadId: r.lead_id,
  invoiceId: r.invoice_id,
  invoiceType: r.invoice_type,
  amount: Number(r.amount),
  date: r.date,
  mode: r.mode,
  reference: r.reference,
  remarks: r.remarks ?? undefined,
  tdsDeducted: Number(r.tds_deducted ?? 0),
  netAmount: Number(r.net_amount),
  utrProof: r.utr_proof ?? undefined,
  verifiedBy: r.verified_by ?? undefined,
  verifiedAt: r.verified_at ?? undefined,
  status: r.status,
  createdBy: r.created_by,
  createdAt: r.created_at,
});
const fromInvoiceStatusHistory = (r: any): InvoiceStatusHistoryEntry => ({
  id: r.id,
  invoiceId: r.invoice_id,
  invoiceType: r.invoice_type,
  oldStatus: r.old_status,
  newStatus: r.new_status,
  changedBy: r.changed_by,
  changedAt: r.changed_at,
  remarks: r.remarks ?? undefined,
});

/* ---- model → row ---- */
const toCompany = (c: Company) => ({
  id: c.id,
  name: c.name,
  legal_name: c.legalName,
  gstin: c.gstin,
  shares_gst_with: c.sharesGstWith ?? null,
  quote_prefix: c.quotePrefix,
  accent: c.accent,
  billing_address: c.billingAddress,
  bank_details: c.bankDetails,
});
const toCategory = (c: ProductCategory) => ({
  id: c.id,
  company_id: c.companyId,
  name: c.name,
  synonyms: c.synonyms,
});
const toUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  company_id: u.companyId,
  title: u.title,
});
const toLead = (l: Lead) => ({
  id: l.id,
  name: l.name,
  phone: l.phone,
  email: l.email ?? null,
  customer_company: l.customerCompany ?? null,
  location: l.location ?? null,
  gst_number: l.gstNumber ?? null,
  source: l.source,
  status: l.status,
  priority: l.priority,
  company_id: l.companyId,
  category_id: l.categoryId,
  assigned_to_user_id: l.assignedToUserId,
  request_text: l.requestText,
  needs_manual_routing: l.needsManualRouting,
  unserved_request: l.unservedRequest ?? null,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
});
const toActivity = (a: Activity) => ({
  id: a.id,
  lead_id: a.leadId,
  at: a.at,
  by_user_id: a.byUserId,
  kind: a.kind,
  text: a.text,
});
const toRequirement = (r: Requirement) => ({
  id: r.id,
  lead_id: r.leadId,
  company_id: r.companyId,
  category_id: r.categoryId,
  request_text: r.requestText,
  status: r.status,
  fields: r.fields,
  created_at: r.createdAt,
  delivery_date: r.deliveryDate ?? null,
});
const toQuotation = (q: Quotation) => ({
  id: q.id,
  requirement_id: q.requirementId,
  lead_id: q.leadId,
  company_id: q.companyId,
  quotation_no: q.quotationNo,
  project_no: q.projectNo,
  version: q.version,
  date: q.date,
  validity_date: q.validityDate,
  lines: q.lines,
  advance_percent: q.advancePercent,
  balance_terms: q.balanceTerms,
  rate_per_day_note: q.ratePerDayNote ?? null,
  work_order_ref: q.workOrderRef ?? null,
  approved_by: q.approvedBy ?? null,
  status: q.status,
  delivery_address: q.deliveryAddress,
  delivery_gstin: q.deliveryGstin,
  gst_percent: q.gstPercent,
  mobilization_charge: q.mobilizationCharge ?? null,
  demobilization_charge: q.demobilizationCharge ?? null,
  viewed_at: q.viewedAt ?? null,
  view_count: q.viewCount ?? null,
  customer_response: q.customerResponse ?? null,
  customer_response_note: q.customerResponseNote ?? null,
  customer_response_at: q.customerResponseAt ?? null,
  locked_at: q.lockedAt ?? null,
});
const toProformaInvoice = (p: ProformaInvoice) => ({
  id: p.id,
  proforma_no: p.proformaNo,
  lead_id: p.leadId,
  quotation_id: p.quotationId,
  quotation_no: p.quotationNo,
  company_id: p.companyId,
  date: p.date,
  valid_until: p.validUntil,
  subtotal: p.subtotal,
  gst_percent: p.gstPercent,
  gst_amount: p.gstAmount,
  total: p.total,
  advance_percent: p.advancePercent,
  advance_amount: p.advanceAmount,
  balance_amount: p.balanceAmount,
  client_name: p.clientName,
  client_company: p.clientCompany ?? null,
  client_address: p.clientAddress ?? null,
  client_gstin: p.clientGstin ?? null,
  client_contact_person: p.clientContactPerson ?? null,
  delivery_address: p.deliveryAddress ?? null,
  delivery_gstin: p.deliveryGstin ?? null,
  note: p.note ?? null,
  status: p.status,
});
const toTaxInvoice = (t: TaxInvoice) => ({
  id: t.id,
  invoice_no: t.invoiceNo,
  lead_id: t.leadId,
  quotation_id: t.quotationId ?? null,
  quotation_no: t.quotationNo ?? null,
  proforma_id: t.proformaId ?? null,
  proforma_no: t.proformaNo ?? null,
  company_id: t.companyId,
  date: t.date,
  due_date: t.dueDate,
  lines: t.lines,
  place_of_supply: t.placeOfSupply,
  gst_percent: t.gstPercent,
  subtotal: t.subtotal,
  gst_amount: t.gstAmount,
  total: t.total,
  advance_received: t.advanceReceived,
  balance_due: t.balanceDue,
  client_name: t.clientName,
  client_company: t.clientCompany ?? null,
  client_address: t.clientAddress ?? null,
  client_gstin: t.clientGstin ?? null,
  client_contact_person: t.clientContactPerson ?? null,
  delivery_address: t.deliveryAddress ?? null,
  delivery_gstin: t.deliveryGstin ?? null,
  note: t.note ?? null,
  status: t.status,
});
const toPayment = (p: Payment) => ({
  id: p.id,
  quotation_id: p.quotationId,
  lead_id: p.leadId,
  stage: p.stage,
  total: p.total,
  advance_amount: p.advanceAmount,
  balance_amount: p.balanceAmount,
  tds_percent: p.tdsPercent,
  tds_amount: p.tdsAmount,
  copy_to_admin: p.copyToAdmin,
  updated_at: p.updatedAt,
});
const toFollowUp = (f: FollowUp) => ({
  id: f.id,
  lead_id: f.leadId,
  due_at: f.dueAt,
  reason: f.reason,
  note: f.note ?? null,
  done: f.done,
  call_attempt_count: f.callAttemptCount,
  outcome: f.outcome ?? null,
  next_action: f.nextAction ?? null,
  negative_reason: f.negativeReason ?? null,
  competitor_name: f.competitorName ?? null,
  competitor_amount: f.competitorAmount ?? null,
  callback_at: f.callbackAt ?? null,
});
const toSiteVisit = (sv: SiteVisit) => ({
  id: sv.id,
  lead_id: sv.leadId,
  scheduled_at: sv.scheduledAt,
  purpose: sv.purpose,
  location: sv.location ?? null,
  note: sv.note ?? null,
  status: sv.status,
});
const toNegotiation = (n: NegotiationRecord) => ({
  lead_id: n.leadId,
  quoted_amount: n.quotedAmount,
  expected_amount: n.expectedAmount,
  competitor_name: n.competitorName ?? null,
  competitor_amount: n.competitorAmount ?? null,
  note: n.note ?? null,
  rounds: n.rounds ?? 1,
});
const toNotInterested = (n: NotInterestedRecord) => ({
  lead_id: n.leadId,
  reason: n.reason,
  competitor_name: n.competitorName ?? null,
  competitor_amount: n.competitorAmount ?? null,
  what_would_change: n.whatWouldChange ?? null,
  note: n.note ?? null,
});
const toTarget = (t: Target) => ({
  user_id: t.userId,
  period: t.period,
  goal: t.goal,
  achieved: t.achieved,
});
const toUnserved = (u: UnservedRequest) => ({
  id: u.id,
  text: u.text,
  phone: u.phone,
  logged_by_user_id: u.loggedByUserId,
  at: u.at,
});
const toStatusHistory = (s: StatusHistoryEntry) => ({
  id: s.id,
  lead_id: s.leadId,
  old_status: s.oldStatus,
  new_status: s.newStatus,
  changed_by_user_id: s.changedByUserId,
  changed_at: s.changedAt,
  reason: s.reason ?? null,
});
const toTransferLog = (t: TransferLog) => ({
  id: t.id,
  lead_id: t.leadId,
  from_company_id: t.fromCompanyId,
  to_company_id: t.toCompanyId,
  from_user_id: t.fromUserId,
  to_user_id: t.toUserId,
  reason_type: t.reasonType,
  note: t.note,
  transferred_by: t.transferredBy,
  created_at: t.createdAt,
});

const toLeadSource = (l: LeadSourceRecord) => ({
  source_name: l.sourceName,
  source_type: l.sourceType,
  webhook_enabled: l.webhookEnabled,
  status: l.status,
});
const toAliasMapping = (a: ProductAliasMapping) => ({
  id: a.id,
  keyword: a.keyword,
  actual_product: a.actualProduct,
  company: a.company,
  confidence_score: a.confidenceScore,
  created_at: a.createdAt,
});
const toAssignmentHistory = (a: LeadAssignmentHistory) => ({
  id: a.id,
  lead_id: a.leadId,
  old_owner: a.oldOwner,
  new_owner: a.newOwner,
  reason: a.reason,
  assigned_by: a.assignedBy,
  created_at: a.createdAt,
});
const toExistingCustomerHistory = (e: ExistingCustomerHistory) => ({
  id: e.id,
  customer_mobile: e.customerMobile,
  previous_quotations: e.previousQuotations,
  previous_invoices: e.previousInvoices,
  previous_payments: e.previousPayments,
  previous_followups: e.previousFollowups,
});
const toFollowupTimeline = (t: FollowupTimelineEntry) => ({
  id: t.id,
  lead_id: t.leadId,
  action_type: t.actionType,
  description: t.description,
  created_by: t.createdBy,
  timestamp: t.timestamp,
});
const toFollowupReminder = (r: FollowupReminder) => ({
  id: r.id,
  lead_id: r.leadId,
  handler_name: r.handlerName,
  reminder_date: r.reminderDate,
  reminder_time: r.reminderTime,
  status: r.status,
  notification_sent: r.notificationSent,
  created_at: r.createdAt,
});
const toNegativeReasonAnalytic = (n: NegativeReasonAnalytic) => ({
  id: n.id,
  lead_id: n.leadId,
  company_name: n.companyName,
  reason_type: n.reasonType,
  competitor_name: n.competitorName ?? null,
  notes: n.notes ?? null,
  created_at: n.createdAt,
});
const toDuplicateLog = (d: DuplicateDetectionLog) => ({
  id: d.id,
  lead_id: d.leadId,
  matched_lead_id: d.matchedLeadId,
  match_type: d.matchType,
  confidence_score: d.confidenceScore,
  action_taken: d.actionTaken,
  actioned_by: d.actionedBy,
  created_at: d.createdAt,
});
const toWorkOrder = (w: WorkOrder) => ({
  id: w.id,
  work_order_no: w.workOrderNo,
  lead_id: w.leadId,
  quotation_id: w.quotationId,
  quotation_no: w.quotationNo,
  company_id: w.companyId,
  date: w.date,
  valid_until: w.validUntil,
  subtotal: w.subtotal,
  gst_percent: w.gstPercent,
  gst_amount: w.gstAmount,
  total: w.total,
  advance_percent: w.advancePercent,
  advance_amount: w.advanceAmount,
  balance_amount: w.balanceAmount,
  client_name: w.clientName,
  client_company: w.clientCompany ?? null,
  client_address: w.clientAddress ?? null,
  client_gstin: w.clientGstin ?? null,
  client_contact_person: w.clientContactPerson ?? null,
  delivery_address: w.deliveryAddress ?? null,
  delivery_gstin: w.deliveryGstin ?? null,
  po_reference: w.poReference ?? null,
  acceptance_remark: w.acceptanceRemark ?? null,
  note: w.note ?? null,
  status: w.status,
});
const toPaymentRecord = (p: PaymentRecord) => ({
  id: p.id,
  lead_id: p.leadId,
  invoice_id: p.invoiceId,
  invoice_type: p.invoiceType,
  amount: p.amount,
  date: p.date,
  mode: p.mode,
  reference: p.reference,
  remarks: p.remarks ?? null,
  tds_deducted: p.tdsDeducted,
  net_amount: p.netAmount,
  utr_proof: p.utrProof ?? null,
  verified_by: p.verifiedBy ?? null,
  verified_at: p.verifiedAt ?? null,
  status: p.status,
  created_by: p.createdBy,
  created_at: p.createdAt,
});
const toInvoiceStatusHistory = (h: InvoiceStatusHistoryEntry) => ({
  id: h.id,
  invoice_id: h.invoiceId,
  invoice_type: h.invoiceType,
  old_status: h.oldStatus,
  new_status: h.newStatus,
  changed_by: h.changedBy,
  changed_at: h.changedAt,
  remarks: h.remarks ?? null,
});
const toNotification = (n: AppNotification) => ({
  id: n.id,
  user_id: n.userId,
  type: n.type,
  title: n.title,
  message: n.message,
  priority: n.priority,
  read: n.read,
  link_to: n.linkTo ?? null,
  created_at: n.createdAt,
});
const toCommunicationLog = (c: CommunicationLog) => ({
  id: c.id,
  lead_id: c.leadId,
  invoice_id: c.invoiceId,
  invoice_type: c.invoiceType,
  method: c.method,
  recipient: c.recipient,
  subject: c.subject,
  body: c.body,
  delivery_status: c.deliveryStatus,
  sent_at: c.sentAt,
  sent_by: c.sentBy,
});

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

  const [
    companies,
    categories,
    users,
    leads,
    activities,
    requirements,
    quotations,
    proformaInvoices,
    taxInvoices,
    payments,
    workOrders,
    paymentRecords,
    invoiceStatusHistory,
    followUps,
    siteVisits,
    negotiations,
    notInterested,
    targets,
    unserved,
    statusHistory,
    transferLogs,
    leadSources,
    aliasMappings,
    assignmentHistory,
    existingCustomerHistory,
    duplicateLogs,
    notifications,
    followupTimeline,
    followupReminders,
    negativeReasonAnalytics,
    communicationLogs,
  ] = await Promise.all([
    q("companies"),
    q("product_categories"),
    q("app_users"),
    q("leads"),
    q("activities"),
    q("requirements"),
    q("quotations"),
    q("proforma_invoices"),
    q("tax_invoices"),
    q("payments"),
    q("work_orders"),
    q("payment_records"),
    q("invoice_status_history"),
    q("follow_ups"),
    q("site_visits"),
    q("negotiations"),
    q("not_interested"),
    q("targets"),
    q("unserved_requests"),
    q("lead_status_history"),
    q("lead_transfer_logs"),
    q("lead_sources"),
    q("product_alias_mapping"),
    q("lead_assignment_history"),
    q("existing_customer_history"),
    q("duplicate_detection_logs"),
    q("notifications"),
    q("followup_timeline"),
    q("followup_reminders"),
    q("negative_reason_analytics"),
    q("communication_logs"),
  ]);

  return {
    companies: companies.map(fromCompany),
    categories: categories.map(fromCategory),
    machines: [],
    users: users.map(fromUser),
    leads: leads.map(fromLead),
    activities: activities.map(fromActivity),
    requirements: requirements.map(fromRequirement),
    quotations: quotations.map(fromQuotation),
    proformaInvoices: proformaInvoices.map(fromProformaInvoice),
    taxInvoices: taxInvoices.map(fromTaxInvoice),
    payments: payments.map(fromPayment),
    workOrders: (workOrders ?? []).map(fromWorkOrder),
    paymentRecords: (paymentRecords ?? []).map(fromPaymentRecord),
    invoiceStatusHistory: (invoiceStatusHistory ?? []).map(fromInvoiceStatusHistory),
    followUps: followUps.map(fromFollowUp),
    siteVisits: siteVisits.map(fromSiteVisit),
    negotiations: negotiations.map(fromNegotiation),
    notInterested: notInterested.map(fromNotInterested),
    targets: targets.map(fromTarget),
    unserved: unserved.map(fromUnserved),
    statusHistory: statusHistory.map(fromStatusHistory),
    transferLogs: (transferLogs ?? []).map(fromTransferLog),
    leadSources: (leadSources ?? []).map(fromLeadSource),
    aliasMappings: (aliasMappings ?? []).map(fromAliasMapping),
    duplicateLogs: (duplicateLogs ?? []).map(fromDuplicateLog),
    assignmentHistory: (assignmentHistory ?? []).map(fromAssignmentHistory),
    existingCustomerHistory: (existingCustomerHistory ?? []).map(fromExistingCustomerHistory),
    notifications: (notifications ?? []).map(fromNotification),
    followupTimeline: (followupTimeline ?? []).map(fromFollowupTimeline),
    followupReminders: (followupReminders ?? []).map(fromFollowupReminder),
    negativeReasonAnalytics: (negativeReasonAnalytics ?? []).map(fromNegativeReasonAnalytic),
    requirementAuditLogs: [],
    communicationLogs: (communicationLogs ?? []).map(fromCommunicationLog),
  };
}

/**
 * Write the full in-memory model back to Supabase via upserts.
 * Returns an array of error messages — empty means all succeeded.
 */
export async function upsertAll(db: Db): Promise<string[]> {
  if (!supabase) return [];
  const sb = supabase;

  /**
   * Upsert a batch sequentially, then return errors.
   * Run multiple batches one after the other so parent rows (leads, companies)
   * are committed before child rows (activities, quotations) — avoiding FK violations.
   */
  async function batch(
    label: string,
    ups: { table: string; rows: any[]; onConflict?: string }[],
  ): Promise<string[]> {
    const errs: string[] = [];
    for (const { table, rows, onConflict } of ups) {
      if (!rows.length) continue;
      const raw = sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
      const res = await Promise.resolve(raw).catch((err: any) => ({ error: err }));
      if (res?.error) {
        const msg = `[supabase] ${table} (${label}): ${res.error?.message ?? res.error}`;
        console.error(msg);
        errs.push(msg);
      }
    }
    return errs;
  }

  const allErrors: string[] = [];

  // Batch 0 — root tables (no FK dependencies)
  allErrors.push(
    ...(await batch("root", [
      { table: "companies", rows: db.companies.map(toCompany) },
      { table: "product_categories", rows: db.categories.map(toCategory) },
      { table: "app_users", rows: db.users.map(toUser) },
      { table: "lead_sources", rows: db.leadSources ?? [] },
      { table: "product_alias_mapping", rows: db.aliasMappings ?? [] },
      { table: "unserved_requests", rows: db.unserved.map(toUnserved) },
      { table: "existing_customer_history", rows: db.existingCustomerHistory ?? [] },
    ])),
  );

  // Batch 1 — depends on companies + users
  allErrors.push(
    ...(await batch("level-1", [
      { table: "leads", rows: db.leads.map(toLead) },
      { table: "targets", rows: db.targets.map(toTarget), onConflict: "user_id,period" },
      { table: "notifications", rows: (db.notifications ?? []).map(toNotification) },
    ])),
  );

  // Batch 2 — depends on leads, companies, users (child tables with lead FKs)
  allErrors.push(
    ...(await batch("level-2", [
      { table: "activities", rows: db.activities.map(toActivity) },
      { table: "requirements", rows: db.requirements.map(toRequirement) },
      { table: "quotations", rows: db.quotations.map(toQuotation) },
      { table: "follow_ups", rows: db.followUps.map(toFollowUp) },
      { table: "site_visits", rows: db.siteVisits.map(toSiteVisit) },
      { table: "negotiations", rows: db.negotiations.map(toNegotiation), onConflict: "lead_id" },
      {
        table: "not_interested",
        rows: db.notInterested.map(toNotInterested),
        onConflict: "lead_id",
      },
      { table: "payments", rows: db.payments.map(toPayment) },
      { table: "lead_status_history", rows: (db.statusHistory ?? []).map(toStatusHistory) },
      { table: "lead_transfer_logs", rows: (db.transferLogs ?? []).map(toTransferLog) },
      {
        table: "lead_assignment_history",
        rows: (db.assignmentHistory ?? []).map(toAssignmentHistory),
      },
      { table: "followup_timeline", rows: (db.followupTimeline ?? []).map(toFollowupTimeline) },
      { table: "followup_reminders", rows: (db.followupReminders ?? []).map(toFollowupReminder) },
      {
        table: "negative_reason_analytics",
        rows: (db.negativeReasonAnalytics ?? []).map(toNegativeReasonAnalytic),
      },
      { table: "proforma_invoices", rows: (db.proformaInvoices ?? []).map(toProformaInvoice) },
      { table: "tax_invoices", rows: (db.taxInvoices ?? []).map(toTaxInvoice) },
      { table: "work_orders", rows: (db.workOrders ?? []).map(toWorkOrder) },
      { table: "payment_records", rows: (db.paymentRecords ?? []).map(toPaymentRecord) },
      {
        table: "invoice_status_history",
        rows: (db.invoiceStatusHistory ?? []).map(toInvoiceStatusHistory),
      },
      { table: "communication_logs", rows: (db.communicationLogs ?? []).map(toCommunicationLog) },
    ])),
  );

  // Batch 2 — depends on leads, companies, users (child tables with lead FKs)
  allErrors.push(
    ...(await batch("level-2", [
      { table: "activities", rows: db.activities.map(toActivity) },
      { table: "requirements", rows: db.requirements.map(toRequirement) },
      { table: "quotations", rows: db.quotations.map(toQuotation) },
      { table: "follow_ups", rows: db.followUps.map(toFollowUp) },
      { table: "site_visits", rows: db.siteVisits.map(toSiteVisit) },
      { table: "negotiations", rows: db.negotiations.map(toNegotiation), onConflict: "lead_id" },
      {
        table: "not_interested",
        rows: db.notInterested.map(toNotInterested),
        onConflict: "lead_id",
      },
      { table: "payments", rows: db.payments.map(toPayment) },
      { table: "lead_status_history", rows: db.statusHistory ?? [] },
      { table: "lead_transfer_logs", rows: db.transferLogs ?? [] },
      { table: "lead_assignment_history", rows: db.assignmentHistory ?? [] },
      { table: "followup_timeline", rows: db.followupTimeline ?? [] },
      { table: "followup_reminders", rows: db.followupReminders ?? [] },
      { table: "negative_reason_analytics", rows: db.negativeReasonAnalytics ?? [] },
      { table: "proforma_invoices", rows: db.proformaInvoices ?? [] },
      { table: "tax_invoices", rows: db.taxInvoices ?? [] },
      { table: "work_orders", rows: db.workOrders ?? [] },
      { table: "payment_records", rows: db.paymentRecords ?? [] },
      { table: "invoice_status_history", rows: db.invoiceStatusHistory ?? [] },
      { table: "communication_logs", rows: db.communicationLogs ?? [] },
    ])),
  );

  return allErrors;
}

/** True if the backend has no companies yet (needs first-time seeding). */
export async function isEmpty(): Promise<boolean> {
  if (!supabase) return false;
  const { count } = await supabase.from("companies").select("id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}
