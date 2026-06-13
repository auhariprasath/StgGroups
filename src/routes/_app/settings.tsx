import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, hydrateStore } from "@/lib/data/store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Users as UsersIcon, Tags, Plus, X, RotateCcw,
  Pencil, Check, ChevronDown, ChevronUp, Target as TargetIcon,
} from "lucide-react";
import type { CompanyId } from "@/lib/data/types";

export const Route = createFileRoute("/_app/settings")({ component: Settings });

function Settings() {
  const db = useDb();
  const { user, role } = useAuth();
  if (user && role !== "super_admin") return <Navigate to="/dashboard" />;

  return (
    <>
      <PageHeader title="Settings" description="Companies, people, product catalog, and targets." />

      {/* Companies */}
      <Card icon={Building2} title="Companies">
        <div className="space-y-4">
          {db.companies.map((c) => (
            <CompanyEditor key={c.id} companyId={c.id} />
          ))}
        </div>
      </Card>

      {/* People */}
      <Card icon={UsersIcon} title="People & assignment">
        <ul className="divide-y">
          {db.users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">
                  {u.name}{" "}
                  {u.role === "super_admin" && <Badge className="ml-1">Super Admin</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.title} · {u.email} · {u.phone}
                </p>
              </div>
              <EditName userId={u.id} current={u.name} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          New leads auto-assign to the executive of the matched company. Use a lead's Transfer button to reassign.
        </p>
      </Card>

      {/* Targets */}
      <Card icon={TargetIcon} title="Targets & periods">
        <div className="space-y-4">
          {db.users.filter((u) => u.role === "exec").map((e) => (
            <TargetEditor key={e.id} userId={e.id} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Targets count completed deals in the stated period. Adjust each month as needed.
        </p>
      </Card>

      {/* Catalog */}
      <Card icon={Tags} title="Product catalog & routing keywords">
        <div className="space-y-4">
          {db.companies.map((c) => (
            <div key={c.id}>
              <p className="mb-2 text-sm font-semibold" style={{ color: c.accent }}>{c.name}</p>
              <div className="space-y-2">
                {db.categories.filter((cat) => cat.companyId === c.id).map((cat) => (
                  <CategoryRow key={cat.id} categoryId={cat.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data sync */}
      <Card icon={RotateCcw} title="Data">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Reload the latest data from the server (Supabase).</p>
          <Button
            variant="outline"
            onClick={async () => {
              await hydrateStore();
              toast.success("Reloaded from server");
            }}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" /> Refresh data
          </Button>
        </div>
      </Card>
    </>
  );
}

/* ── Company editor ──────────────────────────────────────────────────────── */

function CompanyEditor({ companyId }: { companyId: string }) {
  const db = useDb();
  const c = db.companies.find((x) => x.id === companyId)!;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    legalName: c.legalName,
    gstin: c.gstin,
    billingAddress: c.billingAddress,
    bankDetails: c.bankDetails,
    accent: c.accent,
  });

  const save = () => {
    if (!form.gstin.trim() || !form.billingAddress.trim() || !form.bankDetails.trim()) {
      toast.error("GSTIN, billing address and bank details are required");
      return;
    }
    mutate((d) => {
      const co = d.companies.find((x) => x.id === companyId);
      if (!co) return;
      co.legalName = form.legalName.trim() || co.legalName;
      co.gstin = form.gstin.trim().toUpperCase();
      co.billingAddress = form.billingAddress.trim();
      co.bankDetails = form.bankDetails.trim();
      co.accent = form.accent;
    });
    setOpen(false);
    toast.success(`${c.name} settings saved`);
  };

  return (
    <div className="rounded-xl border p-4">
      <button
        className="flex w-full items-center justify-between gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.accent }} />
          <div className="text-left">
            <p className="font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">GSTIN: {c.gstin} · {c.quotePrefix}-YYYY-####</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {c.sharesGstWith && <Badge variant="secondary" className="text-[11px]">Shares GST</Badge>}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Legal name</Label>
            <Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>GSTIN</Label>
            <Input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              placeholder="15-digit GSTIN"
              className="uppercase"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Billing address (shown on quotations & invoices)</Label>
            <Textarea
              value={form.billingAddress}
              onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
              rows={3}
              placeholder="Company name&#10;Address line 1&#10;City, State PIN"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Bank details (shown on proforma & tax invoices)</Label>
            <Textarea
              value={form.bankDetails}
              onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
              rows={4}
              placeholder="A/c Name: ...&#10;Bank: ...&#10;A/c No: ...&#10;IFSC: ..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Brand colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border p-0.5"
              />
              <Input
                value={form.accent}
                onChange={(e) => setForm({ ...form, accent: e.target.value })}
                className="w-28 font-mono text-xs uppercase"
              />
            </div>
          </div>
          <div className="flex items-end gap-2 sm:col-start-2 sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}><Check className="mr-1.5 h-4 w-4" /> Save changes</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Target editor ───────────────────────────────────────────────────────── */

function TargetEditor({ userId }: { userId: string }) {
  const db = useDb();
  const u = db.users.find((x) => x.id === userId)!;
  const target = db.targets.find((t) => t.userId === userId);
  const [goal, setGoal] = useState(target?.goal ?? 10);
  const [period, setPeriod] = useState(target?.period ?? "");
  const [achieved, setAchieved] = useState(target?.achieved ?? 0);

  const save = () => {
    if (!period.trim()) { toast.error("Period is required (e.g. Jul 2026)"); return; }
    mutate((d) => {
      const t = d.targets.find((x) => x.userId === userId);
      if (t) {
        t.goal = Math.max(1, goal);
        t.period = period.trim();
        t.achieved = Math.max(0, achieved);
      } else {
        d.targets.push({ userId, period: period.trim(), goal: Math.max(1, goal), achieved: Math.max(0, achieved) });
      }
    });
    toast.success(`Target updated for ${u.name}`);
  };

  const pct = target ? Math.round((target.achieved / target.goal) * 100) : 0;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.title}</p>
        </div>
        {target && (
          <div className="text-right text-sm">
            <p className="font-semibold">{target.achieved}/{target.goal}</p>
            <p className="text-xs text-muted-foreground">{pct}% of {target.period} target</p>
          </div>
        )}
      </div>
      {target && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 50 ? "var(--success)" : "var(--primary)" }} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Period</Label>
          <Input className="h-8 text-sm" placeholder="Jul 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Goal (deals)</Label>
          <Input className="h-8 text-sm" type="number" min={1} value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Achieved</Label>
          <Input className="h-8 text-sm" type="number" min={0} value={achieved} onChange={(e) => setAchieved(Number(e.target.value))} />
        </div>
      </div>
      <Button size="sm" className="mt-2" onClick={save}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
    </div>
  );
}

/* ── Catalog row ─────────────────────────────────────────────────────────── */

function CategoryRow({ categoryId }: { categoryId: string }) {
  const db = useDb();
  const cat = db.categories.find((c) => c.id === categoryId)!;
  const [adding, setAdding] = useState("");

  const addSyn = () => {
    const kw = adding.trim().toLowerCase();
    if (!kw) return;
    mutate((d) => {
      const c = d.categories.find((x) => x.id === categoryId);
      if (c && !c.synonyms.includes(kw)) c.synonyms.push(kw);
    });
    setAdding("");
    toast.success(`Added keyword to ${cat.name}`);
  };
  const removeSyn = (kw: string) =>
    mutate((d) => {
      const c = d.categories.find((x) => x.id === categoryId);
      if (c) c.synonyms = c.synonyms.filter((s) => s !== kw);
    });

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{cat.name}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cat.synonyms.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {s}
            <button onClick={() => removeSyn(s)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          className="h-8"
          placeholder="Add keyword customers use…"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSyn()}
        />
        <Button size="sm" variant="outline" onClick={addSyn}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function EditName({ userId, current }: { userId: string; current: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current);
  const save = () => {
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.name = name.trim() || u.name;
    });
    setEditing(false);
    toast.success("Name updated");
  };
  if (!editing)
    return (
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Rename
      </Button>
    );
  return (
    <div className="flex items-center gap-1.5">
      <Input className="h-8 w-40" value={name} onChange={(e) => setName(e.target.value)} />
      <Button size="sm" onClick={save}>Save</Button>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h2>
      {children}
    </section>
  );
}
