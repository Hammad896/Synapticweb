/**
 * Applies docs/supabase/schema.sql to the project database.
 *
 * DDL cannot go through the REST API, so this connects directly with the
 * Postgres client. The password comes from the environment and is never written
 * to disk or committed:
 *
 *   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
 *     node scripts/apply-schema.mjs
 *
 * The schema is idempotent, so re-running it is safe.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const sql = readFileSync("docs/supabase/schema.sql", "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("connected");

  await client.query(sql);
  console.log("schema applied");

  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`,
  );
  console.log("\ntables now present:");
  for (const r of rows) console.log("  " + r.table_name);

  const { rows: admins } = await client.query("select email from admins");
  console.log(
    admins.length
      ? `\nadmins: ${admins.map((a) => a.email).join(", ")}`
      : "\nadmins: NONE YET. Create the auth user, then add them to the admins table.",
  );
} catch (error) {
  console.error("failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
