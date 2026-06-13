import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads } from "@/lib/data/selectors";
import { completeFollowUp } from "@/lib/data/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTimeIN } from "@/lib/format";
import { toast } from "sonner";
import { PhoneCall, Check, ChevronRight, AlertTriangle, Flame, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/follow-ups")({ component: FollowUps });

function overdueDays(dueAt: string): number {
  const diff = Date.now() - new Date(dueAt).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
}

function EscalationBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  if (days >= 7) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
      <Flame className="h-3 w-3" /> {days}d — High risk
    </span>
  );
  if (days >= 3) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
      <AlertTriangle className="h-3 w-3" /> {days}d — Needs admin review
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
      <Clock className="h-3 w-3" /> {days}d overdue
    </span>
  );
}

function FollowUps() {
  const db = useDb();
  const { user } = useAuth();
  const leadIds = new Set(visibleLeads(db, user).map((l) => l.id));

  const items = db.followUps
    .filter((f) => !f.done && leadIds.has(f.leadId))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const overdueCount = items.filter((f) => overdueDays(f.dueAt) > 0).length;

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={
          overdueCount > 0
            ? `${overdueCount} overdue · soonest first`
            : "Scheduled call-backs, soonest first. You're up to date."
        }
      />
      {items.length === 0 ? (
        <Empty text="No pending follow-ups. You're all caught up." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y">
            {items.map((f) => {
              const lead = db.leads.find((l) => l.id === f.leadId);
              if (!lead) return null;
              const days = overdueDays(f.dueAt);
              const isOverdue = days > 0;

              return (
                <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn(
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    days >= 7 ? "bg-destructive/15 text-destructive" :
                    days >= 3 ? "bg-orange-500/15 text-orange-600" :
                    isOverdue ? "bg-warning/15 text-warning" :
                    "bg-primary/10 text-primary"
                  )}>
                    <PhoneCall className="h-4 w-4" />
                  </span>

                  <Link to="/leads/$leadId" params={{ leadId: f.leadId }} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{lead.name}</p>
                      {f.callAttemptCount > 1 && (
                        <span className="text-[10px] text-muted-foreground">Attempt {f.callAttemptCount}</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{f.reason}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <p className={cn("text-xs", isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                        {formatDateTimeIN(f.dueAt)}
                      </p>
                      <EscalationBadge days={days} />
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        completeFollowUp(f.id);
                        toast.success("Marked done");
                      }}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Done
                    </Button>
                    <Link to="/leads/$leadId" params={{ leadId: f.leadId }} className="text-muted-foreground hover:text-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
