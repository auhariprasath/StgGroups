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
  | "new"           // just arrived, not yet actioned
  | "followup"      // contacted, awaiting callback
  | "interested"    // gathering requirement
  | "negotiation"   // haggling on price
  | "quote_sent"    // quotation issued
  | "confirmed"     // amount fixed, proforma/advance stage
  | "completed"     // 100% paid, requirement closed
  | "not_interested" // dropped (with reason)
  | "dormant";      // unresponsive; can be reactivated

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
  status: "draft" | "sent" | "accepted" | "expired";
  deliveryAddress: string;
  deliveryGstin: string;
  /** GST rate applied to the subtotal (0 = exempt/no-GST). Default 18. */
  gstPercent: number;
}

export interface ProformaInvoice {
  id: string;
  proformaNo: string;       // e.g. STGR-PI-2026-001
  leadId: string;
  quotationId: string;
  quotationNo: string;
  companyId: CompanyId;
  date: string;             // ISO date string
  validUntil: string;       // ISO date string
  // Amounts snapshot at time of PI creation
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;            // subtotal + gstAmount
  advancePercent: number;
  advanceAmount: number;    // what is due right now
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
  invoiceNo: string;      // e.g. STGR-INV-2026-001
  leadId: string;
  quotationId?: string;
  quotationNo?: string;
  proformaId?: string;
  proformaNo?: string;
  companyId: CompanyId;
  date: string;           // ISO date
  dueDate: string;        // ISO date
  lines: TaxInvoiceLine[];
  placeOfSupply: string;  // e.g. "Karnataka (29)"
  gstPercent: number;
  subtotal: number;       // sum of taxableAmounts
  gstAmount: number;      // subtotal * gstPercent / 100
  total: number;          // subtotal + gstAmount (invoice value)
  advanceReceived: number;
  balanceDue: number;     // total - advanceReceived
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

export type PaymentStage = "none" | "proforma_sent" | "advance_paid" | "fully_paid";

export interface Payment {
  id: string;
  quotationId: string;
  leadId: string;
  stage: PaymentStage;
  total: number;
  advanceAmount: number;
  balanceAmount: number;
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
  | "funds"    // legacy aliases kept for existing seed data
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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  /** Optional contact email — used for duplicate detection (Phase 2). */
  email?: string;
  /** Customer's company / organisation name. */
  customerCompany?: string;
  /** Project site city or area. */
  location?: string;
  /** Customer's GST number — enables cross-company duplicate detection. */
  gstNumber?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: Priority;
  companyId: CompanyId;
  /** Equipment category the request matched (drives spec fields). */
  categoryId: string | null;
  assignedToUserId: string | null;
  requestText: string;
  /** Set when intake couldn't classify (phone call, unknown product). */
  needsManualRouting: boolean;
  /** Product we don't carry — logged for the "common requests" board. */
  unservedRequest?: string;
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

export interface Db {
  companies: Company[];
  categories: ProductCategory[];
  users: User[];
  leads: Lead[];
  activities: Activity[];
  requirements: Requirement[];
  quotations: Quotation[];
  proformaInvoices: ProformaInvoice[];
  taxInvoices: TaxInvoice[];
  payments: Payment[];
  followUps: FollowUp[];
  siteVisits: SiteVisit[];
  negotiations: NegotiationRecord[];
  notInterested: NotInterestedRecord[];
  targets: Target[];
  unserved: UnservedRequest[];
  statusHistory: StatusHistoryEntry[];
}
