import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import {
  recordContactOutcome,
  recordNegotiation,
  markNotInterested,
  reassignLead,
  scheduleSiteVisit,
} from "@/lib/data/actions";
import { SITE_VISIT_PURPOSES } from "@/lib/data/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Minus, PhoneOff } from "lucide-react";
import type {
  CompanyId,
  FollowUpOutcome,
  FollowUpNextAction,
  FollowUpNegativeReason,
  NotInterestedReason,
  Lead,
  Quotation,
  FollowUp,
  TaxInvoice,
  ProformaInvoice,
} from "@/lib/data/types";

/* ── Follow-up / Contact Outcome ─────────────────────────── */

const NEGATIVE_REASONS: { value: FollowUpNegativeReason; label: string }[] = [
  { value: "price_too_high", label: "Price too high" },
  { value: "already_purchased", label: "Already purchased" },
  { value: "competitor_selected", label: "Competitor selected" },
  { value: "no_requirement", label: "No requirement" },
  { value: "budget_issue", label: "Budget issue" },
  { value: "wrong_contact", label: "Wrong contact" },
  { value: "no_response", label: "No response" },
  { value: "timing_issue", label: "Timing issue" },
  { value: "product_not_available", label: "Product not available" },
  { value: "other", label: "Other" },
];

const NEXT_ACTIONS: { value: FollowUpNextAction; label: string }[] = [
  { value: "call_again", label: "Call again" },
  { value: "waiting_decision", label: "Waiting for decision" },
  { value: "meeting", label: "Schedule meeting" },
  { value: "site_visit", label: "Site visit" },
  { value: "price_negotiation", label: "Price negotiation" },
  { value: "send_quotation", label: "Send quotation" },
];

const OUTCOME_OPTS: {
  value: FollowUpOutcome;
  label: string;
  icon: typeof ThumbsUp;
  cls: string;
}[] = [
  {
    value: "positive",
    label: "Positive",
    icon: ThumbsUp,
    cls: "border-success text-success bg-success/10",
  },
  {
    value: "neutral",
    label: "Neutral / Call later",
    icon: Minus,
    cls: "border-warning text-warning bg-warning/10",
  },
  {
    value: "negative",
    label: "Negative / Lost",
    icon: ThumbsDown,
    cls: "border-destructive text-destructive bg-destructive/10",
  },
  {
    value: "no_response",
    label: "No response",
    icon: PhoneOff,
    cls: "border-muted text-muted-foreground bg-muted/10",
  },
];

