// Emits a JSON snapshot of the sample data for the provisioning script.
// Run: npx tsx scripts/gen-seed.ts
import { writeFileSync } from "node:fs";
import { buildSeed } from "../src/lib/data/seed.ts";

const out = new URL("../supabase/seed.json", import.meta.url);
writeFileSync(out, JSON.stringify(buildSeed(), null, 2));
console.log("Wrote supabase/seed.json");
