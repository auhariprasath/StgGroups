/**
 * Full one-shot database setup for STG Groups CRM.
 *
 *   node scripts/setup-all.mjs
 *
 * What it does (all idempotent — safe to re-run):
 *   1. Creates every table (schema.sql) via direct Postgres connection
 *   2. Enables RLS and open anon policies on every table
 *   3. Upserts seed data (companies, categories, users, targets)
 *   4. Creates the 4 Supabase Auth users (MD + 3 execs)
 *   5. Upserts profiles linking auth UIDs → app_user_id + role + company
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import ws from "ws";

// Node < 22 needs a WebSocket polyfill for Supabase realtime.
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = ws;

// ── Read .env (no dotenv dependency) ─────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL       = env.SUPABASE_DB_URL;

if (!SUPABASE_URL || !SERVICE_KEY || !DB_URL) {
  console.error("✗  Missing env vars. Check .env has VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Step 1: Run schema DDL via direct Postgres connection ─────────────────────
async function runSchema() {
  console.log("\n── Step 1: Creating tables & RLS policies ──────────────────");
  const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(schema);
    console.log("   ✓ All tables created / verified");
  } finally {
    await client.end();
  }
}

// ── Step 2: Seed static config data ──────────────────────────────────────────
const COMPANIES = [
  { id: "stg-rentals",  name: "STG Rentals",            legal_name: "STG Rentals",            gstin: "29ABCDE1234F1Z5", shares_gst_with: null,          quote_prefix: "STGR", accent: "#D81E27", billing_address: "STG Rentals\nNo. 12, Industrial Estate, Peenya\nBengaluru, Karnataka 560058",          bank_details: "A/c Name: STG Rentals\nBank: HDFC Bank, Peenya\nA/c No: 5010 0123 4567\nIFSC: HDFC0001234" },
  { id: "stg-infra",    name: "STG Infra Equipment",    legal_name: "STG Infra Equipment",    gstin: "29ABCDE1234F1Z5", shares_gst_with: "stg-rentals",  quote_prefix: "STGI", accent: "#C77900", billing_address: "STG Infra Equipment\nNo. 12, Industrial Estate, Peenya\nBengaluru, Karnataka 560058",    bank_details: "A/c Name: STG Infra Equipment\nBank: HDFC Bank, Peenya\nA/c No: 5010 0987 6543\nIFSC: HDFC0001234" },
  { id: "stg-trading",  name: "STG Trading Corporation", legal_name: "STG Trading Corporation", gstin: "29ZZTTR5678K1Z2", shares_gst_with: null,          quote_prefix: "STGT", accent: "#1769C0", billing_address: "STG Trading Corporation\nNo. 47, Auto Spares Market, Yeshwanthpur\nBengaluru, Karnataka 560022", bank_details: "A/c Name: STG Trading Corporation\nBank: ICICI Bank, Yeshwanthpur\nA/c No: 6020 1122 3344\nIFSC: ICIC0006020" },
];

const CATEGORIES = [
  { id: "c-boom",    company_id: "stg-rentals", name: "Boom Lift",                     synonyms: ["boom lift","boomlift","articulating boom","telescopic boom","cherry picker","aerial boom"] },
  { id: "c-scissor", company_id: "stg-rentals", name: "Scissor Lift",                  synonyms: ["scissor lift","scissorlift","scissor platform","scissor"] },
  { id: "c-man",     company_id: "stg-rentals", name: "Man Lift",                      synonyms: ["man lift","manlift","personnel lift","vertical mast","single man lift"] },
  { id: "c-spider",  company_id: "stg-rentals", name: "Spider Lift",                   synonyms: ["spider lift","spiderlift","tracked lift","crawler lift"] },
  { id: "c-grader",  company_id: "stg-infra",   name: "Motor Grader",                  synonyms: ["motor grader","grader","road grader"] },
  { id: "c-vroller", company_id: "stg-infra",   name: "Vibratory Roller",              synonyms: ["vibratory roller","vibro roller","compactor roller","drum roller"] },
  { id: "c-soil",    company_id: "stg-infra",   name: "Soil Compactor",                synonyms: ["soil compactor","soil compacter","padfoot compactor","sheep foot"] },
  { id: "c-tandem",  company_id: "stg-infra",   name: "Mini Tandem Roller",            synonyms: ["mini tandem roller","tandem roller","tandem compactor","baby roller"] },
  { id: "c-mixer",   company_id: "stg-infra",   name: "Self Loading Concrete Mixer",   synonyms: ["self loading concrete mixer","self loading mixer","concrete mixer","slcm","mobile mixer"] },
  { id: "c-tyres",   company_id: "stg-trading", name: "Tyres",                         synonyms: ["tyre","tyres","tire","tires","otr tyre"] },
  { id: "c-filters", company_id: "stg-trading", name: "Filters",                       synonyms: ["filter","filters","air filter","oil filter","fuel filter","hydraulic filter"] },
];

const APP_USERS = [
  { id: "u-md",     name: "Managing Director",    email: "stggroups2008smm@gmail.com",          phone: "9000000000", role: "super_admin", company_id: null,          title: "Super Admin / MD" },
  { id: "u-sanjay", name: "Sanjay",               email: "rentals@stggroups.co.in",             phone: "8939205909", role: "exec",        company_id: "stg-rentals", title: "Marketing Executive — STG Rentals" },
  { id: "u-infra",  name: "Infra Executive",      email: "infra@stggroups.co.in",               phone: "8939205900", role: "exec",        company_id: "stg-infra",   title: "Marketing Executive — STG Infra" },
  { id: "u-naveen", name: "Naveen",               email: "stgtradingcooperation2026@gmail.com", phone: "9884115099", role: "exec",        company_id: "stg-trading", title: "Marketing Executive — STG Trading" },
];

const TARGETS = [
  { user_id: "u-sanjay", period: "Jun 2026", goal: 12, achieved: 0 },
  { user_id: "u-infra",  period: "Jun 2026", goal: 8,  achieved: 0 },
  { user_id: "u-naveen", period: "Jun 2026", goal: 10, achieved: 0 },
];

async function seedData() {
  console.log("\n── Step 2: Seeding static config data ──────────────────────");

  const upsert = async (table, rows, onConflict) => {
    if (!rows.length) return;
    const opts = onConflict ? { onConflict } : undefined;
    const { error } = await admin.from(table).upsert(rows, opts);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`   ✓ ${table} (${rows.length} rows)`);
  };

  await upsert("companies",          COMPANIES);
  await upsert("product_categories", CATEGORIES);
  await upsert("app_users",          APP_USERS);
  await upsert("targets",            TARGETS, "user_id,period");
}

// ── Step 3: Create auth users + profiles ─────────────────────────────────────
const ROSTER = [
  { appUserId: "u-md",     email: "stggroups2008smm@gmail.com",          password: "stgsmm@2026",      role: "super_admin", companyId: null          },
  { appUserId: "u-sanjay", email: "rentals@stggroups.co.in",             password: "StgRentals@2026",  role: "exec",        companyId: "stg-rentals" },
  { appUserId: "u-infra",  email: "infra@stggroups.co.in",               password: "StgInfra@2026",    role: "exec",        companyId: "stg-infra"   },
  { appUserId: "u-naveen", email: "stgtradingcooperation2026@gmail.com", password: "StgTrading@2026",  role: "exec",        companyId: "stg-trading" },
];

async function findExistingUser(email) {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function provisionAuth() {
  console.log("\n── Step 3: Auth users + profiles ───────────────────────────");

  for (const r of ROSTER) {
    let uid;
    const { data, error } = await admin.auth.admin.createUser({
      email: r.email,
      password: r.password,
      email_confirm: true,
      user_metadata: { role: r.role, company_id: r.companyId, app_user_id: r.appUserId },
    });

    if (error) {
      const existing = await findExistingUser(r.email);
      if (!existing) throw new Error(`${r.email}: ${error.message}`);
      uid = existing.id;
      await admin.auth.admin.updateUserById(uid, { password: r.password, email_confirm: true });
      console.log(`   • ${r.email} already existed — password synced`);
    } else {
      uid = data.user.id;
      console.log(`   ✓ ${r.email} created`);
    }

    const { error: pErr } = await admin.from("profiles").upsert({
      id: uid,
      app_user_id: r.appUserId,
      role: r.role,
      company_id: r.companyId,
    });
    if (pErr) throw new Error(`profile ${r.email}: ${pErr.message}`);
  }
}

// ── Run everything ────────────────────────────────────────────────────────────
(async () => {
  try {
    await runSchema();
    await seedData();
    await provisionAuth();

    console.log("\n✅  Setup complete!\n");
    console.log("Login credentials:");
    console.log("  Role         Email                                    Password");
    console.log("  ──────────── ──────────────────────────────────────── ────────────────────");
    for (const r of ROSTER) {
      console.log(`  ${r.role.padEnd(12)} ${r.email.padEnd(40)} ${r.password}`);
    }
    console.log("\nApp URL: http://localhost:8081");
  } catch (err) {
    console.error("\n✗  Setup failed:", err.message);
    process.exit(1);
  }
})();
