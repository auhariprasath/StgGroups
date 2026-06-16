import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate, newId } from "@/lib/data/store";
import { canSeeLead, companyName, customerHistoryForLead } from "@/lib/data/selectors";
import { downloadQuotationPdf, generateQuotationPdf } from "@/lib/quotation-pdf";
import type { QuotationClientInfo } from "@/lib/quotation-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAutosaveDraft, loadDraft } from "@/hooks/use-autosave-draft";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileDown,
  Send,
  IndianRupee,
  History,
  Mail,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Stamp,
  FileText,
  ClipboardCheck,
  Users,
  ChevronDown,
  ChevronRight,
  Building2,
  Phone,
  FileSpreadsheet,
  Receipt,
  Handshake,
  ArrowLeftRight,
  MessageCircle,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type {
  Company,
  Quotation,
  QuotationLine,
  Requirement,
  Machine,
  CustomerResponseType,
} from "@/lib/data/types";

export const Route = createFileRoute("/_app/quotation/$leadId")({ component: QuotationBuilder });

function nextQuoteNo(company: Company, count: number) {
  const year = new Date().getFullYear();
  return `${company.quotePrefix}-${year}-${String(1000 + count + 1).slice(1)}`;
}

function seedLines(
  requirement: Requirement | undefined,
  db: ReturnType<typeof useDb>,
): QuotationLine[] {
  const cat = requirement?.categoryId
    ? db.categories.find((c) => c.id === requirement.categoryId)
    : null;
  return [
    {
      id: newId("ql"),
      description: cat
        ? `${cat.name} — as per requirement`
        : "Equipment rental — as per requirement",
      qty: 1,
      unit: "month",
      rate: 0,
    },
    { id: newId("ql"), description: "Operator + transport to site", qty: 1, unit: "lot", rate: 0 },
  ];
}

const BLOCKED_STATUSES = ["dormant", "not_interested", "completed"] as const;
const GST_RATES = [0, 5, 12, 18, 28];

const AVAILABILITY_META: Record<
  NonNullable<Machine["availabilityStatus"]>,
  { label: string; dot: string; text: string }
> = {
  available: { label: "Available", dot: "bg-green-500", text: "text-green-600" },
  reserved: { label: "Reserved", dot: "bg-amber-500", text: "text-amber-600" },
  maintenance: { label: "Under Maintenance", dot: "bg-red-500", text: "text-red-600" },
  booked: { label: "Booked", dot: "bg-red-500", text: "text-red-600" },
};

const RESPONSE_META: Record<CustomerResponseType, string> = {
  accepted: "Accepted",
  too_costly: "Too costly",
  need_discount: "Need discount",
  competitor_quote: "Competitor quote",
  requirement_change: "Requirement change",
  under_review: "Under review",
  no_response: "No response",
};

