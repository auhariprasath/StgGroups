import { cn } from "@/lib/utils";
import { LEAD_STATUS, PRIORITY } from "@/lib/status";
import type { LeadStatus, Priority } from "@/lib/data/types";

/** Coloured pill for a lead's lifecycle state. */
export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = LEAD_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${s.token} 14%, transparent)`, color: s.token }}
      title={s.hint}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.token }} />
      {s.label}
    </span>
  );
}

/** Small priority dot + label. */
export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const p = PRIORITY[priority];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}
      style={{ color: p.token }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.token }} />
      {p.label}
    </span>
  );
}
