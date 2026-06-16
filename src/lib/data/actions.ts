import { mutate, newId, getDb } from "./store";
import { canTransition, transitionError } from "@/lib/status";
import type {
  ActivityKind,
  CompanyId,
  Db,
  Lead,
  LeadSource,
  LeadStatus,
  Priority,
  FollowUpOutcome,
  FollowUpNextAction,
  FollowUpNegativeReason,
  NotInterestedReason,
  AppNotification,
  DuplicateMatchType,
  DuplicateAction,
  FollowupTimelineEntry,
  CommunicationLog,
} from "./types";

/**
 * All write operations live here so route components stay declarative and the
 * audit trail (activities) is never forgotten. Each lead mutation also stamps
 * updatedAt and, where it matters, appends an activity entry.
 */

function touch(lead: Lead): Lead {
  return { ...lead, updatedAt: new Date().toISOString() };
}

/**
 * Auto customer-communication templates (Phase 3). Queued as a `message`
 * activity on the lead so the handler can one-tap send via WhatsApp.
 */
export const CUSTOMER_MESSAGES: Partial<Record<FollowUpOutcome, string>> = {
  positive: "Thank you for your interest. Quotation will be shared shortly.",
  neutral: "As discussed, we will follow up on the scheduled date.",
  negative: "Thank you for your time. Please contact us anytime.",
};

export function logFollowupTimeline(entry: {
  leadId: string;
  actionType: string;
  description: string;
  createdBy: string;
}) {
  mutate((db) => {
    if (!db.followupTimeline) db.followupTimeline = [];
    db.followupTimeline.push({
      id: newId("ft"),
      leadId: entry.leadId,
      actionType: entry.actionType,
      description: entry.description,
      createdBy: entry.createdBy,
      timestamp: new Date().toISOString(),
    });
  });
}

export function logNegativeReasonAnalytic(entry: {
  leadId: string;
  companyName: string;
  reasonType: string;
  competitorName?: string;
  notes?: string;
}) {
  mutate((db) => {
    if (!db.negativeReasonAnalytics) db.negativeReasonAnalytics = [];
    db.negativeReasonAnalytics.push({
      id: newId("nra"),
      leadId: entry.leadId,
      companyName: entry.companyName,
      reasonType: entry.reasonType,
      competitorName: entry.competitorName ?? undefined,
      notes: entry.notes ?? undefined,
      createdAt: new Date().toISOString(),
    });
  });
}

export function addNotification(n: Omit<AppNotification, "id" | "createdAt">) {
  mutate((db) => {
    db.notifications.push({
      id: newId("notif"),
      ...n,
      createdAt: new Date().toISOString(),
    });
  });
}

export function logActivity(leadId: string, byUserId: string, kind: ActivityKind, text: string) {
  mutate((db) => {
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind,
      text,
    });
  });
}

/**
 * Core status-change primitive that all status mutations must go through.
 * Handles validation, denormalized fields, status history logging, and
 * optionally an activity entry. Callers inside a mutate() block use this
 * directly; external callers use setLeadStatus().
 */
function applyStatusChange(
  db: Db,
  lead: Lead,
  status: LeadStatus,
  byUserId: string,
  note?: string,
  options?: { skipValidation?: boolean; skipActivity?: boolean },
): void {
  if (!options?.skipValidation && !canTransition(lead.status, status)) {
    throw new Error(
      transitionError(lead.status, status) ?? `Cannot transition from ${lead.status} to ${status}`,
    );
  }

  const now = new Date().toISOString();
  const oldStatus = lead.status;

  // Stamp denormalized fields so the UI never needs to join history.
  lead.previousStatus = oldStatus;
  lead.statusChangedAt = now;
  lead.statusChangedBy = byUserId;

  // Update status + updatedAt timestamp
  Object.assign(lead, touch({ ...lead, status }));

  // Status history entry for the audit trail.
  if (!db.statusHistory) db.statusHistory = [];
  db.statusHistory.push({
    id: newId("sh"),
    leadId: lead.id,
    oldStatus,
    newStatus: status,
    changedByUserId: byUserId,
    changedAt: now,
    reason: note,
  });

  // Optional activity — callers with richer messages pass skipActivity: true
  if (!options?.skipActivity) {
    db.activities.push({
      id: newId("a"),
      leadId: lead.id,
      at: now,
      byUserId,
      kind: "status_change",
      text: note ?? `Status: ${oldStatus.replace(/_/g, " ")} → ${status.replace(/_/g, " ")}`,
    });
  }
}

