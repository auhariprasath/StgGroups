/**
 * STG Groups CRM — domain model.
 *
 * Everything the UI renders flows through these types. They are intentionally
 * shaped to map 1:1 onto a future Supabase schema (snake_case columns become
 * camelCase fields), so swapping the mock store for real tables later is a
 * thin adapter, not a rewrite.
 */

export type CompanyId = "stg-rentals" | "stg-infra" | "stg-trading";

export type Role = "super_admin" | "exec";

/** The single lead lifecycle. Every lead is in exactly one of these. */
export type LeadStatus =
  | "new" // just arrived, not yet actioned
  | "first_contact" // initial contact made
  | "followup" // contacted, awaiting callback
  | "requirements" // gathering requirement (replaces "interested")
  | "quote_sent" // quotation issued
  | "negotiation" // haggling on price
  | "work_order" // work order issued
  | "active_project" // project in progress
  | "completed" // 100% paid, requirement closed
  | "not_interested" // dropped (with reason)
  | "dormant"; // unresponsive; can be reactivated

export interface StatusHistoryEntry {
  id: string;
  leadId: string;
  oldStatus: LeadStatus;
  newStatus: LeadStatus;
  changedByUserId: string;
  changedAt: string; // ISO
  reason?: string;
}

export type LeadSource =
  | "justdial"
  | "indiamart"
  | "phone"
  | "whatsapp"
  | "walkin"
  | "reference"
  | "existing_customer"
  | "manual";

export type Priority = "hot" | "warm" | "cold";

export interface Company {
  id: CompanyId;
  name: string;
  legalName: string;
  /** Same GSTIN is shared by rentals + infra; trading has its own. */
  gstin: string;
  sharesGstWith?: CompanyId;
  /** Distinct quotation series prefix. */
  quotePrefix: string;
  accent: string; // hex for per-company chips
  billingAddress: string;
  bankDetails: string;
}

export interface ProductCategory {
  id: string;
  companyId: CompanyId;
  /** Canonical display name, e.g. "Boom Lift". */
  name: string;
  /** Alternate spellings/keywords seen on JustDial/IndiaMart/phone. */
  synonyms: string[];
}

export interface Machine {
  id: string;
  categoryId: string;
  companyId: CompanyId;
  name: string;
  make: string;
  model: string;
  platformHeight?: string;
  workingHeight?: string;
  capacity?: string;
  machineWeight?: string;
  engine?: string;
  driveSpeed?: string;
  fuelType?: string;
  specifications?: string;
  rentalCategory?: string;
  safetyNotes?: string;
  imageUrl?: string;
  dailyRate?: number;
  /** Fleet availability — used by the quotation availability engine. */
  availabilityStatus?: "available" | "reserved" | "maintenance" | "booked";
  /** ISO date the machine becomes available again (when booked/maintenance). */
  availableFrom?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  /** null for super_admin (sees all companies). */
  companyId: CompanyId | null;
  title: string;
}

export type ActivityKind =
  | "created"
  | "assigned"
  | "transferred"
  | "note"
  | "followup_set"
  | "status_change"
  | "requirement"
  | "quotation"
  | "payment"
  | "message";

export interface Activity {
  id: string;
  leadId: string;
  at: string; // ISO
  byUserId: string;
  kind: ActivityKind;
  text: string;
}

export interface RequirementField {
  key: string;
  label: string;
  value: string;
  /** When the user couldn't get the data they enter "nil" + a reason. */
  nilReason?: string;
}

export type RequirementStatus = "draft" | "open" | "closed";

export interface Requirement {
  id: string;
  leadId: string;
  companyId: CompanyId;
  categoryId: string | null;
  /** Free-text snapshot of what the customer asked for. */
  requestText: string;
  status: RequirementStatus;
  fields: RequirementField[];
  createdAt: string;
  /** A booked requirement schedules a delivery + reminders. */
  deliveryDate?: string;
}

export interface QuotationLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  machineId?: string;
  machineName?: string;
  workingHeight?: string;
  platformHeight?: string;
  capacity?: string;
  powerSupply?: string;
}

