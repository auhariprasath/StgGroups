import type { LeadStatus, LeadSource, Priority } from "./data/types";

/**
 * Single source of truth for how lifecycle states read in the UI.
 * Plain, professional wording + the design token each maps to, so badges
 * stay consistent everywhere.
 */

export const LEAD_STATUS: Record<LeadStatus, { label: string; token: string; hint: string }> = {
  new: {
    label: "New enquiry",
    token: "var(--color-status-new)",
    hint: "Just arrived — needs first contact",
  },
  first_contact: {
    label: "First contact",
    token: "var(--color-status-first-contact)",
    hint: "Initial contact made",
  },
  followup: {
    label: "Follow-up",
    token: "var(--color-status-followup)",
    hint: "Awaiting a scheduled call-back",
  },
  requirements: {
    label: "Requirements",
    token: "var(--color-status-requirements)",
    hint: "Gathering requirement details",
  },
  quote_sent: {
    label: "Quotation sent",
    token: "var(--color-status-quote-sent)",
    hint: "Awaiting client decision",
  },
  negotiation: {
    label: "Negotiation",
    token: "var(--color-status-negotiation)",
    hint: "Discussing price",
  },
  work_order: {
    label: "Work order",
    token: "var(--color-status-work-order)",
    hint: "Work order issued",
  },
  active_project: {
    label: "Active project",
    token: "var(--color-status-active-project)",
    hint: "Project in progress",
  },
  completed: {
    label: "Completed",
    token: "var(--color-status-completed)",
    hint: "Fully paid — requirement closed",
  },
  not_interested: {
    label: "Not interested",
    token: "var(--color-status-not-interested)",
    hint: "Dropped with reason",
  },
  dormant: {
    label: "Dormant",
    token: "var(--color-status-dormant)",
    hint: "Unresponsive — can be reactivated",
  },
};

/**
 * Phase 4 — Valid status transitions.
 * Only transitions listed here are allowed. The UI enforces this by disabling
 * invalid options; the action layer validates again and throws if bypassed.
 *
 * Backward-compatible: old statuses (interested, confirmed) are kept as valid
 * transition targets so existing data is not orphaned.
 */
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["first_contact", "not_interested", "dormant"],
  first_contact: ["followup", "requirements", "not_interested", "dormant"],
  followup: ["requirements", "not_interested", "dormant"],
  requirements: ["quote_sent", "negotiation", "not_interested"],
  quote_sent: ["negotiation", "work_order", "not_interested"],
  negotiation: ["work_order", "quote_sent", "not_interested"],
  work_order: ["active_project", "negotiation", "not_interested"],
  active_project: ["completed", "work_order"],
  completed: [],
  not_interested: ["followup"],
  dormant: ["followup"],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionError(from: LeadStatus, to: LeadStatus): string | null {
  if (from === to) return null;
  if (canTransition(from, to)) return null;
  const fromLabel = LEAD_STATUS[from]?.label ?? from;
  const toLabel = LEAD_STATUS[to]?.label ?? to;
  return `Cannot move from "${fromLabel}" to "${toLabel}". This transition is not allowed in the current workflow.`;
}

/** The order in which a healthy lead progresses (for pipeline views). */
export const LEAD_FLOW: LeadStatus[] = [
  "new",
  "first_contact",
  "followup",
  "requirements",
  "quote_sent",
  "negotiation",
  "work_order",
  "active_project",
  "completed",
];

/** Statuses that represent a "converted" customer */
export const CONVERTED_STATUSES: LeadStatus[] = [
  "quote_sent",
  "work_order",
  "active_project",
  "completed",
];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  justdial: "JustDial",
  indiamart: "IndiaMART",
  phone: "Phone call",
  whatsapp: "WhatsApp",
  walkin: "Walk-in",
  reference: "Reference",
  existing_customer: "Existing customer",
  manual: "Manual entry",
};

export const PRIORITY: Record<Priority, { label: string; token: string }> = {
  hot: { label: "Hot", token: "var(--color-status-hot)" },
  warm: { label: "Warm", token: "var(--color-status-warm)" },
  cold: { label: "Cold", token: "var(--color-status-cold)" },
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
