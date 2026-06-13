/**
 * Removes the sample/demo transactional data, leaving a clean CRM:
 *   keeps  → companies, product_categories, app_users, profiles (real config)
 *   clears → leads (+ cascades: activities, requirements, quotations, payments,
 *            follow_ups, negotiations, not_interested) and unserved_requests
 *   resets → targets.achieved to 0 (keeps the goals as config)
 *
 *   node scripts/clear-demo.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query("delete from public.leads;"); // cascades to all lead-linked tables
  await client.query("delete from public.unserved_requests;");
  await client.query("update public.targets set achieved = 0;");
  const { rows } = await client.query(`
    select 'companies' t, count(*)::int n from public.companies
    union all select 'product_categories', count(*) from public.product_categories
    union all select 'app_users', count(*) from public.app_users
    union all select 'leads', count(*) from public.leads
    union all select 'quotations', count(*) from public.quotations
    union all select 'unserved_requests', count(*) from public.unserved_requests
    order by t;`);
  console.log("✅ Demo data cleared. Remaining row counts:");
  for (const r of rows) console.log(`   ${r.t.padEnd(20)} ${r.n}`);
} catch (e) {
  console.error("✗ Failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
