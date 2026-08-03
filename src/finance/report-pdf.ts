import type { PDFFont, PDFPage } from "pdf-lib";
import { ink, line, muted, openLetterhead } from "@/hr/letterhead";
import {
  accountCodeOf,
  balanceSheetAsOf,
  breakdown,
  monthLabel,
  monthlyClosings,
  openingBalance,
  pkr,
  round2,
  totalsOf,
} from "./calc";
import type { FinanceCategory, Transaction } from "./types";

/**
 * The branded financial report — the document the owner hands to an
 * accountant or files alongside an FBR return. Page one renders on the real
 * letterhead (signature + stamp included: this is an official company
 * statement); overflow continues on clean pages.
 */

export interface ReportParams {
  /** Already filtered to the period AND scope being reported. */
  transactions: Transaction[];
  /** The FULL ledger — needed for the opening balance at period start. */
  allTransactions: Transaction[];
  categories: FinanceCategory[];
  periodLabel: string;
  scopeLabel: string; // "Everything" | "Income only" | "Category: Salary" …
  from: string;
  to: string;
}

export const renderFinancialReport = async (params: ReportParams): Promise<Uint8Array> => {
  const { transactions, allTransactions, categories, periodLabel, scopeLabel, from } = params;

  const doc = await openLetterhead(80);
  const { pdf, font, bold, layout, width, height, left, right, hasArtwork } = doc;
  let page: PDFPage = doc.page;
  const bottom = hasArtwork ? layout.marginBottom : 70;
  let y = doc.top;

  const ensureRoom = (needed: number) => {
    if (y - needed >= bottom) return;
    page = pdf.addPage([width, height]);
    y = height - 80;
    page.drawText("(continued)", { x: left, y, size: 8, font, color: muted });
    y -= 22;
  };

  const heading = (label: string) => {
    ensureRoom(34);
    page.drawText(label, { x: left, y, size: 10, font: bold, color: ink });
    y -= 5;
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.75, color: line });
    y -= 15;
  };

  const row = (label: string, value: string, emphasize = false) => {
    ensureRoom(14);
    const f = emphasize ? bold : font;
    page.drawText(label, { x: left, y, size: 9.5, font: f, color: emphasize ? ink : muted });
    page.drawText(value, {
      x: right - f.widthOfTextAtSize(value, 9.5),
      y, size: 9.5, font: f, color: ink,
    });
    y -= 14;
  };

  const tableRow = (cells: Array<[string, number, "left" | "right"]>, f: PDFFont, color = ink) => {
    ensureRoom(13.5);
    for (const [value, x, align] of cells) {
      page.drawText(value, {
        x: align === "left" ? x : x - f.widthOfTextAtSize(value, 9),
        y, size: 9, font: f, color,
      });
    }
    y -= 13.5;
  };

  /* ── Title ─────────────────────────────────────────────────────────────── */
  const title = "FINANCIAL REPORT";
  page.drawText(title, {
    x: left + (right - left - bold.widthOfTextAtSize(title, 15)) / 2,
    y, size: 15, font: bold, color: ink,
  });
  y -= 18;
  const sub = `${periodLabel} · ${scopeLabel}`;
  page.drawText(sub, {
    x: left + (right - left - font.widthOfTextAtSize(sub, 9.5)) / 2,
    y, size: 9.5, font, color: muted,
  });
  y -= 10;
  const generated = `Generated ${new Date().toISOString().slice(0, 10)} by Synaptic Lab Finance`;
  page.drawText(generated, {
    x: left + (right - left - font.widthOfTextAtSize(generated, 7.5)) / 2,
    y, size: 7.5, font, color: muted,
  });
  y -= 24;

  /* ── Summary ───────────────────────────────────────────────────────────── */
  const totals = totalsOf(transactions);
  const opening = openingBalance(allTransactions, from);
  heading("SUMMARY");
  row("Opening balance (period start)", `PKR ${pkr(opening)}`);
  row("Income", `PKR ${pkr(totals.income)}`);
  row("Expenses", `PKR ${pkr(totals.expenses)}`);
  row("Net for the period", `PKR ${pkr(totals.net)}`, true);
  row("Closing balance", `PKR ${pkr(round2(opening + totals.net))}`, true);
  row("Transactions", String(totals.count));
  y -= 10;

  /* ── Breakdowns, with account codes ────────────────────────────────────── */
  const codeX = left;
  const nameX = left + 52;
  const amountX = right;

  const income = breakdown(transactions, "income");
  if (income.length) {
    heading("INCOME BY SOURCE");
    for (const item of income) {
      tableRow(
        [
          [accountCodeOf(categories, "income", item.category) || "—", codeX, "left"],
          [item.category, nameX, "left"],
          [pkr(item.amount), amountX, "right"],
        ],
        font,
      );
    }
    tableRow([["Total income", nameX, "left"], [pkr(totals.income), amountX, "right"]], bold);
    y -= 10;
  }

  const expenses = breakdown(transactions, "expense");
  if (expenses.length) {
    heading("EXPENSES BY CATEGORY");
    for (const item of expenses) {
      tableRow(
        [
          [accountCodeOf(categories, "expense", item.category) || "—", codeX, "left"],
          [item.category, nameX, "left"],
          [pkr(item.amount), amountX, "right"],
        ],
        font,
      );
    }
    tableRow([["Total expenses", nameX, "left"], [pkr(totals.expenses), amountX, "right"]], bold);
    y -= 10;
  }

  /* ── Month by month within the period ──────────────────────────────────── */
  const months = monthlyClosings(transactions);
  if (months.length > 1) {
    heading("MONTH BY MONTH");
    const cols = { month: left, income: left + 200, expenses: left + 300, net: left + 390, closing: right };
    tableRow(
      [
        ["Month", cols.month, "left"],
        ["Income", cols.income, "right"],
        ["Expenses", cols.expenses, "right"],
        ["Net", cols.net, "right"],
        ["Closing", cols.closing, "right"],
      ],
      bold, muted,
    );
    let running = opening;
    for (const m of months) {
      running = round2(running + m.net);
      tableRow(
        [
          [monthLabel(m.period), cols.month, "left"],
          [pkr(m.income), cols.income, "right"],
          [pkr(m.expenses), cols.expenses, "right"],
          [pkr(m.net), cols.net, "right"],
          [pkr(running), cols.closing, "right"],
        ],
        font,
      );
    }
  }

  y -= 8;
  ensureRoom(12);
  page.drawText("This is a system-generated report derived from the company ledger.", {
    x: left, y, size: 7.5, font, color: muted,
  });

  return pdf.save();
};

