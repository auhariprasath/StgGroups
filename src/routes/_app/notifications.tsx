import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads, buildCustomerList } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Clock, FileText, Truck, Users, CheckCircle2, Bell,
  PhoneCall, TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_app/notifications")({ component: NotificationsPage });

interface Alert {
  id: string;
  severity: "urgent" | "warning" | "info";
  icon: typeof Bell;
  title: string;
  sub: string;
  linkTo: string;
  linkParams?: Record<string, string>;
}

function NotificationsPage() {
  const db = useDb();
  const { user } = useAuth();
  const leads = visibleLeads(db, user);
  const customers = buildCustomerList(db, user);
  const now = Date.now();

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];

    /* 1. Overdue follow-ups */
    const overdueFollowUps = db.followUps.filter((f) => {
      if (f.done) return false;
      const lead = db.leads.find((l) => l.id === f.leadId);
      if (!lead || !leads.some((l) => l.id === lead.id)) return false;
      return new Date(f.dueAt).getTime() < now;
    });
    for (const f of overdueFollowUps) {
      const lead = db.leads.find((l) => l.id === f.leadId);
      if (!lead) continue;
      const daysOverdue = Math.floor((now - new Date(f.dueAt).getTime()) / (1000 * 60 * 60 * 24));
      list.push({
        id: `fu-${f.id}`,
        severity: daysOverdue > 2 ? "urgent" : "warning",
        icon: PhoneCall,
        title: `Overdue follow-up — ${lead.name}`,
        sub: `Was due ${formatDateIN(f.dueAt)} · ${daysOverdue}d overdue · ${f.reason}`,
        linkTo: "/leads/$leadId",
        linkParams: { leadId: lead.id },
      });
    }

    /* 2. Stale new leads (> 24 h unactioned) */
    const staleNew = leads.filter(
      (l) => l.status === "new" && now - new Date(l.createdAt).getTime() > 24 * 3600 * 1000,
    );
    for (const l of staleNew) {
      const hoursOld = Math.floor((now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60));
      list.push({
        id: `new-${l.id}`,
        severity: "urgent",
        icon: Bell,
        title: `New lead not actioned — ${l.name}`,
        sub: `Arrived ${hoursOld}h ago and is still in "New" status`,
        linkTo: "/leads/$leadId",
        linkParams: { leadId: l.id },
      });
    }

    /* 3. Expiring quotations (≤ 3 days left, status = sent) */
    const expiringQuotes = db.quotations.filter((q) => {
      if (q.status !== "sent") return false;
      if (!leads.some((l) => l.id === q.leadId)) return false;
      const daysLeft = Math.ceil((new Date(q.validityDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 3;
    });
    for (const q of expiringQuotes) {
      const lead = db.leads.find((l) => l.id === q.leadId);
      if (!lead) continue;
      const daysLeft = Math.ceil((new Date(q.validityDate).getTime() - now) / (1000 * 60 * 60 * 24));
      list.push({
        id: `q-${q.id}`,
        severity: daysLeft === 0 ? "urgent" : "warning",
        icon: FileText,
        title: `Quotation expiring — ${q.quotationNo}`,
        sub: `${lead.name} · expires ${formatDateIN(q.validityDate)} (${daysLeft === 0 ? "today" : `${daysLeft}d left`})`,
        linkTo: "/quotation/$leadId",
        linkParams: { leadId: q.leadId },
      });
    }

    /* 4. Upcoming deliveries (≤ 3 days) */
    const upcomingDeliveries = db.requirements.filter((r) => {
      if (!r.deliveryDate) return false;
      if (!leads.some((l) => l.id === r.leadId)) return false;
      const daysLeft = Math.ceil((new Date(r.deliveryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 3;
    });
    for (const r of upcomingDeliveries) {
      const lead = db.leads.find((l) => l.id === r.leadId);
      if (!lead) continue;
      const daysLeft = Math.ceil((new Date(r.deliveryDate!).getTime() - now) / (1000 * 60 * 60 * 24));
      list.push({
        id: `del-${r.id}`,
        severity: daysLeft === 0 ? "urgent" : "warning",
        icon: Truck,
        title: `Delivery due — ${lead.name}`,
        sub: `${r.categoryId ?? "requirement"} · ${formatDateIN(r.deliveryDate!)} (${daysLeft === 0 ? "today" : `${daysLeft}d`})`,
        linkTo: "/leads/$leadId",
        linkParams: { leadId: lead.id },
      });
    }

    /* 5. At-risk customers */
    const atRisk = customers.filter((c) => c.isAtRisk);
    if (atRisk.length > 0) {
      list.push({
        id: "risk-customers",
        severity: "warning",
        icon: TrendingDown,
        title: `${atRisk.length} customer${atRisk.length > 1 ? "s" : ""} at risk`,
        sub: `No activity in >120 days — risk of churn. View the Customers page to re-engage.`,
        linkTo: "/customers",
      });
    }

    /* 6. Re-engagement needed */
    const reengageNeeded = customers.filter((c) => c.needsReengagement);
    if (reengageNeeded.length > 0) {
      list.push({
        id: "reengage",
        severity: "info",
        icon: Users,
        title: `${reengageNeeded.length} customer${reengageNeeded.length > 1 ? "s" : ""} need re-engagement`,
        sub: `60–120 days since last contact. Time for a check-in call.`,
        linkTo: "/customers",
      });
    }

    // Sort: urgent first, then warning, then info
    const ORDER = { urgent: 0, warning: 1, info: 2 };
    return list.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  }, [db, leads, customers, now]);

  const urgentCount = alerts.filter((a) => a.severity === "urgent").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Overdue follow-ups, expiring quotations, upcoming deliveries, and customer alerts."
      />

      {/* Summary strip */}
      <div className="mb-6 flex flex-wrap gap-3">
        <SeverityPill severity="urgent" count={urgentCount} />
        <SeverityPill severity="warning" count={warningCount} />
        <SeverityPill severity="info" count={alerts.filter((a) => a.severity === "info").length} />
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-16 text-center shadow-card">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-lg font-semibold">All clear!</p>
          <p className="text-sm text-muted-foreground">No overdue tasks, no expiring quotations, no at-risk customers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const Icon = alert.icon;
  const severityClass = {
    urgent: "border-l-destructive bg-destructive/5",
    warning: "border-l-amber-400 bg-amber-50 dark:bg-amber-900/10",
    info: "border-l-blue-400 bg-blue-50/40 dark:bg-blue-900/10",
  }[alert.severity];

  const iconClass = {
    urgent: "text-destructive",
    warning: "text-amber-600",
    info: "text-blue-600",
  }[alert.severity];

  const content = (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-l-4 bg-card px-4 py-3 shadow-card transition-colors hover:bg-accent/30",
        severityClass,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{alert.title}</p>
        <p className="text-sm text-muted-foreground">{alert.sub}</p>
      </div>
      <SeverityBadge severity={alert.severity} />
    </div>
  );

  if (alert.linkParams) {
    return (
      <Link to={alert.linkTo as string} params={alert.linkParams}>
        {content}
      </Link>
    );
  }
  return <Link to={alert.linkTo as string}>{content}</Link>;
}

function SeverityBadge({ severity }: { severity: "urgent" | "warning" | "info" }) {
  return (
    <Badge
      className={cn(
        "shrink-0 text-[10px] uppercase tracking-wide",
        severity === "urgent" && "bg-destructive/10 text-destructive border-destructive/20",
        severity === "warning" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
        severity === "info" && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
      )}
      variant="outline"
    >
      {severity}
    </Badge>
  );
}

function SeverityPill({ severity, count }: { severity: "urgent" | "warning" | "info"; count: number }) {
  const labels = { urgent: "Urgent", warning: "Warning", info: "Info" };
  const icons = { urgent: AlertTriangle, warning: Clock, info: Bell };
  const Icon = icons[severity];
  const colorClass = {
    urgent: "text-destructive border-destructive/20 bg-destructive/5",
    warning: "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20",
    info: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20",
  }[severity];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", colorClass)}>
      <Icon className="h-4 w-4" />
      {count} {labels[severity]}
    </div>
  );
}
