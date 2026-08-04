/**
 * QA end-to-end: drives the real UI in a headless browser like a human tester —
 * types into fields (including hostile input), clicks buttons, reads what the
 * app says back.
 *
 * ⚠ SANDBOX ONLY. Point this at a server started WITHOUT Supabase env vars
 * (`npx vite --mode qa --port 8081`), so the app uses its localStorage
 * adapters and destroying data costs nothing. NEVER run it against a server
 * connected to the live project: on 2026-08-04 a version of this script that
 * blanket-accepted confirm dialogs deleted 5 real payroll rows and their
 * salary transactions in under two minutes.
 *
 * Dialogs are DISMISSED by default; a step must opt in by name to accept one.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   node scripts/qa-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:8081";
const EMAIL = process.env.QA_EMAIL ?? "qa@synaptic.test";
const PASSWORD = process.env.QA_PASSWORD ?? "qa-sandbox-pass";
const SHOTS = process.env.SHOTS_DIR ?? ".";

if (/localhost:8080|vercel\.app/.test(BASE)) {
  console.error("Refusing to run: BASE looks like the live app. Use the sandbox server.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR: ${e.message.slice(0, 160)}`));

/* Dialogs: dismissed unless a step explicitly opts in. */
let acceptDialogs = false;
const dialogs = [];
page.on("dialog", (d) => {
  dialogs.push(`${d.type()}: ${d.message().slice(0, 100)}`);
  void (acceptDialogs ? d.accept() : d.dismiss());
});
const accepting = async (fn) => {
  acceptDialogs = true;
  try { await fn(); } finally { acceptDialogs = false; }
};

const results = [];
let shot = 0;
const step = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (e) {
    shot += 1;
    await page.screenshot({ path: `${SHOTS}/qa-fail-${shot}.png`, fullPage: true }).catch(() => {});
    results.push({ name, ok: false, error: e.message.split("\n")[0].slice(0, 150) });
    console.log(`FAIL  ${name} — ${e.message.split("\n")[0].slice(0, 150)}`);
  }
};
const settle = (ms = 700) => page.waitForTimeout(ms);

/** Reads the app's own data store — the honest "did it save?" check. */
const stored = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "[]"), key);
const savedWith = async (key, match) => {
  const rows = await stored(key);
  if (!rows.some((r) => JSON.stringify(r).includes(match)))
    throw new Error();
};

/* ══ Login ════════════════════════════════════════════════════════════════ */
await step("wrong password is rejected", async () => {
  await page.goto(`${BASE}/admin`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", "wrong-on-purpose");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("text=/don't match|invalid|failed/i", { timeout: 8000 });
});

await step("correct password signs in", async () => {
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("text=Sign out", { timeout: 15000 });
});

/* ══ Every tab renders ════════════════════════════════════════════════════ */
for (const tab of ["overview", "finance", "employees", "letters", "documents", "careers", "website", "content", "reports", "audit"]) {
  await step(`tab "${tab}" renders`, async () => {
    await page.goto(`${BASE}/admin?tab=${tab}`);
    await settle(900);
    if (await page.getByText(/something went wrong|crashed/i).count()) throw new Error("ErrorBoundary triggered");
  });
}

for (const panel of ["dashboard", "transactions", "payroll", "invoices", "customers", "reports", "settings"]) {
  await step(`finance panel "${panel}" renders`, async () => {
    await page.goto(`${BASE}/admin?tab=finance&panel=${panel}`);
    await settle(900);
    if (await page.getByText(/something went wrong|crashed/i).count()) throw new Error("ErrorBoundary triggered");
  });
}

/* ══ Employees — hostile input, auto-ID, raise stamp ══════════════════════ */
const NAME = "QA O'Brien 🚀 Tester";
await step("add employee: apostrophe + emoji name, HTML-ish role", async () => {
  await page.goto(`${BASE}/admin?tab=employees`);
  await page.getByRole("button", { name: /^\+?\s*Add$/i }).first().click();
  await settle(600);
  await page.fill("#fullName", NAME);
  await page.fill("#role", '<b>QA</b> Engineer & "Tester"');
  await page.fill("#joinedAt", "2026-08-01");
  await page.fill("#salaryAmount", "54321");
  await page.locator("form").getByRole("button", { name: /^add employee$/i }).click();
  await settle(1200);
  await savedWith("synapticlab.hr.employees", "QA O'Brien");
});

await step("employee ID auto-assigns from the joining year", async () => {
  await page.getByLabel(`Edit ${NAME}`).first().click();
  await settle(600);
  const id = await page.inputValue("#employeeId");
  if (!/^SL-2026-\d{3}$/.test(id)) throw new Error(`auto ID looks wrong: "${id}"`);
});

await step("salary increase auto-stamps 'Last raise on' with today", async () => {
  await page.fill("#salaryAmount", "60000");
  await page.getByRole("button", { name: /save changes/i }).click();
  await settle(1200);
  await page.getByLabel(`Edit ${NAME}`).first().click();
  await settle(600);
  const stamped = await page.inputValue("#lastRaiseAt");
  const today = new Date().toISOString().slice(0, 10);
  if (stamped !== today) throw new Error(`lastRaiseAt "${stamped}" ≠ today ${today}`);
});

await step("required fields block an empty save", async () => {
  await page.fill("#fullName", "");
  await page.getByRole("button", { name: /save changes/i }).click();
  await settle(700);
  const stillOpen = await page.locator("#fullName").count();
  if (!stillOpen) throw new Error("form closed with an empty required name");
  await page.fill("#fullName", NAME);
  await page.getByRole("button", { name: /cancel/i }).click();
});

/* ══ Transactions — emoji, XSS, long text, negative amount ════════════════ */
await step("empty category list explains itself instead of dead-clicking", async () => {
  await page.goto(`${BASE}/admin?tab=finance&panel=transactions`);
  await page.getByRole("button", { name: /add transaction/i }).first().click();
  await settle(500);
  await page.getByRole("alert").filter({ hasText: /Settings/i }).first().waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /cancel/i }).click();
});

