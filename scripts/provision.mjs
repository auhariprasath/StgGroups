/**
 * One-shot backend provisioning for STG Groups CRM.
 *
 *   node scripts/provision.mjs
 *
 * Uses the service_role key (from .env) to:
 *   1. Seed every table from supabase/seed.json (bypasses RLS).
 *   2. Create the 4 auth users (MD + 3 execs), idempotently.
 *   3. Upsert profiles linking each auth user → role + company.
 *
 * Safe to re-run: everything is upsert / find-or-create.
 *
 * Prereqs: run supabase/schema.sql AND supabase/auth-roles.sql in the SQL editor
 * first, and set SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Node < 22 has no native WebSocket; supabase-js's realtime client needs one.
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = ws;

// ---- read .env (no external dep) ----
const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY || KEY.includes("PASTE_YOUR")) {
  console.error("✗ Set SUPABASE_SERVICE_ROLE_KEY in .env first (and VITE_SUPABASE_URL).");
  process.exit(1);
}

const db = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const seed = JSON.parse(readFileSync(new URL("../supabase/seed.json", import.meta.url), "utf8"));

// ---- camelCase model → snake_case rows ----
const m = {
  companies: (c) => ({ id: c.id, name: c.name, legal_name: c.legalName, gstin: c.gstin, shares_gst_with: c.sharesGstWith ?? null, quote_prefix: c.quotePrefix, accent: c.accent, billing_address: c.billingAddress, bank_details: c.bankDetails }),
  product_categories: (c) => ({ id: c.id, company_id: c.companyId, name: c.name, synonyms: c.synonyms }),
  app_users: (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, company_id: u.companyId, title: u.title }),
  leads: (l) => ({ id: l.id, name: l.name, phone: l.phone, source: l.source, status: l.status, priority: l.priority, company_id: l.companyId, category_id: l.categoryId ?? null, assigned_to_user_id: l.assignedToUserId ?? null, request_text: l.requestText, needs_manual_routing: l.needsManualRouting, unserved_request: l.unservedRequest ?? null, created_at: l.createdAt, updated_at: l.updatedAt }),
  activities: (a) => ({ id: a.id, lead_id: a.leadId, at: a.at, by_user_id: a.byUserId, kind: a.kind, text: a.text }),
  requirements: (r) => ({ id: r.id, lead_id: r.leadId, company_id: r.companyId, category_id: r.categoryId ?? null, request_text: r.requestText, status: r.status, fields: r.fields, created_at: r.createdAt, delivery_date: r.deliveryDate ?? null }),
  quotations: (q) => ({ id: q.id, requirement_id: q.requirementId, lead_id: q.leadId, company_id: q.companyId, quotation_no: q.quotationNo, project_no: q.projectNo, version: q.version, date: q.date, validity_date: q.validityDate, lines: q.lines, advance_percent: q.advancePercent, balance_terms: q.balanceTerms, rate_per_day_note: q.ratePerDayNote ?? null, work_order_ref: q.workOrderRef ?? null, approved_by: q.approvedBy ?? null, status: q.status, delivery_address: q.deliveryAddress, delivery_gstin: q.deliveryGstin }),
  payments: (p) => ({ id: p.id, quotation_id: p.quotationId, lead_id: p.leadId, stage: p.stage, total: p.total, advance_amount: p.advanceAmount, balance_amount: p.balanceAmount, copy_to_admin: p.copyToAdmin, updated_at: p.updatedAt }),
  follow_ups: (f) => ({ id: f.id, lead_id: f.leadId, due_at: f.dueAt, reason: f.reason, note: f.note ?? null, done: f.done }),
  negotiations: (n) => ({ lead_id: n.leadId, quoted_amount: n.quotedAmount, expected_amount: n.expectedAmount, competitor_name: n.competitorName ?? null, competitor_amount: n.competitorAmount ?? null, note: n.note ?? null }),
  not_interested: (n) => ({ lead_id: n.leadId, reason: n.reason, competitor_name: n.competitorName ?? null, competitor_amount: n.competitorAmount ?? null, what_would_change: n.whatWouldChange ?? null, note: n.note ?? null }),
  targets: (t) => ({ user_id: t.userId, period: t.period, goal: t.goal, achieved: t.achieved }),
  unserved_requests: (u) => ({ id: u.id, text: u.text, phone: u.phone, logged_by_user_id: u.loggedByUserId, at: u.at }),
};

// FK-safe order
const PLAN = [
  ["companies", seed.companies, undefined],
  ["product_categories", seed.categories, undefined],
  ["app_users", seed.users, undefined],
  ["leads", seed.leads, undefined],
  ["activities", seed.activities, undefined],
  ["requirements", seed.requirements, undefined],
  ["quotations", seed.quotations, undefined],
  ["payments", seed.payments, undefined],
  ["follow_ups", seed.followUps, undefined],
  ["negotiations", seed.negotiations, "lead_id"],
  ["not_interested", seed.notInterested, "lead_id"],
  ["targets", seed.targets, "user_id,period"],
  ["unserved_requests", seed.unserved, undefined],
];

async function seedTables() {
  console.log("→ Seeding tables…");
  for (const [table, rows, onConflict] of PLAN) {
    if (!rows?.length) continue;
    const mapped = rows.map(m[table]);
    const { error } = await db.from(table).upsert(mapped, onConflict ? { onConflict } : undefined);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`   ✓ ${table} (${mapped.length})`);
  }
}

// ---- the 4 roles ----
const ROSTER = [
  { id: "u-md", email: "stggroups2008smm@gmail.com", password: "stgsmm@2026", role: "super_admin", companyId: null },
  { id: "u-sanjay", email: "rentals@stggroups.co.in", password: "StgRentals@2026", role: "exec", companyId: "stg-rentals" },
  { id: "u-infra", email: "infra@stggroups.co.in", password: "StgInfra@2026", role: "exec", companyId: "stg-infra" },
  { id: "u-naveen", email: "stgtradingcooperation2026@gmail.com", password: "StgTrading@2026", role: "exec", companyId: "stg-trading" },
];

async function findUserByEmail(email) {
  // Paginate admin user list to find an existing account.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function provisionRoles() {
  console.log("→ Creating auth users + profiles…");
  for (const r of ROSTER) {
    let uid;
    const { data, error } = await db.auth.admin.createUser({
      email: r.email,
      password: r.password,
      email_confirm: true,
      user_metadata: { role: r.role, company_id: r.companyId, app_user_id: r.id },
    });
    if (error) {
      const existing = await findUserByEmail(r.email);
      if (!existing) throw new Error(`${r.email}: ${error.message}`);
      uid = existing.id;
      // keep password in sync for a known demo login
      await db.auth.admin.updateUserById(uid, { password: r.password, email_confirm: true });
      console.log(`   • ${r.email} already existed — updated`);
    } else {
      uid = data.user.id;
      console.log(`   ✓ ${r.email} created`);
    }
    const { error: pErr } = await db.from("profiles").upsert({ id: uid, app_user_id: r.id, role: r.role, company_id: r.companyId });
    if (pErr) throw new Error(`profile ${r.email}: ${pErr.message}`);
  }
}

(async () => {
  try {
    await seedTables();
    await provisionRoles();
    console.log("\n✅ Provisioning complete. Logins:");
    for (const r of ROSTER) console.log(`   ${r.role.padEnd(11)}  ${r.email}  /  ${r.password}`);
  } catch (e) {
    console.error("\n✗ Provisioning failed:", e.message);
    process.exit(1);
  }
})();
