import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/data/supabase-adapter";
import { getDb, setDb } from "@/lib/data/store";

/**
 * Supabase realtime subscriptions.
 *
 * Listens to INSERT / UPDATE / DELETE on all CRM tables and pulls a fresh
 * snapshot whenever something changes — so every open browser tab stays in
 * sync without manual refresh.
 *
 * Gracefully no-ops when Supabase is not configured (the mock / seed path).
 */

const CRM_TABLES = [
  "leads",
  "activities",
  "requirements",
  "quotations",
  "proforma_invoices",
  "tax_invoices",
  "payments",
  "follow_ups",
  "site_visits",
  "negotiations",
  "not_interested",
  "targets",
  "unserved_requests",
  "lead_status_history",
  "lead_transfer_logs",
  "lead_sources",
  "product_alias_mapping",
  "lead_assignment_history",
  "existing_customer_history",
  "notifications",
  "followup_timeline",
  "followup_reminders",
  "negative_reason_analytics",
] as const;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let activeChannels: ReturnType<SupabaseClient["channel"]>[] = [];

/**
 * Debounced refresh: batch multiple realtime events into a single fetch.
 */
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = undefined;
    if (!supabase) return;
    try {
      const fresh = await fetchAll();
      setDb(fresh);
    } catch (err) {
      console.error("[realtime] refresh failed:", err);
    }
  }, 500);
}

/**
 * Start listening to all CRM tables.
 * Safe to call multiple times — cleans up previous subscriptions first.
 */
export function startRealtime() {
  stopRealtime();
  if (!supabase) return;

  for (const table of CRM_TABLES) {
    const channel = supabase
      .channel(`crm-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => scheduleRefresh())
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn(`[realtime] ${table}: ${status}`);
        }
      });
    activeChannels.push(channel);
  }
}

/**
 * Stop all subscriptions and cancel pending refresh.
 */
export function stopRealtime() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
  for (const ch of activeChannels) {
    supabase?.removeChannel(ch);
  }
  activeChannels = [];
}