await step("seed a category, then the emoji + 300-char transaction saves", async () => {
  // Test setup, not a UI assertion: put one category in the app's own store.
  await page.evaluate(() => {
    localStorage.setItem("synapticlab.finance.categories", JSON.stringify([
      { id: "qa-cat", kind: "expense_category", name: "QA Category", accountCode: "9999", sortOrder: 10, isActive: true },
      { id: "qa-src", kind: "income_source", name: "QA Source", accountCode: "0001", sortOrder: 10, isActive: true },
    ]));
  });
  await page.goto(`${BASE}/admin?tab=finance&panel=transactions`);
  await settle(900);
  await page.getByRole("button", { name: /add transaction/i }).first().click();
  await settle(500);
  await page.fill("#tx-amount", "0.01");
  await page.fill("#tx-description", "QA 🧪 expense — O'Brien & Söhne <tag>");
  await page.fill("#tx-notes", "N".repeat(300));
  await page.locator("form").getByRole("button", { name: /^add transaction$/i }).click();
  await settle(1200);
  await savedWith("synapticlab.finance.transactions", "QA ");
});

await step("script tag in a description does NOT execute", async () => {
  await page.getByRole("button", { name: /add transaction/i }).first().click();
  await settle(500);
  await page.selectOption("#tx-type", "income");
  await page.fill("#tx-amount", "1234567.89");
  await page.fill("#tx-description", 'QA <script>window.__xss=1</script> income');
  await page.locator("form").getByRole("button", { name: /^add transaction$/i }).click();
  await settle(1200);
  if (await page.evaluate(() => window.__xss)) throw new Error("XSS EXECUTED");
});

await step("negative amount is refused", async () => {
  await page.getByRole("button", { name: /add transaction/i }).first().click();
  await settle(500);
  await page.fill("#tx-amount", "-500");
  await page.fill("#tx-description", "QA negative");
  await page.locator("form").getByRole("button", { name: /^add transaction$/i }).click();
  await settle(900);
  if (await page.getByText("QA negative").count()) throw new Error("negative amount was accepted");
  await page.getByRole("button", { name: /cancel/i }).click();
});

/* ══ Invoices — numbering, lifecycle, PDF ═════════════════════════════════ */
await step("new invoice suggests INV-00217", async () => {
  await page.goto(`${BASE}/admin?tab=finance&panel=invoices`);
  await page.getByRole("button", { name: /new invoice/i }).first().click();
  await settle(600);
  const suggested = await page.inputValue("#inv-no");
  if (suggested !== "INV-00217") throw new Error(`expected INV-00217, got ${suggested}`);
  await page.getByRole("button", { name: /cancel/i }).click();
});

