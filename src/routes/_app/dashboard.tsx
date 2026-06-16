import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import {
  visibleLeads,
  staleNewLeads,
  userName,
  companyName,
  buildCustomerList,
  followUpAnalytics,
} from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { formatDateTimeIN, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Users,
  PhoneCall,
  Truck,
  HandCoins,
  AlertTriangle,
  Target as TargetIcon,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  PartyPopper,
  IndianRupee,
  BadgeCheck,
  RefreshCw,
  Building2,
  Percent,
} from "lucide-react";
import type { Db, Lead, User } from "@/lib/data/types";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const db = useDb();
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "super_admin" ? (
    <AdminDashboard db={db} user={user} />
  ) : (
    <ExecDashboard db={db} user={user} />
  );
}

/* ── Shared helpers ──────────────────────────────────────── */

function upcomingDeliveries(db: Db, leads: Lead[]) {
  const ids = new Set(leads.map((l) => l.id));
  const now = Date.now();
  const horizon = now + 2 * 24 * 60 * 60 * 1000;
  return db.requirements
    .filter(
      (r) =>
        ids.has(r.leadId) &&
        r.deliveryDate &&
        new Date(r.deliveryDate).getTime() <= horizon &&
        r.status !== "closed",
    )
    .sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());
}

function StatCard({
  to,
  icon: Icon,
  label,
  value,
  tone = "default",
  sub,
}: {
  to: string;
  icon: typeof Users;
  label: string;
  value: number | string;
  tone?: "default" | "danger" | "warn" | "good";
  sub?: string;
}) {
  const toneCls = {
    default: "text-primary bg-primary/10",
    danger: "text-destructive bg-destructive/10",
    warn: "text-warning bg-warning/10",
    good: "text-success bg-success/10",
  }[tone];
  return (
    <Link
      to={to}
      className="group rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", toneCls)}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Link>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LeadRow({ db, lead }: { db: Db; lead: Lead }) {
  return (
    <Link
      to="/leads/$leadId"
      params={{ leadId: lead.id }}
      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{lead.name}</p>
        <p className="truncate text-xs text-muted-foreground">{lead.requestText}</p>
      </div>
      <StatusBadge status={lead.status} />
    </Link>
  );
}

/* ── Executive dashboard ─────────────────────────────────── */

