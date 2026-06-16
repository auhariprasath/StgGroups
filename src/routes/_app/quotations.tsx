import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads, companyName } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import type { Quotation } from "@/lib/data/types";

export const Route = createFileRoute("/_app/quotations")({ component: Quotations });

type StatusFilter = "all" | "draft" | "pending_approval" | "sent" | "accepted" | "expired";

const STATUS_META: Record<
  Quotation["status"],
  { label: string; color: string; icon: typeof FileText }
> = {
  draft: { label: "Draft", color: "text-muted-foreground", icon: FileText },
  pending_approval: { label: "Pending Approval", color: "text-amber-600", icon: ClipboardCheck },
  sent: { label: "Sent", color: "text-blue-600", icon: Send },
  accepted: { label: "Accepted", color: "text-success", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-amber-600", icon: Clock },
};

function isExpiringSoon(q: Quotation): boolean {
  if (q.status !== "sent") return false;
  const daysLeft = Math.ceil(
    (new Date(q.validityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return daysLeft >= 0 && daysLeft <= 3;
}

function grandTotal(q: Quotation): number {
  const sub = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  return sub * (1 + (q.gstPercent ?? 18) / 100);
}

function Quotations() {
  const db = useDb();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const ids = new Set(visibleLeads(db, user).map((l) => l.id));

  const allRows = useMemo(
    () =>
      db.quotations
        .filter((quote) => ids.has(quote.leadId))
        .map((quote) => {
          const lead = db.leads.find((l) => l.id === quote.leadId);
          const total = grandTotal(quote);
          const expiring = isExpiringSoon(quote);
          return { quote, lead, total, expiring };
        })
        .sort((a, b) => b.quote.date.localeCompare(a.quote.date)),
    [db, ids],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allRows
      .filter(({ quote }) => statusFilter === "all" || quote.status === statusFilter)
      .filter(({ quote, lead }) => {
        if (!term) return true;
        return [
          quote.quotationNo,
          quote.projectNo,
          lead?.name,
          quote.workOrderRef,
          quote.approvedBy,
          String(quote.lines.reduce((s, l) => s + l.qty * l.rate, 0)),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
  }, [allRows, q, statusFilter]);

  // Counts per status for filter tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allRows.length };
    for (const { quote } of allRows) c[quote.status] = (c[quote.status] ?? 0) + 1;
    return c;
  }, [allRows]);

  const expiringCount = allRows.filter((r) => r.expiring).length;

  // ── Conversion + aging analytics (Phase 6) ──────────────────────────────────
  const analytics = useMemo(() => {
    const total = allRows.length;
    let accepted = 0;
    let expired = 0;
    let negotiation = 0;
    let revenue = 0;
    let valueSum = 0;
    // Aging buckets for live (sent) quotations, by days since issue.
    const aging = { "0-3": 0, "4-7": 0, "8-15": 0, "15+": 0 };
    for (const { quote, total: gt } of allRows) {
      valueSum += gt;
      if (quote.status === "accepted") {
        accepted += 1;
        revenue += gt;
      }
      if (quote.status === "expired") expired += 1;
      if (quote.customerResponse && quote.customerResponse !== "accepted") negotiation += 1;
      if (quote.status === "sent") {
        const days = Math.floor((Date.now() - new Date(quote.date).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 3) aging["0-3"] += 1;
        else if (days <= 7) aging["4-7"] += 1;
        else if (days <= 15) aging["8-15"] += 1;
        else aging["15+"] += 1;
      }
    }
    return {
      total,
      accepted,
      expired,
      negotiation,
      revenue,
      conversionRate: total ? Math.round((accepted / total) * 100) : 0,
      avgValue: total ? Math.round(valueSum / total) : 0,
      aging,
    };
  }, [allRows]);
  // ── End analytics ───────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Quotations"
        description="All quotations across companies — track status, GST-inclusive value, and expiry."
      />

      {/* Expiry alert */}
      {expiringCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">
              {expiringCount} quotation{expiringCount > 1 ? "s" : ""}
            </span>{" "}
            expir{expiringCount > 1 ? "e" : "es"} within 3 days — follow up now.
          </p>
        </div>
      )}

      {/* Conversion analytics */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total quotes" value={String(analytics.total)} />
        <StatCard label="Accepted" value={String(analytics.accepted)} accent="text-success" />
        <StatCard
          label="Conversion"
          value={`${analytics.conversionRate}%`}
          accent="text-primary"
        />
        <StatCard label="In negotiation" value={String(analytics.negotiation)} />
        <StatCard label="Won revenue" value={formatINR(analytics.revenue)} accent="text-success" />
        <StatCard label="Avg value" value={formatINR(analytics.avgValue)} />
      </div>

      {/* Quote aging */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold">Quote aging (sent, awaiting response)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["0-3", "4-7", "8-15", "15+"] as const).map((bucket) => (
            <div key={bucket} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-lg font-bold">{analytics.aging[bucket]}</p>
              <p className="text-xs text-muted-foreground">{bucket} days</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          ["all", "draft", "pending_approval", "sent", "accepted", "expired"] as StatusFilter[]
        ).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              statusFilter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-muted",
            )}
          >
            {f === "all"
              ? `All (${counts.all ?? 0})`
              : `${STATUS_META[f].label} (${counts[f] ?? 0})`}
          </button>
        ))}

        {/* Search — pushed to right */}
        <div className="relative ml-auto flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by number, project, client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No quotations match your filters.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map(({ quote, lead, total, expiring }) => {
              const meta = STATUS_META[quote.status];
              const StatusIcon = meta.icon;
              return (
                <li key={quote.id}>
                  <Link
                    to="/quotation/$leadId"
                    params={{ leadId: quote.leadId }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {quote.quotationNo}{" "}
                          <span className="text-muted-foreground font-normal">
                            · v{quote.version}
                          </span>
                        </p>
                        {expiring && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] dark:bg-amber-900/30 dark:text-amber-300">
                            Expiring soon
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {lead?.name} · {companyName(db, quote.companyId)} · {quote.projectNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateIN(quote.date)} · valid till {formatDateIN(quote.validityDate)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold">{formatINR(total)}</span>
                      <span
                        className={cn("flex items-center gap-1 text-xs font-medium", meta.color)}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold", accent)}>{value}</p>
    </div>
  );
}
