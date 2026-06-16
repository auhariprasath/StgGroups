import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { activitiesFor, canSeeLead, userName, companyName } from "@/lib/data/selectors";
import {
  logActivity,
  setLeadStatus,
  completeFollowUp,
  completeSiteVisit,
  cancelSiteVisit,
  markInvalid,
  reopenLead,
} from "@/lib/data/actions";
import { LEAD_STATUS, LEAD_FLOW, SOURCE_LABEL, VALID_TRANSITIONS } from "@/lib/status";
import { StatusBadge, PriorityBadge, LeadTypeBadge } from "@/components/status-badge";
import {
  FollowUpDialog,
  NegotiationDialog,
  NotInterestedDialog,
  ReassignDialog,
  SiteVisitDialog,
  ExistingCustomerDialog,
} from "@/components/leads/lead-action-dialogs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildWaMeLink, openWaMeLink } from "@/lib/utils";
import { formatDateTimeIN, formatINR, initialsOf, relativeTime } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  PhoneCall,
  HandCoins,
  XCircle,
  Share2,
  FileText,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  Clock,
  IndianRupee,
  Forward,
  CalendarClock,
  Check,
  X,
  MapPin,
  BadgeCheck,
  AlertTriangle,
  PenLine,
  Send,
  Building2,
  RotateCcw,
} from "lucide-react";
import type { LeadStatus } from "@/lib/data/types";

export const Route = createFileRoute("/_app/leads/$leadId")({ component: LeadDetail });

/* ─────────────────────────────── WhatsApp templates ────────────────────── */
function waTemplates(name: string, company: string) {
  return [
    {
      label: "Enquiry Acknowledgement",
      icon: MessageSquare,
      msg: `Hi ${name}, thank you for enquiring about equipment rental with ${company}. Our team will call you shortly to discuss your requirements.`,
    },
    {
      label: "Quotation Sent",
      icon: FileText,
      msg: `Hi ${name}, we have shared the quotation for your equipment rental requirement. Please review and let us know if you have any questions. We look forward to your confirmation.`,
    },
    {
      label: "Follow-up",
      icon: PhoneCall,
      msg: `Hi ${name}, this is a follow-up from ${company} regarding your equipment rental enquiry. Could you share a convenient time to discuss? We are happy to help.`,
    },
    {
      label: "Payment Reminder",
      icon: IndianRupee,
      msg: `Hi ${name}, a gentle reminder that your rental advance payment is pending. Please make the payment at your earliest convenience so we can proceed with equipment mobilisation.`,
    },
    {
      label: "Delivery Confirmation",
      icon: CalendarClock,
      msg: `Hi ${name}, your equipment is ready for delivery. Please confirm the site address and the contact person at the site. Our team will coordinate the delivery schedule.`,
    },
  ];
}

