import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Employee } from "@/admin/types";
import { loadLayout } from "@/hr/layout";
import { wrap } from "@/hr/pdf";
import { fiscalYearRange, monthLabel, pkr, round2 } from "./calc";
import { netPay, type PayrollItem, type Transaction } from "./types";

/**
 * The annual salary certificate — what an employee attaches to their FBR
 * return. One fiscal year (1 July – 30 June), month by month, on the real
 * letterhead with the company signature and stamp.
 *
 * Amounts come from the payroll register where it has rows for the month;
 * months paid before the register existed fall back to the ledger's Salary
 * expenses mentioning the employee. Same reconciliation rule as everywhere
 * else in the module.
 */

export interface CertificateParams {
  employee: Employee;
  fiscalYear: string; // "2025-26"
  payroll: PayrollItem[];
  transactions: Transaction[];
  taxNote: string;
}

const ink = rgb(0.08, 0.08, 0.1);
const muted = rgb(0.42, 0.42, 0.47);
const line = rgb(0.8, 0.8, 0.84);

/** First meaningful token of a name — "M. Farhan" → "farhan". */
const nameNeedle = (fullName: string): string => {
  const tokens = fullName.toLowerCase().replace(/\./g, "").split(/\s+/).filter((t) => t.length > 2);
  return tokens[0] ?? fullName.toLowerCase();
};

export const monthlySalaries = (
  params: Pick<CertificateParams, "employee" | "fiscalYear" | "payroll" | "transactions">,
): Array<{ month: string; amount: number }> => {
  const { employee, fiscalYear, payroll, transactions } = params;
  const [from, to] = fiscalYearRange(fiscalYear);
  const needle = nameNeedle(employee.fullName);

  const byMonth = new Map<string, number>();

  for (const row of payroll) {
    const month = row.payMonth.slice(0, 7);
    if (row.payMonth < from || row.payMonth > to) continue;
    const isTheirs =
      row.employeeId === employee.id ||
      row.employeeName.toLowerCase().includes(needle);
    if (!isTheirs) continue;
    byMonth.set(month, (byMonth.get(month) ?? 0) + netPay(row));
  }

  for (const t of transactions) {
    if (t.type !== "expense" || t.category !== "Salary") continue;
    if (t.date < from || t.date > to) continue;
    if (!t.description.toLowerCase().includes(needle)) continue;
    // Salaries are paid the month AFTER they are earned; attribute the ledger
    // entry to the previous month so it lines up with the payroll register.
    const paid = new Date(t.date + "T00:00:00");
    paid.setMonth(paid.getMonth() - 1);
    const earnedMonth = paid.toISOString().slice(0, 7);
    if (byMonth.has(earnedMonth)) continue; // register already covers it
    byMonth.set(earnedMonth, (byMonth.get(earnedMonth) ?? 0) + t.amount);
  }

  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount: round2(amount) }));
};

export const renderSalaryCertificate = async (
  params: CertificateParams,
): Promise<Uint8Array> => {
  const { employee, fiscalYear, taxNote } = params;
  const rows = monthlySalaries(params);
  const total = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  const [from, to] = fiscalYearRange(fiscalYear);

  let base: ArrayBuffer | null = null;
  try {
    const response = await fetch("/letterhead.pdf");
    if (response.ok) base = await response.arrayBuffer();
  } catch {
    base = null;
  }

  const pdf = base ? await PDFDocument.load(base) : await PDFDocument.create();
  const page = base ? pdf.getPages()[0] : pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedStandardFont(StandardFonts.Helvetica);
  const bold = await pdf.embedStandardFont(StandardFonts.HelveticaBold);

  const layout = loadLayout();
  const { width, height } = page.getSize();
  const left = layout.marginLeft;
  const right = width - layout.marginRight;
  const contentWidth = right - left;
  let y = height - (base ? Math.min(layout.marginTop, 148) : 90);

  const title = "SALARY CERTIFICATE";
  page.drawText(title, {
    x: left + (contentWidth - bold.widthOfTextAtSize(title, 15)) / 2,
    y, size: 15, font: bold, color: ink,
  });
  y -= 16;
  const period = `Fiscal Year ${fiscalYear}  ·  ${from} to ${to}`;
  page.drawText(period, {
    x: left + (contentWidth - font.widthOfTextAtSize(period, 9.5)) / 2,
    y, size: 9.5, font, color: muted,
  });
  y -= 30;

  const issued = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(issued, {
    x: right - font.widthOfTextAtSize(issued, 10),
    y, size: 10, font, color: muted,
  });
  y -= 26;

  page.drawText("TO WHOM IT MAY CONCERN", { x: left, y, size: 10.5, font: bold, color: ink });
  y -= 22;

  const wasOrIs = employee.status === "active" ? "has been employed" : "was employed";
  const identifiers = [
    employee.cnic && `CNIC: ${employee.cnic}`,
    employee.ntn && `NTN: ${employee.ntn}`,
  ].filter(Boolean);
  const cnic = identifiers.length ? ` (${identifiers.join(", ")})` : "";
  const body =
    `This is to certify that ${employee.fullName}${cnic} ${wasOrIs} with Synaptic Lab ` +
    `as ${employee.role || "an employee"}. The salary paid to ${employee.fullName} during ` +
    `Fiscal Year ${fiscalYear} is summarised below. All amounts are in Pakistani Rupees.`;
  for (const bodyLine of wrap(body, font, 10.5, contentWidth)) {
    page.drawText(bodyLine, { x: left, y, size: 10.5, font, color: ink });
    y -= 15.5;
  }
  y -= 10;

  /* Month table, two columns of months when the year is full. */
  const rule = () => {
    page.drawLine({ start: { x: left, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.75, color: line });
  };
  page.drawText("MONTH", { x: left, y, size: 9, font: bold, color: muted });
  page.drawText("NET SALARY PAID", {
    x: right - bold.widthOfTextAtSize("NET SALARY PAID", 9),
    y, size: 9, font: bold, color: muted,
  });
  y -= 4;
  rule();
  y -= 14;

  for (const row of rows) {
    page.drawText(monthLabel(row.month), { x: left, y, size: 10, font, color: ink });
    const value = pkr(row.amount);
    page.drawText(value, { x: right - font.widthOfTextAtSize(value, 10), y, size: 10, font, color: ink });
    y -= 14.5;
  }
  y -= 2;
  rule();
  y -= 16;
  page.drawText("TOTAL", { x: left, y, size: 10.5, font: bold, color: ink });
  const totalValue = `PKR ${pkr(total)}`;
  page.drawText(totalValue, {
    x: right - bold.widthOfTextAtSize(totalValue, 10.5),
    y, size: 10.5, font: bold, color: ink,
  });
  y -= 24;

  for (const noteLine of wrap(taxNote, font, 8.5, contentWidth)) {
    page.drawText(noteLine, { x: left, y, size: 8.5, font, color: muted });
    y -= 11;
  }
  y -= 8;
  page.drawText(
    "Issued at the request of the employee for tax and record purposes.",
    { x: left, y, size: 8.5, font, color: muted },
  );

  return pdf.save();
};
