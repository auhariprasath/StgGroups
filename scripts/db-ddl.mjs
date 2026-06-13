/**
 * Runs the full schema (setup-all.sql) directly against Postgres.
 *
 *   node scripts/db-ddl.mjs
 *
 * Needs SUPABASE_DB_URL in .env — the connection string from
 * Supabase → Project Settings → Database → Connection string (URI),
 * with your database password filled in.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const conn = env.SUPABASE_DB_URL;
if (!conn || conn.includes("PASTE_")) {
  console.error("✗ Set SUPABASE_DB_URL in .env (Supabase → Settings → Database → Connection string).");
  process.exit(1);
}

const sql = readFileSync(new URL("../supabase/setup-all.sql", import.meta.url), "utf8");

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

try {
  console.log("→ Connecting to Postgres…");
  await client.connect();
  console.log("→ Running setup-all.sql (schema + roles + RLS)…");
  await client.query(sql);
  const { rows } = await client.query(
    "select count(*)::int as n from information_schema.tables where table_schema='public'",
  );
  console.log(`✅ Done. public schema now has ${rows[0].n} tables.`);
} catch (e) {
  console.error("✗ Failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
