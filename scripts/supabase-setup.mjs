/**
 * One-shot Supabase setup, driven by a personal access token.
 *
 * Runs the schema through the Management API (DDL cannot go through the REST
 * API), then reports what exists. The token is read from the environment and is
 * never written to disk or committed:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase-setup.mjs
 *
 * The schema is idempotent, so re-running this is safe.
 */
import { readFileSync } from "node:fs";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF ?? "lhtzvyrbajlxkcvnuchw";

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is not set.");
  process.exit(1);
}

const query = async (sql) => {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const step = async (label, sql) => {
  process.stdout.write(`${label} ... `);
  try {
    const result = await query(sql);
    console.log("ok");
    return result;
  } catch (error) {
    console.log("FAILED");
    console.error("  " + error.message);
    throw error;
  }
};

// 1. The schema.
await step("applying schema", readFileSync("docs/supabase/schema.sql", "utf8"));

// 2. What exists now.
const tables = await step(
  "listing tables",
  `select table_name from information_schema.tables
   where table_schema = 'public' order by table_name`,
);
console.log("\ntables:");
for (const t of tables) console.log("  " + (t.table_name ?? JSON.stringify(t)));

// 3. RLS must be on for every one of them. This is the whole security model:
//    the anon key is public, so RLS is the only thing protecting the rows.
const rls = await query(
  `select relname, relrowsecurity from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r'
   order by relname`,
);
console.log("\nrow level security:");
let unprotected = 0;
for (const r of rls) {
  const on = r.relrowsecurity === true || r.relrowsecurity === "t";
  if (!on) unprotected++;
  console.log(`  ${on ? "ON " : "OFF"}  ${r.relname}`);
}
if (unprotected > 0) {
  console.error(`\n>>> ${unprotected} table(s) have RLS OFF. The anon key is public. Fix before deploying.`);
  process.exitCode = 1;
}

// 4. The admin allowlist. Nothing works until someone is in it, by design.
const admins = await query("select email from admins");
console.log(
  admins.length
    ? `\nadmins: ${admins.map((a) => a.email).join(", ")}`
    : "\nadmins: EMPTY. Nobody can read anything yet, which is correct. Next: create the auth user, then add them here.",
);
