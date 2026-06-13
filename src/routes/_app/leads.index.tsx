import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/data/store";
import { visibleLeads, userName, companyName } from "@/lib/data/selectors";
import { LEAD_STATUS, SOURCE_LABEL } from "@/lib/status";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildWaMeLink, openWaMeLink } from "@/lib/utils";
import { initialsOf, relativeTime } from "@/lib/format";
import { Plus, Search, Phone, MessageSquare, AlertCircle } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/data/types";

export const Route = createFileRoute("/_app/leads/")({ component: LeadsPage });

const FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "followup", label: "Follow-up" },
  { value: "interested", label: "Interested" },
  { value: "negotiation", label: "Negotiation" },
  { value: "quote_sent", label: "Quoted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "Not interested" },
];

function LeadsPage() {
  const db = useDb();
  const { user } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [q, setQ] = useState("");

  const leads = useMemo(() => {
    let list = visibleLeads(db, user);
    if (filter !== "all") list = list.filter((l) => l.status === filter);
    const term = q.trim().toLowerCase();
    if (term)
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.phone.includes(term) ||
          l.requestText.toLowerCase().includes(term) ||
          (l.customerCompany?.toLowerCase().includes(term) ?? false) ||
          (l.location?.toLowerCase().includes(term) ?? false) ||
          (l.email?.toLowerCase().includes(term) ?? false),
      );
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [db, user, filter, q]);

  const counts = useMemo(() => {
    const all = visibleLeads(db, user);
    const map: Record<string, number> = { all: all.length };
    for (const s of Object.keys(LEAD_STATUS)) map[s] = all.filter((l) => l.status === s).length;
    return map;
  }, [db, user]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Leads</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {user?.role === "super_admin"
              ? "All leads across STG Groups."
              : `Your ${companyName(db, user?.companyId ?? "")} leads.`}
          </p>
        </div>
        <Button onClick={() => setDialog(true)} className="min-h-11">
          <Plus className="h-4 w-4 mr-1.5" /> New lead
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          <Input
            className="pl-9 h-11"
            placeholder="Search name, phone, request…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 h-9 px-3 rounded-full text-xs font-medium border min-w-[44px] transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent",
              )}
            >
              {f.label}
              <span className={cn("ml-1.5 opacity-70", filter === f.value && "opacity-90")}>
                {counts[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          {q || filter !== "all" ? "No leads match your filters." : "No leads yet. Create your first lead to get started."}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned to</th>
                {user?.role === "super_admin" && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Updated</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <LeadRow
                  key={l.id}
                  lead={l}
                  assignedName={userName(db, l.assignedToUserId)}
                  company={user?.role === "super_admin" ? companyName(db, l.companyId) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewLeadDialog open={dialog} onOpenChange={setDialog} />
    </>
  );
}

function LeadRow({
  lead,
  assignedName,
  company,
}: {
  lead: Lead;
  assignedName: string;
  company?: string;
}) {
  const navigate = useNavigate();
  const tel = lead.phone.replace(/\D/g, "").slice(-10);

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate({ to: "/leads/$leadId", params: { leadId: lead.id } })}
    >
      {/* Name + avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px]">{initialsOf(lead.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="font-medium truncate max-w-[140px] block">{lead.name}</span>
            {lead.needsManualRouting && (
              <span className="inline-flex items-center gap-1 text-[10px] text-warning">
                <AlertCircle className="h-3 w-3" /> Needs routing
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Phone */}
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.phone}</td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityBadge priority={lead.priority} />
      </td>

      {/* Source */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {SOURCE_LABEL[lead.source]}
      </td>

      {/* Assigned */}
      <td className="px-4 py-3 text-sm text-muted-foreground">{assignedName}</td>

      {/* Company (super_admin only) */}
      {company !== undefined && (
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{company}</td>
      )}

      {/* Updated */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {relativeTime(lead.updatedAt)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <a
            href={`tel:+91${tel}`}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent"
            aria-label="Call"
          >
            <Phone className="h-3.5 w-3.5 text-primary" />
          </a>
          <button
            type="button"
            onClick={() => {
              const wa = buildWaMeLink(lead.phone);
              if (wa) openWaMeLink(wa);
            }}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent"
            aria-label="WhatsApp"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#25d366]" />
          </button>
        </div>
      </td>
    </tr>
  );
}