/** Extract the first number from a spec string like "20.3 m" or "227 kg". */
function parseLeadingNumber(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.match(/[\d,]+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function QuotationBuilder() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lead = db.leads.find((l) => l.id === leadId);
  const requirement = db.requirements.find((r) => r.leadId === leadId);
  const company = db.companies.find((c) => c.id === lead?.companyId);
  const versions = db.quotations
    .filter((q) => q.leadId === leadId)
    .sort((a, b) => b.version - a.version);
  const latest = versions[0];

  const field = (k: string) => requirement?.fields.find((f) => f.key === k)?.value ?? "";

  const [lines, setLines] = useState<QuotationLine[]>(() =>
    latest ? structuredCloneLines(latest.lines) : seedLines(requirement, db),
  );
  const [showMachinePicker, setShowMachinePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [advancePercent, setAdvance] = useState(latest?.advancePercent ?? 50);
  const [balanceTerms, setBalanceTerms] = useState(
    latest?.balanceTerms ?? "Balance against bill within 7 days of delivery",
  );
  const [ratePerDayNote, setRate] = useState(latest?.ratePerDayNote ?? "");
  const [approvedBy, setApprovedBy] = useState(latest?.approvedBy ?? "MD");
  const [validityDays, setValidityDays] = useState(7);
  const [gstPercent, setGstPercent] = useState(latest?.gstPercent ?? 18);
  const [requireApproval, setRequireApproval] = useState(false);
  const [mobilizationCharge, setMobilization] = useState(latest?.mobilizationCharge ?? 0);
  const [demobilizationCharge, setDemobilization] = useState(latest?.demobilizationCharge ?? 0);

  // Lock engine — accepted quotations cannot be edited (only viewed / downloaded / revised)
  const isLocked = !!latest && (latest.status === "accepted" || !!latest.lockedAt);

  // Auto-Save Draft Engine — saves quotation state to localStorage every 30s
  const draftKey = `quotation-${leadId}`;
  const draftValue = useMemo(
    () => ({
      lines,
      advancePercent,
      balanceTerms,
      ratePerDayNote,
      approvedBy,
      validityDays,
      gstPercent,
      mobilizationCharge,
      demobilizationCharge,
    }),
    [
      lines,
      advancePercent,
      balanceTerms,
      ratePerDayNote,
      approvedBy,
      validityDays,
      gstPercent,
      mobilizationCharge,
      demobilizationCharge,
    ],
  );
  const { savedAt, clear: clearDraft } = useAutosaveDraft(draftKey, draftValue, !latest);

  // Restore draft on mount (only for new quotations, not existing revisions)
  const existingDraft = !latest ? loadDraft<typeof draftValue>(draftKey) : null;
  const [showRestore, setShowRestore] = useState(!!existingDraft && !latest);

  const restoreDraft = () => {
    const draft = loadDraft<typeof draftValue>(draftKey);
    if (!draft) return;
    setLines(draft.lines);
    setAdvance(draft.advancePercent);
    setBalanceTerms(draft.balanceTerms);
    setRate(draft.ratePerDayNote);
    setApprovedBy(draft.approvedBy);
    setValidityDays(draft.validityDays);
    setGstPercent(draft.gstPercent);
    setMobilization(draft.mobilizationCharge ?? 0);
    setDemobilization(draft.demobilizationCharge ?? 0);
    setShowRestore(false);
    toast.success("Draft restored");
  };

  const discardDraft = () => {
    clearDraft();
    setShowRestore(false);
    toast.success("Draft discarded");
  };

  const lineTotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.rate, 0), [lines]);
  const mobTotal = (Number(mobilizationCharge) || 0) + (Number(demobilizationCharge) || 0);
  const subtotal = lineTotal + mobTotal;
  const gstAmt = Math.round((subtotal * gstPercent) / 100);
  const grandTotal = subtotal + gstAmt;
  const advanceAmt = Math.round((grandTotal * advancePercent) / 100);

  // Client billing info from requirement (Tab 1 + Tab 2 fields)
  const clientInfo: QuotationClientInfo = {
    name: lead?.name ?? "",
    companyName: field("companyName") || lead?.customerCompany || undefined,
    address: field("companyAddress") || undefined,
    gstin: field("companyGstin") || lead?.gstNumber || undefined,
    contactPerson: field("contactPerson") || undefined,
    mdName: field("mdName") || undefined,
    mdNumber: field("mdNumber") || undefined,
    mdEmail: field("mdEmail") || undefined,
  };

  // ── Customer Auto-Fill Engine ──────────────────────────────────────────────
  // Compute whether the customer has history (safe to call with undefined lead)
  const customerLeadPhone = lead?.phone?.replace(/\D/g, "").slice(-10) ?? "";
  const customerLeadIds = new Set(
    customerLeadPhone
      ? db.leads
          .filter((l) => l.phone.replace(/\D/g, "").slice(-10) === customerLeadPhone)
          .map((l) => l.id)
      : [],
  );
  const hasCustomerHistory =
    customerLeadIds.size > 1 ||
    db.quotations.some((q) => customerLeadIds.has(q.leadId)) ||
    db.proformaInvoices.some((p) => customerLeadIds.has(p.leadId)) ||
    db.taxInvoices.some((t) => customerLeadIds.has(t.leadId));
  const [showCustomer360, setShowCustomer360] = useState(hasCustomerHistory);
  // ── End Customer Auto-Fill Engine ──────────────────────────────────────────

  // Product Master Engine — available machines for this company (safe to compute before guard)
  const availableMachines = useMemo(
    () =>
      db.machines
        .filter((m) => m.companyId === company?.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [db.machines, company],
  );

  // ── Smart Machine Recommendation Engine ─────────────────────────────────────
  // Scores machines against the requirement's working height & capacity.
  const reqHeight = parseLeadingNumber(
    requirement?.fields.find((f) => /working\s*height|height/i.test(f.label))?.value,
  );
  const reqCapacity = parseLeadingNumber(
    requirement?.fields.find((f) => /capacity|load/i.test(f.label))?.value,
  );
  const recommendedIds = useMemo(() => {
    if (!reqHeight && !reqCapacity) return new Set<string>();
    const scored = availableMachines
      .map((m) => {
        const mh = parseLeadingNumber(m.workingHeight);
        const mc = parseLeadingNumber(m.capacity);
        // Machine must meet-or-exceed the requirement to be a candidate.
        if (reqHeight && (!mh || mh < reqHeight)) return null;
        if (reqCapacity && (!mc || mc < reqCapacity)) return null;
        // Lower score = closer fit (less over-spec).
        const score = (mh ? mh - (reqHeight || 0) : 0) + (mc ? (mc - (reqCapacity || 0)) / 100 : 0);
        return { id: m.id, score };
      })
      .filter((x): x is { id: string; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    return new Set(scored.map((s) => s.id));
  }, [availableMachines, reqHeight, reqCapacity]);
  // ── End Smart Machine Recommendation Engine ─────────────────────────────────

  if (!lead || !company) return <Missing />;
  if (!canSeeLead(user, lead)) return <Missing text="This lead belongs to another company." />;

  // ── Customer Auto-Fill Engine (continued) ──────────────────────────────────
  const customerHistory = customerHistoryForLead(db, lead);
  const isExistingCustomer =
    customerHistory.quotations.length > 0 ||
    customerHistory.proformas.length > 0 ||
    customerHistory.taxInvoices.length > 0 ||
    customerHistory.followUps.length > 0;

  // Find active projects (leads in quote_sent/confirmed, excluding current lead)
  const activeProjects = db.leads
    .filter(
      (l) =>
        customerLeadIds.has(l.id) &&
        l.id !== leadId &&
        ["quote_sent", "work_order", "negotiation"].includes(l.status),
    )
    .map((l) => ({
      id: l.id,
      name: l.name,
      status: l.status,
      company: l.customerCompany || "",
      quotation: db.quotations
        .filter((q) => q.leadId === l.id)
        .sort((a, b) => b.version - a.version)[0],
    }));
  // Pending payments across all customer leads
  const pendingPayments = db.payments
    .filter((p) => customerLeadIds.has(p.leadId) && p.stage !== "fully_paid" && p.stage !== "none")
    .map((p) => ({
      ...p,
      leadName: db.leads.find((l) => l.id === p.leadId)?.name ?? "",
      outstanding: p.total - (p.stage === "advance_paid" ? p.advanceAmount : 0),
    }));
  // Aggregate total revenue from this customer
  const lifetimeRevenue = db.payments
    .filter((p) => customerLeadIds.has(p.leadId))
    .reduce(
      (sum, p) =>
        sum + (p.stage === "fully_paid" ? p.total : p.stage !== "none" ? p.advanceAmount : 0),
      0,
    );
  // Negotiation history
  const negotiationHistory = db.negotiations.filter((n) => customerLeadIds.has(n.leadId));
  // ── End Customer Auto-Fill Engine ──────────────────────────────────────────

  const isBlocked = (BLOCKED_STATUSES as readonly string[]).includes(lead.status);

  // Phase 3: prevent quotation creation if no follow-up outcome has been recorded
  // (revisions of existing quotations are always allowed).
  const hasFollowUpOutcome = db.followUps.some((f) => f.leadId === leadId && f.outcome != null);
  const needsFirstFollowUp = !latest && !hasFollowUpOutcome;

  if (!requirement) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">Gather the requirement first</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A quotation pulls billing, delivery and GST details from the requirement.
        </p>
        <Button asChild className="mt-4">
          <Link to="/requirement/$leadId" params={{ leadId }}>
            Start requirement
          </Link>
        </Button>
      </div>
    );
  }

  const addMachine = (m: Machine) => {
    // Machine Availability Engine — warn + require admin override when not available.
    const status = m.availabilityStatus ?? "available";
    if (status !== "available") {
      const when = m.availableFrom ? ` Available from ${m.availableFrom}.` : "";
      const isAdmin = user?.role === "super_admin";
      const proceed = window.confirm(
        `${m.make} ${m.model} is currently ${status.toUpperCase()}.${when}\n\n` +
          (isAdmin
            ? "As admin you may override and add it anyway. Continue?"
            : "Adding an unavailable machine requires admin override. Continue and flag for admin?"),
      );
      if (!proceed) return;
      mutate((d) => {
        d.activities.push({
          id: newId("a"),
          leadId,
          at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md",
          kind: "quotation",
          text: `Availability override — added ${m.make} ${m.model} while ${status}${when} (by ${user?.name ?? "user"})`,
        });
      });
    }
    setLines((ls) => [
      ...ls,
      {
        id: newId("ql"),
        description: `${m.make} ${m.model} — ${m.name}`,
        qty: 1,
        unit: "month",
        rate: m.dailyRate ?? 0,
        machineId: m.id,
        machineName: m.name,
        workingHeight: m.workingHeight,
        platformHeight: m.platformHeight,
        capacity: m.capacity,
        powerSupply: m.fuelType,
      },
    ]);
    setShowMachinePicker(false);
    toast.success(`Added ${m.make} ${m.model}`);
  };
  const setLine = (id: string, patch: Partial<QuotationLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [...ls, { id: newId("ql"), description: "", qty: 1, unit: "month", rate: 0 }]);
  const duplicateLine = (id: string) => {
    const source = lines.find((l) => l.id === id);
    if (!source) return;
    setLines((ls) => {
      const idx = ls.findIndex((l) => l.id === id);
      const copy = { ...source, id: newId("ql") };
      return [...ls.slice(0, idx + 1), copy, ...ls.slice(idx + 1)];
    });
  };
  const moveLine = (id: string, dir: -1 | 1) => {
    setLines((ls) => {
      const idx = ls.findIndex((l) => l.id === id);
      if (idx < 0) return ls;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= ls.length) return ls;
      const arr = [...ls];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };
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
      mobilizationCharge: mobilizationCharge || undefined,
      demobilizationCharge: demobilizationCharge || undefined,
    };
  };

  const saveVersion = (send: boolean, bypassApproval = false) => {
    if (send && isBlocked) {
      toast.error(`Cannot send a quotation — lead is ${lead.status.replace("_", " ")}`);
      return;
    }
    const q = build();
    if (!q) return;
    const needsApproval =
      send && requireApproval && !bypassApproval && user?.role !== "super_admin";
    q.status = needsApproval ? "pending_approval" : send ? "sent" : "draft";
    // Data-layer enforcement: requirement must exist and have no unresolved NIL fields
    const req = db.requirements.find((r) => r.leadId === leadId);
    if (!req) {
      toast.error("Cannot create quotation — gather the requirement first");
      return;
    }
    const nilFields = req.fields.filter(
      (f) => f.value.trim().toLowerCase() === "nil" && f.nilReason,
    );
    if (nilFields.length > 0) {
      toast.error(
        `Cannot create quotation — resolve NIL fields first: ${nilFields.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    mutate((d) => {
      d.quotations.push(q);
      if (send) {
        const l = d.leads.find((x) => x.id === leadId);
        if (l && l.status !== "completed") l.status = "quote_sent";
        d.activities.push({
          id: newId("a"),
          leadId,
          at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md",
          kind: "quotation",
          text: `Quotation ${q.quotationNo} v${q.version} sent (${formatINR(grandTotal)}) — emailed to ${field("email") || clientInfo.companyName || "client"}`,
        });
        // proforma/payment shell — keyed by grand total (includes GST)
        if (!d.payments.find((p) => p.leadId === leadId)) {
          d.payments.push({
            id: newId("p"),
            quotationId: q.id,
            leadId,
            stage: "none",
            total: grandTotal,
            advanceAmount: advanceAmt,
            balanceAmount: grandTotal - advanceAmt,
            tdsPercent: 0,
            tdsAmount: 0,
            copyToAdmin: true,
            updatedAt: new Date().toISOString(),
          });
        }
        // Auto follow-up: +1 day to check client has received and reviewed
        const due = new Date();
        due.setDate(due.getDate() + 1);
        d.followUps.push({
          id: newId("f"),
          leadId,
          dueAt: due.toISOString(),
          reason: `Follow up on quotation ${q.quotationNo} v${q.version} — confirm receipt & check feedback`,
          done: false,
          callAttemptCount: 0,
        });
      } else {
        d.activities.push({
          id: newId("a"),
          leadId,
          at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md",
          kind: "quotation",
          text: `Quotation ${q.quotationNo} v${q.version} saved as draft`,
        });
      }
    });
    toast.success(
      send
        ? `Quotation v${q.version} sent — follow-up scheduled in 1 day`
        : `Draft v${q.version} saved`,
    );
    if (send) navigate({ to: "/leads/$leadId", params: { leadId } });
  };

  const generatePdfBlob = (): Blob | null => {
    const q = build();
    if (!q) return null;
    // Machine Image Validation — block if any machine line item lacks an image
    const missingImages = lines
      .filter((l) => l.machineId)
      .filter((l) => {
        const machine = db.machines.find((m) => m.id === l.machineId);
        return machine && !machine.imageUrl;
      });
    if (missingImages.length > 0) {
      toast.error(
        `Machine Image Missing — Upload Required for: ${missingImages.map((l) => l.machineName || l.description).join(", ")}`,
      );
      mutate((d) => {
        d.activities.push({
          id: newId("a"),
          leadId,
          at: new Date().toISOString(),
          byUserId: user?.id ?? "u-md",
          kind: "quotation",
          text: `PDF generation blocked — machine image missing for ${missingImages.map((l) => l.machineName || l.description).join(", ")}`,
        });
      });
      return null;
    }
    return generateQuotationPdf(q, company, clientInfo).output("blob");
  };

  const openPreview = () => {
    const blob = generatePdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewBlobUrl(url);
    setShowPreview(true);
  };

  const downloadPdf = () => {
    const blob = generatePdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientInfo.companyName || "quotation"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded");
  };

  // View Tracking Engine — record a customer view; auto Sent → Viewed
  const markViewed = () => {
    if (!latest) return;
    mutate((d) => {
      const q = d.quotations.find((x) => x.id === latest.id);
      if (!q) return;
      q.viewedAt = new Date().toISOString();
      q.viewCount = (q.viewCount ?? 0) + 1;
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "quotation",
        text: `Quotation ${q.quotationNo} v${q.version} viewed by customer (view #${q.viewCount})`,
      });
    });
    toast.success("View recorded");
  };

  // Customer Response Tracking Engine
  const recordResponse = (rt: CustomerResponseType) => {
    if (!latest) return;
    mutate((d) => {
      const q = d.quotations.find((x) => x.id === latest.id);
      if (!q) return;
      q.customerResponse = rt;
      q.customerResponseAt = new Date().toISOString();
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "quotation",
        text: `Customer response on ${q.quotationNo} v${q.version}: ${RESPONSE_META[rt]}`,
      });
      // A negotiation-flavoured response nudges the lead into negotiation.
      if (
        (rt === "too_costly" || rt === "need_discount" || rt === "competitor_quote") &&
        q.status !== "accepted"
      ) {
        const l = d.leads.find((x) => x.id === leadId);
        if (l && l.status === "quote_sent") l.status = "negotiation";
      }
    });
    toast.success(`Response recorded: ${RESPONSE_META[rt]}`);
  };

  // Intra-state vs inter-state detection for GST label
  const deliveryGstin = field("deliveryGstin");
  const stgState = company.gstin.slice(0, 2);
  const clientState = deliveryGstin ? deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = deliveryGstin.length > 0 && clientState !== stgState;
  const gstLabel =
    gstPercent === 0
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
              Reactivate the lead first (change status to followup or interested) before sending a
              new quotation.
            </p>
          </div>
        </div>
      )}

      {/* Follow-up required banner — Phase 3 */}
      {needsFirstFollowUp && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div>
            <p className="font-semibold text-orange-600">First follow-up required</p>
            <p className="text-sm text-muted-foreground">
              A quotation cannot be created until the first follow-up outcome has been recorded.
              Please log a follow-up with the customer first.
            </p>
          </div>
        </div>
      )}

      {/* Restore Draft banner — Auto-Save Engine */}
      {showRestore && existingDraft && !latest && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/8 p-4">
          <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="font-semibold text-blue-600">Unsaved draft found</p>
            <p className="text-sm text-muted-foreground">
              You have a saved draft from a previous session. Would you like to restore it?
              {savedAt && <span className="ml-1">Last saved: {savedAt.toLocaleTimeString()}</span>}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={restoreDraft}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Restore Draft
              </Button>
              <Button size="sm" variant="outline" onClick={discardDraft}>
                Discard Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lock engine banner — accepted quotation is immutable */}
      {isLocked && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/8 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-700">Quotation locked (accepted)</p>
            <p className="text-sm text-muted-foreground">
              {latest?.quotationNo} v{latest?.version} has been accepted and is locked from edits.
              You can still view, download, or create a new revision below.
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
                  ) : (
                    "New quotation"
                  )}
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
                ]
                  .filter(Boolean)
                  .join("\n")}
                hint={
                  !clientInfo.companyName
                    ? "Fill Company Name in the requirement to show billing info."
                    : undefined
                }
              />
              <AddrBlock
                title="Deliver to (site)"
                body={[
                  field("deliveryAddress") || "—",
                  field("deliveryGstin") ? `GSTIN: ${field("deliveryGstin")}` : "",
                ]
                  .filter(Boolean)
                  .join("\n")}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AddrBlock
                title="From (STG billing)"
                body={`${company.billingAddress}\nGSTIN: ${company.gstin}`}
              />
            </div>
          </div>

          {/* Customer 360 View — Auto-Fill Engine */}
          {isExistingCustomer && (
            <div className="rounded-2xl border bg-card shadow-card">
              <button
                onClick={() => setShowCustomer360(!showCustomer360)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  Customer 360 View
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Existing customer
                  </Badge>
                </span>
                {showCustomer360 ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showCustomer360 && (
                <div className="border-t px-4 pb-4 pt-3">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Previous Quotations</p>
                      <p className="mt-1 text-lg font-bold">{customerHistory.quotations.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Lifetime: {formatINR(lifetimeRevenue)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Proforma Invoices</p>
                      <p className="mt-1 text-lg font-bold">{customerHistory.proformas.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Tax Invoices</p>
                      <p className="mt-1 text-lg font-bold">{customerHistory.taxInvoices.length}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Follow-ups Logged</p>
                      <p className="mt-1 text-lg font-bold">{customerHistory.followUps.length}</p>
                    </div>
                  </div>

                  {/* Active Projects */}
                  {activeProjects.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Active Projects
                      </p>
                      <div className="space-y-1.5">
                        {activeProjects.map((p) => (
                          <Link
                            key={p.id}
                            to="/leads/$leadId"
                            params={{ leadId: p.id }}
                            className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-muted/50"
                          >
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {p.name}
                              {p.company && (
                                <span className="text-xs text-muted-foreground">· {p.company}</span>
                              )}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {p.status.replace("_", " ")}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Payments */}
                  {pendingPayments.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                        Pending Payments
                      </p>
                      <div className="space-y-1.5">
                        {pendingPayments.map((pp) => (
                          <div
                            key={pp.id}
                            className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/20"
                          >
                            <span className="flex items-center gap-2">
                              <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
                              {pp.leadName}
                            </span>
                            <span className="font-semibold text-amber-700">
                              {formatINR(pp.outstanding)} outstanding
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Quotes */}
                  {customerHistory.quotations.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recent Quotations
                      </p>
                      <div className="space-y-1">
                        {customerHistory.quotations.slice(0, 3).map((q) => {
                          const qTotal = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
                          const qGst = Math.round((qTotal * (q.gstPercent ?? 0)) / 100);
                          return (
                            <div
                              key={q.id}
                              className="flex items-center justify-between rounded-lg border p-2 text-xs"
                            >
                              <span className="font-medium">{q.quotationNo}</span>
                              <span className="text-muted-foreground">
                                {q.date} · {formatINR(qTotal + qGst)} ·{" "}
                                <Badge variant="outline" className="text-[10px]">
                                  {q.status}
                                </Badge>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Negotiation History */}
                  {negotiationHistory.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Handshake className="mr-1 inline h-3 w-3" />
                        Negotiation History ({negotiationHistory.length} round
                        {negotiationHistory.length > 1 ? "s" : ""})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Line items</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowMachinePicker(true)}>
                  <Building2 className="mr-1.5 h-4 w-4" /> Select Machine
                </Button>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add line
                </Button>
              </div>
            </div>

            {/* Machine picker dialog */}
            {showMachinePicker && (
              <div className="mb-4 rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Product Catalog — {companyName(db, company.id)}
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setShowMachinePicker(false)}>
                    Close
                  </Button>
                </div>
                {availableMachines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No machines in catalog for this company.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[...availableMachines]
                      .sort(
                        (a, b) =>
                          (recommendedIds.has(b.id) ? 1 : 0) - (recommendedIds.has(a.id) ? 1 : 0),
                      )
                      .map((m) => {
                        const status = m.availabilityStatus ?? "available";
                        const statusMeta = AVAILABILITY_META[status];
                        return (
                      <button
                        key={m.id}
                        onClick={() => addMachine(m)}
                        className={cn(
                          "rounded-lg border bg-card p-3 text-left text-sm hover:border-primary hover:shadow-sm transition-all",
                          recommendedIds.has(m.id) && "border-primary/60 ring-1 ring-primary/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">
                            {m.make} {m.model}
                          </p>
                          {recommendedIds.has(m.id) && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cn("inline-flex h-2 w-2 rounded-full", statusMeta.dot)} />
                          <span className={cn("text-[11px] font-medium", statusMeta.text)}>
                            {statusMeta.label}
                            {status !== "available" && m.availableFrom
                              ? ` · from ${m.availableFrom}`
                              : ""}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {m.workingHeight && m.workingHeight !== "N/A" && (
                            <Badge variant="outline" className="text-[10px]">
                              {m.workingHeight}
                            </Badge>
                          )}
                          {m.capacity && (
                            <Badge variant="outline" className="text-[10px]">
                              {m.capacity}
                            </Badge>
                          )}
                          {m.fuelType && (
                            <Badge variant="outline" className="text-[10px]">
                              {m.fuelType}
                            </Badge>
                          )}
                        </div>
                        {m.dailyRate && (
                          <p className="mt-1 text-xs font-medium text-primary">
                            {formatINR(m.dailyRate)}/day
                          </p>
                        )}
                      </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.id}>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <Input
                      className="col-span-12 sm:col-span-4"
                      placeholder="Description"
                      value={l.description}
                      onChange={(e) => setLine(l.id, { description: e.target.value })}
                    />
                    {l.machineId && (
                      <div className="col-span-12 sm:col-span-1 flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] px-1">
                          M
                        </Badge>
                      </div>
                    )}
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
                    <div className="col-span-1 flex items-center gap-0.5">
                      <button
                        className="grid place-items-center text-muted-foreground hover:text-primary disabled:opacity-30"
                        onClick={() => moveLine(l.id, -1)}
                        disabled={lines.indexOf(l) === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        className="grid place-items-center text-muted-foreground hover:text-primary disabled:opacity-30"
                        onClick={() => moveLine(l.id, 1)}
                        disabled={lines.indexOf(l) === lines.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        className="grid place-items-center text-muted-foreground hover:text-primary"
                        onClick={() => duplicateLine(l.id)}
                        aria-label="Duplicate line"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="grid place-items-center text-muted-foreground hover:text-destructive"
                        onClick={() => delLine(l.id)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Machine specs row */}
                  {l.machineId &&
                    (l.workingHeight || l.platformHeight || l.capacity || l.powerSupply) && (
                      <div className="ml-1 mt-1 flex flex-wrap gap-1.5">
                        {l.platformHeight && (
                          <Badge variant="outline" className="text-[10px]">
                            Platform: {l.platformHeight}
                          </Badge>
                        )}
                        {l.workingHeight && (
                          <Badge variant="outline" className="text-[10px]">
                            Working: {l.workingHeight}
                          </Badge>
                        )}
                        {l.capacity && (
                          <Badge variant="outline" className="text-[10px]">
                            Capacity: {l.capacity}
                          </Badge>
                        )}
                        {l.powerSupply && (
                          <Badge variant="outline" className="text-[10px]">
                            Power: {l.powerSupply}
                          </Badge>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>

            {/* GST breakdown */}
            <div className="mt-4 space-y-1.5 border-t pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Line items</span>
                <span className="font-medium text-foreground">{formatINR(lineTotal)}</span>
              </div>
              {mobilizationCharge > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Mobilization</span>
                  <span>{formatINR(mobilizationCharge)}</span>
                </div>
              )}
              {demobilizationCharge > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Demobilization</span>
                  <span>{formatINR(demobilizationCharge)}</span>
                </div>
              )}
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
              <div className="grid gap-1.5">
                <Label>Mobilization charge (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Transport to site"
                  value={mobilizationCharge}
                  onChange={(e) => setMobilization(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Demobilization charge (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Return transport"
                  value={demobilizationCharge}
                  onChange={(e) => setDemobilization(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="font-medium">Require manager approval before sending</span>
                </label>
                {requireApproval && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Exec → Manager approval → Send
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Advance due: <span className="font-semibold">{formatINR(advanceAmt)}</span> · Balance:{" "}
              <span className="font-semibold">{formatINR(grandTotal - advanceAmt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveVersion(true)}
              disabled={isBlocked || needsFirstFollowUp}
              title={
                isBlocked
                  ? `Lead is ${lead.status.replace("_", " ")} — cannot send`
                  : needsFirstFollowUp
                    ? "Record first follow-up outcome before creating quotation"
                    : undefined
              }
            >
              <Send className="mr-1.5 h-4 w-4" />
              {latest
                ? `Send revision v${(latest.version ?? 0) + 1}`
                : requireApproval
                  ? "Submit for Approval"
                  : "Send quotation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => saveVersion(false)}
              disabled={needsFirstFollowUp}
            >
              Save draft
            </Button>
            <Button variant="outline" onClick={openPreview}>
              <Eye className="mr-1.5 h-4 w-4" /> Preview PDF
            </Button>
            <Button variant="ghost" onClick={downloadPdf}>
              <FileDown className="mr-1.5 h-4 w-4" /> Download
            </Button>
            {latest?.status === "sent" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const phone = lead.phone || field("mdNumber") || field("email") || "";
                    const msg = encodeURIComponent(
                      `Dear ${clientInfo.companyName || clientInfo.name},\n\nPlease find attached quotation ${latest.quotationNo} v${latest.version} for your reference.\n\nTotal: ${formatINR(grandTotal)}\nValidity: ${validityDays} days\n\nRegards,\n${company.name}`,
                    );
                    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                    mutate((d) => {
                      d.activities.push({
                        id: newId("a"),
                        leadId,
                        at: new Date().toISOString(),
                        byUserId: user?.id ?? "u-md",
                        kind: "quotation",
                        text: `Quotation ${latest.quotationNo} v${latest.version} shared via WhatsApp to ${phone}`,
                      });
                    });
                    toast.success("WhatsApp link opened");
                  }}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4 text-green-600" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const email = field("email") || lead.email || "";
                    const subject = encodeURIComponent(
                      `Quotation ${latest.quotationNo} v${latest.version} — ${company.name}`,
                    );
                    const body = encodeURIComponent(
                      `Dear ${clientInfo.companyName || clientInfo.name},\n\nPlease find attached quotation ${latest.quotationNo} v${latest.version}.\n\nTotal: ${formatINR(grandTotal)}\nValidity: ${validityDays} days\n\nRegards,\n${company.name}\n${company.billingAddress}`,
                    );
                    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
                    mutate((d) => {
                      d.activities.push({
                        id: newId("a"),
                        leadId,
                        at: new Date().toISOString(),
                        byUserId: user?.id ?? "u-md",
                        kind: "quotation",
                        text: `Quotation ${latest.quotationNo} v${latest.version} shared via email to ${email}`,
                      });
                    });
                    toast.success("Email client opened");
                  }}
                >
                  <Mail className="mr-1.5 h-4 w-4 text-blue-600" /> Email
                </Button>
              </>
            )}
          </div>

          {!isBlocked && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Sending will mark lead as "Quote sent" and create a follow-up task for tomorrow
              automatically.
            </p>
          )}

          {/* View tracking + Customer response engine — shown once a quotation is live */}
          {latest && (latest.status === "sent" || latest.status === "accepted") && (
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4 text-muted-foreground" /> Customer engagement
              </h2>

              {/* View tracking */}
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="text-sm">
                  <p className="font-medium">View tracking</p>
                  {latest.viewedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Viewed {new Date(latest.viewedAt).toLocaleString()} · {latest.viewCount ?? 1}{" "}
                      view{(latest.viewCount ?? 1) > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not yet viewed by customer</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={markViewed}>
                  Mark as viewed
                </Button>
              </div>

              {/* Customer response */}
              <div className="mt-3">
                <p className="mb-1.5 text-sm font-medium">Customer response</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(RESPONSE_META) as CustomerResponseType[]).map((rt) => (
                    <button
                      key={rt}
                      onClick={() => recordResponse(rt)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                        latest.customerResponse === rt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:bg-muted",
                      )}
                    >
                      {RESPONSE_META[rt]}
                    </button>
                  ))}
                </div>
                {latest.customerResponse && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Recorded: {RESPONSE_META[latest.customerResponse]}
                    {latest.customerResponseAt
                      ? ` · ${new Date(latest.customerResponseAt).toLocaleDateString()}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: version history + payment */}
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <History className="h-4 w-4 text-muted-foreground" /> Version history
              </h2>
              {versions.length >= 2 && (
                <Button size="sm" variant="ghost" onClick={() => setShowCompare(true)}>
                  <ArrowLeftRight className="mr-1 h-3.5 w-3.5" /> Compare
                </Button>
              )}
            </div>
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
                          {v.viewedAt ? " · viewed" : ""}
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

          {/* Approval Section — show when quotation is pending approval and user is super_admin */}
          {latest?.status === "pending_approval" && user?.role === "super_admin" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-card dark:border-amber-800 dark:bg-amber-950/20">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                <ClipboardCheck className="h-4 w-4" /> Approval Required
              </h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Quotation{" "}
                <strong>
                  {latest.quotationNo} v{latest.version}
                </strong>{" "}
                is pending your approval.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    mutate((d) => {
                      const q = d.quotations.find((x) => x.id === latest.id);
                      if (!q) return;
                      q.status = "sent";
                      const l = d.leads.find((x) => x.id === leadId);
                      if (l && l.status !== "completed") l.status = "quote_sent";
                      d.activities.push({
                        id: newId("a"),
                        leadId,
                        at: new Date().toISOString(),
                        byUserId: user?.id ?? "u-md",
                        kind: "quotation",
                        text: `Quotation ${q.quotationNo} v${q.version} approved by ${user?.name} and sent`,
                      });
                    });
                    toast.success("Quotation approved and sent");
                  }}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve & Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    mutate((d) => {
                      const q = d.quotations.find((x) => x.id === latest.id);
                      if (!q) return;
                      q.status = "draft";
                      d.activities.push({
                        id: newId("a"),
                        leadId,
                        at: new Date().toISOString(),
                        byUserId: user?.id ?? "u-md",
                        kind: "quotation",
                        text: `Quotation ${q.quotationNo} v${q.version} rejected by ${user?.name} — returned to draft`,
                      });
                    });
                    toast.error("Quotation rejected, returned to draft");
                  }}
                >
                  <X className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}

          <PaymentCard leadId={leadId} />
        </div>
      </div>

      {/* Version Comparison Modal */}
      {showCompare && versions.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="font-semibold">Version Comparison — {versions[0].quotationNo}</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowCompare(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(versions.length, 4)}, 1fr)` }}
              >
                {versions.slice(0, 4).map((v) => {
                  const vSub = v.lines.reduce((s, l) => s + l.qty * l.rate, 0);
                  const vGst = Math.round((vSub * (v.gstPercent ?? 0)) / 100);
                  const vTotal = vSub + vGst;
                  return (
                    <div key={v.id} className="rounded-xl border bg-muted/20 p-4">
                      <div className="mb-3 text-center">
                        <p className="text-lg font-bold">v{v.version}</p>
                        <p className="text-xs text-muted-foreground">{v.date}</p>
                        <Badge variant="outline" className="mt-1">
                          {v.status}
                        </Badge>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Line Items</p>
                          {v.lines.map((l, i) => (
                            <p key={i} className="text-xs">
                              {l.description} × {l.qty} {l.unit} @ {formatINR(l.rate)}
                            </p>
                          ))}
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatINR(vSub)}</span>
                          </div>
                          {v.gstPercent > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">GST {v.gstPercent}%</span>
                              <span>{formatINR(vGst)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1 font-bold">
                            <span>Grand Total</span>
                            <span>{formatINR(vTotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Advance</span>
                            <span>{v.advancePercent}%</span>
                          </div>
                        </div>
                        {v.balanceTerms && (
                          <div className="border-t pt-2 text-xs text-muted-foreground">
                            <span className="font-semibold">Terms:</span> {v.balanceTerms}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && previewBlobUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="font-semibold">
                PDF Preview — {clientInfo.companyName || "Quotation"}
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={downloadPdf}>
                  <FileDown className="mr-1.5 h-4 w-4" /> Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowPreview(false);
                    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <embed
                src={previewBlobUrl}
                type="application/pdf"
                className="h-full w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PaymentCard({ leadId }: { leadId: string }) {
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const payment = db.payments.find((p) => p.leadId === leadId);
  const latestSent = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "sent")
    .sort((a, b) => b.version - a.version)[0];
  const latestAccepted = db.quotations
    .filter((q) => q.leadId === leadId && q.status === "accepted")
    .sort((a, b) => b.version - a.version)[0];
  const workOrders = (db.workOrders ?? []).filter((wo) => wo.leadId === leadId);
  const [showAccept, setShowAccept] = useState(false);
  const [poRef, setPoRef] = useState("");
  const [acceptRemark, setAcceptRemark] = useState("");
  if (!payment) return null;

  const acceptQuotation = () => {
    if (!latestSent) {
      toast.error("No sent quotation to accept");
      return;
    }
    mutate((d) => {
      const q = d.quotations.find((x) => x.id === latestSent.id);
      if (!q) return;
      q.status = "accepted";
      const l = d.leads.find((x) => x.id === leadId);
      if (l) l.status = "work_order";
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "quotation",
        text: `Quotation ${q.quotationNo} v${q.version} accepted. PO: ${poRef || "N/A"}. Remark: ${acceptRemark || "N/A"}`,
      });
    });
    toast.success("Quotation marked as accepted");
    setShowAccept(false);
  };

  const createWorkOrder = () => {
    if (!latestAccepted) {
      toast.error("Quotation must be accepted first");
      return;
    }
    const today = new Date();
    const valid = new Date(today);
    valid.setDate(valid.getDate() + 30);
    const woCount = (db.workOrders ?? []).filter(
      (w) => w.companyId === db.leads.find((l) => l.id === leadId)?.companyId,
    ).length;
    const company = db.companies.find(
      (c) => c.id === db.leads.find((l) => l.id === leadId)?.companyId,
    );
    const prefix = company?.quotePrefix ?? "STG";
    const year = today.getFullYear();
    const woNo = `${prefix}-WO-${year}-${String(100 + woCount + 1).slice(1)}`;

    const lead = db.leads.find((l) => l.id === leadId);
    const requirement = db.requirements.find((r) => r.leadId === leadId);
    if (!lead || !requirement) {
      toast.error("Lead or requirement not found");
      return;
    }

    const wo = {
      id: newId("wo"),
      workOrderNo: woNo,
      leadId,
      quotationId: latestAccepted.id,
      quotationNo: latestAccepted.quotationNo,
      companyId: lead.companyId,
      date: today.toISOString().slice(0, 10),
      validUntil: valid.toISOString().slice(0, 10),
      subtotal: latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0),
      gstPercent: latestAccepted.gstPercent,
      gstAmount: Math.round(
        (latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) * latestAccepted.gstPercent) /
          100,
      ),
      total:
        latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) +
        Math.round(
          (latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) *
            latestAccepted.gstPercent) /
            100,
        ),
      advancePercent: latestAccepted.advancePercent,
      advanceAmount: Math.round(
        ((latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) +
          Math.round(
            (latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) *
              latestAccepted.gstPercent) /
              100,
          )) *
          latestAccepted.advancePercent) /
          100,
      ),
      balanceAmount:
        latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) +
        Math.round(
          (latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) *
            latestAccepted.gstPercent) /
            100,
        ) -
        Math.round(
          ((latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) +
            Math.round(
              (latestAccepted.lines.reduce((s, l) => s + l.qty * l.rate, 0) *
                latestAccepted.gstPercent) /
                100,
            )) *
            latestAccepted.advancePercent) /
            100,
        ),
      clientName: lead.name,
      clientCompany:
        requirement.fields.find((f) => f.key === "companyName")?.value ||
        lead.customerCompany ||
        undefined,
      clientAddress: requirement.fields.find((f) => f.key === "companyAddress")?.value || undefined,
      clientGstin:
        requirement.fields.find((f) => f.key === "companyGstin")?.value ||
        lead.gstNumber ||
        undefined,
      clientContactPerson:
        requirement.fields.find((f) => f.key === "contactPerson")?.value || undefined,
      deliveryAddress:
        requirement.fields.find((f) => f.key === "deliveryAddress")?.value || undefined,
      deliveryGstin: requirement.fields.find((f) => f.key === "deliveryGstin")?.value || undefined,
      poReference: poRef || undefined,
      acceptanceRemark: acceptRemark || undefined,
      note: undefined,
      status: "draft" as const,
    };

    mutate((d) => {
      if (!d.workOrders) d.workOrders = [];
      d.workOrders.push(wo);
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "quotation",
        text: `Work Order ${woNo} created from accepted quotation ${latestAccepted.quotationNo}`,
      });
    });
    toast.success(`Work Order ${woNo} created`);
  };

  const setStage = (stage: typeof payment.stage) => {
    mutate((d) => {
      const p = d.payments.find((x) => x.leadId === leadId);
      if (!p) return;
      p.stage = stage;
      p.updatedAt = new Date().toISOString();
      const l = d.leads.find((x) => x.id === leadId);
      if (l) {
        if (stage === "advance_paid") l.status = "active_project";
        if (stage === "fully_paid") l.status = "completed";
      }
      if (stage === "fully_paid") {
        const r = d.requirements.find((x) => x.leadId === leadId);
        if (r) r.status = "closed";
      }
      d.activities.push({
        id: newId("a"),
        leadId,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "u-md",
        kind: "payment",
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

      {/* Acceptance workflow */}
      {latestSent && !latestAccepted && (
        <div className="mb-3">
          <Button size="sm" className="w-full" onClick={() => setShowAccept(true)}>
            <ClipboardCheck className="mr-1.5 h-4 w-4" /> Accept Quotation
          </Button>
        </div>
      )}
      {latestAccepted && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2.5 text-sm dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-1.5 font-semibold text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Accepted
          </div>
          {latestAccepted.workOrderRef && (
            <p className="text-xs text-muted-foreground">PO: {latestAccepted.workOrderRef}</p>
          )}
        </div>
      )}

      {/* Accept dialog */}
      {showAccept && (
        <div className="mb-3 space-y-2 rounded-lg border p-3">
          <p className="font-semibold text-sm">Accept Quotation — Proof Details</p>
          <div className="grid gap-1.5">
            <Label className="text-xs">PO / LOI / Work Order Reference</Label>
            <Input
              placeholder="e.g. PO-2026-0042"
              value={poRef}
              onChange={(e) => setPoRef(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Acceptance Remark</Label>
            <Textarea
              placeholder="e.g. Accepted by Mr. Sharma via email"
              value={acceptRemark}
              onChange={(e) => setAcceptRemark(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={acceptQuotation}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm Acceptance
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAccept(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Work Order conversion (only after acceptance) */}
      {latestAccepted && workOrders.length === 0 && (
        <div className="mb-3">
          <Button size="sm" variant="secondary" className="w-full" onClick={createWorkOrder}>
            <FileText className="mr-1.5 h-4 w-4" /> Convert to Work Order
          </Button>
        </div>
      )}
      {workOrders.length > 0 && (
        <div className="mb-3 space-y-1">
          {workOrders.map((wo) => (
            <div key={wo.id} className="rounded-lg border p-2 text-xs">
              <span className="font-semibold">{wo.workOrderNo}</span>
              <span className="ml-2 text-muted-foreground">· {wo.status}</span>
            </div>
          ))}
        </div>
      )}

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
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-3",
        !body.trim() && "border-dashed opacity-60",
      )}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
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