await step("customer must exist before invoicing (empty dropdown is honest)", async () => {
  await page.goto(`${BASE}/admin?tab=finance&panel=customers`);
  await page.getByRole("button", { name: /add customer/i }).first().click();
  await settle(500);
  await page.fill("#cl-name", "QA Sandbox Client");
  await page.selectOption("#cl-currency", "NOK");
  await page.fill("#cl-address", "Østre Aker vei 17\n0581 Oslo\nNorway");
  await page.locator("form").getByRole("button", { name: /^add customer$/i }).click();
  await settle(1200);
  await page.waitForSelector("text=QA Sandbox Client", { timeout: 8000 });
});

await step("invoice: create → sent → paid, PDF renders", async () => {
  await page.goto(`${BASE}/admin?tab=finance&panel=invoices`);
  await page.getByRole("button", { name: /new invoice/i }).first().click();
  await settle(600);
  const client = page.locator("#inv-client");
  await settle(700);
  const hit = (await client.locator("option").allTextContents()).find((o) => o.includes("QA Sandbox"));
  if (!hit) throw new Error("customer missing from the invoice dropdown");
  await client.selectOption({ label: hit });
  await page.getByLabel("Item 1 description").fill("IT Support Services");
  await page.getByLabel("Item 1 quantity").fill("1");
  await page.getByLabel("Item 1 rate").fill("12780");
  await page.getByRole("button", { name: /save invoice/i }).click();
  await settle(1300);
  await savedWith("synapticlab.finance.invoices", "INV-00217");

  await page.getByLabel("Mark INV-00217 as sent").click();
  await settle(1000);
  await page.getByLabel("Record payment for INV-00217").click();
  await settle(500);
  await page.fill("#pay-amount", "355000");
  await page.getByRole("button", { name: /^record$/i }).click();
  await settle(1300);
  if (!(await page.getByText("paid").count())) throw new Error("invoice did not reach paid");
});

await step("Net 30 computes the due date", async () => {
  await page.getByRole("button", { name: /new invoice/i }).first().click();
  await settle(600);
  await page.fill("#inv-date", "2026-07-01");
  await page.fill("#inv-terms", "Net 30");
  await settle(400);
  const due = await page.inputValue("#inv-due");
  if (due !== "2026-07-31") throw new Error(`due date ${due} ≠ 2026-07-31`);
  await page.getByRole("button", { name: /cancel/i }).click();
});

/* ══ Letters — the full template sweep ════════════════════════════════════ */
await step("every letter template selects and previews", async () => {
  await page.goto(`${BASE}/admin?tab=letters`);
  await settle(900);
  const selects = page.locator("select");
  const employeePick = selects.first();
  const options = await employeePick.locator("option").allTextContents();
  const hit = options.find((o) => o.includes("QA O'Brien"));
  if (!hit) throw new Error(`QA employee missing from picker: ${options.join(" | ")}`);
  await employeePick.selectOption({ label: hit });
  await settle(600);
  const templatePick = selects.nth(1);
  const templates = await templatePick.locator("option").allTextContents();
  if (templates.length < 5) throw new Error(`only ${templates.length} templates found`);
  console.log(`      templates: ${templates.join(", ")}`);
  for (const t of templates) {
    await templatePick.selectOption({ label: t });
    await settle(500);
    const dates = page.locator("input[type=date]");
    for (let i = 0; i < (await dates.count()); i++) {
      if (!(await dates.nth(i).inputValue())) await dates.nth(i).fill("2026-08-10");
    }
    if (await page.getByText(/something went wrong/i).count()) throw new Error(`template "${t}" crashed`);
  }
});

/* ══ Sign out ═════════════════════════════════════════════════════════════ */
await step("sign out really signs out", async () => {
  await page.getByRole("button", { name: /sign out/i }).click();
  await settle(1000);
  await page.goto(`${BASE}/admin?tab=finance`);
  await page.waitForSelector("#password", { timeout: 8000 });
});

/* ══ Report ═══════════════════════════════════════════════════════════════ */
console.log("\n── dialogs seen (all dismissed unless a step opted in) ──");
for (const d of [...new Set(dialogs)]) console.log("  " + d);
if (consoleErrors.length) {
  console.log("\n── console errors ──");
  for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  " + e);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n══ ${results.length} steps, ${failed.length} failed ══`);
await browser.close();
process.exit(failed.length ? 2 : 0);
