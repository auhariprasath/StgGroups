import type { LeadStatus, LeadSource, Priority } from "./data/types";

/**
 * Single source of truth for how lifecycle states read in the UI.
 * Plain, professional wording + the design token each maps to, so badges
 * stay consistent everywhere.
 */

export const LEAD_STATUS: Record<
  LeadStatus,
  { label: string; token: string; hint: string }
> = {
  new: { label: "New enquiry", token: "var(--color-status-new)", hint: "Just arrived — needs first contact" },
  followup: { label: "Follow-up", token: "var(--color-status-followup)", hint: "Awaiting a scheduled call-back" },
  interested: { label: "Interested", token: "var(--color-status-interested)", hint: "Gathering requirement details" },
  negotiation: { label: "Negotiation", token: "var(--color-status-negotiation)", hint: "Discussing price" },
  quote_sent: { label: "Quotation sent", token: "var(--color-status-quote-sent)", hint: "Awaiting client decision" },
  confirmed: { label: "Confirmed", token: "var(--color-status-confirmed)", hint: "Amount fixed — proforma / advance" },
  completed: { label: "Completed", token: "var(--color-status-completed)", hint: "Fully paid — requirement closed" },
  not_interested: { label: "Not interested", token: "var(--color-status-not-interested)", hint: "Dropped with reason" },
  dormant: { label: "Dormant", token: "var(--color-status-not-interested)", hint: "Unresponsive — can be reactivated" },
};

/**
 * Phase 4 — Valid status transitions.
 * Only transitions listed here are allowed. The UI enforces this by disabling
 * invalid options; the action layer validates again and throws if bypassed.
 */
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["followup", "interested", "not_interested", "dormant"],
  followup: ["interested", "not_interested", "dormant"],
  interested: ["quote_sent", "negotiation", "not_interested"],
  negotiation: ["quote_sent", "confirmed", "not_interested"],
  quote_sent: ["negotiation", "confirmed", "not_interested"],
  confirmed: ["completed", "negotiation"],
  completed: [],
  not_interested: ["followup"],  // reopen
  dormant: ["followup"],         // reactivate
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** The order in which a healthy lead progresses (for pipeline views). */
export const LEAD_FLOW: LeadStatus[] = [
  "new",
  "followup",
  "interested",
  "negotiation",
  "quote_sent",
  "confirmed",
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
