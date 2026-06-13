import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName } from "@/lib/data/selectors";
import { downloadTaxInvoicePdf } from "@/lib/tax-invoice-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, FileDown, Send, AlertTriangle, CheckCircle2, Clock,
  Plus, Trash2, Receipt,
} from "lucide-react";
import type { TaxInvoice, TaxInvoiceLine } from "@/lib/data/types";

export const Route = createFileRoute("/_app/tax-invoice/$leadId")({ component: TaxInvoicePage });

// SAC codes by company — editable per line
const DEFAULT_SAC: Record<string, string> = {
  "stg-rentals": "997313", // Leasing/rental of construction machinery
  "stg-infra": "995432",   // Earthmoving & excavation services
  "stg-trading": "84795",  // Machinery parts — user should refine
};

// Karnataka state code prefix for intra/inter detection
const KA_STATE = "29";

function nextInvNo(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-INV-${year}-${String(100 + count + 1).slice(1)}`;
}

function TaxInvoicePage() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();

  const lead = db.leads.find((l) => l.id === leadId);
  const requirement = db.requirements.find((r) => r.leadId === leadId);
  const company = db.companies.find((c) => c.id === lead?.companyId);
  const payment = db.payments.find((p) => p.leadId === leadId);

  const latestSentQuotation = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "sent")
    .sort((a, b) => b.version - a.version)[0];

  const latestPI = (db.proformaInvoices ?? [])
    .filter((p) => p.leadId === leadId && p.status === "sent")
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const pastInvoices = (db.taxInvoices ?? [])
    .filter((t) => t.leadId === leadId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const field = (k: string) => requirement?.fields.find((f) => f.key === k)?.value ?? "";

  const defaultSac = company ? (DEFAULT_SAC[company.id] ?? "") : "";

  // Build initial lines from latest sent quotation
  const initialLines = useMemo<TaxInvoiceLine[]>(() => {
    if (!latestSentQuotation) return [];
    return latestSentQuotation.lines.map((l) => ({
      id: newId("til"),
      description: l.description,
      sacCode: defaultSac,
      qty: l.qty,
      unit: l.unit,
      rate: l.rate,
      taxableAmount: l.qty * l.rate,
    }));
  }, [latestSentQuotation?.id]);

  const [lines, setLines] = useState<TaxInvoiceLine[]>(initialLines);
  const [gstPercent, setGstPercent] = useState(latestSentQuotation?.gstPercent ?? 18);
  const [placeOfSupply, setPlaceOfSupply] = useState("Karnataka (29)");
  const [dueDays, setDueDays] = useState(7);
  const [note, setNote] = useState("");

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.taxableAmount, 0), [lines]);
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const total = subtotal + gstAmount;
  const advanceReceived = payment?.advanceAmount ?? 0;
  const balanceDue = Math.max(0, total - advanceReceived);

  const clientInfo = {
    name: lead?.name ?? "",
    companyName: field("companyName") || lead?.customerCompany || undefined,
    address: field("companyAddress") || undefined,
    gstin: field("companyGstin") || lead?.gstNumber || undefined,
    contactPerson: field("contactPerson") || undefined,
    deliveryAddress: field("deliveryAddress") || undefined,
    deliveryGstin: field("deliveryGstin") || undefined,
  };

  if (!lead || !company) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  if (!latestSentQuotation && !payment) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">No sent quotation found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a quotation before generating a Tax Invoice.
        </p>
        <Button asChild className="mt-4">
          <Link to="/quotation/$leadId" params={{ leadId }}>Go to quotation</Link>
        </Button>
      </div>
    );
  }

  const setLine = (id: string, patch: Partial<TaxInvoiceLine>) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        updated.taxableAmount = updated.qty * updated.rate;
        return updated;
      }),
    );
  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { id: newId("til"), description: "", sacCode: defaultSac, qty: 1, unit: "month", rate: 0, taxableAmount: 0 },
    ]);
  const delLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const isInterstate = (() => {
    const stgState = company.gstin.slice(0, 2);
    const clientState = clientInfo.deliveryGstin
      ? clientInfo.deliveryGstin.slice(0, 2)
      : clientInfo.gstin
      ? clientInfo.gstin.slice(0, 2)
      : stgState;
    return clientState !== stgState;
  })();

  const gstLabel =
    gstPercent === 0
      ? "No GST (exempt)"
      : isInterstate
      ? `IGST ${gstPercent}%`
      : `CGST ${gstPercent / 2}% + SGST ${gstPercent / 2}%`;

  const buildInvoice = (): TaxInvoice | null => {
    if (subtotal <= 0) {
      toast.error("Add at least one priced line item");
      return null;
    }
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + dueDays);
    const invCount = (db.taxInvoices ?? []).filter((t) => t.companyId === company.id).length;
    return {
      id: newId("ti"),
      invoiceNo: nextInvNo(company.quotePrefix, invCount),
      leadId,
      quotationId: latestSentQuotation?.id,
      quotationNo: latestSentQuotation?.quotationNo,
      proformaId: latestPI?.id,
      proformaNo: latestPI?.proformaNo,
      companyId: company.id,
      date: today.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      lines: lines.map((l) => ({ ...l })),
      placeOfSupply,
      gstPercent,
      subtotal,
      gstAmount,
      total,
      advanceReceived,
      balanceDue,
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
    const inv = buildInvoice();
    if (!inv) return;
    downloadTaxInvoicePdf(inv, company);
    toast.success("Tax Invoice PDF downloaded");
  };

  const sendInvoice = () => {
    const inv = buildInvoice();
    if (!inv) return;
    inv.status = "sent";
    mutate((d) => {
      if (!d.taxInvoices) d.taxInvoices = [];
      d.taxInvoices.push(inv);
      // Update payment total in case GST changed
      const p = d.payments.find((x) => x.leadId === leadId);
      if (p) {
        p.total = total;
        p.balanceAmount = balanceDue;
        p.updatedAt = new Date().toISOString();
      }
      d.activities.push({
        id: newId("a"), leadId, at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md", kind: "payment",
        text: `Tax Invoice ${inv.invoiceNo} issued — total ${formatINR(total)}, balance due ${formatINR(balanceDue)}`,
      });
    });
    downloadTaxInvoicePdf(inv, company);
    toast.success(`Tax Invoice ${inv.invoiceNo} generated`);
    navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  const GST_RATES = [0, 5, 12, 18, 28];

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  Tax Invoice
                </h1>
                <p className="text-sm text-muted-foreground">
                  {companyName(db, company.id)} · {lead.name}
                  {latestSentQuotation && (
                    <span className="ml-2 text-muted-foreground">
                      · Ref: {latestSentQuotation.quotationNo} v{latestSentQuotation.version}
                    </span>
                  )}
                </p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                GST Invoice
              </Badge>
            </div>

            {/* Client + Place of supply */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recipient (Bill to)
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
              <div className="grid gap-1.5">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Place of supply
                  </p>
                  <Input
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="h-7 text-sm"
                    placeholder="e.g. Karnataka (29)"
                  />
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    GST type
                  </p>
                  <span className={isInterstate ? "text-blue-600" : "text-green-600"}>
                    {isInterstate ? "IGST (interstate)" : "CGST + SGST (intra-state)"}
                  </span>
                </div>
              </div>
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

            {/* Column headers */}
            <div className="mb-1 grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
              <span className="col-span-5">Description</span>
              <span className="col-span-2">SAC code</span>
              <span className="col-span-1 text-center">Qty</span>
              <span className="col-span-1 text-center">Unit</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.id} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="Description of service"
                    value={l.description}
                    onChange={(e) => setLine(l.id, { description: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="SAC"
                    value={l.sacCode}
                    onChange={(e) => setLine(l.id, { sacCode: e.target.value })}
                  />
                  <Input
                    className="col-span-1"
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-1"
                    placeholder="unit"
                    value={l.unit}
                    onChange={(e) => setLine(l.id, { unit: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    placeholder="rate"
                    value={l.rate}
                    onChange={(e) => setLine(l.id, { rate: Number(e.target.value) })}
                  />
                  <button
                    className="col-span-1 grid place-items-center text-muted-foreground hover:text-destructive"
                    onClick={() => delLine(l.id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* GST + totals */}
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxable value (subtotal)</span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted-foreground">GST rate</span>
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
                  <span>{formatINR(gstAmount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Invoice value (grand total)</span>
                <span className="text-base">{formatINR(total)}</span>
              </div>

              {advanceReceived > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-400">
                    <span>Less: advance received</span>
                    <span>− {formatINR(advanceReceived)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-bold dark:border-red-800 dark:bg-red-950/30">
                    <span className="text-red-700 dark:text-red-400">Balance due</span>
                    <span className="text-lg text-red-800 dark:text-red-300">
                      {formatINR(balanceDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Invoice options */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Invoice options</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Payment due (days from today)</Label>
                <Input
                  type="number"
                  min={1}
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-1.5">
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="e.g. Payment by NEFT/RTGS only. Cheques not accepted."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sendInvoice}>
              <Send className="mr-1.5 h-4 w-4" /> Issue Tax Invoice
            </Button>
            <Button variant="outline" onClick={downloadOnly}>
              <FileDown className="mr-1.5 h-4 w-4" /> Preview PDF
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            "Issue" downloads the PDF and records the invoice. GST credit can be claimed on this document.
          </p>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Invoice history */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" /> Tax invoices
            </h2>
            {pastInvoices.length ? (
              <ul className="space-y-2 text-sm">
                {pastInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div>
                      <p className="font-semibold">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.date} · {inv.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">{formatINR(inv.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          bal {formatINR(inv.balanceDue)}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadTaxInvoicePdf(inv, company)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Download"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No tax invoices issued yet.
              </p>
            )}
          </div>

          {/* Payment summary */}
          {payment && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-3 font-semibold">Payment summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quotation total</span>
                  <span>{formatINR(payment.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance received</span>
                  <span className="text-green-600">{formatINR(payment.advanceAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Balance</span>
                  <span className="text-red-600">{formatINR(payment.balanceAmount)}</span>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Stage: <span className="font-medium text-foreground">{payment.stage.replace(/_/g, " ")}</span>
              </p>
            </div>
          )}
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
