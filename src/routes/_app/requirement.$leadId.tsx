import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName } from "@/lib/data/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTip } from "@/components/ui/info-tip";
import { specFieldsFor, companyFieldsFor } from "@/lib/data/specs";
import { useAutosaveDraft, loadDraft } from "@/hooks/use-autosave-draft";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import type { RequirementField } from "@/lib/data/types";

export const Route = createFileRoute("/_app/requirement/$leadId")({ component: RequirementForm });

interface FieldDef {
  key: string;
  label: string;
  tab: number;
  placeholder?: string;
  hint?: string;
  type?: "text" | "date" | "email";
}

const FIELDS: FieldDef[] = [
  {
    key: "location",
    label: "Site Location",
    tab: 0,
    placeholder: "Project site city / area",
    hint: "Where the machine will actually work.",
  },
  { key: "duration", label: "Duration", tab: 0, placeholder: "e.g. 30 days" },
  {
    key: "workingHeight",
    label: "Working Height",
    tab: 0,
    placeholder: "e.g. 22 metres / 60 feet",
  },
  {
    key: "deliveryDate",
    label: "Delivery Date",
    tab: 0,
    type: "date",
    hint: "Schedules the delivery task + reminders.",
  },
  { key: "companyName", label: "Company Name", tab: 1, placeholder: "Client company" },
  {
    key: "companyAddress",
    label: "Company Address",
    tab: 1,
    placeholder: "Registered / billing address",
  },
  { key: "companyGstin", label: "Company GSTIN", tab: 1, placeholder: "15-digit GSTIN" },
  { key: "contactPerson", label: "Contact Person", tab: 1, placeholder: "Who we coordinate with" },
  {
    key: "email",
    label: "Company Email",
    tab: 1,
    type: "email",
    placeholder: "name@company.com",
    hint: "Quotation is auto-mailed here.",
  },
  { key: "landline", label: "Landline", tab: 1, placeholder: "With STD code" },
  {
    key: "deliveryAddress",
    label: "Delivery Address",
    tab: 2,
    placeholder: "Exact site delivery address",
    hint: "May differ from billing — used on the quotation.",
  },
  {
    key: "deliveryGstin",
    label: "Delivery GSTIN",
    tab: 2,
    placeholder: "Site-state GSTIN if different",
  },
  { key: "mdName", label: "MD Name", tab: 2 },
  { key: "mdNumber", label: "MD Number", tab: 2 },
  { key: "mdEmail", label: "MD Email", tab: 2, type: "email" },
];

const TABS = ["Equipment & Job", "Company", "Delivery & MD"];
type Values = Record<string, { value: string; nilReason?: string }>;

