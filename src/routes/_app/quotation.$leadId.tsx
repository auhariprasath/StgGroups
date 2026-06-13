import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName } from "@/lib/data/selectors";
import { downloadQuotationPdf } from "@/lib/quotation-pdf";
import type { QuotationClientInfo } from "@/lib/quotation-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, FileDown, Send, IndianRupee, History, Mail,
  AlertTriangle, CheckCircle2, RefreshCw, ExternalLink,
} from "lucide-react";
import type { Company, Quotation, QuotationLine, Requirement } from "@/lib/data/types";

export const Route = createFileRoute("/_app/quotation/$leadId")({ component: QuotationBuilder });

function nextQuoteNo(company: Company, count: number) {
  const year = new Date().getFullYear();
  return `${company.quotePrefix}-${year}-${String(1000 + count + 1).slice(1)}`;
}

function seedLines(requirement: Requirement | undefined, db: ReturnType<typeof useDb>): QuotationLine[] {
  const cat = requirement?.categoryId ? db.categories.find((c) => c.id === requirement.categoryId) : null;
  return [
    { id: newId("ql"), description: cat ? `${cat.name} — as per requirement` : "Equipment rental — as per requirement", qty: 1, unit: "month", rate: 0 },
    { id: newId("ql"), description: "Operator + transport to site", qty: 1, unit: "lot", rate: 0 },
  ];
}

const BLOCKED_STATUSES = ["dormant", "not_interested", "completed"] as const;
const GST_RATES = [0, 5, 12, 18, 28];

