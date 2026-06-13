import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName } from "@/lib/data/selectors";
import { downloadProformaPdf } from "@/lib/proforma-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft, FileDown, Send, IndianRupee, AlertTriangle, CheckCircle2,
  Clock, Building2,
} from "lucide-react";
import type { ProformaInvoice } from "@/lib/data/types";

export const Route = createFileRoute("/_app/proforma/$leadId")({ component: ProformaInvoicePage });

function nextPiNo(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-PI-${year}-${String(100 + count + 1).slice(1)}`;
}

function ProformaInvoicePage() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();

  const lead = db.leads.find((l) => l.id === leadId);
  const requirement = db.requirements.find((r) => r.leadId === leadId);
  const company = db.companies.find((c) => c.id === lead?.companyId);
  const payment = db.payments.find((p) => p.leadId === leadId);

  // The latest sent quotation is the basis for the PI
  const sentQuotations = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "sent")
    .sort((a, b) => b.version - a.version);
  const latestSent = sentQuotations[0];

  // Past PIs for this lead
  const pastPIs = (db.proformaInvoices ?? [])
    .filter((p) => p.leadId === leadId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestPI = pastPIs[0];

  const field = (k: string) => requirement?.fields.find((f) => f.key === k)?.value ?? "";

  // Note state (editable before generating)
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState(7);

  if (!lead || !company) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  if (!latestSent && !payment) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">No sent quotation found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a quotation first — the Proforma Invoice is based on the approved quotation.
        </p>
        <Button asChild className="mt-4">
          <Link to="/quotation/$leadId" params={{ leadId }}>Go to quotation builder</Link>
        </Button>
      </div>
    );
  }

  // Derive amounts from payment record (which mirrors the sent quotation's grand total)
  const total = payment?.total ?? 0;
  const advancePercent = latestSent?.advancePercent ?? payment ? Math.round((payment!.advanceAmount / payment!.total) * 100) : 50;
  const advanceAmount = payment?.advanceAmount ?? 0;
  const balanceAmount = payment?.balanceAmount ?? 0;

  // Derive GST breakdown from the sent quotation
  const gstPercent = latestSent?.gstPercent ?? 0;
  const subtotal = latestSent
    ? latestSent.lines.reduce((s, l) => s + l.qty * l.rate, 0)
    : Math.round(total / (1 + gstPercent / 100));
  const gstAmount = total - subtotal;

  const clientInfo = {
    name: lead.name,
    companyName: field("companyName") || lead.customerCompany || undefined,
    address: field("companyAddress") || undefined,
    gstin: field("companyGstin") || lead.gstNumber || undefined,
    contactPerson: field("contactPerson") || undefined,
    deliveryAddress: field("deliveryAddress") || undefined,
    deliveryGstin: field("deliveryGstin") || undefined,
  };

  const buildPI = (): ProformaInvoice => {
    const today = new Date();
    const valid = new Date(today);
    valid.setDate(valid.getDate() + validityDays);
    const piCount = (db.proformaInvoices ?? []).filter((p) => p.companyId === company.id).length;
    return {
      id: newId("pi"),
      proformaNo: nextPiNo(company.quotePrefix, piCount),
      leadId,
      quotationId: latestSent?.id ?? "",
      quotationNo: latestSent?.quotationNo ?? "",
      companyId: company.id,
      date: today.toISOString().slice(0, 10),
      validUntil: valid.toISOString().slice(0, 10),
      subtotal,
      gstPercent,
      gstAmount,
      total,
      advancePercent,
      advanceAmount,
      balanceAmount,
      clientName: clientInfo.name,
      clientCompany: clientInfo.companyName,
      clientAddress: clientInfo.address,
      clientGstin: clientInfo.gstin,
      clientContactPerson: clientInfo.contactPerson,
      deliveryAddress: clientInfo.deliveryAddress,
      deliveryGstin: clientInfo.deliveryGstin,
      note: note.trim() || undefined,
      status: "draft",
    };
  };

  const downloadOnly = () => {
    const pi = buildPI();
    downloadProformaPdf(pi, company);
    toast.success("Proforma Invoice PDF downloaded");
  };

  const sendPI = () => {
    const pi = buildPI();
    pi.status = "sent";
    mutate((d) => {
      if (!d.proformaInvoices) d.proformaInvoices = [];
      d.proformaInvoices.push(pi);
      // Update payment stage
      const p = d.payments.find((x) => x.leadId === leadId);
      if (p) {
        p.stage = "proforma_sent";
        p.updatedAt = new Date().toISOString();
      }
      d.activities.push({
        id: newId("a"), leadId, at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md", kind: "payment",
        text: `Proforma Invoice ${pi.proformaNo} generated — advance of ${formatINR(pi.advanceAmount)} requested`,
      });
    });
    downloadProformaPdf(pi, company);
    toast.success(`PI ${pi.proformaNo} generated & payment stage updated`);
    navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  // Intra/inter-state label
  const stgState = company.gstin.slice(0, 2);
  const clientState = clientInfo.deliveryGstin ? clientInfo.deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = (clientInfo.deliveryGstin ?? "").length > 0 && clientState !== stgState;
  const gstLabel = gstPercent === 0
    ? "No GST"
    : isInterstate
    ? `IGST ${gstPercent}%`
    : `CGST ${gstPercent / 2}% + SGST ${gstPercent / 2}%`;

  return (
    <>
      <Link
        to="/quotation/$leadId"
        params={{ leadId }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotation
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          {/* Header */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h1 className="text-xl font-bold tracking-tight">Proforma Invoice</h1>
            <p className="text-sm text-muted-foreground">
              {companyName(db, company.id)} · {lead.name}
              {latestSent && (
                <span className="ml-2 text-muted-foreground">
                  · Ref: {latestSent.quotationNo} v{latestSent.version}
                </span>
              )}
            </p>

            {/* Client info */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> Billed to
                </p>
                <p className="whitespace-pre-line text-sm">
                  {[
                    clientInfo.companyName || clientInfo.name,
                    clientInfo.contactPerson ? `Attn: ${clientInfo.contactPerson}` : "",
                    clientInfo.address || "",
                    clientInfo.gstin ? `GSTIN: ${clientInfo.gstin}` : "",
                  ].filter(Boolean).join("\n") || "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Delivery site
                </p>
                <p className="whitespace-pre-line text-sm">
                  {[
                    clientInfo.deliveryAddress || "—",
                    clientInfo.deliveryGstin ? `GSTIN: ${clientInfo.deliveryGstin}` : "",
                  ].filter(Boolean).join("\n")}
                </p>
              </div>
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Amount summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Value of order (excl. GST)</span>
                <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
              </div>
              {gstPercent > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{gstLabel}</span>
                  <span>{formatINR(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Grand total</span>
                <span className="text-base">{formatINR(total)}</span>
              </div>
            </div>

            {/* Advance due highlight */}
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Advance due now ({advancePercent}%)
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-amber-900 dark:text-amber-200">
                    {formatINR(advanceAmount)}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-amber-400" />
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Balance of {formatINR(balanceAmount)} due as per quotation payment terms.
              </p>
            </div>
          </div>

          {/* Bank details (read-only preview) */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-card dark:border-blue-800 dark:bg-blue-950/20">
            <h2 className="mb-2 font-semibold text-blue-900 dark:text-blue-200">
              Bank details (printed on PI)
            </h2>
            <pre className="whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-300">
              {company.bankDetails}
            </pre>
          </div>

          {/* PI options */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">PI options</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>PI validity (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-1.5">
              <Label>Note / special instructions (optional)</Label>
              <Textarea
                placeholder="e.g. Please transfer by 20 June to ensure timely delivery."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sendPI}>
              <Send className="mr-1.5 h-4 w-4" /> Generate & send PI
            </Button>
            <Button variant="outline" onClick={downloadOnly}>
              <FileDown className="mr-1.5 h-4 w-4" /> Download preview
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            "Generate & send" downloads the PDF and marks payment stage as "Proforma sent".
          </p>
        </div>

        {/* Right: PI history */}
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" /> PI history
            </h2>
            {pastPIs.length ? (
              <ul className="space-y-2 text-sm">
                {pastPIs.map((pi) => (
                  <li
                    key={pi.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div>
                      <p className="font-semibold">{pi.proformaNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {pi.date} · <StatusBadge status={pi.status} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatINR(pi.advanceAmount)}</span>
                      <button
                        onClick={() => downloadProformaPdf(pi, company)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Download PI"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No proforma invoices generated yet.
              </p>
            )}
          </div>

          {/* Payment stage summary */}
          {payment && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-3 font-semibold">Payment stage</h2>
              <PaymentStageTracker stage={payment.stage} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: ProformaInvoice["status"] }) {
  const map: Record<ProformaInvoice["status"], string> = {
    draft: "text-muted-foreground",
    sent: "text-blue-600 dark:text-blue-400",
    paid: "text-success",
  };
  return <span className={map[status]}>{status}</span>;
}

const STAGES = [
  { key: "none", label: "Quotation sent" },
  { key: "proforma_sent", label: "PI sent" },
  { key: "advance_paid", label: "Advance received" },
  { key: "fully_paid", label: "Fully paid" },
] as const;

function PaymentStageTracker({ stage }: { stage: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  return (
    <ol className="space-y-2 text-sm">
      {STAGES.map((s, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.key} className="flex items-center gap-2.5">
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                done
                  ? "border-success bg-success text-success-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              {done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className={active ? "font-semibold" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
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
