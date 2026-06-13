import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { createLead } from "@/lib/data/actions";
import { companyName } from "@/lib/data/selectors";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { CompanyId, Lead, LeadSource, Priority } from "@/lib/data/types";
import { SOURCE_LABEL } from "@/lib/status";

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "justdial", label: "JustDial" },
  { value: "indiamart", label: "IndiaMART" },
  { value: "walkin", label: "Walk-in" },
  { value: "reference", label: "Reference" },
  { value: "existing_customer", label: "Existing customer" },
  { value: "manual", label: "Manual entry" },
];

// Generic domains that are too common to be a meaningful duplicate signal.
const COMMON_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","rediffmail.com",
  "yahoo.co.in","icloud.com","live.com","protonmail.com",
]);

// Levenshtein distance for fuzzy company name matching (Layer 4).
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isFuzzyMatch(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (!la || !lb || la.length < 4 || lb.length < 4) return false;
  if (la.includes(lb) || lb.includes(la)) return true;
  const dist = levenshtein(la, lb);
  const maxLen = Math.max(la.length, lb.length);
  return dist / maxLen <= 0.25; // ≤25% edit distance = fuzzy match
}

interface DuplicateHit {
  lead: Lead;
  layer: number;
  reason: string;
}

function detectDuplicates(
  leads: Lead[],
  phone: string,
  email: string,
  customerCompany: string,
  gstNumber: string,
  companyId: string,
): { exact: Lead | null; possible: DuplicateHit[] } {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const gst = gstNumber.trim().toUpperCase();
  const emailDomain = email.trim().split("@")[1]?.toLowerCase();
  const company = customerCompany.trim();

  let exact: Lead | null = null;
  const possible: DuplicateHit[] = [];

  for (const l of leads) {
    const lDigits = l.phone.replace(/\D/g, "").slice(-10);

    // Layer 1: exact phone match in same company → hard block
    if (digits.length >= 10 && lDigits === digits && l.companyId === companyId) {
      exact = l;
      break;
    }

    // Layer 2: GST number exact match (cross-company)
    if (gst.length === 15 && l.gstNumber?.toUpperCase() === gst) {
      possible.push({ lead: l, layer: 2, reason: `GST match: ${gst}` });
      continue;
    }

    // Layer 3: phone in a different company
    if (digits.length >= 10 && lDigits === digits && l.companyId !== companyId) {
      possible.push({ lead: l, layer: 3, reason: `Same phone in ${l.companyId}` });
      continue;
    }

    // Layer 4: fuzzy company name match
    if (company && l.customerCompany && isFuzzyMatch(company, l.customerCompany)) {
      possible.push({ lead: l, layer: 4, reason: `Similar company: "${l.customerCompany}"` });
      continue;
    }

    // Layer 5: email domain match (non-generic domains only)
    if (emailDomain && !COMMON_DOMAINS.has(emailDomain)) {
      const lDomain = l.email?.split("@")[1]?.toLowerCase();
      if (lDomain === emailDomain) {
        possible.push({ lead: l, layer: 5, reason: `Same email domain: @${emailDomain}` });
      }
    }
  }

  return { exact, possible: exact ? [] : possible };
}