export interface Quotation {
  id: string;
  requirementId: string;
  leadId: string;
  companyId: CompanyId;
  quotationNo: string;
  /** Same projectNo groups all revisions of one project. */
  projectNo: string;
  version: number;
  date: string;
  validityDate: string;
  lines: QuotationLine[];
  /** Commercial terms. */
  advancePercent: number;
  balanceTerms: string; // e.g. "balance against bill within 7 days"
  ratePerDayNote?: string;
  workOrderRef?: string;
  approvedBy?: string;
  status: "draft" | "pending_approval" | "sent" | "accepted" | "expired";
  deliveryAddress: string;
  deliveryGstin: string;
  /** GST rate applied to the subtotal (0 = exempt/no-GST). Default 18. */
  gstPercent: number;
  /** Dedicated mobilisation / demobilisation charges (added to subtotal). */
  mobilizationCharge?: number;
  demobilizationCharge?: number;
  /** View tracking — set when the customer is recorded as having viewed it. */
  viewedAt?: string;
  viewCount?: number;
  /** Customer response after a sent quotation. */
  customerResponse?: CustomerResponseType;
  customerResponseNote?: string;
  customerResponseAt?: string;
  /** Lock engine — set when accepted; blocks edit/delete, allows view/revision. */
  lockedAt?: string;
}

export type CustomerResponseType =
  | "accepted"
  | "too_costly"
  | "need_discount"
  | "competitor_quote"
  | "requirement_change"
  | "no_response"
  | "under_review";

export interface WorkOrder {
  id: string;
  workOrderNo: string;
  leadId: string;
  quotationId: string;
  quotationNo: string;
  companyId: CompanyId;
  date: string;
  validUntil: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  advancePercent: number;
  advanceAmount: number;
  balanceAmount: number;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientGstin?: string;
  clientContactPerson?: string;
  deliveryAddress?: string;
  deliveryGstin?: string;
  poReference?: string;
  acceptanceRemark?: string;
  note?: string;
  status: "draft" | "sent" | "accepted";
}

export interface ProformaInvoice {
  id: string;
  proformaNo: string; // e.g. STGR-PI-2026-001
  leadId: string;
  quotationId: string;
  quotationNo: string;
  workOrderId?: string;
  workOrderNo?: string;
  companyId: CompanyId;
  date: string; // ISO date string
  validUntil: string; // ISO date string
  // Amounts snapshot at time of PI creation
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number; // subtotal + gstAmount
  advancePercent: number;
  advanceAmount: number; // what is due right now
  balanceAmount: number;
  // Client info snapshot
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientGstin?: string;
  clientContactPerson?: string;
  deliveryAddress?: string;
  deliveryGstin?: string;
  note?: string;
  status: "draft" | "sent" | "paid";
}

export interface PaymentRecord {
  id: string;
  leadId: string;
  invoiceId: string;
  invoiceType: "proforma" | "tax";
  amount: number;
  date: string;
  mode: "NEFT" | "RTGS" | "UPI" | "Cheque" | "Cash" | "Card" | "Other";
  reference: string;
  remarks?: string;
  tdsDeducted: number;
  netAmount: number;
  utrProof?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  status: "pending" | "verified" | "approved" | "rejected";
  createdBy: string;
  createdAt: string;
}

export interface InvoiceStatusHistoryEntry {
  id: string;
  invoiceId: string;
  invoiceType: "proforma" | "tax";
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
  remarks?: string;
}

export interface RequirementAuditLog {
  id: string;
  requirementId: string;
  actionType: string; // "created" | "updated" | "nil_resolved" | "nil_alerted"
  fieldKey?: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changedAt: string;
}

export interface CommunicationLog {
  id: string;
  leadId: string;
  invoiceId: string;
  invoiceType: "proforma" | "tax";
  method: "whatsapp" | "email";
  recipient: string;
  subject: string;
  body: string;
  deliveryStatus: "sent" | "delivered" | "read" | "failed";
  sentAt: string;
  sentBy: string;
}

export interface TaxInvoiceLine {
  id: string;
  description: string;
  sacCode: string;
  qty: number;
  unit: string;
  rate: number;
  taxableAmount: number; // qty * rate
}