function ExecDashboard({ db, user }: { db: Db; user: User }) {
  const leads = visibleLeads(db, user);
  const followUps = db.followUps
    .filter((f) => !f.done && leads.some((l) => l.id === f.leadId))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const dueFollowUps = followUps.filter(
    (f) => new Date(f.dueAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000,
  );
  const stale = staleNewLeads(leads);
  const deliveries = upcomingDeliveries(db, leads);
  const negotiations = db.negotiations.filter((n) => leads.some((l) => l.id === n.leadId));
  const newCount = leads.filter((l) => l.status === "new").length;
  const target = db.targets.find((t) => t.userId === user.id);
  const pct = target ? Math.round((target.achieved / target.goal) * 100) : 0;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={`${companyName(db, user.companyId ?? "")} · your pipeline at a glance`}
      />

      {stale.length > 0 && (
        <Link
          to="/leads"
          className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">
              {stale.length} new lead{stale.length > 1 ? "s" : ""} not actioned in 24h
            </p>
            <p className="text-sm text-muted-foreground">
              Call them now — fresh leads go cold fast.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-destructive" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          to="/leads"
          icon={Users}
          label="New leads"
          value={newCount}
          tone={newCount ? "warn" : "default"}
        />
        <StatCard
          to="/follow-ups"
          icon={PhoneCall}
          label="Follow-ups due"
          value={dueFollowUps.length}
          tone={dueFollowUps.length ? "danger" : "good"}
        />
        <StatCard
          to="/deliveries"
          icon={Truck}
          label="Deliveries ≤ 2 days"
          value={deliveries.length}
          tone={deliveries.length ? "warn" : "default"}
        />
        <StatCard
          to="/negotiations"
          icon={HandCoins}
          label="In negotiation"
          value={negotiations.length}
        />
      </div>

      {/* Daily reminders section */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Link
          to="/follow-ups"
          className="group rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/10 text-warning">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Follow-ups due today</p>
                <p className="text-2xl font-bold">{dueFollowUps.length}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </Link>
        <Link
          to="/leads"
          className="group rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending new leads</p>
                <p className="text-2xl font-bold">{newCount}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Panel
            title="Today & tomorrow — deliveries"
            icon={Truck}
            action={
              <Link to="/deliveries" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {deliveries.length ? (
              <ul className="space-y-1">
                {deliveries.map((r) => {
                  const lead = db.leads.find((l) => l.id === r.leadId)!;
                  return (
                    <Link
                      key={r.id}
                      to="/leads/$leadId"
                      params={{ leadId: r.leadId }}
                      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-accent/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.fields.find((f) => f.key === "location")?.value}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-warning">
                        {formatDateTimeIN(r.deliveryDate!)}
                      </span>
                    </Link>
                  );
                })}
              </ul>
            ) : (
              <Empty text="No deliveries in the next 2 days." />
            )}
          </Panel>

          <Panel
            title="Follow-ups due"
            icon={PhoneCall}
            action={
              <Link to="/follow-ups" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {dueFollowUps.length ? (
              <ul className="space-y-1">
                {dueFollowUps.map((f) => {
                  const lead = db.leads.find((l) => l.id === f.leadId)!;
                  return (
                    <Link
                      key={f.id}
                      to="/leads/$leadId"
                      params={{ leadId: f.leadId }}
                      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-accent/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{f.reason}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          new Date(f.dueAt).getTime() < Date.now()
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatDateTimeIN(f.dueAt)}
                      </span>
                    </Link>
                  );
                })}
              </ul>
            ) : (
              <Empty text="No follow-ups due. Nicely on top of it." />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Your target" icon={TargetIcon}>
            {target ? (
              <div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold">
                    {target.achieved}
                    <span className="text-base font-normal text-muted-foreground">
                      /{target.goal}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">{pct}%</p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {pct >= 100 ? (
                    <>
                      <PartyPopper className="h-4 w-4 text-success" /> Target smashed!
                    </>
                  ) : pct >= 50 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" /> Halfway there — keep going!
                    </>
                  ) : (
                    <>
                      {target.goal - target.achieved} more to hit {target.period}'s goal.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <Empty text="No target set." />
            )}
          </Panel>

          <Panel title="Active pipeline" icon={TrendingUp}>
            <div className="space-y-0.5">
              {leads
                .filter((l) => ["requirements", "quote_sent", "work_order"].includes(l.status))
                .slice(0, 6)
                .map((l) => (
                  <LeadRow key={l.id} db={db} lead={l} />
                ))}
              {leads.filter((l) => ["requirements", "quote_sent", "work_order"].includes(l.status))
                .length === 0 && <Empty text="Nothing active right now." />}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ── Admin / MD dashboard ────────────────────────────────── */

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "#94a3b8" },
  { key: "first_contact", label: "First contact", color: "#818cf8" },
  { key: "followup", label: "Follow-up", color: "#60a5fa" },
  { key: "requirements", label: "Requirements", color: "#a78bfa" },
  { key: "quote_sent", label: "Quoted", color: "#f97316" },
  { key: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { key: "work_order", label: "Work order", color: "#14b8a6" },
  { key: "active_project", label: "Active project", color: "#22c55e" },
  { key: "completed", label: "Completed", color: "#16a34a" },
] as const;

function AdminDashboard({ db, user }: { db: Db; user: User }) {
  const leads = db.leads;
  const execs = db.users.filter((u) => u.role === "exec");
  const stale = staleNewLeads(leads);

  // Revenue: sum of fully_paid payment totals
  const totalRevenue = useMemo(
    () => db.payments.filter((p) => p.stage === "fully_paid").reduce((s, p) => s + p.total, 0),
    [db.payments],
  );

  // Pipeline value: all active quotations (sent + accepted), GST-inclusive
  const pipelineValue = useMemo(
    () =>
      db.quotations
        .filter((q) => q.status === "sent" || q.status === "accepted")
        .reduce((s, q) => {
          const sub = q.lines.reduce((x, l) => x + l.qty * l.rate, 0);
          return s + sub + Math.round((sub * (q.gstPercent ?? 0)) / 100);
        }, 0),
    [db.quotations],
  );

  // Win rate
  const closedCount = leads.filter(
    (l) => l.status === "completed" || l.status === "not_interested",
  ).length;
  const wonCount = leads.filter((l) => l.status === "completed").length;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  // Customer re-engagement
  const customers = buildCustomerList(db, user);
  const reengageCount = customers.filter((c) => c.needsReengagement || c.isAtRisk).length;

  // Follow-up analytics (Phase 3)
  const fa = useMemo(() => followUpAnalytics(db, user), [db, user]);

  // Company stats
  const companies = db.companies.map((c) => {
    const cLeads = leads.filter((l) => l.companyId === c.id);
    const cRevenue = db.payments
      .filter((p) => p.stage === "fully_paid" && cLeads.some((l) => l.id === p.leadId))
      .reduce((s, p) => s + p.total, 0);
    const cPipeline = db.quotations
      .filter((q) => q.companyId === c.id && (q.status === "sent" || q.status === "accepted"))
      .reduce((s, q) => {
        const sub = q.lines.reduce((x, l) => x + l.qty * l.rate, 0);
        return s + sub + Math.round((sub * (q.gstPercent ?? 0)) / 100);
      }, 0);
    const activeLeads = cLeads.filter(
      (l) => !["completed", "not_interested", "dormant"].includes(l.status),
    ).length;
    return { company: c, cLeads, cRevenue, cPipeline, activeLeads };
  });

  // Expiring quotations (validity date within 3 days)
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const expiringSoon = db.quotations.filter(
    (q) =>
      q.status === "sent" &&
      new Date(q.validityDate) <= soon &&
      new Date(q.validityDate) >= new Date(),
  );

  const won = leads
    .filter((l) => l.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader
        title="MD Command Centre"
        description="Live view across STG Rentals, Infra & Trading."
      />

      {/* Alerts */}
      {stale.length > 0 && (
        <Link
          to="/leads"
          className="mb-3 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 hover:bg-destructive/10"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm">
            <span className="font-semibold text-destructive">
              {stale.length} new lead{stale.length > 1 ? "s" : ""}
            </span>{" "}
            unactioned for 24h+.
          </p>
          <ArrowRight className="h-4 w-4 text-destructive" />
        </Link>
      )}
      {reengageCount > 0 && (
        <Link
          to="/customers"
          className="mb-5 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
        >
          <RefreshCw className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {reengageCount} customer{reengageCount > 1 ? "s" : ""}
            </span>{" "}
            need re-engagement (60+ days inactive).
          </p>
          <ArrowRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}
      {expiringSoon.length > 0 && (
        <Link
          to="/quotations"
          className="mb-5 flex items-center gap-3 rounded-xl border border-orange-300 bg-orange-50/60 p-4 hover:bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
          <p className="flex-1 text-sm">
            <span className="font-semibold text-orange-700 dark:text-orange-400">
              {expiringSoon.length} quotation{expiringSoon.length > 1 ? "s" : ""}
            </span>{" "}
            expiring in 3 days — follow up before they lapse.
          </p>
          <ArrowRight className="h-4 w-4 text-orange-500" />
        </Link>
      )}

      {/* Top KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard to="/leads" icon={Users} label="Total leads" value={leads.length} />
        <StatCard
          to="/leads"
          icon={IndianRupee}
          label="Revenue collected"
          value={formatINR(totalRevenue, { short: true })}
          tone="good"
        />
        <StatCard
          to="/quotations"
          icon={TrendingUp}
          label="Active pipeline"
          value={formatINR(pipelineValue, { short: true })}
          tone="default"
        />
        <StatCard
          to="/leads"
          icon={Percent}
          label="Win rate"
          value={`${winRate}%`}
          tone={winRate >= 50 ? "good" : winRate >= 25 ? "warn" : "danger"}
        />
      </div>

      {/* Company breakdown */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {companies.map(({ company: c, cLeads, cRevenue, cPipeline, activeLeads }) => (
          <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: c.accent }}
              />
              <p className="font-semibold text-sm truncate">{c.name}</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads</span>
                <span className="font-medium">{cLeads.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{activeLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium text-success">
                  {formatINR(cRevenue, { short: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pipeline</span>
                <span className="font-medium">{formatINR(cPipeline, { short: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="mt-5 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Pipeline funnel
        </h2>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map(({ key, label, color }) => {
            const count = leads.filter((l) => l.status === key).length;
            return (
              <Link
                key={key}
                to="/leads"
                className="flex min-w-[90px] flex-col items-center rounded-xl border px-3 py-2.5 text-center hover:bg-accent/50"
              >
                <span className="text-2xl font-bold" style={{ color }}>
                  {count}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Follow-up analytics (Phase 3) */}
      <div className="mt-5 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Follow-up analytics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border p-3 text-center">
            <div className="text-2xl font-bold text-success">{fa.positivePct}%</div>
            <div className="text-xs text-muted-foreground">Positive ({fa.positive})</div>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <div className="text-2xl font-bold text-warning">{fa.neutralPct}%</div>
            <div className="text-xs text-muted-foreground">Neutral ({fa.neutral})</div>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{fa.negativePct}%</div>
            <div className="text-xs text-muted-foreground">Negative ({fa.negative})</div>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <div className="text-2xl font-bold">{fa.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">Conversion rate</div>
          </div>
        </div>
        {(fa.lostReasons.length > 0 || fa.competitors.length > 0) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fa.lostReasons.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Top lost reasons</p>
                <div className="space-y-1">
                  {fa.lostReasons.slice(0, 5).map((r) => (
                    <div key={r.reason} className="flex justify-between text-sm capitalize">
                      <span>{r.reason}</span>
                      <span className="font-medium">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fa.competitors.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Competitors seen</p>
                <div className="space-y-1">
                  {fa.competitors.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-medium">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Team activity & targets"
            icon={TrendingUp}
            action={
              <Link to="/team" className="text-xs font-medium text-primary hover:underline">
                Open team view
              </Link>
            }
          >
            <div className="space-y-3">
              {execs.map((e) => {
                const t = db.targets.find((x) => x.userId === e.id);
                const eLeads = leads.filter((l) => l.companyId === e.companyId);
                const active = eLeads.filter(
                  (l) => !["completed", "not_interested"].includes(l.status),
                ).length;
                const eWon = eLeads.filter((l) => l.status === "completed").length;
                const eLost = eLeads.filter((l) => l.status === "not_interested").length;
                const pct = t ? Math.round((t.achieved / t.goal) * 100) : 0;
                const eRevenue = db.payments
                  .filter((p) => p.stage === "fully_paid" && eLeads.some((l) => l.id === p.leadId))
                  .reduce((s, p) => s + p.total, 0);
                return (
                  <div key={e.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {companyName(db, e.companyId ?? "")}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">{active}</span> active
                        </div>
                        <div className="text-success">
                          {formatINR(eRevenue, { short: true })} revenue
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium text-success">{eWon}</span> won
                      </span>
                      <span>
                        <span className="font-medium text-destructive">{eLost}</span> lost
                      </span>
                      {eWon + eLost > 0 && (
                        <span>
                          <span className="font-medium">
                            {Math.round((eWon / (eWon + eLost)) * 100)}%
                          </span>{" "}
                          win rate
                        </span>
                      )}
                    </div>
                    {t && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Target {t.period}</span>
                          <span className="font-medium">
                            {t.achieved}/{t.goal} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: pct >= 50 ? "var(--success)" : "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Needs attention" icon={AlertTriangle}>
            <div className="space-y-0.5">
              {leads
                .filter((l) => l.status === "negotiation" || l.needsManualRouting)
                .slice(0, 6)
                .map((l) => (
                  <LeadRow key={l.id} db={db} lead={l} />
                ))}
              {leads.filter((l) => l.status === "negotiation" || l.needsManualRouting).length ===
                0 && <Empty text="All clear." />}
            </div>
          </Panel>
          <Panel
            title="Customers"
            icon={BadgeCheck}
            action={
              <Link to="/customers" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total customers</span>
                <span className="font-medium">{customers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active ({"<"}60d)</span>
                <span className="font-medium text-success">
                  {customers.filter((c) => c.isActive).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Need re-engagement</span>
                <span className="font-medium text-amber-600">
                  {customers.filter((c) => c.needsReengagement).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">At risk ({">120d"})</span>
                <span className="font-medium text-destructive">
                  {customers.filter((c) => c.isAtRisk).length}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">Repeat customers</span>
                <span className="font-medium text-primary">
                  {customers.filter((c) => c.repeatCustomer).length}
                </span>
              </div>
            </div>
          </Panel>
          <Panel title="Recently completed" icon={CheckCircle2}>
            <div className="space-y-0.5">
              {won.slice(0, 5).map((l) => (
                <LeadRow key={l.id} db={db} lead={l} />
              ))}
              {won.length === 0 && <Empty text="No completed deals yet." />}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}