function RequirementForm() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const lead = db.leads.find((l) => l.id === leadId);
  const existing = db.requirements.find((r) => r.leadId === leadId);

  if (!lead) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  const draftKey = `requirement-${leadId}`;
  const companyId = lead.companyId;

  const [values, setValues] = useState<Values>({});
  const [tab, setTab] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(
    existing?.categoryId ?? lead.categoryId ?? null,
  );
  const { savedAt, clear } = useAutosaveDraft(draftKey, values, true);

  // Dynamic form switching: detect company change and reset fields
  const companyRef = useRef(companyId);
  useEffect(() => {
    if (companyId !== companyRef.current) {
      companyRef.current = companyId;
      setValues({});
      setCategoryId(null);
      clear();
      toast.info(`Switched to ${companyName(db, companyId)} requirement form`);
    }
  }, [companyId]);

  // Populate initial values from existing requirement or draft
  const companyF = companyFieldsFor(companyId);
  const hasCompanyF = companyF.length > 0;
  const initial = useMemo<Values>(() => {
    const fromDraft = loadDraft<Values>(draftKey);
    if (fromDraft) return fromDraft;
    const v: Values = {};
    const allKeys = new Set([
      ...(hasCompanyF
        ? companyF.map((f) => f.key)
        : FIELDS.filter((f) => f.tab === 0).map((f) => f.key)),
      ...FIELDS.filter((f) => f.tab > 0).map((f) => f.key),
      ...(existing?.fields.map((f) => f.key) ?? []),
    ]);
    for (const key of allKeys) {
      const ex = existing?.fields.find((x) => x.key === key);
      v[key] = { value: ex?.value ?? "", nilReason: ex?.nilReason };
    }
    return v;
  }, [draftKey, existing, companyId, categoryId]);
  // Apply initial values once
  if (Object.keys(values).length === 0 && Object.keys(initial).length > 0) {
    setValues(initial);
  }

  // Equipment-specific spec fields (tab 0) merge ahead of the standard fields.
  const categories = db.categories.filter((c) => c.companyId === companyId);
  const specDefs: FieldDef[] = specFieldsFor(categoryId).map((s) => ({
    key: s.key,
    label: s.label,
    tab: 0 as const,
    placeholder: s.placeholder,
    hint: s.hint,
  }));
  // Phase 5: company-specific fields replace the generic Tab 0 fields.
  const tab0Fields: FieldDef[] = hasCompanyF
    ? [
        ...specDefs,
        ...companyF.map((s) => ({
          key: s.key,
          label: s.label,
          tab: 0 as const,
          placeholder: s.placeholder,
          hint: s.hint,
        })),
      ]
    : [...specDefs, ...FIELDS.filter((f) => f.tab === 0)];
  const tab12Fields = FIELDS.filter((f) => f.tab > 0);
  const allFields: FieldDef[] = [...tab0Fields, ...tab12Fields];

  const setVal = (k: string, value: string) =>
    setValues((v) => ({ ...v, [k]: { ...v[k], value } }));
  const setNil = (k: string, nilReason: string) =>
    setValues((v) => ({ ...v, [k]: { ...v[k], nilReason } }));

  const fieldValid = (f: FieldDef) => {
    const cell = values[f.key];
    if (!cell || cell.value.trim() === "") return false;
    if (cell.value.trim().toLowerCase() === "nil") return !!cell.nilReason?.trim();
    return true;
  };
  const tabValid = (t: number) => allFields.filter((f) => f.tab === t).every(fieldValid);
  const allValid = allFields.every(fieldValid);

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Enter advances, never submits/books accidentally
      const next = Math.min(Number(tab) + 1, TABS.length - 1);
      if (tabValid(Number(tab))) setTab(String(next));
      else
        toast.error(
          "Fill all fields on this tab (use 'nil' + a reason if you don't have the data)",
        );
    }
  };

  const save = () => {
    if (saving) return;
    if (!allValid) {
      toast.error("Every field is mandatory. Enter 'nil' and a reason where you don't have data.");
      return;
    }
    setSaving(true);
    const fields: RequirementField[] = allFields.map((f) => ({
      key: f.key,
      label: f.label,
      value: values[f.key].value.trim(),
      nilReason:
        values[f.key].value.trim().toLowerCase() === "nil" ? values[f.key].nilReason : undefined,
    }));
    const deliveryDate = values["deliveryDate"]?.value;

    mutate((d) => {
      const idx = d.requirements.findIndex((r) => r.leadId === leadId);
      const base = {
        leadId,
        companyId: lead.companyId,
        categoryId,
        requestText: lead.requestText,
        status: "open" as const,
        fields,
        deliveryDate:
          deliveryDate && deliveryDate.toLowerCase() !== "nil"
            ? new Date(deliveryDate).toISOString()
            : undefined,
      };
      if (idx >= 0) {
        d.requirements[idx] = { ...d.requirements[idx], ...base };
      } else {
        d.requirements.push({ id: newId("r"), createdAt: new Date().toISOString(), ...base });
      }
      const l = d.leads.find((x) => x.id === leadId);
      if (l && (l.status === "new" || l.status === "followup" || l.status === "first_contact"))
        l.status = "requirements";
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "requirement",
        text: existing ? "Requirement updated" : "Requirement gathered — ready to quote",
      });
      // Phase 5: NIL admin alert + audit log
      const nilFields = fields.filter((f) => f.nilReason);
      if (nilFields.length > 0) {
        if (!d.notifications) d.notifications = [];
        const admins = d.users.filter((u) => u.role === "super_admin");
        for (const admin of admins) {
          d.notifications.push({
            id: newId("notif"),
            userId: admin.id,
            type: "nil_alert",
            title: "NIL fields in requirement",
            message: `Lead "${lead.name}" has ${nilFields.length} NIL field(s): ${nilFields.map((f) => f.label).join(", ")}`,
            priority: "high",
            read: false,
            linkTo: `/requirement/${leadId}`,
            createdAt: new Date().toISOString(),
          });
        }
        if (!d.requirementAuditLogs) d.requirementAuditLogs = [];
        const reqId = d.requirements.find((r) => r.leadId === leadId)?.id ?? "";
        for (const nf of nilFields) {
          d.requirementAuditLogs.push({
            id: newId("ral"),
            requirementId: reqId,
            actionType: "nil_alerted",
            fieldKey: nf.key,
            changedBy: user?.id ?? "u-md",
            changedAt: new Date().toISOString(),
          });
        }
      }
    });
    clear();
    toast.success("Requirement saved");
    setSaving(false);
    navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  return (
    <>
      <Link
        to="/leads/$leadId"
        params={{ leadId }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lead
      </Link>

      <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Requirement — {lead.name}</h1>
            <p className="text-sm text-muted-foreground">
              {companyName(db, lead.companyId)} · all fields mandatory
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Autosaved ${savedAt.toLocaleTimeString()}` : "Autosaves as you type"}
          </span>
        </div>

        {/* Equipment category drives the specification fields below */}
        <div className="mb-4 grid gap-1.5 sm:max-w-xs">
          <Label className="flex items-center">
            Equipment / product{" "}
            <InfoTip tip="Sets the technical spec fields to collect for this product." />
          </Label>
          <Select value={categoryId ?? ""} onValueChange={(v) => setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select equipment…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 grid w-full grid-cols-3">
            {TABS.map((t, i) => (
              <TabsTrigger key={t} value={String(i)} className="gap-1.5">
                {tabValid(i) && <Check className="h-3.5 w-3.5 text-success" />}
                <span className="truncate">{t}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((_, t) => (
            <TabsContent key={t} value={String(t)} className="grid gap-4 sm:grid-cols-2">
              {t === 0 && specDefs.length === 0 && (
                <p className="sm:col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Select the equipment above to collect its technical specs.
                </p>
              )}
              {allFields
                .filter((f) => f.tab === t)
                .map((f) => {
                  const cell = values[f.key];
                  const isNil = cell?.value.trim().toLowerCase() === "nil";
                  const invalid = !fieldValid(f);
                  return (
                    <div key={f.key} className="grid gap-1.5">
                      <Label htmlFor={f.key} className="flex items-center">
                        {f.label} <span className="ml-0.5 text-destructive">*</span>
                        {f.hint && <InfoTip tip={f.hint} />}
                      </Label>
                      <Input
                        id={f.key}
                        type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                        placeholder={f.placeholder ?? "Type value, or 'nil'"}
                        value={cell?.value ?? ""}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        onKeyDown={handleEnter}
                        className={cn(invalid && cell?.value.trim() !== "" && "border-destructive")}
                      />
                      {isNil && (
                        <Input
                          placeholder="Why is this nil? (required)"
                          value={cell?.nilReason ?? ""}
                          onChange={(e) => setNil(f.key, e.target.value)}
                          className="text-xs"
                        />
                      )}
                    </div>
                  );
                })}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" /> Enter moves to the next tab. Nothing is booked
            until you save.
          </p>
          <div className="flex gap-2">
            {Number(tab) > 0 && (
              <Button variant="outline" onClick={() => setTab(String(Number(tab) - 1))}>
                Back
              </Button>
            )}
            {Number(tab) < TABS.length - 1 ? (
              <Button
                onClick={() =>
                  tabValid(Number(tab))
                    ? setTab(String(Number(tab) + 1))
                    : toast.error("Complete this tab first")
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={save} disabled={!allValid || saving}>
                {saving ? "Saving…" : "Save requirement"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Missing({ text = "Lead not found" }: { text?: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <p className="font-semibold">{text}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/leads">Back to leads</Link>
      </Button>
    </div>
  );
}