export interface TaxInvoice {
  id: string;
  invoiceNo: string; // e.g. STGR-INV-2026-001
  leadId: string;
  quotationId?: string;
  quotationNo?: string;
  proformaId?: string;
  proformaNo?: string;
  companyId: CompanyId;
  date: string; // ISO date
  dueDate: string; // ISO date
  lines: TaxInvoiceLine[];
  placeOfSupply: string; // e.g. "Karnataka (29)"
  gstPercent: number;
  subtotal: number; // sum of taxableAmounts
  gstAmount: number; // subtotal * gstPercent / 100
  total: number; // subtotal + gstAmount (invoice value)
  advanceReceived: number;
  balanceDue: number; // total - advanceReceived
  // Client snapshot
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientGstin?: string;
  clientContactPerson?: string;
  deliveryAddress?: string;
  deliveryGstin?: string;
  note?: string;
  status: "draft" | "sent" | "paid";
}

export type PaymentStage =
  | "none"
  | "proforma_sent"
  | "advance_paid"
  | "partially_paid"
  | "fully_paid";

export interface Payment {
  id: string;
  quotationId: string;
  leadId: string;
  stage: PaymentStage;
  total: number;
  advanceAmount: number;
  balanceAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  copyToAdmin: boolean;
  updatedAt: string;
}

export type FollowUpOutcome = "positive" | "negative" | "neutral" | "no_response";

export type FollowUpNextAction =
  | "call_again"
  | "waiting_decision"
  | "meeting"
  | "site_visit"
  | "price_negotiation"
  | "send_quotation";

export type FollowUpNegativeReason =
  | "price_too_high"
  | "already_purchased"
  | "competitor_selected"
  | "no_requirement"
  | "budget_issue"
  | "wrong_contact"
  | "no_response"
  | "timing_issue"
  | "product_not_available"
  | "other";

export interface FollowUp {
  id: string;
  leadId: string;
  dueAt: string; // ISO — when to call / when the call happened
  reason: string; // reason for scheduling (pre-call) or outcome notes (post-call)
  note?: string;
  done: boolean;
  /** How many call attempts have been made for this follow-up cycle. */
  callAttemptCount: number;
  /** Outcome recorded after the contact. */
  outcome?: FollowUpOutcome;
  nextAction?: FollowUpNextAction;
  negativeReason?: FollowUpNegativeReason;
  competitorName?: string;
  competitorAmount?: number;
  /** ISO — scheduled callback for neutral outcomes. */
  callbackAt?: string;
}

export interface NegotiationRecord {
  leadId: string;
  quotedAmount: number;
  expectedAmount: number;
  competitorName?: string;
  competitorAmount?: number;
  note?: string;
  /** Number of negotiation rounds recorded; 3+ auto-escalates to MD. */
  rounds?: number;
}

export type NotInterestedReason =
  | "price_too_high"
  | "already_purchased"
  | "competitor_selected"
  | "no_requirement"
  | "budget_issue"
  | "wrong_contact"
  | "no_response"
  | "timing_issue"
  | "product_not_available"
  | "other"
  | "funds" // legacy aliases kept for existing seed data
  | "low_offer"
  | "competitor";

export interface NotInterestedRecord {
  leadId: string;
  reason: NotInterestedReason;
  competitorName?: string;
  competitorAmount?: number;
  whatWouldChange?: string;
  note?: string;
}

export interface Target {
  userId: string;
  period: string; // e.g. "Jun 2026"
  goal: number; // count of conversions
  achieved: number;
}

export type DuplicateMatchType = "mobile" | "gst" | "company" | "fuzzy" | "email";
export type DuplicateAction = "merged" | "ignored" | "linked";

export interface DuplicateDetectionLog {
  id: string;
  leadId: string;
  matchedLeadId: string | null;
  matchType: DuplicateMatchType;
  confidenceScore: number;
  actionTaken: DuplicateAction;
  actionedBy: string;
  createdAt: string;
}

