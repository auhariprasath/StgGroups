import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb, mutate } from "@/lib/data/store";
import { visibleLeads } from "@/lib/data/selectors";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { buildWaMeLink, openWaMeLink, cn } from "@/lib/utils";
import { formatDateIN } from "@/lib/format";
import {
  MessageSquare, Search, ChevronRight, CheckCircle2, Copy, Send,
} from "lucide-react";
import type { Lead } from "@/lib/data/types";

export const Route = createFileRoute("/_app/whatsapp")({ component: WhatsAppHub });

/* ── Template definitions ────────────────────────────────────────────────── */

interface Template {
  id: string;
  label: string;
  category: "greeting" | "quotation" | "followup" | "payment" | "delivery" | "reengagement";
  body: string; // {{var}} placeholders
  vars: { key: string; label: string; defaultFn?: (lead: Lead) => string }[];
}

const TEMPLATES: Template[] = [
  {
    id: "intro",
    label: "Introduction",
    category: "greeting",
    body: `Hello {{name}}, Good day! 🙏\n\nThis is {{exec}} from *STG Groups*.\n\nWe received your enquiry for *{{product}}*. I'd like to schedule a quick call to discuss your requirements.\n\nPlease let me know a convenient time. Thank you!`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "exec", label: "Your name" },
      { key: "product", label: "Product / equipment" },
    ],
  },
  {
    id: "quote_ready",
    label: "Quotation ready",
    category: "quotation",
    body: `Hello {{name}},\n\nYour quotation *{{quoteNo}}* for *{{product}}* is ready. 📋\n\nPlease review and let us know if you'd like to proceed or if you have any questions.\n\nLooking forward to working with you!\n\nRegards,\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "quoteNo", label: "Quotation number" },
      { key: "product", label: "Product / equipment" },
      { key: "exec", label: "Your name" },
    ],
  },
  {
    id: "quote_followup",
    label: "Quotation follow-up",
    category: "followup",
    body: `Hello {{name}}, 👋\n\nI'm following up on quotation *{{quoteNo}}* we sent on *{{date}}* for *{{product}}*.\n\nDo you have any questions or concerns? We're happy to discuss pricing or adjust the terms if needed.\n\nRegards,\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "quoteNo", label: "Quotation number" },
      { key: "date", label: "Date sent" },
      { key: "product", label: "Product / equipment" },
      { key: "exec", label: "Your name" },
    ],
  },
  {
    id: "advance_reminder",
    label: "Advance payment reminder",
    category: "payment",
    body: `Hello {{name}},\n\nThis is a gentle reminder regarding the advance payment for your order *{{quoteNo}}*. 💳\n\nAmount: ₹{{amount}}\nBank: {{bank}}\n\nKindly process the payment at your earliest convenience so we can proceed with the booking.\n\nThank you!\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "quoteNo", label: "Quotation / PI number" },
      { key: "amount", label: "Amount due (₹)" },
      { key: "bank", label: "Bank account name" },
      { key: "exec", label: "Your name" },
    ],
  },
  {
    id: "delivery_confirm",
    label: "Delivery confirmation",
    category: "delivery",
    body: `Hello {{name}}, 🚚\n\nYour *{{product}}* is scheduled for delivery on *{{date}}*.\n\nDelivery address: {{address}}\n\nPlease ensure someone is available to receive the equipment. For any changes, contact us immediately.\n\nThank you for choosing STG Groups!`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "product", label: "Product / equipment" },
      { key: "date", label: "Delivery date" },
      { key: "address", label: "Delivery address" },
    ],
  },
  {
    id: "reengagement",
    label: "Re-engagement",
    category: "reengagement",
    body: `Hello {{name}}, 😊\n\nIt's been a while since we last connected! We hope everything is going well.\n\nWe have some new offerings and updated pricing for *{{product}}* that might interest you.\n\nWould you like to reconnect and explore possibilities?\n\nBest regards,\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "product", label: "Product / equipment" },
      { key: "exec", label: "Your name" },
    ],
  },
  {
    id: "balance_payment",
    label: "Balance payment due",
    category: "payment",
    body: `Hello {{name}},\n\nThank you for the advance payment! 🙏\n\nThis is a reminder that the balance amount of *₹{{balance}}* is due on *{{dueDate}}* as per our payment terms.\n\nPlease let us know if you need any assistance.\n\nRegards,\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "balance", label: "Balance amount (₹)" },
      { key: "dueDate", label: "Due date" },
      { key: "exec", label: "Your name" },
    ],
  },
  {
    id: "thank_you",
    label: "Thank you / Completion",
    category: "greeting",
    body: `Hello {{name}}, 🎉\n\nThank you for completing the payment and choosing *STG Groups*!\n\nIt was a pleasure working with you on *{{product}}*. We hope it serves you well.\n\nDo reach out whenever you need our services again. We look forward to a long partnership! 🙏\n\nRegards,\n{{exec}} | STG Groups`,
    vars: [
      { key: "name", label: "Customer name" },
      { key: "product", label: "Product / equipment" },
      { key: "exec", label: "Your name" },
    ],
  },
];

const CATEGORY_LABELS: Record<Template["category"], string> = {
  greeting: "Greetings",
  quotation: "Quotation",
  followup: "Follow-up",
  payment: "Payment",
  delivery: "Delivery",
  reengagement: "Re-engagement",
};

/* ── Page ────────────────────────────────────────────────────────────────── */

function WhatsAppHub() {
  const db = useDb();
  const { user } = useAuth();
  const leads = visibleLeads(db, user);

  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return leads.slice(0, 30);
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.phone.includes(term) ||
        l.customerCompany?.toLowerCase().includes(term),
    );
  }, [leads, search]);

  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedTemplate(null);
    setVars({});
  };

  const selectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    // Pre-fill where possible
    const defaults: Record<string, string> = {};
    for (const v of t.vars) {
      defaults[v.key] = v.defaultFn ? v.defaultFn(selectedLead!) : "";
    }
    // Common auto-fills
    if (selectedLead) {
      defaults.name = selectedLead.name;
    }
    if (user) {
      defaults.exec = user.name;
    }
    setVars(defaults);
  };

  const preview = useMemo(() => {
    if (!selectedTemplate) return "";
    return selectedTemplate.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `[${k}]`);
  }, [selectedTemplate, vars]);

  const waLink = selectedLead
    ? buildWaMeLink(selectedLead.phone, selectedTemplate ? preview : undefined)
    : null;

  const sendMessage = () => {
    if (!waLink || !selectedLead || !selectedTemplate) return;

    // Log as an activity
    mutate((d) => {
      d.activities.push({
        id: crypto.randomUUID(),
        leadId: selectedLead.id,
        at: new Date().toISOString(),
        byUserId: user?.id ?? "",
        kind: "note",
        text: `WhatsApp sent (${selectedTemplate.label}): ${preview.slice(0, 200)}${preview.length > 200 ? "…" : ""}`,
      });
    });

    openWaMeLink(waLink);
    toast.success("WhatsApp opened — message pre-filled");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(preview).then(() => toast.success("Message copied to clipboard"));
  };

  return (
    <>
      <PageHeader
        title="WhatsApp Hub"
        description="Choose a lead, pick a template, fill in variables, and open WhatsApp with the message ready to send."
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* ── Lead picker ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card shadow-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-[70vh] divide-y overflow-y-auto">
            {filteredLeads.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">No leads found</li>
            )}
            {filteredLeads.map((l) => {
              const isSelected = selectedLead?.id === l.id;
              const company = db.companies.find((c) => c.id === l.companyId);
              return (
                <li key={l.id}>
                  <button
                    onClick={() => selectLead(l)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      isSelected && "bg-primary/10",
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: company?.accent ?? "var(--primary)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{l.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.phone}</p>
                    </div>
                    {isSelected && <ChevronRight className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Composer ────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {!selectedLead ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-16 text-center shadow-card">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-muted-foreground">Select a lead to get started</p>
            </div>
          ) : (
            <>
              {/* Lead info strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-card">
                <div>
                  <p className="font-semibold">{selectedLead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.phone}
                    {selectedLead.customerCompany && ` · ${selectedLead.customerCompany}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">{selectedLead.status.replace(/_/g, " ")}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/leads/$leadId" params={{ leadId: selectedLead.id }}>View lead</Link>
                  </Button>
                </div>
              </div>

              {/* Template picker */}
              <div className="rounded-2xl border bg-card p-4 shadow-card">
                <p className="mb-3 font-semibold">Choose a template</p>
                <div className="space-y-3">
                  {(Object.keys(CATEGORY_LABELS) as Template["category"][]).map((cat) => {
                    const catTemplates = TEMPLATES.filter((t) => t.category === cat);
                    return (
                      <div key={cat}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABELS[cat]}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {catTemplates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => selectTemplate(t)}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                                selectedTemplate?.id === t.id
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-input hover:bg-muted",
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedTemplate && (
                <>
                  {/* Variable inputs */}
                  {selectedTemplate.vars.length > 0 && (
                    <div className="rounded-2xl border bg-card p-4 shadow-card">
                      <p className="mb-3 font-semibold">Fill in details</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedTemplate.vars.map((v) => (
                          <div key={v.key} className="grid gap-1.5">
                            <Label className="text-xs">{v.label}</Label>
                            <Input
                              value={vars[v.key] ?? ""}
                              onChange={(e) => setVars({ ...vars, [v.key]: e.target.value })}
                              placeholder={`Enter ${v.label.toLowerCase()}…`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message preview */}
                  <div className="rounded-2xl border bg-card p-4 shadow-card">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="font-semibold">Message preview</p>
                      <Button size="sm" variant="outline" onClick={copyToClipboard}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                    <Textarea
                      readOnly
                      rows={10}
                      value={preview}
                      className="resize-none font-mono text-sm bg-muted/40"
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {waLink ? (
                        <Button onClick={sendMessage} className="bg-[#25d366] hover:bg-[#1ebe5d] text-white">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Open in WhatsApp
                        </Button>
                      ) : (
                        <Button disabled>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Open in WhatsApp
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Opening WhatsApp will also log this message as an activity on the lead.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
