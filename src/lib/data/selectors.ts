import type { Db, Lead, User } from "./types";

/**
 * Read-side helpers. Crucially `visibleLeads` enforces the isolation rule:
 * an exec sees ONLY their own company's leads; the MD/super-admin sees all.
 */

export function visibleLeads(db: Db, user: User | null): Lead[] {
  if (!user) return [];
  if (user.role === "super_admin") return db.leads;
  return db.leads.filter((l) => l.companyId === user.companyId);
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
  const CUSTOMER_STATUSES = new Set(["completed", "confirmed", "quote_sent"]);
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
