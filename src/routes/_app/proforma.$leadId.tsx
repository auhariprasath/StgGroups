import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName } from "@/lib/data/selectors";
import { downloadProformaPdf } from "@/lib/proforma-pdf";
import { logCommunication } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileDown,
  Send,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Download,
  Smartphone,
  Mail,
  QrCode,
  History,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  ShieldCheck,
  ShieldX,
  Ban,
  Upload,
} from "lucide-react";
import type { Lead, ProformaInvoice, PaymentRecord } from "@/lib/data/types";

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

  const sentQuotations = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "sent")
    .sort((a, b) => b.version - a.version);
  const latestSent = sentQuotations[0];

  const acceptedQuotations = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "accepted")
    .sort((a, b) => b.version - a.version);
  const latestAccepted = acceptedQuotations[0];

  const workOrders = (db.workOrders ?? []).filter((wo) => wo.leadId === leadId);
  const latestWO = workOrders.sort((a, b) => b.date.localeCompare(a.date))[0];

  const pastPIs = (db.proformaInvoices ?? [])
    .filter((p) => p.leadId === leadId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestPI = pastPIs[0];

  const paymentRecords = (db.paymentRecords ?? [])
    .filter((pr) => pr.leadId === leadId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const field = (k: string) => requirement?.fields.find((f) => f.key === k)?.value ?? "";

  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState(7);
  const [tdsPercent, setTdsPercent] = useState(payment?.tdsPercent ?? 0);

  const [showQR, setShowQR] = useState(false);
  const [showReceivePayment, setShowReceivePayment] = useState(false);
  const [recvAmount, setRecvAmount] = useState(0);
  const [recvDate, setRecvDate] = useState(new Date().toISOString().slice(0, 10));
  const [recvMode, setRecvMode] = useState<PaymentRecord["mode"]>("NEFT");
  const [recvRef, setRecvRef] = useState("");
  const [recvRemarks, setRecvRemarks] = useState("");
  const [recvUtrProof, setRecvUtrProof] = useState("");

  if (!lead || !company) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  if (!latestAccepted && !payment) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">No accepted quotation found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The quotation must be accepted by the customer before a Proforma Invoice can be generated.
        </p>
        <Button asChild className="mt-4">
          <Link to="/quotation/$leadId" params={{ leadId }}>
            Go to quotation builder
          </Link>
        </Button>
      </div>
    );
  }

  const total = payment?.total ?? 0;
  const advancePercent =
    (latestSent?.advancePercent ?? payment)
      ? Math.round((payment!.advanceAmount / payment!.total) * 100)
      : 50;
  const advanceAmount = payment?.advanceAmount ?? 0;
  const balanceAmount = payment?.balanceAmount ?? 0;

  const gstPercent = latestSent?.gstPercent ?? 0;
  const subtotal = latestSent
    ? latestSent.lines.reduce((s, l) => s + l.qty * l.rate, 0)
    : Math.round(total / (1 + gstPercent / 100));
  const gstAmount = total - subtotal;

  const tdsAmount = Math.round((total * tdsPercent) / 100);
  const netReceivable = total - tdsAmount;
  const totalReceived = paymentRecords.reduce((s, r) => s + r.netAmount, 0);
  const balanceDue = Math.max(0, total - totalReceived);

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
      workOrderId: latestWO?.id,
      workOrderNo: latestWO?.workOrderNo,
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

  const logStatusHistory = (
    invoiceId: string,
    invoiceType: "proforma" | "tax",
    oldStatus: string,
    newStatus: string,
    remarks?: string,
  ) => {
    mutate((d) => {
      if (!d.invoiceStatusHistory) d.invoiceStatusHistory = [];
      d.invoiceStatusHistory.push({
        id: newId("ish"),
        invoiceId,
        invoiceType,
        oldStatus,
        newStatus,
        changedBy: user?.id ?? "u-md",
        changedAt: new Date().toISOString(),
        remarks,
      });
    });
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
      const p = d.payments.find((x) => x.leadId === leadId);
      if (p) {
        p.stage = "proforma_sent";
        p.tdsPercent = tdsPercent;
        p.tdsAmount = tdsAmount;
        p.updatedAt = new Date().toISOString();
      }
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "payment",
        text: `Proforma Invoice ${pi.proformaNo} generated — advance of ${formatINR(pi.advanceAmount)} requested`,
      });
    });
    logStatusHistory(pi.id, "proforma", "draft", "sent");
    downloadProformaPdf(pi, company);
    toast.success(`PI ${pi.proformaNo} generated & payment stage updated`);
    navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  const receivePayment = () => {
    // ── Payment validation ──────────────────────────────────────────────
    if (recvAmount <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    if (!recvRef.trim()) {
      toast.error("Enter a payment reference (UTR/Cheque No.)");
      return;
    }
    const existingRef = paymentRecords.find(
      (r) => r.reference.toLowerCase() === recvRef.trim().toLowerCase(),
    );
    if (existingRef) {
      toast.error("Duplicate payment reference — this UTR/cheque number is already recorded");
      return;
    }
    const newTotal = totalReceived + recvAmount;
    if (newTotal > total) {
      toast.error(
        `Overpayment — total received would be ${formatINR(newTotal)} against ${formatINR(total)}. Verify the amount.`,
      );
      return;
    }
    // ── Validation passed ───────────────────────────────────────────────
    const pi = latestPI || buildPI();
    const record: PaymentRecord = {
      id: newId("pr"),
      leadId,
      invoiceId: pi.id,
      invoiceType: "proforma",
      amount: recvAmount,
      date: recvDate,
      mode: recvMode,
      reference: recvRef.trim(),
      remarks: recvRemarks.trim() || undefined,
      tdsDeducted: Math.round((recvAmount * tdsPercent) / 100),
      netAmount: recvAmount - Math.round((recvAmount * tdsPercent) / 100),
      utrProof: recvUtrProof.trim() || undefined,
      status: "pending",
      createdBy: user?.id ?? "u-md",
      createdAt: new Date().toISOString(),
    };
    mutate((d) => {
      if (!d.paymentRecords) d.paymentRecords = [];
      d.paymentRecords.push(record);
      const newTotalReceived = (d.paymentRecords ?? [])
        .filter((r) => r.leadId === leadId)
        .reduce((s, r) => s + r.netAmount, 0);
      const p = d.payments.find((x) => x.leadId === leadId);
      if (p) {
        if (newTotalReceived >= p.total) p.stage = "fully_paid";
        else if (newTotalReceived > 0) p.stage = "partially_paid";
        p.balanceAmount = Math.max(0, p.total - newTotalReceived);
        p.tdsPercent = tdsPercent;
        p.tdsAmount = (d.paymentRecords ?? [])
          .filter((r) => r.leadId === leadId)
          .reduce((s, r) => s + r.tdsDeducted, 0);
        p.updatedAt = new Date().toISOString();
      }
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "payment",
        text: `Payment received: ${formatINR(record.netAmount)} via ${record.mode} (Ref: ${record.reference})`,
      });
    });
    toast.success(`Payment of ${formatINR(record.netAmount)} recorded (pending verification)`);
    setShowReceivePayment(false);
    setRecvAmount(0);
    setRecvRef("");
    setRecvRemarks("");
    setRecvUtrProof("");
  };

  // ── Payment approval workflow ────────────────────────────────────────
  const approvePayment = (recordId: string, newStatus: "verified" | "approved" | "rejected") => {
    mutate((d) => {
      const pr = (d.paymentRecords ?? []).find((r) => r.id === recordId);
      if (!pr) return;
      pr.status = newStatus;
      pr.verifiedBy = user?.id ?? "u-md";
      pr.verifiedAt = new Date().toISOString();
      const label = { verified: "Verified", approved: "Approved", rejected: "Rejected" }[newStatus];
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "payment",
        text: `Payment ${formatINR(pr.netAmount)} (Ref: ${pr.reference}) marked as ${label} by ${user?.name ?? "System"}`,
      });
    });
    toast.success(`Payment ${newStatus}`);
  };

  const sendWhatsApp = () => {
    const pi = latestPI || buildPI();
    const decodedMsg =
      `Dear ${clientInfo.companyName || clientInfo.name},\n\n` +
      `Please find attached our Proforma Invoice ${pi.proformaNo} for ${formatINR(pi.total)}.\n\n` +
      `Advance due: ${formatINR(pi.advanceAmount)}\n` +
      `Bank: ${company.bankDetails}\n\n` +
      `Kindly process the payment at your earliest.`;
    const msg = encodeURIComponent(decodedMsg);
    window.open(`https://wa.me/${lead.phone}?text=${msg}`, "_blank");
    logCommunication({
      leadId,
      invoiceId: pi.id,
      invoiceType: "proforma",
      method: "whatsapp",
      recipient: lead.phone,
      subject: `PI ${pi.proformaNo}`,
      body: decodedMsg,
      sentBy: user?.id ?? "u-md",
    });
    toast.success("WhatsApp link opened");
  };

  const sendEmail = () => {
    const pi = latestPI || buildPI();
    const decodedSubject = `Proforma Invoice ${pi.proformaNo} from ${company.name}`;
    const decodedBody =
      `Dear ${clientInfo.companyName || clientInfo.name},\n\n` +
      `Please find attached our Proforma Invoice ${pi.proformaNo} for ${formatINR(pi.total)}.\n\n` +
      `Advance due: ${formatINR(pi.advanceAmount)}\n` +
      `Payment Terms: As per quotation\n\n` +
      `Regards,\n${company.name}`;
    const subject = encodeURIComponent(decodedSubject);
    const body = encodeURIComponent(decodedBody);
    const emailTo = lead.email || "";
    window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, "_blank");
    logCommunication({
      leadId,
      invoiceId: pi.id,
      invoiceType: "proforma",
      method: "email",
      recipient: emailTo,
      subject: decodedSubject,
      body: decodedBody,
      sentBy: user?.id ?? "u-md",
    });
    toast.success("Email client opened");
  };

  const stgState = company.gstin.slice(0, 2);
  const clientState = clientInfo.deliveryGstin ? clientInfo.deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = (clientInfo.deliveryGstin ?? "").length > 0 && clientState !== stgState;
  const gstLabel =
    gstPercent === 0
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

      {/* Acceptance required banner */}
      {!latestAccepted && !latestWO && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Quotation acceptance recommended
            </p>
            <p className="text-sm text-muted-foreground">
              Accept the quotation first (with PO/LOI reference) before generating the Proforma
              Invoice. You can still generate a PI without acceptance.
            </p>
          </div>
        </div>
      )}

      {latestWO && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">
              Work Order {latestWO.workOrderNo}
            </p>
            <p className="text-sm text-muted-foreground">
              Work Order created. Proforma Invoice will reference this Work Order.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h1 className="text-xl font-bold tracking-tight">Proforma Invoice</h1>
            <p className="text-sm text-muted-foreground">
              {companyName(db, company.id)} · {lead.name}
              {latestSent && (
                <span className="ml-2 text-muted-foreground">
                  · Ref: {latestSent.quotationNo} v{latestSent.version}
                </span>
              )}
              {latestWO && (
                <span className="ml-2 text-muted-foreground">· WO: {latestWO.workOrderNo}</span>
              )}
            </p>

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
                  ]
                    .filter(Boolean)
                    .join("\n") || "—"}
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
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </p>
              </div>
            </div>
          </div>

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
              {tdsPercent > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>TDS @ {tdsPercent}%</span>
                  <span>− {formatINR(tdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Net receivable</span>
                <span className="text-base">{formatINR(netReceivable)}</span>
              </div>
            </div>

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

          {/* TDS setting */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">TDS Configuration</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>TDS % (if applicable)</Label>
                <div className="flex gap-2">
                  {[0, 1, 2, 5, 10].map((p) => (
                    <button
                      key={p}
                      onClick={() => setTdsPercent(p)}
                      className={`rounded px-3 py-1.5 text-xs font-medium border transition-colors ${
                        tdsPercent === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {p === 0 ? "No TDS" : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-card dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-blue-900 dark:text-blue-200">
                Bank details (printed on PI)
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowQR(!showQR)}>
                <QrCode className="mr-1.5 h-4 w-4" /> {showQR ? "Hide QR" : "Show QR"}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-300">
              {company.bankDetails}
            </pre>
            {showQR && (
              <div className="mt-3 rounded-lg border bg-white p-4 text-center dark:bg-gray-900">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">UPI QR Code</p>
                <UPIQrCode
                  upiId={`${company.quotePrefix}@upi`}
                  name={company.name}
                  amount={balanceDue}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Scan to pay via UPI | Amount: {formatINR(balanceDue)}
                </p>
              </div>
            )}
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

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendPI}>
              <Send className="mr-1.5 h-4 w-4" /> Generate & send PI
            </Button>
            <Button variant="outline" onClick={downloadOnly}>
              <FileDown className="mr-1.5 h-4 w-4" /> Download preview
            </Button>
            <Button variant="outline" onClick={sendWhatsApp}>
              <Smartphone className="mr-1.5 h-4 w-4" /> Share on WhatsApp
            </Button>
            <Button variant="outline" onClick={sendEmail}>
              <Mail className="mr-1.5 h-4 w-4" /> Share via Email
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            "Generate & send" downloads the PDF and marks payment stage as "Proforma sent".
          </p>

          {/* Receive payment */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Receive Payment</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReceivePayment(!showReceivePayment)}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Record Payment
              </Button>
            </div>
            {paymentRecords.length > 0 && (
              <div className="space-y-2 mb-4">
                {paymentRecords.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{formatINR(pr.netAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pr.date} · {pr.mode} · {pr.reference}
                        {pr.tdsDeducted > 0 && ` · TDS: ${formatINR(pr.tdsDeducted)}`}
                        {pr.utrProof && ` · UTR: ${pr.utrProof}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          pr.status === "approved"
                            ? "default"
                            : pr.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {pr.status}
                      </Badge>
                      {pr.status === "pending" && (
                        <>
                          <button
                            onClick={() => approvePayment(pr.id, "verified")}
                            className="text-blue-600 hover:text-blue-800"
                            title="Verify payment"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => approvePayment(pr.id, "rejected")}
                            className="text-red-600 hover:text-red-800"
                            title="Reject payment"
                          >
                            <ShieldX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {pr.status === "verified" && (
                        <button
                          onClick={() => approvePayment(pr.id, "approved")}
                          className="text-green-600 hover:text-green-800"
                          title="Approve payment"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showReceivePayment && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">Record Payment Receipt</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min={1}
                      value={recvAmount}
                      onChange={(e) => setRecvAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={recvDate}
                      onChange={(e) => setRecvDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Payment Mode</Label>
                    <select
                      value={recvMode}
                      onChange={(e) => setRecvMode(e.target.value as PaymentRecord["mode"])}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      {["NEFT", "RTGS", "UPI", "Cheque", "Cash", "Card", "Other"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Reference (UTR/Cheque No.)</Label>
                    <Input
                      value={recvRef}
                      onChange={(e) => setRecvRef(e.target.value)}
                      placeholder="e.g. HDFC250123456"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Remarks (optional)</Label>
                  <Input
                    value={recvRemarks}
                    onChange={(e) => setRecvRemarks(e.target.value)}
                    placeholder="Any notes"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>UTR Proof / Reference Note (optional)</Label>
                  <Input
                    value={recvUtrProof}
                    onChange={(e) => setRecvUtrProof(e.target.value)}
                    placeholder="e.g. UTR: HDFC123456789 or Bank Receipt #123"
                  />
                  <p className="text-xs text-muted-foreground">
                    <Upload className="mr-1 inline h-3 w-3" />
                    Enter UTR number or receipt reference for audit trail
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={receivePayment}>
                    <IndianRupee className="mr-1.5 h-4 w-4" /> Record Payment
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReceivePayment(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {totalReceived > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Total received</span>
                <span className="font-semibold text-green-600">{formatINR(totalReceived)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
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
                        {pi.date} · {pi.status}
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

          {/* Work Orders */}
          {workOrders.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" /> Work Orders
              </h2>
              <ul className="space-y-2 text-sm">
                {workOrders.map((wo) => (
                  <li
                    key={wo.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div>
                      <p className="font-semibold">{wo.workOrderNo}</p>
                      <p className="text-xs text-muted-foreground">{wo.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {payment && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-3 font-semibold">Payment stage</h2>
              <PaymentStageTracker stage={payment.stage} />
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span>{formatINR(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received</span>
                  <span className="text-green-600">{formatINR(totalReceived)}</span>
                </div>
                {tdsAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TDS deducted</span>
                    <span className="text-amber-600">{formatINR(tdsAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Balance due</span>
                  <span className={balanceDue > 0 ? "text-red-600" : "text-green-600"}>
                    {balanceDue > 0 ? formatINR(balanceDue) : "Cleared"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function UPIQrCode({ upiId, name, amount }: { upiId: string; name: string; amount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQR = useCallback(async () => {
    try {
      const QRCode = (await import("qrcode")).default;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
      QRCode.toCanvas(canvas, upiLink, {
        width: 180,
        margin: 2,
        color: { dark: "#000", light: "#fff" },
      });
    } catch {
      // qrcode lib not installed — silently skip
    }
  }, [upiId, name, amount]);

  useMemo(() => {
    generateQR();
  }, [generateQR]);

  return <canvas ref={canvasRef} className="mx-auto rounded-lg" />;
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
  { key: "partially_paid", label: "Partially paid" },
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
            <span
              className={
                active
                  ? "font-semibold"
                  : done
                    ? "text-muted-foreground line-through"
                    : "text-muted-foreground"
              }
            >
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