/* ──────────────────────────────── Component ─────────────────────────────── */
function LeadDetail() {
  const { leadId } = Route.useParams();
  const db = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();

  const lead = db.leads.find((l) => l.id === leadId);
  const [activeTab, setActiveTab] = useState("overview");
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [siteVisitDialog, setSiteVisitDialog] = useState(false);
  const [negotiate, setNegotiate] = useState(false);
  const [notInterested, setNotInterested] = useState(false);
  const [reassign, setReassign] = useState(false);
  const [existingCheck, setExistingCheck] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  if (!lead) return <NotFound />;
  if (!canSeeLead(user, lead)) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-semibold">This lead belongs to another company.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You can only view leads assigned to your team.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </div>
    );
  }

  const activities = activitiesFor(db, leadId);
  const requirement = db.requirements.find((r) => r.leadId === leadId);
  const quotations = db.quotations
    .filter((q) => q.leadId === leadId)
    .sort((a, b) => b.version - a.version);
  const payment = db.payments.find((p) => p.leadId === leadId);
  const allFollowUps = db.followUps
    .filter((f) => f.leadId === leadId)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const hasFollowUpOutcome = db.followUps.some((f) => f.leadId === leadId && f.outcome != null);
  const pendingFollowUps = allFollowUps.filter((f) => !f.done);
  const siteVisits = (db.siteVisits ?? [])
    .filter((sv) => sv.leadId === leadId)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const upcomingMeetings = siteVisits.filter((sv) => sv.status === "scheduled");
  const negotiation = db.negotiations.find((n) => n.leadId === leadId);
  const notInterestedRecord = db.notInterested.find((n) => n.leadId === leadId);
  const notes = activities.filter((a) => a.kind === "note");
  const transfers = (db.transferLogs ?? [])
    .filter((t) => t.leadId === leadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tel = lead.phone.replace(/\D/g, "").slice(-10);
  const waBase = buildWaMeLink(lead.phone);

  const move = (s: LeadStatus) => {
    try {
      setLeadStatus(leadId, s, user?.id ?? "u-md");
      toast.success(`Moved to ${LEAD_STATUS[s].label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status change failed");
    }
  };

  const saveNote = () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    logActivity(leadId, user?.id ?? "u-md", "note", noteText.trim());
    setNoteText("");
    setSavingNote(false);
    toast.success("Note saved");
  };

  const templates = waTemplates(lead.name, companyName(db, lead.companyId));

  return (
    <>
      <Link
        to="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      {/* ── Header card ── */}
      <div className="bg-card border rounded-lg p-4 md:p-5 mb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="text-base font-semibold">
              {initialsOf(lead.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-semibold truncate">{lead.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <span>{lead.phone}</span>
                </div>
              </div>
              <PriorityBadge priority={lead.priority} />
              <LeadTypeBadge leadType={lead.leadType} />
            </div>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={lead.status} />
              <span className="text-[11px] text-muted-foreground">
                Updated {relativeTime(lead.updatedAt)}
              </span>
              {pendingFollowUps.length > 0 && (
                <span className="text-[11px] bg-warning/15 text-warning border border-warning/30 rounded-full px-2 py-0.5">
                  Follow-up: {formatDateTimeIN(pendingFollowUps[0].dueAt)}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{SOURCE_LABEL[lead.source]}</span>
              <span>· {companyName(db, lead.companyId)}</span>
              <span>· {userName(db, lead.assignedToUserId)}</span>
            </div>

            {lead.requestText && (
              <p className="mt-2 text-sm text-muted-foreground">{lead.requestText}</p>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <a
                href={`tel:+91${tel}`}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
              <button
                type="button"
                onClick={() => {
                  if (waBase) openWaMeLink(waBase);
                }}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-[#25d366] text-white text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </button>
              <Button variant="outline" className="h-11" onClick={() => setFollowUpDialog(true)}>
                <PhoneCall className="h-4 w-4 mr-1.5" /> Follow-up
              </Button>
              <Button variant="outline" className="h-11" onClick={() => setSiteVisitDialog(true)}>
                <Building2 className="h-4 w-4 mr-1.5" /> Venue meeting
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11">
                    More <ChevronDown className="ml-1.5 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/requirement/$leadId", params: { leadId } })}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />{" "}
                    {requirement ? "Edit requirement" : "Gather requirement"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/quotation/$leadId", params: { leadId } })}
                    disabled={!requirement || (quotations.length === 0 && !hasFollowUpOutcome)}
                  >
                    <FileText className="h-4 w-4 mr-2" /> Quotation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNegotiate(true)}>
                    <HandCoins className="h-4 w-4 mr-2" /> Negotiation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setReassign(true)}>
                    <Share2 className="h-4 w-4 mr-2" /> Transfer lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExistingCheck(true)}>
                    <BadgeCheck className="h-4 w-4 mr-2" /> Existing customer check
                  </DropdownMenuItem>
                  {lead.needsManualRouting && (
                    <DropdownMenuItem onClick={() => setReassign(true)}>
                      <Forward className="h-4 w-4 mr-2" /> Forward lead
                    </DropdownMenuItem>
                  )}
                  {(lead.status === "not_interested" || lead.status === "dormant") && (
                    <DropdownMenuItem
                      onClick={() => {
                        try {
                          reopenLead(leadId, user?.id ?? "u-md");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Reopen failed");
                        }
                        toast.success("Lead reopened — back in follow-up");
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Reopen lead
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setNotInterested(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Not interested
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      markInvalid(leadId, user?.id ?? "u-md", "Invalid lead");
                      toast.success("Lead marked as invalid");
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Mark as invalid
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="h-11 ml-auto">
                    Update status <ChevronDown className="ml-1.5 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => {
                    const isValid = VALID_TRANSITIONS[lead.status]?.includes(s);
                    const isCurrent = s === lead.status;
                    if (!isValid && !isCurrent) return null;
                    return (
                      <DropdownMenuItem key={s} onClick={() => move(s)} disabled={isCurrent}>
                        <span
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: LEAD_STATUS[s].token }}
                        />
                        {LEAD_STATUS[s].label}
                        {isCurrent && (
                          <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <Stepper status={lead.status} />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 text-[11px] h-auto">
          <TabsTrigger value="overview" className="py-2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="reqs" className="py-2">
            Reqs
          </TabsTrigger>
          <TabsTrigger value="booking" className="py-2">
            Booking
          </TabsTrigger>
          <TabsTrigger value="activity" className="py-2">
            Activity
          </TabsTrigger>
          <TabsTrigger value="followups" className="relative py-2">
            Follow-ups
            {pendingFollowUps.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground leading-none">
                {pendingFollowUps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="venue" className="relative py-2">
            Venue
            {upcomingMeetings.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground leading-none">
                {upcomingMeetings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="py-2">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="note" className="py-2">
            Note
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-3 pt-4">
          <InfoRow label="Source" value={SOURCE_LABEL[lead.source]} />
          <InfoRow label="Company" value={companyName(db, lead.companyId)} />
          <InfoRow label="Assigned to" value={userName(db, lead.assignedToUserId)} />
          <InfoRow
            label="Priority"
            value={lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
          />
          <InfoRow label="Created" value={formatDateTimeIN(lead.createdAt)} />

          {lead.requestText && (
            <div className="bg-card border rounded-md p-3">
              <div className="text-[11px] text-muted-foreground mb-1">Enquiry</div>
              <div className="text-sm whitespace-pre-wrap">{lead.requestText}</div>
            </div>
          )}

          {/* Pending follow-up summary */}
          {pendingFollowUps.length > 0 && (
            <div className="bg-card border rounded-md p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Next follow-up
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                <p className="font-medium">{formatDateTimeIN(pendingFollowUps[0].dueAt)}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{pendingFollowUps[0].reason}</p>
              </div>
            </div>
          )}

          {/* Upcoming meeting summary */}
          {upcomingMeetings.length > 0 && (
            <div className="bg-card border rounded-md p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Next meeting
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
                <p className="font-medium">{upcomingMeetings[0].purpose}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {formatDateTimeIN(upcomingMeetings[0].scheduledAt)}
                </p>
                {upcomingMeetings[0].location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {upcomingMeetings[0].location}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Negotiation summary */}
          {negotiation && (
            <div className="bg-card border rounded-md p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <HandCoins className="h-3.5 w-3.5" /> Negotiation
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Our quote</span>
                  <span className="font-medium">{formatINR(negotiation.quotedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client wants</span>
                  <span className="font-medium">{formatINR(negotiation.expectedAmount)}</span>
                </div>
                {negotiation.competitorName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Competitor</span>
                    <span className="font-medium">
                      {negotiation.competitorName}
                      {negotiation.competitorAmount
                        ? ` · ${formatINR(negotiation.competitorAmount)}`
                        : ""}
                    </span>
                  </div>
                )}
                {negotiation.note && (
                  <p className="pt-1 text-xs text-muted-foreground">{negotiation.note}</p>
                )}
              </div>
            </div>
          )}

          {/* Not interested */}
          {notInterestedRecord && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
              <div className="text-xs font-semibold text-destructive mb-1">Not interested</div>
              <div className="text-sm text-muted-foreground">
                {notInterestedRecord.reason.replace(/_/g, " ")}
              </div>
              {notInterestedRecord.competitorName && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Competitor: {notInterestedRecord.competitorName}
                </div>
              )}
              {notInterestedRecord.note && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {notInterestedRecord.note}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Reqs ── */}
        <TabsContent value="reqs" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Requirement</h3>
            <Button
              size="sm"
              variant={requirement ? "outline" : "default"}
              onClick={() => navigate({ to: "/requirement/$leadId", params: { leadId } })}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              {requirement ? "Edit" : "Gather requirement"}
            </Button>
          </div>

          {requirement ? (
            <div className="bg-card border rounded-md p-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {requirement.fields.map((f) => (
                  <div
                    key={f.key}
                    className="flex justify-between gap-3 border-b border-dashed py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span
                      className={cn(
                        "text-right font-medium",
                        f.value === "nil" && "italic text-muted-foreground",
                      )}
                    >
                      {f.value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No requirement gathered yet. Click "Gather requirement" to fill in site, company, and
              delivery details.
            </div>
          )}

          {/* Quotations */}
          <div className="flex items-center justify-between mt-2">
            <h3 className="text-sm font-semibold">
              Quotations{quotations.length > 0 ? ` (${quotations.length})` : ""}
            </h3>
            <Button
              size="sm"
              variant="outline"
              disabled={!requirement}
              onClick={() => navigate({ to: "/quotation/$leadId", params: { leadId } })}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {quotations.length ? "New version" : "Create"}
            </Button>
          </div>

          {quotations.length > 0 ? (
            <ul className="space-y-2">
              {quotations.map((q) => {
                const total = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
                return (
                  <li key={q.id}>
                    <Link
                      to="/quotation/$leadId"
                      params={{ leadId }}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold">
                          {q.quotationNo}{" "}
                          <span className="text-muted-foreground">· v{q.version}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {q.date} · valid till {q.validityDate} ·{" "}
                          <span className="capitalize">{q.status}</span>
                        </p>
                      </div>
                      <span className="font-semibold text-primary">{formatINR(total)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No quotation yet. Gather the requirement first, then create a quotation.
            </div>
          )}
        </TabsContent>

        {/* ── Booking ── */}
        <TabsContent value="booking" className="pt-4 space-y-3">
          <h3 className="text-sm font-semibold">Rental Order / Payment Status</h3>

          {payment ? (
            <div className="space-y-3">
              <div className="bg-card border rounded-md p-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="font-semibold text-sm">{formatINR(payment.total)}</p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-3">
                    <p className="text-[11px] text-muted-foreground">Advance</p>
                    <p className="font-semibold text-sm text-success">
                      {formatINR(payment.advanceAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-[11px] text-muted-foreground">Balance</p>
                    <p className="font-semibold text-sm text-destructive">
                      {formatINR(payment.balanceAmount)}
                    </p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Stage:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {payment.stage.replace(/_/g, " ")}
                  </span>
                </p>
              </div>

              {/* Confirmed quotation */}
              {quotations
                .filter((q) => q.status === "accepted" || q.status === "sent")
                .map((q) => {
                  const total = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
                  return (
                    <div
                      key={q.id}
                      className="bg-card border rounded-md p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          {q.quotationNo} v{q.version}
                          <span
                            className={cn(
                              "text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5",
                              q.status === "accepted"
                                ? "bg-success/15 text-success"
                                : "bg-blue-500/15 text-blue-500",
                            )}
                          >
                            {q.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.date}</p>
                      </div>
                      <span className="font-semibold">{formatINR(total)}</span>
                    </div>
                  );
                })}
            </div>
          ) : quotations.length > 0 ? (
            <div className="bg-card border rounded-md p-6 text-center text-sm text-muted-foreground">
              <IndianRupee className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>Payment tracking starts once a quotation is accepted and confirmed.</p>
              <p className="text-xs mt-1">
                Update the lead status to "Confirmed" to generate a proforma.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No booking yet. Create a quotation first, then confirm the order.
            </div>
          )}
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="pt-4">
          {activities.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
          ) : (
            <ol className="relative border-l ml-2 space-y-4">
              {activities.map((a) => (
                <li key={a.id} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
                  <div className="text-sm">{a.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDateTimeIN(a.at)} · {userName(db, a.byUserId)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        {/* ── Follow-ups ── */}
        <TabsContent value="followups" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Follow-ups{allFollowUps.length > 0 ? ` (${allFollowUps.length})` : ""}
            </h3>
            <Button size="sm" onClick={() => setFollowUpDialog(true)}>
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Schedule
            </Button>
          </div>

          {allFollowUps.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No follow-ups yet. Click Schedule to set a call-back reminder.
            </div>
          ) : (
            <div className="space-y-2">
              {allFollowUps.map((f) => {
                const overdue = !f.done && new Date(f.dueAt).getTime() < Date.now();
                return (
                  <div key={f.id} className="bg-card border rounded-md p-3 flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        f.done
                          ? "bg-success/10 text-success"
                          : overdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {f.done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <PhoneCall className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{f.reason}</p>
                      {f.note && <p className="truncate text-xs text-muted-foreground">{f.note}</p>}
                      <p
                        className={cn(
                          "text-xs",
                          f.done
                            ? "text-muted-foreground line-through"
                            : overdue
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {overdue && !f.done ? "Overdue · " : ""}
                        {formatDateTimeIN(f.dueAt)}
                      </p>
                    </div>
                    {!f.done ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          completeFollowUp(f.id);
                          toast.success("Follow-up marked done");
                        }}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Done
                      </Button>
                    ) : (
                      <span className="text-xs text-success font-medium">Done</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Venue meetings ── */}
        <TabsContent value="venue" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Venue Meetings{siteVisits.length > 0 ? ` (${siteVisits.length})` : ""}
            </h3>
            <Button size="sm" onClick={() => setSiteVisitDialog(true)}>
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Schedule
            </Button>
          </div>

          {siteVisits.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No venue meetings scheduled yet. Click Schedule to plan a site visit or client
              meeting.
            </div>
          ) : (
            <div className="space-y-2">
              {siteVisits.map((sv) => {
                const isPast = new Date(sv.scheduledAt).getTime() < Date.now();
                const isUpcoming = sv.status === "scheduled";
                return (
                  <div key={sv.id} className="bg-card border rounded-md p-3 flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        sv.status === "completed"
                          ? "bg-success/10 text-success"
                          : sv.status === "cancelled"
                            ? "bg-muted text-muted-foreground"
                            : isPast
                              ? "bg-warning/10 text-warning"
                              : "bg-blue-500/10 text-blue-500",
                      )}
                    >
                      {sv.status === "completed" ? (
                        <BadgeCheck className="h-4 w-4" />
                      ) : sv.status === "cancelled" ? (
                        <X className="h-4 w-4" />
                      ) : isPast ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CalendarClock className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{sv.purpose}</p>
                      <p
                        className={cn(
                          "text-xs mt-0.5",
                          sv.status === "cancelled"
                            ? "text-muted-foreground line-through"
                            : isPast && isUpcoming
                              ? "font-medium text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {isPast && isUpcoming ? "Overdue · " : ""}
                        {formatDateTimeIN(sv.scheduledAt)}
                      </p>
                      {sv.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {sv.location}
                        </p>
                      )}
                      {sv.note && <p className="mt-0.5 text-xs text-muted-foreground">{sv.note}</p>}
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {sv.status}
                      </p>
                    </div>
                    {sv.status === "scheduled" && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            completeSiteVisit(sv.id, user?.id ?? "u-md");
                            toast.success("Meeting marked completed");
                          }}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => {
                            cancelSiteVisit(sv.id);
                            toast.success("Meeting cancelled");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── WhatsApp ── */}
        <TabsContent value="whatsapp" className="pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Message templates
          </h3>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.label} className="bg-card border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.label}
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#25d366] hover:bg-[#128c7e] text-white shrink-0"
                    onClick={() => {
                      const link = buildWaMeLink(lead.phone, t.msg);
                      if (link) openWaMeLink(link);
                    }}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap">
                  {t.msg}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Note ── */}
        <TabsContent value="note" className="pt-4 space-y-4">
          {/* Add note */}
          <div className="bg-card border rounded-md p-3 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PenLine className="h-4 w-4 text-muted-foreground" /> Add note
            </h3>
            <Textarea
              placeholder="Write a note about this lead — call summary, client preference, site details…"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button size="sm" onClick={saveNote} disabled={!noteText.trim() || savingNote}>
              {savingNote ? "Saving…" : "Save note"}
            </Button>
          </div>

          {/* Saved notes */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Previous notes
              </div>
              {notes.map((n) => (
                <div key={n.id} className="bg-card border rounded-md p-3">
                  <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {formatDateTimeIN(n.at)} · {userName(db, n.byUserId)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {notes.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No notes yet. Use the form above to add one.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <FollowUpDialog leadId={leadId} open={followUpDialog} onOpenChange={setFollowUpDialog} />
      <SiteVisitDialog leadId={leadId} open={siteVisitDialog} onOpenChange={setSiteVisitDialog} />
      <NegotiationDialog leadId={leadId} open={negotiate} onOpenChange={setNegotiate} />
      <NotInterestedDialog leadId={leadId} open={notInterested} onOpenChange={setNotInterested} />
      <ReassignDialog leadId={leadId} open={reassign} onOpenChange={setReassign} />
      <ExistingCustomerDialog
        leadId={leadId}
        open={existingCheck}
        onOpenChange={setExistingCheck}
      />
    </>
  );
}

/* ─────────────────────── Stepper ─────────────────────── */
function Stepper({ status }: { status: LeadStatus }) {
  if (status === "not_interested") {
    return (
      <div className="mt-4 rounded-lg bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
        This lead was marked not interested.
      </div>
    );
  }
  const idx = LEAD_FLOW.indexOf(status);
  return (
    <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
      {LEAD_FLOW.map((s, i) => {
        const done = i <= idx;
        return (
          <div key={s} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn("h-2.5 w-2.5 rounded-full transition-colors", done ? "" : "bg-muted")}
                style={done ? { backgroundColor: LEAD_STATUS[s].token } : undefined}
              />
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium",
                  done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {LEAD_STATUS[s].label}
              </span>
            </div>
            {i < LEAD_FLOW.length - 1 && (
              <span className={cn("mx-1 h-px w-8 sm:w-12", i < idx ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Small helpers ─────────────────── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function NotFound() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <p className="font-semibold">Lead not found</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/leads">Back to leads</Link>
      </Button>
    </div>
  );
}
