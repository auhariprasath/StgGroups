import { mutate, newId, getDb } from "./store";
import { canTransition } from "@/lib/status";
import type {
  ActivityKind,
  CompanyId,
  Lead,
  LeadSource,
  LeadStatus,
  Priority,
  FollowUpOutcome,
  FollowUpNextAction,
  FollowUpNegativeReason,
  NotInterestedReason,
} from "./types";

/**
 * All write operations live here so route components stay declarative and the
 * audit trail (activities) is never forgotten. Each lead mutation also stamps
 * updatedAt and, where it matters, appends an activity entry.
 */

function touch(lead: Lead): Lead {
  return { ...lead, updatedAt: new Date().toISOString() };
}

export function logActivity(leadId: string, byUserId: string, kind: ActivityKind, text: string) {
  mutate((db) => {
    db.activities.push({ id: newId("a"), leadId, at: new Date().toISOString(), byUserId, kind, text });
  });
}

export function setLeadStatus(leadId: string, status: LeadStatus, byUserId: string, note?: string, skipValidation = false) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Phase 4: enforce valid transitions (can be bypassed for internal use only)
    if (!skipValidation && !canTransition(lead.status, status)) {
      console.warn(`[CRM] Blocked transition ${lead.status} → ${status} for lead ${leadId}`);
      return;
    }

    const now = new Date().toISOString();
    const oldStatus = lead.status;
    Object.assign(lead, touch({ ...lead, status }));

    // Status history record
    if (!db.statusHistory) db.statusHistory = [];
    db.statusHistory.push({
      id: newId("sh"),
      leadId,
      oldStatus,
      newStatus: status,
      changedByUserId: byUserId,
      changedAt: now,
      reason: note,
    });

    db.activities.push({
      id: newId("a"),
      leadId,
      at: now,
      byUserId,
      kind: "status_change",
      text: note ?? `Status: ${oldStatus.replace(/_/g, " ")} → ${status.replace(/_/g, " ")}`,
    });
  });
}

export function reassignLead(leadId: string, userId: string, companyId: CompanyId, byUserId: string) {
  mutate((db) => {
    const lead = db.leads.find((l) => l.id === leadId);
    const target = db.users.find((u) => u.id === userId);
    if (!lead || !target) return;
    Object.assign(lead, touch({ ...lead, assignedToUserId: userId, companyId, needsManualRouting: false }));
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "transferred",
      text: `Transferred to ${target.name} (${companyId})`,
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
    }
  });

  return { leadId: id, existingLeadId: existing?.id ?? null };
}

export function scheduleFollowUp(leadId: string, dueAt: string, reason: string, byUserId: string, note?: string) {
  mutate((db) => {
    db.followUps.push({ id: newId("f"), leadId, dueAt, reason, note, done: false, callAttemptCount: 1 });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead) Object.assign(lead, touch({ ...lead, status: "followup" }));
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "followup_set",
      text: `Follow-up set for ${new Date(dueAt).toLocaleString("en-IN")} — ${reason}`,
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
 * - Positive: marks lead as "interested" and logs outcome
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
      Object.assign(lead, touch({ ...lead, status: "interested", ...(input.priority ? { priority: input.priority } : {}) }));
      db.activities.push({ id: newId("a"), leadId: input.leadId, at: now, byUserId: input.byUserId, kind: "status_change", text: `Contacted — interested. ${input.requirementNotes ?? ""}`.trim() });
    } else if (input.outcome === "negative") {
      Object.assign(lead, touch({ ...lead, status: "not_interested" }));
      const existing = db.notInterested.find((n) => n.leadId === input.leadId);
      const rec = { leadId: input.leadId, reason: (input.negativeReason ?? "other") as NotInterestedReason, competitorName: input.competitorName ?? undefined, competitorAmount: input.competitorAmount ?? undefined, note: input.note || undefined };
      if (existing) Object.assign(existing, rec);
      else db.notInterested.push(rec);
      db.activities.push({ id: newId("a"), leadId: input.leadId, at: now, byUserId: input.byUserId, kind: "status_change", text: `Contacted — not interested. Reason: ${(input.negativeReason ?? "other").replace(/_/g, " ")}` });
    } else if (input.outcome === "neutral") {
      Object.assign(lead, touch({ ...lead, status: "followup" }));
      db.activities.push({ id: newId("a"), leadId: input.leadId, at: now, byUserId: input.byUserId, kind: "followup_set", text: `Contacted — callback set: ${input.callbackAt ? new Date(input.callbackAt).toLocaleString("en-IN") : "TBD"}. Next: ${(input.nextAction ?? "call_again").replace(/_/g, " ")}` });
    } else {
      // no_response
      db.activities.push({ id: newId("a"), leadId: input.leadId, at: now, byUserId: input.byUserId, kind: "followup_set", text: `No response — attempt logged` });
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
  data: { quotedAmount: number; expectedAmount: number; competitorName?: string; competitorAmount?: number; note?: string },
  byUserId: string,
) {
  mutate((db) => {
    const existing = db.negotiations.find((n) => n.leadId === leadId);
    if (existing) Object.assign(existing, data);
    else db.negotiations.push({ leadId, ...data });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead) Object.assign(lead, touch({ ...lead, status: "negotiation" }));
    db.activities.push({
      id: newId("a"),
      leadId,
      at: new Date().toISOString(),
      byUserId,
      kind: "note",
      text: `Negotiation: quoted ₹${data.quotedAmount.toLocaleString("en-IN")}, client wants ₹${data.expectedAmount.toLocaleString("en-IN")}`,
    });
  });
}

export function markNotInterested(
  leadId: string,
  data: { reason: NotInterestedReason; competitorName?: string; competitorAmount?: number; whatWouldChange?: string; note?: string },
  byUserId: string,
) {
  mutate((db) => {
    const existing = db.notInterested.find((n) => n.leadId === leadId);
    if (existing) Object.assign(existing, data);
    else db.notInterested.push({ leadId, ...data });
    const lead = db.leads.find((l) => l.id === leadId);
    if (lead) Object.assign(lead, touch({ ...lead, status: "not_interested" }));
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
    db.siteVisits.push({ id: newId("sv"), leadId, scheduledAt, purpose, location, note, status: "scheduled" });
    db.activities.push({
      id: newId("a"), leadId, at: new Date().toISOString(), byUserId,
      kind: "note", text: `Meeting scheduled: "${purpose}" on ${new Date(scheduledAt).toLocaleDateString("en-IN")}${location ? ` at ${location}` : ""}`,
    });
  });
}

export function completeSiteVisit(siteVisitId: string, byUserId: string) {
  mutate((db) => {
    const sv = db.siteVisits.find((x) => x.id === siteVisitId);
    if (!sv) return;
    sv.status = "completed";
    db.activities.push({
      id: newId("a"), leadId: sv.leadId, at: new Date().toISOString(), byUserId,
      kind: "note", text: `Meeting completed: "${sv.purpose}"`,
    });
  });
}

export function cancelSiteVisit(siteVisitId: string) {
  mutate((db) => {
    const sv = db.siteVisits.find((x) => x.id === siteVisitId);
    if (sv) sv.status = "cancelled";
  });
}

export function logUnservedRequest(text: string, phone: string, byUserId: string) {
  mutate((db) => {
    db.unserved.push({ id: newId("un"), text, phone, loggedByUserId: byUserId, at: new Date().toISOString() });
  });
}