function QuotationBuilder() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lead = db.leads.find((l) => l.id === leadId);
  const requirement = db.requirements.find((r) => r.leadId === leadId);
  const company = db.companies.find((c) => c.id === lead?.companyId);
  const versions = db.quotations.filter((q) => q.leadId === leadId).sort((a, b) => b.version - a.version);
  const latest = versions[0];

  const field = (k: string) => requirement?.fields.find((f) => f.key === k)?.value ?? "";

  const [lines, setLines] = useState<QuotationLine[]>(() =>
    latest ? structuredCloneLines(latest.lines) : seedLines(requirement, db),
  );
  const [advancePercent, setAdvance] = useState(latest?.advancePercent ?? 50);
  const [balanceTerms, setBalanceTerms] = useState(
    latest?.balanceTerms ?? "Balance against bill within 7 days of delivery",
  );
  const [ratePerDayNote, setRate] = useState(latest?.ratePerDayNote ?? "");
  const [approvedBy, setApprovedBy] = useState(latest?.approvedBy ?? "MD");
  const [validityDays, setValidityDays] = useState(14);
  const [gstPercent, setGstPercent] = useState(latest?.gstPercent ?? 18);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.rate, 0), [lines]);
  const gstAmt = Math.round((subtotal * gstPercent) / 100);
  const grandTotal = subtotal + gstAmt;
  const advanceAmt = Math.round((grandTotal * advancePercent) / 100);

  // Client billing info from requirement (Tab 1 fields)
  const clientInfo: QuotationClientInfo = {
    name: lead?.name ?? "",
    companyName: field("companyName") || lead?.customerCompany || undefined,
    address: field("companyAddress") || undefined,
    gstin: field("companyGstin") || lead?.gstNumber || undefined,
    contactPerson: field("contactPerson") || undefined,
  };

  if (!lead || !company) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  const isBlocked = (BLOCKED_STATUSES as readonly string[]).includes(lead.status);

  if (!requirement) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">Gather the requirement first</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A quotation pulls billing, delivery and GST details from the requirement.
        </p>
        <Button asChild className="mt-4">
          <Link to="/requirement/$leadId" params={{ leadId }}>Start requirement</Link>
        </Button>
      </div>
    );
  }

  const setLine = (id: string, patch: Partial<QuotationLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [...ls, { id: newId("ql"), description: "", qty: 1, unit: "month", rate: 0 }]);
  const delLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const build = (): Quotation | null => {
    if (subtotal <= 0) {
      toast.error("Add at least one priced line item");
      return null;
    }
    const today = new Date();
    const valid = new Date(today);
    valid.setDate(valid.getDate() + validityDays);
    const projectNo = latest?.projectNo ?? `PRJ-${leadId.slice(-4)}`;
    return {
      id: newId("q"),
      requirementId: requirement.id,
      leadId,
      companyId: company.id,
      quotationNo: latest?.quotationNo ?? nextQuoteNo(company, db.quotations.length),
      projectNo,
      version: (latest?.version ?? 0) + 1,
      date: today.toISOString().slice(0, 10),
      validityDate: valid.toISOString().slice(0, 10),
      lines: structuredCloneLines(lines),
      advancePercent,
      balanceTerms,
      ratePerDayNote: ratePerDayNote || undefined,
      approvedBy: approvedBy || undefined,
      status: "draft",
      deliveryAddress: field("deliveryAddress"),
      deliveryGstin: field("deliveryGstin"),
      gstPercent,
    };
  };

  const saveVersion = (send: boolean) => {
    if (send && isBlocked) {
      toast.error(`Cannot send a quotation — lead is ${lead.status.replace("_", " ")}`);
      return;
    }
    const q = build();
    if (!q) return;
    q.status = send ? "sent" : "draft";
    mutate((d) => {
      d.quotations.push(q);
      if (send) {
        const l = d.leads.find((x) => x.id === leadId);
        if (l && l.status !== "completed") l.status = "quote_sent";
        d.activities.push({
          id: newId("a"), leadId, at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md", kind: "quotation",
          text: `Quotation ${q.quotationNo} v${q.version} sent (${formatINR(grandTotal)}) — emailed to ${field("email") || clientInfo.companyName || "client"}`,
        });
        // proforma/payment shell — keyed by grand total (includes GST)
        if (!d.payments.find((p) => p.leadId === leadId)) {
          d.payments.push({
            id: newId("p"), quotationId: q.id, leadId,
            stage: "none", total: grandTotal,
            advanceAmount: advanceAmt,
            balanceAmount: grandTotal - advanceAmt,
            copyToAdmin: true, updatedAt: new Date().toISOString(),
          });
        }
        // Auto follow-up: +2 days to check client has received and reviewed
        const due = new Date();
        due.setDate(due.getDate() + 2);
        d.followUps.push({
          id: newId("f"), leadId,
          dueAt: due.toISOString(),
          reason: `Follow up on quotation ${q.quotationNo} v${q.version} — confirm receipt & check feedback`,
          done: false, callAttemptCount: 0,
        });
      } else {
        d.activities.push({
          id: newId("a"), leadId, at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md", kind: "quotation",
          text: `Quotation ${q.quotationNo} v${q.version} saved as draft`,
        });
      }
    });
    toast.success(send ? `Quotation v${q.version} sent — follow-up scheduled in 2 days` : `Draft v${q.version} saved`);
    if (send) navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  const downloadPdf = () => {
    const q = build();
    if (!q) return;
    downloadQuotationPdf(q, company, clientInfo);
    toast.success("PDF downloaded");
  };

  // Intra-state vs inter-state detection for GST label
  const deliveryGstin = field("deliveryGstin");
  const stgState = company.gstin.slice(0, 2);
  const clientState = deliveryGstin ? deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = deliveryGstin.length > 0 && clientState !== stgState;
  const gstLabel = gstPercent === 0
    ? "No GST (exempt / composite)"
    : isInterstate
    ? `IGST ${gstPercent}%`
    : `CGST ${gstPercent / 2}% + SGST ${gstPercent / 2}%`;

  return (
    <>
      <Link
        to="/leads/$leadId"
        params={{ leadId }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lead
      </Link>

      {/* Blocked state banner */}
      {isBlocked && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Quotation cannot be sent</p>
            <p className="text-sm text-muted-foreground">
              This lead is <span className="font-medium">{lead.status.replace("_", " ")}</span>.
              Reactivate the lead first (change status to followup or interested) before sending a new quotation.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          {/* Header + client info */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  {latest ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-muted-foreground" />
                      Revision of {latest.quotationNo}
                      <Badge variant="outline">v{(latest.version ?? 0) + 1}</Badge>
                    </span>
                  ) : "New quotation"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {companyName(db, company.id)} · {lead.name}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AddrBlock
                title="Bill to (client)"
                body={[
                  clientInfo.companyName || clientInfo.name,
                  clientInfo.contactPerson ? `Attn: ${clientInfo.contactPerson}` : "",
                  clientInfo.address || "",
                  clientInfo.gstin ? `GSTIN: ${clientInfo.gstin}` : "",
                ].filter(Boolean).join("\n")}
                hint={!clientInfo.companyName ? "Fill Company Name in the requirement to show billing info." : undefined}
              />
              <AddrBlock
                title="Deliver to (site)"
                body={[
                  field("deliveryAddress") || "—",
                  field("deliveryGstin") ? `GSTIN: ${field("deliveryGstin")}` : "",
                ].filter(Boolean).join("\n")}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AddrBlock
                title="From (STG billing)"
                body={`${company.billingAddress}\nGSTIN: ${company.gstin}`}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Line items</h2>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="mr-1.5 h-4 w-4" /> Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.id} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    className="col-span-12 sm:col-span-6"
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => setLine(l.id, { description: e.target.value })}
                  />
                  <Input
                    className="col-span-3 sm:col-span-1"
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-4 sm:col-span-2"
                    placeholder="unit"
                    value={l.unit}
                    onChange={(e) => setLine(l.id, { unit: e.target.value })}
                  />
                  <Input
                    className="col-span-4 sm:col-span-2"
                    type="number"
                    min={0}
                    placeholder="rate"
                    value={l.rate}
                    onChange={(e) => setLine(l.id, { rate: Number(e.target.value) })}
                  />
                  <button
                    className="col-span-1 grid place-items-center text-muted-foreground hover:text-destructive"
                    onClick={() => delLine(l.id)}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* GST breakdown */}
            <div className="mt-4 space-y-1.5 border-t pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground flex-1">GST %</span>
                <div className="flex gap-1.5">
                  {GST_RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setGstPercent(r)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium border transition-colors",
                        gstPercent === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:bg-muted",
                      )}
                    >
                      {r === 0 ? "NIL" : `${r}%`}
                    </button>
                  ))}
                </div>
              </div>

              {gstPercent > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{gstLabel}</span>
                  <span>{formatINR(gstAmt)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Grand total</span>
                <span className="text-xl font-bold">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Commercial terms */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">Commercial terms</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Advance % (of grand total)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={advancePercent}
                  onChange={(e) => setAdvance(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Validity (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Balance terms</Label>
                <Input value={balanceTerms} onChange={(e) => setBalanceTerms(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Extension rate note</Label>
                <Input
                  placeholder="e.g. ₹6,500/day beyond period"
                  value={ratePerDayNote}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Approved by</Label>
                <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Advance due: <span className="font-semibold">{formatINR(advanceAmt)}</span>
              {" "}· Balance: <span className="font-semibold">{formatINR(grandTotal - advanceAmt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveVersion(true)}
              disabled={isBlocked}
              title={isBlocked ? `Lead is ${lead.status.replace("_", " ")} — cannot send` : undefined}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {latest ? `Send revision v${(latest.version ?? 0) + 1}` : "Send quotation"}
            </Button>
            <Button variant="outline" onClick={() => saveVersion(false)}>
              Save draft
            </Button>
            <Button variant="outline" onClick={downloadPdf}>
              <FileDown className="mr-1.5 h-4 w-4" /> Preview PDF
            </Button>
          </div>

          {!isBlocked && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Sending will mark lead as "Quote sent" and create a 2-day follow-up task automatically.
            </p>
          )}
        </div>

        {/* Right: version history + payment */}
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <History className="h-4 w-4 text-muted-foreground" /> Version history
            </h2>
            {versions.length ? (
              <ul className="space-y-2 text-sm">
                {versions.map((v) => {
                  const vTotal = v.lines.reduce((s, l) => s + l.qty * l.rate, 0);
                  const vGst = Math.round((vTotal * (v.gstPercent ?? 0)) / 100);
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div>
                        <p className="font-semibold">
                          {v.quotationNo}{" "}
                          <span className="text-muted-foreground">v{v.version}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.date} · {v.status}
                          {v.gstPercent ? ` · GST ${v.gstPercent}%` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatINR(vTotal + vGst)}</span>
                        <button
                          onClick={() => downloadQuotationPdf(v, company, clientInfo)}
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Download PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No versions yet. Same project keeps one quotation number across revisions.
              </p>
            )}
          </div>

          <PaymentCard leadId={leadId} />
        </div>
      </div>
    </>
  );
}

function PaymentCard({ leadId }: { leadId: string }) {
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const payment = db.payments.find((p) => p.leadId === leadId);
  if (!payment) return null;

  const setStage = (stage: typeof payment.stage) => {
    mutate((d) => {
      const p = d.payments.find((x) => x.leadId === leadId);
      if (!p) return;
      p.stage = stage;
      p.updatedAt = new Date().toISOString();
      const l = d.leads.find((x) => x.id === leadId);
      if (l) {
        if (stage === "advance_paid") l.status = "confirmed";
        if (stage === "fully_paid") l.status = "completed";
      }
      if (stage === "fully_paid") {
        const r = d.requirements.find((x) => x.leadId === leadId);
        if (r) r.status = "closed";
      }
      d.activities.push({
        id: newId("a"), leadId, at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md", kind: "payment",
        text: `Payment marked: ${stage.replace(/_/g, " ")} — copy to admin`,
      });
    });
    toast.success(`Marked ${stage.replace(/_/g, " ")}`);
  };

  const stageLabel = payment.stage.replace(/_/g, " ");

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <IndianRupee className="h-4 w-4 text-muted-foreground" /> Proforma & payment
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Grand total</p>
          <p className="font-semibold">{formatINR(payment.total)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Advance</p>
          <p className="font-semibold">{formatINR(payment.advanceAmount)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-semibold">{formatINR(payment.balanceAmount)}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Stage: <span className="font-medium text-foreground">{stageLabel}</span>
      </p>
      <div className="mt-3 grid gap-2">
        {/* PI button — navigates to dedicated Proforma Invoice page */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate({ to: "/proforma/$leadId", params: { leadId } })}
        >
          <Mail className="mr-1.5 h-4 w-4" />
          Generate Proforma Invoice (PI)
          <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate({ to: "/tax-invoice/$leadId", params: { leadId } })}
        >
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Issue Tax Invoice (GST)
        </Button>
        <Button size="sm" variant="outline" onClick={() => setStage("advance_paid")}>
          Mark advance received
        </Button>
        <Button size="sm" onClick={() => setStage("fully_paid")}>
          Mark fully paid · close requirement
        </Button>
      </div>
    </div>
  );
}

function structuredCloneLines(lines: QuotationLine[]): QuotationLine[] {
  return lines.map((l) => ({ ...l, id: newId("ql") }));
}

function AddrBlock({ title, body, hint }: { title: string; body: string; hint?: string }) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3", !body.trim() && "border-dashed opacity-60")}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="whitespace-pre-line text-sm">{body || "—"}</p>
      {hint && <p className="mt-1 text-xs text-amber-600">{hint}</p>}
    </div>
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
