/**
 * Full backup of the live database, for the scheduled GitHub Actions job.
 * Signs in as the panel admin (RLS applies; no master key anywhere) and dumps
 * every table to backup/*.json. The run itself also counts as project
 * activity, which keeps the free-tier Supabase project from pausing.
 *
 *   SB_EMAIL=... SB_PASS=... node scripts/backup-live.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://lhtzvyrbajlxkcvnuchw.supabase.co",
  "sb_publishable_V1IN3-d-DJCCv6uP5puzLg_YBi4LfcA",
);

const { error: auth } = await db.auth.signInWithPassword({
  email: process.env.SB_EMAIL,
  password: process.env.SB_PASS,
});
if (auth) {
  console.error("sign-in failed:", auth.message);
  process.exit(1);
}

const TABLES = [
  "transactions",
  "payroll_items",
  "finance_categories",
  "finance_settings",
  "finance_recurring",
  "employees",
  "documents",
  "announcements",
  "jobs",
  "applications",
  "partners",
  "capabilities",
  "site_content",
  "audit_log",
];

mkdirSync("backup", { recursive: true });
let failures = 0;

for (const table of TABLES) {
  const { data, error } = await db.from(table).select("*").limit(10000);
  if (error) {
    // A table that doesn't exist yet is a warning, not a failed backup.
    console.error(`WARN ${table}: ${error.message}`);
    failures += error.message.includes("schema cache") ? 0 : 1;
    continue;
  }
  writeFileSync(`backup/${table}.json`, JSON.stringify(data, null, 1));
  console.log(`${table}: ${data.length} rows`);
}

writeFileSync(
  "backup/MANIFEST.json",
  JSON.stringify({ takenAt: new Date().toISOString(), tables: TABLES }, null, 1),
);

if (failures > 0) {
  console.error(`${failures} table(s) failed to back up.`);
  process.exit(1);
}
console.log("backup complete");
process.exit(0);