/**
 * The cash-basis balance sheet as of a date, on the letterhead. This is a
 * cash book, so it states exactly what a cash book can prove: cash on hand,
 * loans given out of it, and how the pair was funded — and it balances by
 * construction.
 */
export const renderBalanceSheet = async (
  transactions: Transaction[],
  asOf: string,
): Promise<Uint8Array> => {
  const sheet = balanceSheetAsOf(transactions, asOf);

  const { pdf, page, font, bold, left, right, top } = await openLetterhead(90);
  let y = top;

  const center = (value: string, f: PDFFont, size: number) =>
    left + (right - left - f.widthOfTextAtSize(value, size)) / 2;
  const row = (label: string, value: string, emphasize = false, indent = 0) => {
    const f = emphasize ? bold : font;
    page.drawText(label, { x: left + indent, y, size: 10, font: f, color: emphasize ? ink : muted });
    page.drawText(value, { x: right - f.widthOfTextAtSize(value, 10), y, size: 10, font: f, color: ink });
    y -= 16;
  };
  const rule = () => {
    page.drawLine({ start: { x: left, y: y + 6 }, end: { x: right, y: y + 6 }, thickness: 0.75, color: line });
    y -= 6;
  };

  const title = "BALANCE SHEET";
  page.drawText(title, { x: center(title, bold, 15), y, size: 15, font: bold, color: ink });
  y -= 17;
  const sub = `(cash basis)  ·  as of ${sheet.asOf}`;
  page.drawText(sub, { x: center(sub, font, 9.5), y, size: 9.5, font, color: muted });
  y -= 32;

  page.drawText("ASSETS", { x: left, y, size: 10.5, font: bold, color: ink });
  y -= 6;
  rule();
  y -= 12;
  row("Cash & bank", `PKR ${pkr(sheet.cash)}`, false, 12);
  row("Loans receivable (Loan account, cumulative)", `PKR ${pkr(sheet.loansReceivable)}`, false, 12);
  rule();
  y -= 10;
  row("TOTAL ASSETS", `PKR ${pkr(sheet.totalAssets)}`, true);
  y -= 14;

  page.drawText("FUNDED BY", { x: left, y, size: 10.5, font: bold, color: ink });
  y -= 6;
  rule();
  y -= 12;
  row("Total receipts (contributions, revenue, repayments)", `PKR ${pkr(sheet.totalReceipts)}`, false, 12);
  row("Less operating payments (excluding loans given)", `PKR (${pkr(sheet.operatingPayments)})`, false, 12);
  rule();
  y -= 10;
  row("NET FUNDING", `PKR ${pkr(round2(sheet.totalReceipts - sheet.operatingPayments))}`, true);
  y -= 22;

  const notes = [
    "Prepared on a cash basis from the company ledger: assets are stated at the cash actually",
    "held or lent, not at accrual values. Loan repayments received are included in receipts.",
    "This is a system-generated statement.",
  ];
  for (const note of notes) {
    page.drawText(note, { x: left, y, size: 7.5, font, color: muted });
    y -= 10.5;
  }

  return pdf.save();
};
