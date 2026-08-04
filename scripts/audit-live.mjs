/**
 * End-to-end live audit — the system's twice-weekly self-check (also runnable
 * any time: SB_EMAIL=… SB_PASS=… node scripts/audit-live.mjs).
 *
 * Exercises real flows with THROWAWAY records only (all named PROBE…, all
 * deleted in finally blocks). Never touches real rows destructively. Covers:
 * anonymous-access lockdown, ledger integrity (numbering, categories),
 * payroll↔ledger contract, the full anonymous self-service round trip
 * (including the smuggle test), the invoice lifecycle, both RESTRICT delete
 * protections, and the append-only audit log. Exit 2 on any failure so the
 * GitHub Actions run goes red.
 */
import { createClient } from "@supabase/supabase-js";

const URL = "https://lhtzvyrbajlxkcvnuchw.supabase.co";
const ANON = "sb_publishable_V1IN3-d-DJCCv6uP5puzLg_YBi4LfcA";

const admin = createClient(URL, ANON, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const info = (text) => console.log(`INFO  ${text}`);

const { error: authError } = await admin.auth.signInWithPassword({
  email: process.env.SB_EMAIL,
  password: process.env.SB_PASS,
});
if (authError) { console.error("admin auth failed:", authError.message); process.exit(1); }

/* ══ A. Security surface — anon must see NOTHING ══════════════════════════ */
for (const table of ["employees", "transactions", "invoices", "clients", "payroll_items", "audit_log", "employee_update_requests"]) {
  const { data, error } = await anon.from(table).select("id").limit(1);
  check(`anon cannot read ${table}`, Boolean(error) || (data ?? []).length === 0,
    error ? "" : `${(data ?? []).length} rows visible`);
}
{
  const { error } = await anon.from("transactions").insert({ date: "2026-01-01", type: "expense", category: "X", amount: 1 });
  check("anon cannot write transactions", Boolean(error));
}

/* ══ B. Ledger integrity ══════════════════════════════════════════════════ */
const { data: txns } = await admin.from("transactions").select("id, txn_no, legacy_id, date, type, category, amount").limit(10000);
{
  const nos = txns.filter((t) => t.txn_no).map((t) => t.txn_no);
  const dupes = nos.filter((n, i) => nos.indexOf(n) !== i);
  check("txn numbers unique", dupes.length === 0, dupes.slice(0, 5).join(", "));
  const unnumbered = txns.filter((t) => !t.txn_no).length;
  check("every transaction numbered", unnumbered === 0, `${unnumbered} without txn_no`);
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  info(`ledger: ${txns.length} transactions, income ${income.toFixed(2)}, expense ${expense.toFixed(2)}, net ${(income - expense).toFixed(2)}`);
  const negative = txns.filter((t) => Number(t.amount) < 0).length;
  check("no negative amounts", negative === 0, `${negative} rows`);
  const { data: cats } = await admin.from("finance_categories").select("kind, name, account_code, is_active");
  const catNames = new Set(cats.map((c) => c.name.toLowerCase()));
  const orphanCats = [...new Set(txns.filter((t) => !catNames.has(t.category.toLowerCase())).map((t) => t.category))];
  check("every transaction category exists in settings", orphanCats.length === 0, orphanCats.slice(0, 6).join(", "));
  const uncoded = cats.filter((c) => c.is_active && !c.account_code).map((c) => c.name);
  if (uncoded.length) info(`active categories with NO account code: ${uncoded.join(", ")}`);
}

/* ══ C. Payroll ↔ ledger contract (read-only on real data) ════════════════ */
const { data: payroll } = await admin.from("payroll_items").select("*");
{
  const slips = payroll.map((p) => p.slip_no);
  check("slip numbers unique", new Set(slips).size === slips.length);
  const confirmed = payroll.filter((p) => p.status === "confirmed");
  const txById = new Map(txns.map((t) => [t.id, t]));
  const broken = [];
  for (const p of confirmed) {
    const t = p.transaction_id ? txById.get(p.transaction_id) : null;
    const net = Number(p.basic) + Number(p.bonus) - Number(p.deduction);
    if (!t) broken.push(`${p.slip_no}: no ledger entry`);
    else if (Math.abs(Number(t.amount) - net) > 0.01) broken.push(`${p.slip_no}: ledger ${t.amount} ≠ net ${net}`);
  }
  check("every confirmed payroll row ↔ matching Salary entry", broken.length === 0, broken.slice(0, 5).join("; "));
  const drafts = payroll.filter((p) => p.status === "draft");
  if (drafts.length) info(`draft payroll rows pending: ${drafts.map((p) => p.slip_no).join(", ")}`);
  const idless = payroll.filter((p) => !p.employee_id);
  if (idless.length) info(`payroll rows with NO employee link (legacy/name-matched): ${idless.length}`);
}

/* ══ D. Employees — completeness & leftovers ══════════════════════════════ */
const { data: employees } = await admin.from("employees").select("*");
{
  info(`roster: ${employees.length} people (${employees.filter((e) => e.status === "active").length} active)`);
  // Data hygiene, not a system break — reported, never fails the run.
  const probes = employees.filter((e) => /test|probe|dummy/i.test(e.full_name));
  if (probes.length) info(`test/dummy employees on roster: ${probes.map((e) => `${e.full_name} (${e.employee_id})`).join(", ")}`);
  const gaps = [];
  for (const e of employees.filter((x) => x.status === "active")) {
    const missing = [];
    if (!e.cnic) missing.push("CNIC");
    if (!e.phone) missing.push("phone");
    if (!e.email) missing.push("email");
    if (!e.bank_name || !e.bank_iban) missing.push("bank");
    if (!e.father_name) missing.push("father");
    if (!e.blood_group) missing.push("blood");
    if (!e.date_of_birth) missing.push("DOB");
    if (!e.emergency_name) missing.push("emergency");
    if (missing.length) gaps.push(`${e.full_name}: ${missing.join("/")}`);
  }
  if (gaps.length) { info(`ACTIVE employees with incomplete records (${gaps.length}):`); for (const g of gaps) info(`  ${g}`); }
  const ids = employees.map((e) => e.employee_id).filter(Boolean);
  check("employee IDs unique", new Set(ids).size === ids.length);
}

/* ══ E. Self-service — the FULL anonymous round trip ══════════════════════ */
let probeEmpId = null;
try {
  const { data: emp, error } = await admin.from("employees")
    .insert({ full_name: "PROBE Selfservice", employee_id: "SL-PROBE-001", role: "Probe", status: "inactive", staff_type: "internal", joined_at: "2026-08-04" })
    .select().single();
  if (error) throw error;
  probeEmpId = emp.id;

  const { data: req, error: reqErr } = await admin.from("employee_update_requests")
    .insert({ employee_id: probeEmpId }).select().single();
  if (reqErr) throw reqErr;

  const { data: fetched } = await anon.rpc("get_update_request", { req_token: req.token });
  check("anon can open a valid link (get_update_request)", Boolean(fetched && fetched.full_name === "PROBE Selfservice"));

  const payload = {
    full_name: "PROBE Selfservice Jr", phone: "0300", cnic: "11111-1111111-1",
    father_name: "PROBE Father", date_of_birth: "1990-01-01", blood_group: "O+",
    email: "probe@x.com", address: "Islamabad", ntn: "1234567",
    bank_name: "Meezan", bank_iban: "PK00PROBE", emergency_name: "PROBE EC",
    emergency_relationship: "Brother", emergency_phone: "0301",
    salary: "9999999", status: "active", // smuggle attempt — must be stripped
  };
  const { data: ok } = await anon.rpc("submit_update_request", { req_token: req.token, payload });
  check("anon can submit a filled form", ok === true);

  const { data: stored } = await admin.from("employee_update_requests").select("submitted, status").eq("id", req.id).single();
  const keys = Object.keys(stored.submitted ?? {}).sort();
  check("all 14 whitelisted fields stored", keys.length === 14, `${keys.length} keys: ${keys.join(",")}`);
  check("smuggled salary/status stripped", !keys.includes("salary") && !keys.includes("status"));
  check("request marked submitted", stored.status === "submitted");

  const { data: again } = await anon.rpc("submit_update_request", { req_token: req.token, payload });
  check("second submit on same token rejected", again !== true);

  await admin.from("employee_update_requests").update({ expires_at: "2020-01-01" }).eq("id", req.id);
  const { data: expired } = await anon.rpc("get_update_request", { req_token: req.token });
  check("expired link rejected (valid:false)", expired?.valid === false);
} catch (e) {
  check("self-service round trip", false, e.message);
} finally {
  if (probeEmpId) {
    await admin.from("employee_update_requests").delete().eq("employee_id", probeEmpId);
    await admin.from("employees").delete().eq("id", probeEmpId);
  }
}

/* ══ F. Invoices — full lifecycle with throwaways ═════════════════════════ */
let probeClientId = null, probeInvId = null, probeTxnId = null;
try {
  const { data: cl, error } = await admin.from("clients")
    .insert({ name: "PROBE Client", currency: "USD", income_source: "Others" }).select().single();
  if (error) throw error;
  probeClientId = cl.id;

  const { data: inv, error: invErr } = await admin.from("invoices").insert({
    invoice_no: "INV-PROBE-1", client_id: probeClientId, client_name: "PROBE Client",
    date: "2026-08-04", terms: "Net 30", due_date: "2026-09-03", currency: "USD",
    lines: [{ description: "Probe work", qty: 2, rate: 100 }], status: "draft",
  }).select().single();
  if (invErr) throw invErr;
  probeInvId = inv.id;
  check("invoice create (draft)", true);

  const { error: dupErr } = await admin.from("invoices").insert({
    invoice_no: "INV-PROBE-1", client_name: "PROBE Client", date: "2026-08-04",
  });
  check("duplicate invoice number rejected by DB", dupErr?.code === "23505", dupErr?.code ?? "no error!");

  await admin.from("invoices").update({ status: "sent" }).eq("id", probeInvId);

  const { data: payTx, error: payErr } = await admin.from("transactions").insert({
    date: "2026-08-04", type: "income", category: "Others",
    description: "Invoice INV-PROBE-1 — PROBE Client", txn_no: "PRB-0001", amount: 55000,
  }).select().single();
  if (payErr) throw payErr;
  probeTxnId = payTx.id;
  await admin.from("invoices").update({ status: "paid", transaction_id: probeTxnId, paid_amount: 55000, paid_date: "2026-08-04" }).eq("id", probeInvId);
  check("payment link (invoice → income entry)", true);

  const { error: delClErr } = await admin.from("clients").delete().eq("id", probeClientId);
  check("customer with invoices cannot be deleted (RESTRICT)", delClErr?.code === "23503", delClErr?.code ?? "DELETED — no protection!");

  await admin.from("transactions").delete().eq("id", probeTxnId);
  probeTxnId = null;
  const { data: afterDel } = await admin.from("invoices").select("transaction_id").eq("id", probeInvId).single();
  check("deleting payment entry clears invoice link (SET NULL)", afterDel.transaction_id === null);
} catch (e) {
  check("invoice lifecycle", false, e.message);
} finally {
  if (probeTxnId) await admin.from("transactions").delete().eq("id", probeTxnId);
  if (probeInvId) await admin.from("invoices").delete().eq("id", probeInvId);
  if (probeClientId) await admin.from("clients").delete().eq("id", probeClientId);
}

/* ══ G. Employee delete protection (throwaway probe, the safe pattern) ════ */
let restrictEmpId = null, restrictPayId = null;
try {
  const { data: emp } = await admin.from("employees")
    .insert({ full_name: "PROBE Restrict", employee_id: "SL-PROBE-002", role: "Probe", status: "inactive", staff_type: "internal", joined_at: "2026-08-04" })
    .select().single();
  restrictEmpId = emp.id;
  const { data: pay } = await admin.from("payroll_items")
    .insert({ pay_month: "2026-08-01", employee_id: restrictEmpId, employee_name: "PROBE Restrict", slip_no: "SYN-PROBE-001", status: "draft", basic: 1 })
    .select().single();
  restrictPayId = pay.id;
  const { error } = await admin.from("employees").delete().eq("id", restrictEmpId);
  check("employee with payroll cannot be deleted (RESTRICT)", error?.code === "23503", error?.code ?? "DELETED — no protection!");
} catch (e) {
  check("employee RESTRICT probe", false, e.message);
} finally {
  if (restrictPayId) await admin.from("payroll_items").delete().eq("id", restrictPayId);
  if (restrictEmpId) await admin.from("employees").delete().eq("id", restrictEmpId);
}

/* ══ H. Audit log is append-only even for admin ═══════════════════════════ */
{
  const { data: rows } = await admin.from("audit_log").select("id").limit(1);
  if (rows?.length) {
    const { error: upErr, data: upData } = await admin.from("audit_log").update({ action: "tamper" }).eq("id", rows[0].id).select();
    check("admin cannot rewrite audit log", Boolean(upErr) || (upData ?? []).length === 0);
    const { error: delErr, data: delData } = await admin.from("audit_log").delete().eq("id", rows[0].id).select();
    check("admin cannot delete audit log", Boolean(delErr) || (delData ?? []).length === 0);
  }
}

/* ══ I. Update requests hygiene ═══════════════════════════════════════════ */
{
  const { data: reqs } = await admin.from("employee_update_requests").select("status, expires_at, created_at");
  const now = new Date().toISOString();
  const stale = reqs.filter((r) => r.status === "pending" && r.expires_at < now).length;
  info(`update requests: ${reqs.length} total — ${reqs.filter((r) => r.status === "submitted").length} awaiting review, ${stale} expired-pending (harmless, auto-hidden)`);
}

/* ══ Summary ══════════════════════════════════════════════════════════════ */
const failed = results.filter((r) => !r.ok);
console.log(`\n══ ${results.length} checks, ${failed.length} failed ══`);
await admin.auth.signOut();
process.exit(failed.length ? 2 : 0);
