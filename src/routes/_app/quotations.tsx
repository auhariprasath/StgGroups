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
import { Search, FileText, Clock, CheckCircle2, Send, AlertTriangle } from "lucide-react";
import type { Quotation } from "@/lib/data/types";

export const Route = createFileRoute("/_app/quotations")({ component: Quotations });

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "expired";

const STATUS_META: Record<Quotation["status"], { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: "Draft", color: "text-muted-foreground", icon: FileText },
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

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "draft", "sent", "accepted", "expired"] as StatusFilter[]).map((f) => (
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
            {f === "all" ? `All (${counts.all ?? 0})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] ?? 0})`}
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
          <div className="p-10 text-center text-sm text-muted-foreground">No quotations match your filters.</div>
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
                          <span className="text-muted-foreground font-normal">· v{quote.version}</span>
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
                      <span className={cn("flex items-center gap-1 text-xs font-medium", meta.color)}>
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