export function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const db = useDb();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const fixedCompany = role === "exec" ? (user?.companyId ?? null) : null;
  const [companyId, setCompanyId] = useState<CompanyId | "">(fixedCompany ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [location, setLocation] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [source, setSource] = useState<LeadSource>("phone");
  const [priority, setPriority] = useState<Priority>("warm");
  const [notes, setNotes] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [ignoredDuplicates, setIgnoredDuplicates] = useState(false);

  const reset = () => {
    setName(""); setPhone(""); setEmail(""); setCustomerCompany("");
    setLocation(""); setGstNumber(""); setSource("phone"); setPriority("warm");
    setNotes(""); setShowExtra(false); setIgnoredDuplicates(false);
    setCompanyId(fixedCompany ?? "");
  };

  const { exact, possible } = useMemo(() => {
    if (!companyId) return { exact: null, possible: [] };
    return detectDuplicates(db.leads, phone, email, customerCompany, gstNumber, companyId);
  }, [phone, email, customerCompany, gstNumber, companyId, db.leads]);

  const openLead = (id: string) => {
    onOpenChange(false);
    reset();
    navigate({ to: "/leads/$leadId", params: { leadId: id } });
  };

  const submit = () => {
    if (!companyId) return toast.error("Select a company");
    if (!name.trim()) return toast.error("Enter a name");
    if (phone.replace(/\D/g, "").length < 10) return toast.error("Enter a valid 10-digit phone");
    if (possible.length > 0 && !ignoredDuplicates)
      return toast.error("Review possible duplicates first or click 'Proceed anyway'");

    const res = createLead({
      name: name.trim(),
      phone: phone.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(customerCompany.trim() ? { customerCompany: customerCompany.trim() } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(gstNumber.trim() ? { gstNumber: gstNumber.trim().toUpperCase() } : {}),
      source,
      priority,
      requestText: notes.trim(),
      companyId: companyId as CompanyId,
      byUserId: user?.id ?? "u-md",
    });
    toast.success("Lead created");
    reset();
    onOpenChange(false);
    navigate({ to: "/leads/$leadId", params: { leadId: res.leadId } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>Capture an enquiry. Add equipment requirement in the next step.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Company */}
          <div className="space-y-1.5">
            <Label>Company</Label>
            {fixedCompany ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">{companyName(db, fixedCompany)}</div>
            ) : (
              <Select value={companyId} onValueChange={(v) => { setCompanyId(v as CompanyId); setIgnoredDuplicates(false); }}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {db.companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ln-name">Contact name</Label>
            <Input id="ln-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anand Kumar — Sobha Builders" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ln-phone">Phone (10 digits)</Label>
            <Input
              id="ln-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setIgnoredDuplicates(false); }}
              placeholder="98XXXXXXXX"
            />

            {/* Layer 1 — hard block */}
            {exact && (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span className="text-foreground">
                    Existing lead in <b>{companyName(db, exact.companyId)}</b> · <StatusBadge status={exact.status} className="align-middle" />.
                    Add a new requirement to the existing lead instead of duplicating.
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 self-start text-xs" onClick={() => openLead(exact!.id)}>
                  <ArrowRight className="mr-1 h-3.5 w-3.5" /> Open existing lead
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ln-notes">Enquiry notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="ln-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did they ask about? Any context…" />
          </div>

          {/* Extra fields toggle */}
          <button
            type="button"
            className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showExtra ? "Hide" : "Add"} company, email &amp; GST details
          </button>

          {showExtra && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="ln-company">Customer company <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  id="ln-company"
                  value={customerCompany}
                  onChange={(e) => { setCustomerCompany(e.target.value); setIgnoredDuplicates(false); }}
                  placeholder="e.g. Sobha Ltd, L&T Construction"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ln-email">Email <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="ln-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setIgnoredDuplicates(false); }}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ln-location">Location <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="ln-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / area" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln-gst">GST number <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  id="ln-gst"
                  value={gstNumber}
                  onChange={(e) => { setGstNumber(e.target.value.toUpperCase()); setIgnoredDuplicates(false); }}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
            </div>
          )}

          {/* Layers 2–5 possible duplicates */}
          {!exact && possible.length > 0 && !ignoredDuplicates && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Possible duplicate{possible.length > 1 ? "s" : ""} detected
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {possible.slice(0, 5).map((hit) => (
                  <div key={hit.lead.id} className="flex items-center justify-between gap-2 rounded border bg-background/60 px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{hit.lead.name}</div>
                      <div className="text-muted-foreground truncate">{hit.reason} · {companyName(db, hit.lead.companyId)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={hit.lead.status} />
                      <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => openLead(hit.lead.id)}>
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full border border-dashed"
                onClick={() => setIgnoredDuplicates(true)}
              >
                These are different — proceed anyway
              </Button>
            </div>
          )}

          {ignoredDuplicates && possible.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Duplicate check overridden — creating as a new lead.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!!exact}>Create lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
