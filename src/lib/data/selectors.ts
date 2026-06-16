import type { Db, Lead, User, Quotation, ProformaInvoice, TaxInvoice, FollowUp } from "./types";

/**
 * Read-side helpers. Crucially `visibleLeads` enforces the isolation rule:
 * an exec sees ONLY their own company's leads; the MD/super-admin sees all.
 */

export function visibleLeads(db: Db, user: User | null, includeDead = false): Lead[] {
  if (!user) return [];
  const companyFiltered =
    user.role === "super_admin" ? db.leads : db.leads.filter((l) => l.companyId === user.companyId);
  if (includeDead) return companyFiltered;
  return companyFiltered.filter((l) => l.status !== "not_interested" && l.status !== "dormant");
}

export function canSeeLead(user: User | null, lead: Lead | undefined): boolean {
  if (!user || !lead) return false;
  return user.role === "super_admin" || lead.companyId === user.companyId;
}

export function activitiesFor(db: Db, leadId: string) {
  return db.activities
    .filter((a) => a.leadId === leadId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function userName(db: Db, userId: string | null): string {
  if (!userId) return "Unassigned";
  return db.users.find((u) => u.id === userId)?.name ?? "Unknown";
}

export function companyName(db: Db, companyId: string): string {
  return db.companies.find((c) => c.id === companyId)?.name ?? companyId;
}

export interface LeadCustomerHistory {
  quotations: Quotation[];
  proformas: ProformaInvoice[];
  taxInvoices: TaxInvoice[];
  followUps: FollowUp[];
}

/**
 * Full history for the customer behind a lead, grouped by phone number across
 * all of that customer's leads. Used by the duplicate-detection popup to show
 * previous quotations / invoices / follow-ups before the user decides.
 */
export function customerHistoryForLead(db: Db, lead: Lead): LeadCustomerHistory {
  const digits = lead.phone.replace(/\D/g, "").slice(-10);
  const leadIds = new Set(
    db.leads.filter((l) => l.phone.replace(/\D/g, "").slice(-10) === digits).map((l) => l.id),
  );
  return {
    quotations: db.quotations.filter((q) => leadIds.has(q.leadId)),
    proformas: db.proformaInvoices.filter((p) => leadIds.has(p.leadId)),
    taxInvoices: db.taxInvoices.filter((t) => leadIds.has(t.leadId)),
    followUps: db.followUps.filter((f) => leadIds.has(f.leadId) && f.done),
  };
}

export interface FollowUpAnalytics {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  noResponse: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  /** Conversion = leads that reached quote_sent/confirmed/completed ÷ all leads. */
  conversionRate: number;
  lostReasons: { reason: string; count: number }[];
  competitors: { name: string; count: number }[];
  execPerformance: { userId: string; name: string; outcomes: number; positive: number }[];
}

/**
 * Super-admin follow-up analytics: outcome mix, lost-reason breakdown,
 * conversion rate, competitor frequency and per-executive performance.
 * Scoped to the calling user's visibility.
 */
export function followUpAnalytics(db: Db, user: User | null): FollowUpAnalytics {
  const leads = visibleLeads(db, user, true);
  const leadIds = new Set(leads.map((l) => l.id));
  const fus = db.followUps.filter((f) => leadIds.has(f.leadId) && f.outcome);

  const positive = fus.filter((f) => f.outcome === "positive").length;
  const negative = fus.filter((f) => f.outcome === "negative").length;
  const neutral = fus.filter((f) => f.outcome === "neutral").length;
  const noResponse = fus.filter((f) => f.outcome === "no_response").length;
  const total = fus.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const CONVERTED = new Set(["quote_sent", "work_order", "active_project", "completed"]);
  const converted = leads.filter((l) => CONVERTED.has(l.status)).length;

  // Lost reasons (from not_interested records + negative follow-ups)
  const reasonCounts = new Map<string, number>();
  for (const n of db.notInterested) {
    if (!leadIds.has(n.leadId)) continue;
    reasonCounts.set(n.reason, (reasonCounts.get(n.reason) ?? 0) + 1);
  }
  const lostReasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason: reason.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count);

  // Competitor analytics
  const compCounts = new Map<string, number>();
  for (const f of fus) {
    if (f.competitorName)
      compCounts.set(f.competitorName, (compCounts.get(f.competitorName) ?? 0) + 1);
  }
  for (const n of db.notInterested) {
    if (leadIds.has(n.leadId) && n.competitorName)
      compCounts.set(n.competitorName, (compCounts.get(n.competitorName) ?? 0) + 1);
  }
  const competitors = [...compCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Per-executive performance (by lead owner)
  const execMap = new Map<string, { outcomes: number; positive: number }>();
  for (const f of fus) {
    const lead = leads.find((l) => l.id === f.leadId);
    const owner = lead?.assignedToUserId;
    if (!owner) continue;
    const e = execMap.get(owner) ?? { outcomes: 0, positive: 0 };
    e.outcomes += 1;
    if (f.outcome === "positive") e.positive += 1;
    execMap.set(owner, e);
  }
  const execPerformance = [...execMap.entries()]
    .map(([userId, v]) => ({
      userId,
      name: userName(db, userId),
      outcomes: v.outcomes,
      positive: v.positive,
    }))
    .sort((a, b) => b.outcomes - a.outcomes);

  return {
    total,
    positive,
    negative,
    neutral,
    noResponse,
    positivePct: pct(positive),
    negativePct: pct(negative),
    neutralPct: pct(neutral),
    conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
    lostReasons,
    competitors,
    execPerformance,
  };
}

/** Leads that arrived but were never actioned within 24h — high priority. */
export function staleNewLeads(leads: Lead[]): Lead[] {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return leads.filter((l) => l.status === "new" && new Date(l.createdAt).getTime() < dayAgo);
}

export interface CustomerRecord {
  phone: string;
  name: string;
  customerCompany?: string;
  gstNumber?: string;
  leads: Lead[];
  completedLeads: Lead[];
  totalRevenue: number;
  /** ISO string of the most recent activity */
  lastActivityAt: string;
  daysSinceActivity: number;
  /** < 60 days */
  isActive: boolean;
  /** 60–120 days: prompt a re-engagement call */
  needsReengagement: boolean;
  /** > 120 days: high-risk churn */
  isAtRisk: boolean;
  repeatCustomer: boolean;
}

/**
 * Aggregates all completed / converted leads into CustomerRecord objects.
 * Groups by phone number — a customer with multiple engagements gets one record.
 * Visible to the calling user based on their company scope.
 */
export function buildCustomerList(db: Db, user: User | null): CustomerRecord[] {
  const leads = visibleLeads(db, user);
  // A phone number is a customer if ANY of their leads reached completed/confirmed
  const CUSTOMER_STATUSES = new Set(["completed", "active_project", "work_order", "quote_sent"]);
  const customerLeads = leads.filter((l) => CUSTOMER_STATUSES.has(l.status));

  // Group by normalised phone (last 10 digits)
  const byPhone = new Map<string, Lead[]>();
  for (const l of customerLeads) {
    const key = l.phone.replace(/\D/g, "").slice(-10);
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key)!.push(l);
  }

  const now = Date.now();
  const records: CustomerRecord[] = [];

  for (const [phone, groupLeads] of byPhone) {
    const completedLeads = groupLeads.filter((l) => l.status === "completed");

    // Total revenue = sum of fully_paid or advance_paid payment totals
    const revenue = groupLeads.reduce((sum, l) => {
      const p = db.payments.find((p) => p.leadId === l.id);
      if (!p) return sum;
      if (p.stage === "fully_paid") return sum + p.total;
      if (p.stage === "advance_paid") return sum + p.advanceAmount;
      return sum;
    }, 0);

    // Most recent activity across all leads of this customer
    const allActivityDates = groupLeads.flatMap((l) =>
      db.activities.filter((a) => a.leadId === l.id).map((a) => a.at),
    );
    const lastAt = allActivityDates.length
      ? allActivityDates.reduce((a, b) => (a > b ? a : b))
      : groupLeads.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt;

    const daysAgo = Math.floor((now - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24));
    const anchor = groupLeads[0];

    records.push({
      phone,
      name: anchor.name,
      customerCompany: anchor.customerCompany,
      gstNumber: anchor.gstNumber,
      leads: groupLeads,
      completedLeads,
      totalRevenue: revenue,
      lastActivityAt: lastAt,
      daysSinceActivity: daysAgo,
      isActive: daysAgo < 60,
      needsReengagement: daysAgo >= 60 && daysAgo < 120,
      isAtRisk: daysAgo >= 120,
      repeatCustomer: completedLeads.length > 1,
    });
  }

  return records.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