export type LeadType = "new_lead" | "existing_contact" | "active_negotiation";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  customerCompany?: string;
  location?: string;
  gstNumber?: string;
  source: LeadSource;
  status: LeadStatus;
  previousStatus?: LeadStatus;
  statusChangedAt?: string;
  statusChangedBy?: string;
  priority: Priority;
  companyId: CompanyId;
  categoryId: string | null;
  assignedToUserId: string | null;
  requestText: string;
  needsManualRouting: boolean;
  unservedRequest?: string;
  leadType?: LeadType;
  createdAt: string;
  updatedAt: string;
}

export interface UnservedRequest {
  id: string;
  text: string;
  phone: string;
  loggedByUserId: string;
  at: string;
}

export type SiteVisitStatus = "scheduled" | "completed" | "cancelled";

export const SITE_VISIT_PURPOSES = [
  "Site inspection",
  "Equipment demo",
  "Client office meeting",
  "Price discussion",
  "Work order signing",
] as const;

export interface SiteVisit {
  id: string;
  leadId: string;
  scheduledAt: string; // ISO
  purpose: string;
  location?: string;
  note?: string;
  status: SiteVisitStatus;
}

export interface LeadSourceRecord {
  sourceName: string;
  sourceType: string;
  webhookEnabled: boolean;
  status: "active" | "inactive";
}

export interface ProductAliasMapping {
  id: string;
  keyword: string;
  actualProduct: string;
  company: string;
  confidenceScore: number;
  createdAt: string;
}

export interface LeadAssignmentHistory {
  id: string;
  leadId: string;
  oldOwner: string | null;
  newOwner: string;
  reason: string;
  assignedBy: string;
  createdAt: string;
}

export interface ExistingCustomerHistory {
  id: string;
  customerMobile: string;
  previousQuotations: any[];
  previousInvoices: any[];
  previousPayments: any[];
  previousFollowups: any[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "urgent";
  read: boolean;
  linkTo?: string;
  createdAt: string;
}

export interface TransferLog {
  id: string;
  leadId: string;
  fromCompanyId: CompanyId;
  toCompanyId: CompanyId;
  fromUserId: string;
  toUserId: string;
  reasonType: "wrong_product" | "wrong_company" | "customer_changed" | "business_decision";
  note: string;
  transferredBy: string;
  createdAt: string;
}

export interface FollowupTimelineEntry {
  id: string;
  leadId: string;
  actionType: string;
  description: string;
  createdBy: string;
  timestamp: string;
}

export interface FollowupReminder {
  id: string;
  leadId: string;
  handlerName: string;
  reminderDate: string;
  reminderTime: string;
  status: "pending" | "sent" | "cancelled";
  notificationSent: boolean;
  createdAt: string;
}

export interface NegativeReasonAnalytic {
  id: string;
  leadId: string;
  companyName: string;
  reasonType: string;
  competitorName?: string;
  notes?: string;
  createdAt: string;
}

export interface Db {
  companies: Company[];
  categories: ProductCategory[];
  machines: Machine[];
  users: User[];
  leads: Lead[];
  activities: Activity[];
  requirements: Requirement[];
  quotations: Quotation[];
  proformaInvoices: ProformaInvoice[];
  taxInvoices: TaxInvoice[];
  payments: Payment[];
  workOrders: WorkOrder[];
  paymentRecords: PaymentRecord[];
  invoiceStatusHistory: InvoiceStatusHistoryEntry[];
  followUps: FollowUp[];
  siteVisits: SiteVisit[];
  negotiations: NegotiationRecord[];
  notInterested: NotInterestedRecord[];
  targets: Target[];
  unserved: UnservedRequest[];
  statusHistory: StatusHistoryEntry[];
  transferLogs: TransferLog[];
  leadSources: LeadSourceRecord[];
  aliasMappings: ProductAliasMapping[];
  assignmentHistory: LeadAssignmentHistory[];
  existingCustomerHistory: ExistingCustomerHistory[];
  duplicateLogs: DuplicateDetectionLog[];
  notifications: AppNotification[];
  followupTimeline: FollowupTimelineEntry[];
  followupReminders: FollowupReminder[];
  negativeReasonAnalytics: NegativeReasonAnalytic[];
  requirementAuditLogs: RequirementAuditLog[];
  communicationLogs: CommunicationLog[];
}
