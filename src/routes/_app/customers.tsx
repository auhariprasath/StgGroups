import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { buildCustomerList } from "@/lib/data/selectors";
import { formatINR, relativeTime } from "@/lib/format";
import { buildWaMeLink, openWaMeLink } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Phone, MessageSquare, Search, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Users, RefreshCw, Building2, IndianRupee,
} from "lucide-react";
import type { CustomerRecord } from "@/lib/data/selectors";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

function CustomersPage() {
  const db = useDb();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "reengage" | "risk">("all");

  const all = useMemo(() => buildCustomerList(db, user), [db, user]);

  const filtered = useMemo(() => {
    let list = all;
    if (filter === "active") list = list.filter((c) => c.isActive);
    if (filter === "reengage") list = list.filter((c) => c.needsReengagement);
    if (filter === "risk") list = list.filter((c) => c.isAtRisk);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.customerCompany?.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.gstNumber?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [all, filter, search]);

  // Summary metrics
  const totalRevenue = all.reduce((s, c) => s + c.totalRevenue, 0);
  const activeCount = all.filter((c) => c.isActive).length;
  const reengageCount = all.filter((c) => c.needsReengagement).length;
  const riskCount = all.filter((c) => c.isAtRisk).length;
  const repeatCount = all.filter((c) => c.repeatCustomer).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Converted leads — track lifetime value, re-engagement, and repeat business.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Total customers"
          value={all.length}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Total revenue"
          value={formatINR(totalRevenue)}
          icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Active (< 60d)"
          value={activeCount}
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          accent="success"
        />
        <MetricCard
          label="Re-engage (60–120d)"
          value={reengageCount}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          accent="warning"
          onClick={() => setFilter("reengage")}
        />
        <MetricCard
          label="At risk (> 120d)"
          value={riskCount}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          accent="danger"
          onClick={() => setFilter("risk")}
        />
      </div>

      {/* Repeat business callout */}
      {repeatCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <TrendingUp className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm">
            <span className="font-semibold">{repeatCount} repeat customer{repeatCount > 1 ? "s" : ""}</span>
            {" "}— these clients have closed more than one deal. Prioritise nurturing.
          </p>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "reengage", "risk"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-muted",
            )}
          >
            {f === "all" && `All (${all.length})`}
            {f === "active" && `Active (${activeCount})`}
            {f === "reengage" && `Re-engage (${reengageCount})`}
            {f === "risk" && `At risk (${riskCount})`}
          </button>
        ))}
        <div className="relative ml-auto flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, company, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="font-semibold text-muted-foreground">No customers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers appear here when leads reach the "Quote sent", "Confirmed" or "Completed" stage.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CustomerRow key={c.phone} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer: c }: { customer: CustomerRecord }) {
  const tel = c.phone.replace(/\D/g, "").slice(-10);
  const waLink = buildWaMeLink(c.phone);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
      {/* Status dot */}
      <div
        className={cn(
          "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
          c.isAtRisk && "bg-destructive",
          c.needsReengagement && !c.isAtRisk && "bg-amber-400",
          c.isActive && "bg-success",
        )}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{c.name}</p>
          {c.customerCompany && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> {c.customerCompany}
            </span>
          )}
          {c.repeatCustomer && (
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
              <RefreshCw className="mr-1 h-2.5 w-2.5" /> Repeat
            </Badge>
          )}
          {c.isAtRisk && (
            <Badge variant="destructive" className="text-[10px]">At risk</Badge>
          )}
          {c.needsReengagement && !c.isAtRisk && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] dark:bg-amber-900/30 dark:text-amber-300">
              Re-engage
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{c.phone}</span>
          {c.completedLeads.length > 0 && (
            <span>{c.completedLeads.length} closed deal{c.completedLeads.length > 1 ? "s" : ""}</span>
          )}
          {c.totalRevenue > 0 && (
            <span className="font-medium text-foreground">{formatINR(c.totalRevenue)} revenue</span>
          )}
          <span>Last activity: {relativeTime(c.lastActivityAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={`tel:+91${tel}`}
          className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"
          title="Call"
        >
          <Phone className="h-4 w-4" />
        </a>
        {waLink && (
          <button
            onClick={() => openWaMeLink(waLink)}
            className="grid h-8 w-8 place-items-center rounded-md border bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20"
            title="WhatsApp"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
        {/* Link to the most recent lead */}
        {c.leads[0] && (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/leads/$leadId" params={{ leadId: c.leads[0].id }}>
              View lead
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label, value, icon, accent, onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "success" | "warning" | "danger";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-card transition-colors",
        onClick && "hover:bg-accent cursor-pointer",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p
        className={cn(
          "text-2xl font-bold",
          accent === "success" && "text-success",
          accent === "warning" && "text-amber-600",
          accent === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </button>
  );
}
