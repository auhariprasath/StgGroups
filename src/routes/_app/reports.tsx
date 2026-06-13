import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads, buildCustomerList } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Users, IndianRupee, CheckCircle2,
  XCircle, AlertTriangle, BarChart3, Building2, Target,
} from "lucide-react";
import type { LeadStatus } from "@/lib/data/types";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const FUNNEL: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "New", color: "#6366f1" },
  { status: "followup", label: "Follow-up", color: "#8b5cf6" },
  { status: "interested", label: "Interested", color: "#3b82f6" },
  { status: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { status: "quote_sent", label: "Quote Sent", color: "#0ea5e9" },
  { status: "confirmed", label: "Confirmed", color: "#10b981" },
  { status: "completed", label: "Completed", color: "#22c55e" },
];

const LOSS_STATUSES: LeadStatus[] = ["not_interested", "dormant"];

function ReportsPage() {
  const db = useDb();
  const { user, role } = useAuth();
  if (user && role !== "super_admin") return <Navigate to="/dashboard" />;

  const leads = visibleLeads(db, user);
  const customers = useMemo(() => buildCustomerList(db, user), [db, user]);

  /* ─── Revenue ─────────────────────────────────────────────────────────── */
  const collectedRevenue = db.payments
    .filter((p) => p.stage === "fully_paid")
    .reduce((s, p) => s + p.total, 0);

  const advanceReceived = db.payments
    .filter((p) => p.stage === "advance_paid")
    .reduce((s, p) => s + p.advanceAmount, 0);

  const pipelineValue = db.quotations
    .filter((q) => q.status === "sent" || q.status === "accepted")
    .reduce((s, q) => {
      const sub = q.lines.reduce((ss, l) => ss + l.qty * l.rate, 0);
      return s + sub * (1 + (q.gstPercent ?? 18) / 100);
    }, 0);

  /* ─── Funnel ───────────────────────────────────────────────────────────── */
  const funnelCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const maxFunnelCount = Math.max(1, ...FUNNEL.map((f) => funnelCounts[f.status] ?? 0));
  const totalLeads = leads.length;
  const wonLeads = funnelCounts["completed"] ?? 0;
  const lostLeads = LOSS_STATUSES.reduce((s, st) => s + (funnelCounts[st] ?? 0), 0);
  const closedLeads = wonLeads + lostLeads;
  const winRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;

  /* ─── Per-company ─────────────────────────────────────────────────────── */
  const perCompany = useMemo(
    () =>
      db.companies.map((c) => {
        const cLeads = leads.filter((l) => l.companyId === c.id);
        const won = cLeads.filter((l) => l.status === "completed").length;
        const lost = cLeads.filter((l) => LOSS_STATUSES.includes(l.status)).length;
        const closed = won + lost;
        const revenue = db.payments
          .filter((p) => {
            const lead = db.leads.find((l) => l.id === p.leadId);
            return lead?.companyId === c.id && p.stage === "fully_paid";
          })
          .reduce((s, p) => s + p.total, 0);
        return { company: c, total: cLeads.length, won, lost, closed, revenue, winRate: closed > 0 ? Math.round((won / closed) * 100) : 0 };
      }),
    [db, leads],
  );

  /* ─── Per-exec ─────────────────────────────────────────────────────────── */
  const perExec = useMemo(
    () =>
      db.users
        .filter((u) => u.role === "exec")
        .map((u) => {
          const uLeads = leads.filter((l) => l.assignedToUserId === u.id);
          const won = uLeads.filter((l) => l.status === "completed").length;
          const lost = uLeads.filter((l) => LOSS_STATUSES.includes(l.status)).length;
          const closed = won + lost;
          const revenue = db.payments
            .filter((p) => {
              const lead = db.leads.find((l) => l.id === p.leadId);
              return lead?.assignedToUserId === u.id && p.stage === "fully_paid";
            })
            .reduce((s, p) => s + p.total, 0);
          const target = db.targets.find((t) => t.userId === u.id);
          return {
            user: u,
            total: uLeads.length,
            won,
            lost,
            closed,
            revenue,
            winRate: closed > 0 ? Math.round((won / closed) * 100) : 0,
            target,
          };
        })
        .sort((a, b) => b.revenue - a.revenue),
    [db, leads],
  );

  /* ─── Source breakdown ─────────────────────────────────────────────────── */
  const bySrc = useMemo(() => {
    const m = new Map<string, { total: number; won: number }>();
    for (const l of leads) {
      const entry = m.get(l.source) ?? { total: 0, won: 0 };
      entry.total++;
      if (l.status === "completed") entry.won++;
      m.set(l.source, entry);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [leads]);

  return (
    <>
      <PageHeader title="Reports" description="Pipeline funnel, revenue breakdown, and exec performance." />

      {/* ─── KPI row ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total leads" value={totalLeads} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <KpiCard
          label="Win rate"
          value={`${winRate}%`}
          icon={winRate >= 40 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          accent={winRate >= 40 ? "success" : winRate >= 20 ? "neutral" : "danger"}
          sub={`${wonLeads} won / ${lostLeads} lost`}
        />
        <KpiCard
          label="Revenue collected"
          value={formatINR(collectedRevenue)}
          icon={<IndianRupee className="h-4 w-4 text-success" />}
          accent="success"
          sub={`+ ${formatINR(advanceReceived)} advance`}
        />
        <KpiCard
          label="Pipeline value"
          value={formatINR(pipelineValue)}
          icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          sub="Open sent + accepted quotes"
        />
      </div>

      {/* ─── Funnel ──────────────────────────────────────────────────────── */}
      <Section title="Lead pipeline funnel" icon={BarChart3}>
        <div className="space-y-2">
          {FUNNEL.map(({ status, label, color }) => {
            const count = funnelCounts[status] ?? 0;
            const pct = Math.round((count / maxFunnelCount) * 100);
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">{label}</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-white mix-blend-difference">
                    {count}
                  </span>
                </div>
                <span className="w-10 shrink-0 text-sm font-medium">{pct}%</span>
              </div>
            );
          })}

          {/* Loss */}
          {lostLeads > 0 && (
            <div className="mt-2 flex items-center gap-3 opacity-60">
              <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">Dropped</span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-destructive/60"
                  style={{ width: `${Math.round((lostLeads / maxFunnelCount) * 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-destructive">
                  {lostLeads}
                </span>
              </div>
              <span className="w-10 shrink-0 text-sm font-medium text-destructive">
                {Math.round((lostLeads / maxFunnelCount) * 100)}%
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* ─── Per-company ─────────────────────────────────────────────────── */}
      <Section title="By company" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-3">
          {perCompany.map(({ company: c, total, won, lost, winRate: wr, revenue }) => (
            <div key={c.id} className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.accent }} />
                <p className="font-semibold truncate">{c.name}</p>
              </div>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Total leads</dt>
                <dd className="text-right font-medium">{total}</dd>
                <dt className="text-muted-foreground">Won</dt>
                <dd className="text-right font-medium text-success">{won}</dd>
                <dt className="text-muted-foreground">Lost/Dropped</dt>
                <dd className="text-right font-medium text-destructive">{lost}</dd>
                <dt className="text-muted-foreground">Win rate</dt>
                <dd className="text-right font-medium">{wr}%</dd>
                <dt className="text-muted-foreground">Revenue</dt>
                <dd className="text-right font-semibold">{formatINR(revenue)}</dd>
              </dl>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${wr}%`, backgroundColor: c.accent }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Per-exec ────────────────────────────────────────────────────── */}
      <Section title="Executive performance" icon={Target}>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Executive</th>
                <th className="px-4 py-2.5 text-right">Leads</th>
                <th className="px-4 py-2.5 text-right">Won</th>
                <th className="px-4 py-2.5 text-right">Lost</th>
                <th className="px-4 py-2.5 text-right">Win%</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
                <th className="px-4 py-2.5 text-right">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {perExec.map(({ user: u, total, won, lost, winRate: wr, revenue, target }) => {
                const tPct = target ? Math.round((target.achieved / target.goal) * 100) : null;
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.title}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{total}</td>
                    <td className="px-4 py-3 text-right font-medium text-success">{won}</td>
                    <td className="px-4 py-3 text-right text-destructive">{lost}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-semibold", wr >= 40 ? "text-success" : wr < 20 ? "text-destructive" : "")}>
                        {wr}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(revenue)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      {target ? (
                        <div>
                          <span className={cn("font-semibold", tPct! >= 100 ? "text-success" : "")}>
                            {target.achieved}/{target.goal}
                          </span>
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted ml-auto">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(tPct!, 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {perExec.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No executives configured yet.</p>
          )}
        </div>
      </Section>

      {/* ─── Customer health ─────────────────────────────────────────────── */}
      <Section title="Customer health" icon={Users}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBox
            label="Total customers"
            value={customers.length}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <StatBox
            label="Repeat business"
            value={customers.filter((c) => c.repeatCustomer).length}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            accent="primary"
          />
          <StatBox
            label="At risk (>120d)"
            value={customers.filter((c) => c.isAtRisk).length}
            icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            accent="danger"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Lifetime customer revenue: <span className="font-semibold text-foreground">{formatINR(customers.reduce((s, c) => s + c.totalRevenue, 0))}</span>
        </p>
      </Section>

      {/* ─── Lead source breakdown ───────────────────────────────────────── */}
      <Section title="Lead sources" icon={BarChart3}>
        <div className="grid gap-2">
          {bySrc.map(([src, { total, won }]) => {
            const pct = Math.round((total / (totalLeads || 1)) * 100);
            const convPct = total > 0 ? Math.round((won / total) * 100) : 0;
            return (
              <div key={src} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-right text-sm capitalize text-muted-foreground">
                  {src.replace(/_/g, " ")}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div className="h-full rounded-md bg-primary/40" style={{ width: `${pct}%` }} />
                  <span className="absolute inset-0 flex items-center px-2.5 text-xs font-medium">
                    {total} leads
                  </span>
                </div>
                <span className="w-28 shrink-0 text-xs text-muted-foreground">
                  {convPct}% conversion
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function Section({
  title, icon: Icon, children,
}: {
  title: string; icon: typeof BarChart3; children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h2>
      {children}
    </section>
  );
}

function KpiCard({
  label, value, icon, accent, sub,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  accent?: "success" | "danger" | "neutral"; sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p
        className={cn(
          "text-2xl font-bold",
          accent === "success" && "text-success",
          accent === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatBox({
  label, value, icon, accent,
}: {
  label: string; value: number; icon: React.ReactNode; accent?: "primary" | "danger";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      {icon}
      <div>
        <p className={cn("text-2xl font-bold", accent === "danger" && "text-destructive", accent === "primary" && "text-primary")}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
