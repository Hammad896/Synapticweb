import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Employee } from "@/admin/types";
import { pkr, monthLabel } from "./calc";
import { netPay, type PayrollItem } from "./types";

/**
 * The salary slip, in the exact layout and wording the company has always
 * issued (03-EMPLOYEES-AND-PAYROLL.md). One page, A4, system-generated note
 * and the FBR tax disclaimer verbatim — that text is policy, not decoration.
 */

const COMPANY = {
  name: "SYNAPTIC LAB",
  tagline: "A Multi-Service Creative Agency",
  address: "Office #14, Executive Plaza, i8 Markaz, Islamabad",
  email: "qhammad286@gmail.com",
  phone: "+92-313-9676896",
  signatory: "Hammad — CEO, Synaptic Lab",
};

const TAX_NOTE =
  "Note: Synaptic Lab does not withhold or deduct any income tax from salaries. " +
  "Each employee is responsible for calculating, declaring and paying their own " +
  "income tax to the FBR as per applicable regulations.";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

const ink = rgb(0.13, 0.13, 0.15);
const muted = rgb(0.45, 0.45, 0.5);
const line = rgb(0.85, 0.85, 0.88);

export const renderSalarySlip = async (
  item: PayrollItem,
  employee: Employee | null,
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const width = A4[0] - MARGIN * 2;
  let y = A4[1] - MARGIN;

  const text = (
    value: string,
    options: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center" } = {},
  ) => {
    const size = options.size ?? 10;
    const f = options.font ?? font;
    let x = options.x ?? MARGIN;
    if (options.align === "center") x = (A4[0] - f.widthOfTextAtSize(value, size)) / 2;
    if (options.align === "right") x = A4[0] - MARGIN - f.widthOfTextAtSize(value, size);
    page.drawText(value, { x, y, size, font: f, color: options.color ?? ink });
  };

  const rule = (offset = 0) =>
    page.drawLine({
      start: { x: MARGIN, y: y + offset },
      end: { x: MARGIN + width, y: y + offset },
      thickness: 0.75,
      color: line,
    });

  /* ── Header ────────────────────────────────────────────────────────────── */
  text(COMPANY.name, { size: 20, font: bold, align: "center" });
  y -= 16;
  text(COMPANY.tagline, { size: 10, color: muted, align: "center" });
  y -= 13;
  text(COMPANY.address, { size: 9, color: muted, align: "center" });
  y -= 28;

  text("SALARY SLIP", { size: 14, font: bold, align: "center" });
  y -= 24;
  rule(10);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const [py, pm] = item.payMonth.split("-").map(Number);
  const fullPeriod = monthNames[pm - 1]
    ? `${monthNames[pm - 1]} ${py}`
    : monthLabel(item.payMonth.slice(0, 7));

  const issueDate = new Date().toISOString().slice(0, 10);
  text(`Document No: ${item.slipNo}`, { size: 10 });
  text(`Pay Period: ${fullPeriod}`, { size: 10, align: "right" });
  y -= 15;
  text(`Issue Date: ${issueDate}`, { size: 10 });
  text(`Pay Date: ${item.payDate || "—"}`, { size: 10, align: "right" });
  y -= 26;

  /* ── Employee details ──────────────────────────────────────────────────── */
  text("EMPLOYEE DETAILS", { size: 10, font: bold });
  y -= 6;
  rule();
  y -= 16;

  const details: Array<[string, string]> = [
    ["Employee Name", item.employeeName],
    ["Designation", item.designation || employee?.role || "—"],
    ["Employee Status", employee ? (employee.status === "active" ? "Active" : "Former") : "—"],
    ["CNIC", item.cnic || employee?.cnic || "—"],
    ["Payment Mode", item.paymentMode || "Bank Transfer"],
  ];
  for (const [label, value] of details) {
    text(label, { size: 9.5, color: muted });
    text(value, { x: MARGIN + 150, size: 9.5 });
    y -= 15;
  }
  y -= 12;

  /* ── Earnings / deductions ─────────────────────────────────────────────── */
  const midX = MARGIN + width / 2 + 12;
  const rightCol = (label: string, value: string, f: PDFFont = font) => {
    page.drawText(label, { x: midX, y, size: 9.5, font: f, color: f === bold ? ink : muted });
    page.drawText(value, {
      x: A4[0] - MARGIN - f.widthOfTextAtSize(value, 9.5),
      y, size: 9.5, font: f, color: ink,
    });
  };
  const leftCol = (label: string, value: string, f: PDFFont = font) => {
    page.drawText(label, { x: MARGIN, y, size: 9.5, font: f, color: f === bold ? ink : muted });
    page.drawText(value, {
      x: midX - 24 - f.widthOfTextAtSize(value, 9.5),
      y, size: 9.5, font: f, color: ink,
    });
  };

  text("EARNINGS", { size: 10, font: bold });
  page.drawText("DEDUCTIONS", { x: midX, y, size: 10, font: bold, color: ink });
  y -= 6;
  rule();
  y -= 16;

  leftCol("Basic Salary", pkr(item.basic));
  rightCol("Advance / Deduction", pkr(item.deduction));
  y -= 15;
  leftCol("Bonus / Allowance", pkr(item.bonus));
  y -= 18;
  leftCol("Total Earnings", pkr(item.basic + item.bonus), bold);
  rightCol("Total Deductions", pkr(item.deduction), bold);
  y -= 30;

  /* ── Net payable ───────────────────────────────────────────────────────── */
  page.drawRectangle({
    x: MARGIN, y: y - 10, width, height: 30,
    color: rgb(0.95, 0.95, 0.97),
  });
  y -= 1;
  text(`NET PAYABLE: PKR ${pkr(netPay(item))}`, { size: 12, font: bold, align: "center" });
  y -= 44;

  /* ── Tax note (verbatim, wrapped) ──────────────────────────────────────── */
  const words = TAX_NOTE.split(" ");
  let lineText = "";
  for (const word of words) {
    const candidate = lineText ? `${lineText} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, 8.5) > width) {
      text(lineText, { size: 8.5, color: muted });
      y -= 12;
      lineText = word;
    } else {
      lineText = candidate;
    }
  }
  if (lineText) {
    text(lineText, { size: 8.5, color: muted });
    y -= 12;
  }
  y -= 46;

  /* ── Signature ─────────────────────────────────────────────────────────── */
  page.drawLine({
    start: { x: MARGIN, y: y + 12 },
    end: { x: MARGIN + 170, y: y + 12 },
    thickness: 0.75,
    color: ink,
  });
  text("Authorized Signatory", { size: 9 });
  y -= 13;
  text(COMPANY.signatory, { size: 9, color: muted });

  /* ── Footer ────────────────────────────────────────────────────────────── */
  y = MARGIN + 8;
  text(`${COMPANY.email} | ${COMPANY.phone} | ${COMPANY.address}`, {
    size: 8, color: muted, align: "center",
  });
  y -= 11;
  text("This is a system-generated salary slip.", { size: 8, color: muted, align: "center" });

  return pdf.save();
};

/** Same download behaviour as the letters module. */
export const downloadSlip = (bytes: Uint8Array, slipNo: string) => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slipNo}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
