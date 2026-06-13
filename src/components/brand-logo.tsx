import { cn } from "@/lib/utils";

/**
 * STG wordmark placeholder (no client logo file supplied yet).
 * Drop the real logo into /public and swap this for an <img> when available.
 * Uses the brand yellow + red so it already feels on-brand.
 */
export function BrandLogo({
  className,
  variant = "dark",
}: {
  className?: string;
  /** "dark" = for light surfaces; "light" = for the charcoal sidebar. */
  variant?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <span
        className="grid h-9 w-9 place-items-center rounded-lg text-sm font-black tracking-tight text-brand-yellow-foreground shadow-sm"
        style={{ backgroundColor: "var(--brand-yellow)" }}
      >
        <span style={{ color: "var(--brand-red)" }}>S</span>
        <span className="sr-only">STG</span>
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block text-base font-extrabold tracking-tight",
            variant === "light" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          STG<span style={{ color: "var(--brand-red)" }}> Groups</span>
        </span>
        <span
          className={cn(
            "block text-[10px] font-medium uppercase tracking-[0.18em]",
            variant === "light" ? "text-sidebar-foreground/60" : "text-muted-foreground",
          )}
        >
          Equipment CRM
        </span>
      </span>
    </span>
  );
}