export function setLeadStatus(
  leadId: string,
  status: LeadStatus,
  byUserId: string,
  note?: string,
  skipValidation = false,
) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === leadId);
    if (!lead) return;
    applyStatusChange(db, lead, status, byUserId, note, { skipValidation });
  });
}

export interface TransferInput {
  leadId: string;
  userId: string;
  companyId: CompanyId;
  byUserId: string;
  reasonType: "wrong_product" | "wrong_company" | "customer_changed" | "business_decision";
  note: string;
}

export function reassignLead(input: TransferInput) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === input.leadId);
    const fromUser = db.users.find((u) => u.id === input.byUserId);
    const target = db.users.find((u) => u.id === input.userId);
    if (!lead || !target) return;
    const oldCompanyId = lead.companyId;
    Object.assign(
      lead,
      touch({
        ...lead,
        assignedToUserId: input.userId,
        companyId: input.companyId,
        needsManualRouting: false,
      }),
    );
    const now = new Date().toISOString();
    db.transferLogs.push({
      id: newId("tl"),
      leadId: input.leadId,
      fromCompanyId: oldCompanyId,
      toCompanyId: input.companyId,
      fromUserId: input.byUserId,
      toUserId: input.userId,
      reasonType: input.reasonType,
      note: input.note,
      transferredBy: fromUser?.name ?? "Unknown",
      createdAt: now,
    });
    const reasonLabels: Record<string, string> = {
      wrong_product: "Wrong product match",
      wrong_company: "Wrong company selection",
      customer_changed: "Customer changed requirement",
      business_decision: "Internal business decision",
    };
    db.activities.push({
      id: newId("a"),
      leadId: input.leadId,
      at: now,
      byUserId: input.byUserId,
      kind: "transferred",
      text: `Transferred to ${target.name} (${input.companyId}) — ${reasonLabels[input.reasonType] ?? input.reasonType}. ${input.note}`,
    });
  });
}

export interface NewLeadInput {
  name: string;
  phone: string;
  email?: string;
  customerCompany?: string;
  location?: string;
  gstNumber?: string;
  source: LeadSource;
  requestText: string;
  priority: Priority;
  /** Company the lead belongs to — chosen explicitly (like Neela). */
  companyId: CompanyId;
  byUserId: string;
}

export interface NewLeadResult {
  leadId: string;
  existingLeadId: string | null;
}

function detectLeadType(
  allLeads: Lead[],
  candidate: { phone: string; companyId: string },
): Lead["leadType"] {
  const digits = candidate.phone.replace(/\D/g, "").slice(-10);
  const match = allLeads.find(
    (l) => l.phone.replace(/\D/g, "").slice(-10) === digits && l.companyId === candidate.companyId,
  );
  if (!match) return "new_lead";
  if (
    match.status === "negotiation" ||
    match.status === "quote_sent" ||
    match.status === "requirements"
  ) {
    return "active_negotiation";
  }
  return "existing_contact";
}

/**
 * Create a lead for the chosen company and assign it to that company's
 * executive. No keyword/equipment detection — the product is selected later in
 * the requirement step. Mirrors Neela's intake flow.
 */
