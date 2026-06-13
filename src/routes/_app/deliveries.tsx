import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { formatDateIN, formatDateTimeIN } from "@/lib/format";
import { Truck, Bell } from "lucide-react";

export const Route = createFileRoute("/_app/deliveries")({ component: Deliveries });

/** Which reminder window a delivery currently falls in. */
function reminderState(deliveryIso: string): { label: string; tone: "danger" | "warn" | "default" } {
  const ms = new Date(deliveryIso).getTime() - Date.now();
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 2) return { label: "≤ 2 hours — final reminder", tone: "danger" };
  if (hours <= 24) return { label: "≤ 1 day — prepare now", tone: "danger" };
  if (hours <= 48) return { label: "≤ 2 days — pre-notice", tone: "warn" };
  return { label: `In ${Math.ceil(hours / 24)} days`, tone: "default" };
}

function Deliveries() {
  const db = useDb();
  const { user } = useAuth();
  const ids = new Set(visibleLeads(db, user).map((l) => l.id));
  const items = db.requirements
    .filter((r) => ids.has(r.leadId) && r.deliveryDate && r.status !== "closed")
    .sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());

  const now = Date.now();
  const soon = items.filter((r) => new Date(r.deliveryDate!).getTime() <= now + 2 * 864e5);
  const later = items.filter((r) => new Date(r.deliveryDate!).getTime() > now + 2 * 864e5);

  return (
    <>
      <PageHeader title="Deliveries & Tasks" description="Booked deliveries with automatic reminders at 2 days, 1 day and 2 hours before." />

      <Group title="Today & next 2 days" icon={Bell} items={soon} db={db} highlight />
      <Group title="Upcoming" icon={Truck} items={later} db={db} />

      {items.length === 0 && <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No booked deliveries yet. They appear here once a requirement has a delivery date.</div>}
    </>
  );
}

function Group({ title, icon: Icon, items, db, highlight }: { title: string; icon: typeof Truck; items: ReturnType<typeof useDb>["requirements"]; db: ReturnType<typeof useDb>; highlight?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Icon className="h-4 w-4" /> {title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => {
          const lead = db.leads.find((l) => l.id === r.leadId)!;
          const st = reminderState(r.deliveryDate!);
          const toneCls = { danger: "border-destructive/30 bg-destructive/5", warn: "border-warning/30 bg-warning/5", default: "" }[st.tone];
          return (
            <Link key={r.id} to="/leads/$leadId" params={{ leadId: r.leadId }} className={cn("rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5", highlight && toneCls)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{lead.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.fields.find((f) => f.key === "location")?.value}</p>
                </div>
                <span className="shrink-0 text-right text-sm font-medium">{formatDateIN(r.deliveryDate!)}</span>
              </div>
              <p className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                st.tone === "danger" ? "bg-destructive/15 text-destructive" : st.tone === "warn" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
                <Bell className="h-3 w-3" /> {st.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeIN(r.deliveryDate!)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
