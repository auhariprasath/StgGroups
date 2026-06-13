import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { formatINR } from "@/lib/format";
import { HandCoins, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/negotiations")({ component: Negotiations });

function Negotiations() {
  const db = useDb();
  const { user } = useAuth();
  const ids = new Set(visibleLeads(db, user).map((l) => l.id));
  const items = db.negotiations.filter((n) => ids.has(n.leadId));

  return (
    <>
      <PageHeader title="Negotiations" description="Open price discussions and the gap to close. Competitor intel is captured here." />
      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No active negotiations.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((n) => {
            const lead = db.leads.find((l) => l.id === n.leadId)!;
            const gap = n.quotedAmount - n.expectedAmount;
            return (
              <Link key={n.leadId} to="/leads/$leadId" params={{ leadId: n.leadId }} className="group rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-warning/10 text-warning"><HandCoins className="h-4 w-4" /></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-3 font-semibold">{lead.name}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-xs text-muted-foreground">Quoted</p><p className="font-semibold">{formatINR(n.quotedAmount, { short: true })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Wants</p><p className="font-semibold">{formatINR(n.expectedAmount, { short: true })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Gap</p><p className="font-semibold text-destructive">{formatINR(gap, { short: true })}</p></div>
                </div>
                {n.competitorName && <p className="mt-2 text-xs text-muted-foreground">vs {n.competitorName}{n.competitorAmount ? ` · ${formatINR(n.competitorAmount, { short: true })}` : ""}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
