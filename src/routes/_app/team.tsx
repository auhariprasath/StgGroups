import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate } from "@/lib/data/store";
import { companyName, userName } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateTimeIN } from "@/lib/format";
import { toast } from "sonner";
import { Target as TargetIcon, Activity as ActivityIcon, Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/team")({ component: Team });

function Team() {
  const db = useDb();
  const { user, role } = useAuth();
  if (user && role !== "super_admin") return <Navigate to="/dashboard" />;

  const execs = db.users.filter((u) => u.role === "exec");

  return (
    <>
      <PageHeader title="Team & Targets" description="Each executive's load, target progress and latest activity. You see everything; they see only their own." />

      <div className="grid gap-5 lg:grid-cols-2">
        {execs.map((e) => {
          const eLeads = db.leads.filter((l) => l.companyId === e.companyId);
          const active = eLeads.filter((l) => !["completed", "not_interested"].includes(l.status));
          const done = eLeads.filter((l) => l.status === "completed");
          const acts = db.activities.filter((a) => a.byUserId === e.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
          return (
            <section key={e.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{e.name}</h2>
                  <p className="text-xs text-muted-foreground">{companyName(db, e.companyId ?? "")} · {e.phone}</p>
                </div>
                <div className="text-right text-sm">
                  <p><span className="font-semibold">{active.length}</span> <span className="text-muted-foreground">active</span></p>
                  <p><span className="font-semibold">{done.length}</span> <span className="text-muted-foreground">won</span></p>
                </div>
              </div>

              <TargetEditor userId={e.id} />

              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><ActivityIcon className="h-3.5 w-3.5" /> Latest activity</p>
                <ul className="space-y-1.5">
                  {acts.length ? acts.map((a) => {
                    const lead = db.leads.find((l) => l.id === a.leadId);
                    return (
                      <li key={a.id} className="text-sm">
                        {lead ? <Link to="/leads/$leadId" params={{ leadId: a.leadId }} className="hover:underline">{a.text}</Link> : a.text}
                        <span className="block text-xs text-muted-foreground">{formatDateTimeIN(a.at)}</span>
                      </li>
                    );
                  }) : <li className="text-sm text-muted-foreground">No activity yet.</li>}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function TargetEditor({ userId }: { userId: string }) {
  const db = useDb();
  const target = db.targets.find((t) => t.userId === userId);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(target?.goal ?? 10);
  if (!target) return null;
  const pct = Math.round((target.achieved / target.goal) * 100);

  const save = () => {
    mutate((d) => {
      const t = d.targets.find((x) => x.userId === userId);
      if (t) t.goal = Math.max(1, goal);
    });
    setEditing(false);
    toast.success("Target updated");
  };

  return (
    <div className="mt-4 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><TargetIcon className="h-3.5 w-3.5" /> Target · {target.period}</p>
        {!editing ? (
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <div className="flex items-center gap-1">
            <Input className="h-7 w-16" type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
            <button onClick={save} className="text-success"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm"><span className="font-semibold">{target.achieved}/{target.goal}</span><span className="text-muted-foreground">{pct}%</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full")} style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 50 ? "var(--success)" : "var(--primary)" }} /></div>
      {pct >= 50 && pct < 100 && <p className="mt-1.5 text-xs text-success">🎉 Crossed 50% — send a congratulations!</p>}
    </div>
  );
}