export function FollowUpDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<FollowUpOutcome | "">("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<"hot" | "warm" | "cold">("warm");
  const [requirementNotes, setRequirementNotes] = useState("");
  // Neutral
  const [callbackAt, setCallbackAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return toLocalInput(d);
  });
  const [nextAction, setNextAction] = useState<FollowUpNextAction>("call_again");
  // Negative
  const [negativeReason, setNegativeReason] = useState<FollowUpNegativeReason>("price_too_high");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorAmount, setCompetitorAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOutcome("");
    setNote("");
    setPriority("warm");
    setRequirementNotes("");
    setNextAction("call_again");
    setNegativeReason("price_too_high");
    setCompetitorName("");
    setCompetitorAmount("");
  };

  const save = (moveToQuotation = false) => {
    if (saving) return;
    if (!outcome) return toast.error("Select an outcome");
    if (outcome === "neutral" && !callbackAt) return toast.error("Set a callback date/time");
    if (outcome === "negative" && !note.trim())
      return toast.error("Add a note explaining the reason");

    setSaving(true);
    try {
      recordContactOutcome({
        leadId,
        byUserId: user?.id ?? "u-md",
        outcome: outcome as FollowUpOutcome,
        note: note.trim(),
        ...(outcome === "neutral"
          ? { callbackAt: new Date(callbackAt).toISOString(), nextAction }
          : {}),
        ...(outcome === "negative"
          ? {
              negativeReason,
              competitorName: competitorName || undefined,
              competitorAmount: competitorAmount ? Number(competitorAmount) : undefined,
            }
          : {}),
        ...(outcome === "positive"
          ? { requirementNotes: requirementNotes || undefined, priority }
          : {}),
      });
    } catch (e) {
      setSaving(false);
      return toast.error(e instanceof Error ? e.message : "Failed to record outcome");
    }

    setSaving(false);
    toast.success(
      outcome === "positive"
        ? moveToQuotation
          ? "Moving to quotation…"
          : "Lead moved to Interested"
        : outcome === "negative"
          ? "Lead marked Not interested"
          : outcome === "neutral"
            ? "Callback scheduled"
            : "No-response logged",
    );
    reset();
    onOpenChange(false);
    if (moveToQuotation) {
      navigate({ to: "/quotation/$leadId", params: { leadId } });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log contact outcome</DialogTitle>
          <DialogDescription>
            Record what happened when you contacted this customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outcome selector */}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTS.map((o) => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                      outcome === o.value
                        ? o.cls
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Positive extras */}
          {outcome === "positive" && (
            <>
              <div className="space-y-1.5">
                <Label>
                  Requirement summary{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  rows={2}
                  value={requirementNotes}
                  onChange={(e) => setRequirementNotes(e.target.value)}
                  placeholder="What equipment, duration, location…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Update priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot — urgent requirement</SelectItem>
                    <SelectItem value="warm">Warm — interested but flexible</SelectItem>
                    <SelectItem value="cold">Cold — future requirement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Neutral extras */}
          {outcome === "neutral" && (
            <>
              <div className="space-y-1.5">
                <Label>Callback date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={callbackAt}
                  onChange={(e) => setCallbackAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next action</Label>
                <Select
                  value={nextAction}
                  onValueChange={(v) => setNextAction(v as FollowUpNextAction)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEXT_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Negative extras */}
          {outcome === "negative" && (
            <>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select
                  value={negativeReason}
                  onValueChange={(v) => setNegativeReason(v as FollowUpNegativeReason)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEGATIVE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {negativeReason === "competitor_selected" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Competitor name</Label>
                    <Input
                      value={competitorName}
                      onChange={(e) => setCompetitorName(e.target.value)}
                      placeholder="e.g. XYZ Rentals"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Their price (₹)</Label>
                    <Input
                      inputMode="numeric"
                      value={competitorAmount}
                      onChange={(e) => setCompetitorAmount(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes — always shown, mandatory for negative */}
          {outcome && (
            <div className="space-y-1.5">
              <Label>
                Notes
                {outcome === "negative" && <span className="text-destructive ml-1">*</span>}
                {outcome !== "negative" && (
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                )}
              </Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  outcome === "positive"
                    ? "Any additional context from the call…"
                    : outcome === "negative"
                      ? "Explain why — helps the MD understand the loss…"
                      : outcome === "neutral"
                        ? "What did they say? Any context for next call…"
                        : "How many attempts? Any notes…"
                }
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => save(false)} disabled={!outcome || saving}>
            {saving ? "Saving…" : "Save outcome"}
          </Button>
          {outcome === "positive" && (
            <Button onClick={() => save(true)} disabled={saving}>
              Move to quotation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Negotiation ─────────────────────────────────────────── */

export function NegotiationDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const db = useDb();
  const existing = db.negotiations.find((n) => n.leadId === leadId);
  const [quoted, setQuoted] = useState(existing?.quotedAmount?.toString() ?? "");
  const [expected, setExpected] = useState(existing?.expectedAmount?.toString() ?? "");
  const [competitor, setCompetitor] = useState(existing?.competitorName ?? "");
  const [compAmount, setCompAmount] = useState(existing?.competitorAmount?.toString() ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  const save = () => {
    const q = Number(quoted),
      e = Number(expected);
    if (!q || !e) return toast.error("Enter quoted and expected amounts");
    try {
      recordNegotiation(
        leadId,
        {
          quotedAmount: q,
          expectedAmount: e,
          competitorName: competitor || undefined,
          competitorAmount: compAmount ? Number(compAmount) : undefined,
          note: note || undefined,
        },
        user?.id ?? "u-md",
      );
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Failed to save negotiation");
    }
    toast.success("Negotiation saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record negotiation</DialogTitle>
          <DialogDescription>
            Track the gap and competitor pressure so nothing is lost.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Our quote (₹)</Label>
              <Input
                inputMode="numeric"
                value={quoted}
                onChange={(e) => setQuoted(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Client wants (₹)</Label>
              <Input
                inputMode="numeric"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Competitor</Label>
              <Input
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>Their price (₹)</Label>
              <Input
                inputMode="numeric"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save negotiation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Not interested (final status) ───────────────────────── */

const NI_REASONS: { value: NotInterestedReason; label: string }[] = [
  { value: "price_too_high", label: "Price too high" },
  { value: "already_purchased", label: "Already purchased" },
  { value: "competitor_selected", label: "Competitor selected" },
  { value: "no_requirement", label: "No requirement" },
  { value: "budget_issue", label: "Budget / funds issue" },
  { value: "wrong_contact", label: "Wrong contact" },
  { value: "no_response", label: "No response (given up)" },
  { value: "timing_issue", label: "Timing issue" },
  { value: "product_not_available", label: "Product not available" },
  { value: "other", label: "Other" },
];

export function NotInterestedDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState<NotInterestedReason>("price_too_high");
  const [competitor, setCompetitor] = useState("");
  const [compAmount, setCompAmount] = useState("");
  const [change, setChange] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    try {
      markNotInterested(
        leadId,
        {
          reason,
          competitorName: competitor || undefined,
          competitorAmount: compAmount ? Number(compAmount) : undefined,
          whatWouldChange: change || undefined,
          note: note || undefined,
        },
        user?.id ?? "u-md",
      );
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Failed to mark not interested");
    }
    toast.success("Marked not interested");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark not interested</DialogTitle>
          <DialogDescription>Capture why — this feeds the MD's loss analysis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as NotInterestedReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NI_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === "competitor_selected" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Competitor</Label>
                <Input value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Their price (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={compAmount}
                  onChange={(e) => setCompAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label>What would have made them buy?</Label>
            <Input
              value={change}
              onChange={(e) => setChange(e.target.value)}
              placeholder="e.g. 10% lower monthly rate"
            />
          </div>
          <div className="grid gap-2">
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={save}>
            Mark not interested
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Transfer / reassign ─────────────────────────────────── */

const TRANSFER_REASONS: {
  value: "wrong_product" | "wrong_company" | "customer_changed" | "business_decision";
  label: string;
}[] = [
  { value: "wrong_product", label: "Wrong product match" },
  { value: "wrong_company", label: "Wrong company selection" },
  { value: "customer_changed", label: "Customer changed requirement" },
  { value: "business_decision", label: "Internal business decision" },
];

export function ReassignDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const db = useDb();
  const execs = db.users.filter((u) => u.role === "exec");
  const [target, setTarget] = useState(execs[0]?.id ?? "");
  const [reasonType, setReasonType] = useState<
    "wrong_product" | "wrong_company" | "customer_changed" | "business_decision"
  >("wrong_product");
  const [note, setNote] = useState("");

  const save = () => {
    const t = execs.find((e) => e.id === target);
    if (!t || !t.companyId) return;
    if (!note.trim()) return toast.error("Add a note explaining the reason for transfer");
    reassignLead({
      leadId,
      userId: t.id,
      companyId: t.companyId,
      byUserId: user?.id ?? "u-md",
      reasonType,
      note: note.trim(),
    });
    toast.success(`Forwarded to ${t.name}`);
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward / transfer lead</DialogTitle>
          <DialogDescription>Send this enquiry to the right company's executive.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Assign to</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {execs.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {db.companies.find((c) => c.id === e.companyId)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>
              Transfer reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reasonType} onValueChange={(v) => setReasonType(v as typeof reasonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>
              Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this lead is being transferred…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Forward lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Site Visit / Client Meeting ─────────────────────────── */

export function SiteVisitDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [purpose, setPurpose] = useState<string>(SITE_VISIT_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return toLocalInput(d);
  });
  const [note, setNote] = useState("");

  const save = () => {
    const finalPurpose = purpose === "other" ? customPurpose.trim() : purpose;
    if (!finalPurpose) return;
    scheduleSiteVisit(
      leadId,
      new Date(when).toISOString(),
      finalPurpose,
      user?.id ?? "u-md",
      location || undefined,
      note || undefined,
    );
    setPurpose(SITE_VISIT_PURPOSES[0]);
    setCustomPurpose("");
    setLocation("");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule meeting</DialogTitle>
          <DialogDescription>Book a site visit or client meeting for this lead.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITE_VISIT_PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
                <SelectItem value="other">Other…</SelectItem>
              </SelectContent>
            </Select>
            {purpose === "other" && (
              <Input
                placeholder="Describe the purpose"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label>Scheduled for</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Location (optional)</Label>
            <Input
              placeholder="e.g. Client office, our yard, project site"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Schedule meeting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Existing Customer Check ─────────────────────────────── */

export function ExistingCustomerDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const db = useDb();
  const navigate = useNavigate();
  const lead = db.leads.find((l) => l.id === leadId);
  const digits = lead?.phone.replace(/\D/g, "").slice(-10) ?? "";

  const relatedLeads = db.leads.filter(
    (l) => l.id !== leadId && l.phone.replace(/\D/g, "").slice(-10) === digits,
  );
  const relatedQuotations: Quotation[] = [];
  const relatedInvoices: (TaxInvoice | ProformaInvoice)[] = [];
  const relatedFollowUps: FollowUp[] = [];
  for (const rl of relatedLeads) {
    relatedQuotations.push(...db.quotations.filter((q) => q.leadId === rl.id));
    relatedInvoices.push(...db.proformaInvoices.filter((p) => p.leadId === rl.id));
    relatedInvoices.push(...db.taxInvoices.filter((t) => t.leadId === rl.id));
    relatedFollowUps.push(...db.followUps.filter((f) => f.leadId === rl.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Existing customer check</DialogTitle>
          <DialogDescription>
            Previous history for phone <span className="font-medium">{digits}</span>
          </DialogDescription>
        </DialogHeader>

        {relatedLeads.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No existing customer found with this phone number.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              {relatedLeads.length} previous lead{relatedLeads.length > 1 ? "s" : ""} found
            </div>

            {relatedLeads.map((rl) => (
              <div key={rl.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{rl.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{rl.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={rl.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        onOpenChange(false);
                        navigate({ to: "/leads/$leadId", params: { leadId: rl.id } });
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </div>

                {rl.requestText && (
                  <p className="text-xs text-muted-foreground">{rl.requestText}</p>
                )}

                {/* Quotations */}
                {relatedQuotations.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">
                      Quotations ({relatedQuotations.length}):
                    </span>
                    <div className="mt-1 space-y-1">
                      {relatedQuotations.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between bg-muted/30 rounded px-2 py-1"
                        >
                          <span>
                            {q.quotationNo} v{q.version}
                          </span>
                          <span className="capitalize text-muted-foreground">{q.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {relatedInvoices.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">
                      Invoices ({relatedInvoices.length}):
                    </span>
                    <div className="mt-1 space-y-1">
                      {relatedInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between bg-muted/30 rounded px-2 py-1"
                        >
                          <span>
                            {"proformaNo" in inv
                              ? inv.proformaNo
                              : "invoiceNo" in inv
                                ? inv.invoiceNo
                                : ""}
                          </span>
                          <span className="capitalize text-muted-foreground">{inv.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-ups */}
                {relatedFollowUps.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">
                      Follow-ups ({relatedFollowUps.length}):
                    </span>
                    <div className="mt-1 space-y-1">
                      {relatedFollowUps.slice(0, 3).map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between bg-muted/30 rounded px-2 py-1"
                        >
                          <span>{f.reason}</span>
                          <span className={f.done ? "text-success" : "text-warning"}>
                            {f.done ? "Done" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