export function createLead(input: NewLeadInput): NewLeadResult {
  const db = getDb();
  const digits = input.phone.replace(/\D/g, "");
  const existing = db.leads.find(
    (l) => l.phone.replace(/\D/g, "") === digits && l.companyId === input.companyId,
  );

  const id = newId("l");
  const assignee = db.users.find((u) => u.companyId === input.companyId && u.role === "exec");

  mutate((draft) => {
    const lead: Lead = {
      id,
      name: input.name,
      phone: input.phone,
      ...(input.email ? { email: input.email } : {}),
      ...(input.customerCompany ? { customerCompany: input.customerCompany } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.gstNumber ? { gstNumber: input.gstNumber } : {}),
      source: input.source,
      status: "new",
      priority: input.priority,
      companyId: input.companyId,
      categoryId: null,
      assignedToUserId: assignee?.id ?? null,
      requestText: input.requestText,
      needsManualRouting: false,
      leadType: detectLeadType(draft.leads, { phone: input.phone, companyId: input.companyId }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.leads.unshift(lead);
    draft.activities.push({
      id: newId("a"),
      leadId: id,
      at: new Date().toISOString(),
      byUserId: input.byUserId,
      kind: "created",
      text: `Lead created from ${input.source}`,
    });
    if (assignee) {
      draft.activities.push({
        id: newId("a"),
        leadId: id,
        at: new Date().toISOString(),
        byUserId: input.byUserId,
        kind: "assigned",
        text: `Assigned to ${assignee.name}`,
      });
      draft.notifications.push({
        id: newId("notif"),
        userId: assignee.id,
        type: "lead_assigned",
        title: `New lead: ${input.name}`,
        message: `A new lead was created from ${input.source}. ${input.requestText ? `"${input.requestText.slice(0, 100)}"` : ""}`,
        priority: "high",
        read: false,
        linkTo: `/leads/${id}`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return { leadId: id, existingLeadId: existing?.id ?? null };
}

export function scheduleFollowUp(
  leadId: string,
  dueAt: string,
  reason: string,
  byUserId: string,
  note?: string,
) {
  mutate((db) => {
    db.followUps.push({
      id: newId("f"),
      leadId,
      dueAt,
      reason,
      note,
      done: false,
      callAttemptCount: 1,
    });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead) applyStatusChange(db, lead, "followup", byUserId, reason, { skipActivity: true });
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "followup_set",
      text: `Follow-up set for ${new Date(dueAt).toLocaleString("en-IN")} — ${reason}`,
    });
    if (!db.followupTimeline) db.followupTimeline = [];
    db.followupTimeline.push({
      id: newId("ft"),
      leadId,
      actionType: "followup_scheduled",
      description: `Follow-up scheduled: ${reason}`,
      createdBy: byUserId,
      timestamp: new Date().toISOString(),
    });
  });
}

export interface RecordContactInput {
  leadId: string;
  byUserId: string;
  outcome: FollowUpOutcome;
  note: string;
  // Neutral
  callbackAt?: string;
  nextAction?: FollowUpNextAction;
  // Negative
  negativeReason?: FollowUpNegativeReason;
  competitorName?: string;
  competitorAmount?: number;
  // Positive
  requirementNotes?: string;
  priority?: Priority;
}

/**
 * Record the outcome of a contact attempt.
 * - Positive: marks lead as "requirements" and logs outcome
 * - Negative: marks lead as "not_interested" with reason
 * - Neutral: schedules a callback (creates a follow-up)
 * - No response: increments attempt count, logs a no-answer entry
 */
export function recordContactOutcome(input: RecordContactInput) {
  const now = new Date().toISOString();
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === input.leadId);
    if (!lead) return;

    const fu = {
      id: newId("f"),
      leadId: input.leadId,
      dueAt: input.callbackAt ?? now,
      reason: input.note || input.outcome,
      note: input.note || undefined,
      done: input.outcome !== "neutral",
      callAttemptCount: 1,
      outcome: input.outcome,
      nextAction: input.nextAction ?? undefined,
      negativeReason: input.negativeReason ?? undefined,
      competitorName: input.competitorName ?? undefined,
      competitorAmount: input.competitorAmount ?? undefined,
      callbackAt: input.callbackAt ?? undefined,
    };
    db.followUps.push(fu);

    if (input.outcome === "positive") {
      applyStatusChange(db, lead, "requirements", input.byUserId, input.requirementNotes, {
        skipActivity: true,
      });
      if (input.priority) lead.priority = input.priority;
      db.activities.push({
        id: newId("a"),
        leadId: input.leadId,
        at: now,
        byUserId: input.byUserId,
        kind: "status_change",
        text: `Contacted — interested. ${input.requirementNotes ?? ""}`.trim(),
      });
    } else if (input.outcome === "negative") {
      applyStatusChange(
        db,
        lead,
        "not_interested",
        input.byUserId,
        input.note || input.negativeReason,
        { skipActivity: true },
      );
      const existing = db.notInterested.find((n) => n.leadId === input.leadId);
      const rec = {
        leadId: input.leadId,
        reason: (input.negativeReason ?? "other") as NotInterestedReason,
        competitorName: input.competitorName ?? undefined,
        competitorAmount: input.competitorAmount ?? undefined,
        note: input.note || undefined,
      };
      if (existing) Object.assign(existing, rec);
      else db.notInterested.push(rec);
      db.activities.push({
        id: newId("a"),
        leadId: input.leadId,
        at: now,
        byUserId: input.byUserId,
        kind: "status_change",
        text: `Contacted — not interested. Reason: ${(input.negativeReason ?? "other").replace(/_/g, " ")}`,
      });
    } else if (input.outcome === "neutral") {
      applyStatusChange(
        db,
        lead,
        "followup",
        input.byUserId,
        input.note || "Neutral — callback scheduled",
        { skipActivity: true },
      );
      db.activities.push({
        id: newId("a"),
        leadId: input.leadId,
        at: now,
        byUserId: input.byUserId,
        kind: "followup_set",
        text: `Contacted — callback set: ${input.callbackAt ? new Date(input.callbackAt).toLocaleString("en-IN") : "TBD"}. Next: ${(input.nextAction ?? "call_again").replace(/_/g, " ")}`,
      });
    } else {
      // no_response — after 3 attempts move to Dormant (not straight to negative)
      const noRespCount = db.followUps.filter(
        (f) => f.leadId === input.leadId && f.outcome === "no_response",
      ).length;
      if (noRespCount >= 3) {
        applyStatusChange(
          db,
          lead,
          "dormant",
          input.byUserId,
          `No response after ${noRespCount} attempts`,
          { skipActivity: true },
        );
        db.activities.push({
          id: newId("a"),
          leadId: input.leadId,
          at: now,
          byUserId: input.byUserId,
          kind: "status_change",
          text: `Moved to Dormant after ${noRespCount} no-response attempts`,
        });
      } else {
        db.activities.push({
          id: newId("a"),
          leadId: input.leadId,
          at: now,
          byUserId: input.byUserId,
          kind: "followup_set",
          text: `No response — attempt ${noRespCount} logged`,
        });
      }
    }

    // Auto customer communication (Phase 3) — queue the templated message so the
    // handler can one-tap send it from the timeline (WhatsApp / SMS / Email).
    const customerMsg = CUSTOMER_MESSAGES[input.outcome];
    if (customerMsg) {
      db.activities.push({
        id: newId("a"),
        leadId: input.leadId,
        at: now,
        byUserId: input.byUserId,
        kind: "message",
        text: `Auto-message to customer: "${customerMsg}"`,
      });
    }

    // Phase 3 — followup timeline entry for every outcome
    if (!db.followupTimeline) db.followupTimeline = [];
    const actionTypeMap: Record<string, string> = {
      positive: "positive_outcome",
      negative: "negative_outcome",
      neutral: "neutral_outcome",
      no_response: "no_response",
    };
    db.followupTimeline.push({
      id: newId("ft"),
      leadId: input.leadId,
      actionType: actionTypeMap[input.outcome] ?? "outcome_recorded",
      description: input.note || `Outcome: ${input.outcome}`,
      createdBy: input.byUserId,
      timestamp: now,
    });

    // Phase 3 — negative reason analytics
    if (input.outcome === "negative" && lead) {
      if (!db.negativeReasonAnalytics) db.negativeReasonAnalytics = [];
      const company = db.companies.find((c) => c.id === lead!.companyId);
      db.negativeReasonAnalytics.push({
        id: newId("nra"),
        leadId: input.leadId,
        companyName: company?.name ?? lead!.companyId,
        reasonType: input.negativeReason ?? "other",
        competitorName: input.competitorName ?? undefined,
        notes: input.note || undefined,
        createdAt: now,
      });
    }
  });
}

export function completeFollowUp(followUpId: string) {
  mutate((db) => {
    const f = db.followUps.find((x) => x.id === followUpId);
    if (f) f.done = true;
  });
}

export function recordNegotiation(
  leadId: string,
  data: {
    quotedAmount: number;
    expectedAmount: number;
    competitorName?: string;
    competitorAmount?: number;
    note?: string;
  },
  byUserId: string,
) {
  mutate((db) => {
    const existing = db.negotiations.find((n) => n.leadId === leadId);
    const rounds = (existing?.rounds ?? 0) + 1;
    if (existing) Object.assign(existing, data, { rounds });
    else db.negotiations.push({ leadId, ...data, rounds });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead)
      applyStatusChange(db, lead, "negotiation", byUserId, data.note, { skipActivity: true });
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "note",
      text: `Negotiation round ${rounds}: quoted ₹${data.quotedAmount.toLocaleString("en-IN")}, client wants ₹${data.expectedAmount.toLocaleString("en-IN")}`,
    });

    // Phase 3: after 3 negotiation rounds, auto-escalate to MD.
    if (rounds >= 3 && lead) {
      const mds = db.users.filter(
        (u) => u.title?.toLowerCase().includes("md") || u.role === "super_admin",
      );
      for (const md of mds) {
        db.notifications.push({
          id: newId("notif"),
          userId: md.id,
          type: "negotiation_escalation",
          title: "Negotiation escalated — 3+ rounds",
          message: `Lead "${lead.name}" has reached ${rounds} negotiation rounds. MD intervention suggested.`,
          priority: "urgent",
          read: false,
          linkTo: `/leads/${leadId}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });
}

export function markNotInterested(
  leadId: string,
  data: {
    reason: NotInterestedReason;
    competitorName?: string;
    competitorAmount?: number;
    whatWouldChange?: string;
    note?: string;
  },
  byUserId: string,
) {
  mutate((db) => {
    const existing = db.notInterested.find((n) => n.leadId === leadId);
    if (existing) Object.assign(existing, data);
    else db.notInterested.push({ leadId, ...data });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead)
      applyStatusChange(db, lead, "not_interested", byUserId, data.note || data.reason, {
        skipActivity: true,
      });
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "status_change",
      text: `Marked not interested — reason: ${data.reason.replace("_", " ")}`,
    });
  });
}

export function scheduleSiteVisit(
  leadId: string,
  scheduledAt: string,
  purpose: string,
  byUserId: string,
  location?: string,
  note?: string,
) {
  mutate((db) => {
    db.siteVisits.push({
      id: newId("sv"),
      leadId,
      scheduledAt,
      purpose,
      location,
      note,
      status: "scheduled",
    });
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "note",
      text: `Meeting scheduled: "${purpose}" on ${new Date(scheduledAt).toLocaleDateString("en-IN")}${location ? ` at ${location}` : ""}`,
    });
  });
}

export function completeSiteVisit(siteVisitId: string, byUserId: string) {
  mutate((db) => {
    const sv = db.siteVisits.find((x) => x.id === siteVisitId);
    if (!sv) return;
    sv.status = "completed";
    db.activities.push({
      id: newId("a"),
      leadId: sv.leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "note",
      text: `Meeting completed: "${sv.purpose}"`,
    });
  });
}

export function cancelSiteVisit(siteVisitId: string) {
  mutate((db) => {
    const sv = db.siteVisits.find((x) => x.id === siteVisitId);
    if (sv) sv.status = "cancelled";
  });
}

/**
 * Reopen a lost (not_interested) or dormant lead back into the follow-up cycle.
 * Full history and timeline are preserved (nothing is deleted); a status_change
 * activity records the reopen.
 */
export function reopenLead(leadId: string, byUserId: string, note?: string) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.status !== "not_interested" && lead.status !== "dormant") return;
    const oldStatus = lead.status;
    const now = new Date().toISOString();
    applyStatusChange(db, lead, "followup", byUserId, note ?? "Lead reopened", {
      skipActivity: true,
    });
    db.activities.push({
      id: newId("a"),
      leadId,
      at: now,
      byUserId,
      kind: "status_change",
      text: note ? `Lead reopened — ${note}` : `Lead reopened from ${oldStatus.replace(/_/g, " ")}`,
    });
    if (!db.followupTimeline) db.followupTimeline = [];
    db.followupTimeline.push({
      id: newId("ft"),
      leadId,
      actionType: "lead_reopened",
      description: note
        ? `Lead reopened — ${note}`
        : `Lead reopened from ${oldStatus.replace(/_/g, " ")}`,
      createdBy: byUserId,
      timestamp: now,
    });
  });
}

export function markInvalid(leadId: string, byUserId: string, note?: string) {
  setLeadStatus(
    leadId,
    "not_interested",
    byUserId,
    note ? `Marked invalid — ${note}` : "Marked invalid",
  );
}

// ── Phase 2 — Duplicate Detection audit + actions ───────────────────────────

/**
 * Record a duplicate-detection action (merged / ignored / linked) into the
 * audit trail. Writes to `duplicateLogs` and appends a human-readable activity
 * on the affected lead so the timeline reflects the decision.
 */
export function logDuplicateAction(input: {
  leadId: string;
  matchedLeadId: string | null;
  matchType: DuplicateMatchType;
  confidenceScore: number;
  actionTaken: DuplicateAction;
  actionedBy: string;
}) {
  mutate((db) => {
    if (!db.duplicateLogs) db.duplicateLogs = [];
    db.duplicateLogs.push({
      id: newId("dup"),
      leadId: input.leadId,
      matchedLeadId: input.matchedLeadId,
      matchType: input.matchType,
      confidenceScore: input.confidenceScore,
      actionTaken: input.actionTaken,
      actionedBy: input.actionedBy,
      createdAt: new Date().toISOString(),
    });
    const auditLeadId = input.matchedLeadId ?? input.leadId;
    db.activities.push({
      id: newId("a"),
      leadId: auditLeadId,
      at: new Date().toISOString(),
      byUserId: input.actionedBy,
      kind: "note",
      text: `Duplicate ${input.actionTaken} — ${input.matchType} match (${input.confidenceScore}% confidence)`,
    });
  });
}

/**
 * Merge a freshly-captured enquiry into an existing lead instead of creating a
 * duplicate. Preserves the existing lead's full history and appends the new
 * enquiry context as an activity note.
 */
export function mergeEnquiryIntoLead(
  existingLeadId: string,
  enquiry: { name: string; phone: string; requestText: string; source: string },
  byUserId: string,
) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === existingLeadId);
    if (!lead) return;
    db.activities.push({
      id: newId("a"),
      leadId: existingLeadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "note",
      text: `Merged new enquiry (${enquiry.source}) from ${enquiry.name} / ${enquiry.phone}: "${enquiry.requestText || "no notes"}"`,
    });
    Object.assign(lead, touch({ ...lead }));
  });
}

export function logCommunication(input: {
  leadId: string;
  invoiceId: string;
  invoiceType: "proforma" | "tax";
  method: "whatsapp" | "email";
  recipient: string;
  subject: string;
  body: string;
  sentBy: string;
}) {
  mutate((db) => {
    if (!db.communicationLogs) db.communicationLogs = [];
    db.communicationLogs.push({
      id: newId("cl"),
      leadId: input.leadId,
      invoiceId: input.invoiceId,
      invoiceType: input.invoiceType,
      method: input.method,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      deliveryStatus: "sent",
      sentAt: new Date().toISOString(),
      sentBy: input.sentBy,
    });
  });
}

export function logUnservedRequest(text: string, phone: string, byUserId: string) {
  mutate((db) => {
    db.unserved.push({
      id: newId("un"),
      text,
      phone,
      loggedByUserId: byUserId,
      at: new Date().toISOString(),
    });
  });
}
