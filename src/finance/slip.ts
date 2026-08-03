import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Employee } from "@/admin/types";
import { loadLayout } from "@/hr/layout";
import { wrap } from "@/hr/pdf";
import { pkr } from "./calc";
import { DEFAULT_SLIP_NOTE, netPay, type PayrollItem } from "./types";

/**
 * The salary slip, rendered onto the REAL Letterhead.pdf — the same artwork the
 * letters module uses, carrying the company's actual signature and stamp. The
 * body sits inside the calibrated text box from hr/layout.ts, so it can never
 * print across the signature.
 *
 * The tax note at the bottom comes from Finance → Settings (editable); the
 * default is the standard FBR self-filing text.
 *
 * If /letterhead.pdf cannot be loaded (local dev without the asset), the slip
 * falls back to a clean plain-A4 rendering rather than failing the download.
 */

const COMPANY = {
  name: "SYNAPTIC LAB",
  tagline: "A Multi-Service Creative Agency",
  address: "Office #14, Executive Plaza, i8 Markaz, Islamabad",
  email: "qhammad286@gmail.com",
  phone: "+92-313-9676896",
  signatory: "Hammad — CEO, Synaptic Lab",
};

const ink = rgb(0.08, 0.08, 0.1);
const muted = rgb(0.42, 0.42, 0.47);
const line = rgb(0.8, 0.8, 0.84);

interface Frame {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  left: number;
  right: number;
  y: number;
}

/** Draws the slip body inside the frame; returns the y it finished at. */
const drawSlipBody = (
  frame: Frame,
  item: PayrollItem,
  employee: Employee | null,
  noteText: string,
): number => {
  const { page, font, bold, left, right } = frame;
  const width = right - left;
  const centerX = (value: string, f: PDFFont, size: number) =>
    left + (width - f.widthOfTextAtSize(value, size)) / 2;
  let y = frame.y;

  const rule = (offset = 0, color = line) =>
    page.drawLine({
      start: { x: left, y: y + offset },
      end: { x: right, y: y + offset },
      thickness: 0.75,
      color,
    });

  /* Title */
  page.drawText("SALARY SLIP", { x: centerX("SALARY SLIP", bold, 15), y, size: 15, font: bold, color: ink });
  y -= 24;
  rule(10);

  /* Meta */
  const [py, pm] = item.payMonth.split("-").map(Number);
  const period =
    pm >= 1 && pm <= 12
      ? new Date(py, pm - 1).toLocaleDateString("en", { month: "long", year: "numeric" })
      : item.payMonth.slice(0, 7);
  const issueDate = new Date().toISOString().slice(0, 10);

  const metaLeft = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 9, font, color: muted });
    page.drawText(value, { x: left + 78, y, size: 9, font: bold, color: ink });
  };
  const metaRight = (label: string, value: string) => {
    const valueX = right - font.widthOfTextAtSize(value, 9) - 2;
    page.drawText(value, { x: valueX, y, size: 9, font: bold, color: ink });
    page.drawText(label, {
      x: valueX - font.widthOfTextAtSize(label, 9) - 8,
      y, size: 9, font, color: muted,
    });
  };

  metaLeft("Document No", item.slipNo);
  metaRight("Pay Period", period);
  y -= 14;
  metaLeft("Issue Date", issueDate);
  metaRight("Pay Date", item.payDate || "—");
  y -= 22;

  /* Employee details */
  page.drawText("EMPLOYEE DETAILS", { x: left, y, size: 9.5, font: bold, color: ink });
  y -= 5;
  rule();
  y -= 14;

  const details: Array<[string, string]> = [
    ["Employee Name", item.employeeName],
    ["Designation", item.designation || employee?.role || "—"],
    ["Employee Status", employee ? (employee.status === "active" ? "Active" : "Former") : "—"],
    ["CNIC", item.cnic || employee?.cnic || "—"],
    ["Payment Mode", item.paymentMode || "Bank Transfer"],
  ];
  for (const [label, value] of details) {
    page.drawText(label, { x: left, y, size: 9, font, color: muted });
    page.drawText(value, { x: left + 130, y, size: 9, font, color: ink });
    y -= 13.5;
  }
  y -= 10;

  /* Earnings / deductions, two columns */
  const midX = left + width / 2 + 10;
  page.drawText("EARNINGS", { x: left, y, size: 9.5, font: bold, color: ink });
  page.drawText("DEDUCTIONS", { x: midX, y, size: 9.5, font: bold, color: ink });
  y -= 5;
  rule();
  y -= 14;

  const moneyRow = (
    colStart: number,
    colEnd: number,
    label: string,
    value: string,
    f: PDFFont,
  ) => {
    page.drawText(label, { x: colStart, y, size: 9, font: f, color: f === bold ? ink : muted });
    page.drawText(value, { x: colEnd - f.widthOfTextAtSize(value, 9), y, size: 9, font: f, color: ink });
  };

  moneyRow(left, midX - 22, "Basic Salary", pkr(item.basic), font);
  moneyRow(midX, right, "Advance / Deduction", pkr(item.deduction), font);
  y -= 13.5;
  moneyRow(left, midX - 22, "Bonus / Allowance", pkr(item.bonus), font);
  y -= 16;
  moneyRow(left, midX - 22, "Total Earnings", pkr(item.basic + item.bonus), bold);
  moneyRow(midX, right, "Total Deductions", pkr(item.deduction), bold);
  y -= 24;

  /* Net payable band */
  page.drawRectangle({
    x: left, y: y - 8, width, height: 26,
    color: rgb(0.94, 0.95, 0.97),
  });
  const net = `NET PAYABLE: PKR ${pkr(netPay(item))}`;
  page.drawText(net, { x: centerX(net, bold, 11.5), y, size: 11.5, font: bold, color: ink });
  y -= 30;

  /* The editable note — policy text, printed verbatim */
  for (const noteLine of wrap(noteText || DEFAULT_SLIP_NOTE, font, 8, width)) {
    page.drawText(noteLine, { x: left, y, size: 8, font, color: muted });
    y -= 10.5;
  }
  y -= 4;

  page.drawText("This is a system-generated salary slip.", {
    x: left, y, size: 7.5, font, color: muted,
  });

  return y;
};

/** Plain-A4 fallback when the letterhead asset is unavailable. */
const renderPlain = async (
  item: PayrollItem,
  employee: Employee | null,
  noteText: string,
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 60;
  const right = 595.28 - 60;
  const width = right - left;

  let y = 841.89 - 64;
  const center = (value: string, f: PDFFont, size: number) =>
    left + (width - f.widthOfTextAtSize(value, size)) / 2;

  page.drawText(COMPANY.name, { x: center(COMPANY.name, bold, 20), y, size: 20, font: bold, color: ink });
  y -= 16;
  page.drawText(COMPANY.tagline, { x: center(COMPANY.tagline, font, 10), y, size: 10, font, color: muted });
  y -= 12;
  page.drawText(COMPANY.address, { x: center(COMPANY.address, font, 9), y, size: 9, font, color: muted });
  y -= 34;

  y = drawSlipBody({ page, font, bold, left, right, y }, item, employee, noteText);

  /* Signature block — the plain version has no artwork to lean on */
  y -= 46;
  page.drawLine({ start: { x: left, y: y + 12 }, end: { x: left + 170, y: y + 12 }, thickness: 0.75, color: ink });
  page.drawText("Authorized Signatory", { x: left, y, size: 9, font, color: ink });
  y -= 12;
  page.drawText(COMPANY.signatory, { x: left, y, size: 9, font, color: muted });

  const footer = `${COMPANY.email} | ${COMPANY.phone} | ${COMPANY.address}`;
  page.drawText(footer, { x: center(footer, font, 8), y: 52, size: 8, font, color: muted });

  return pdf.save();
};

export const renderSalarySlip = async (
  item: PayrollItem,
  employee: Employee | null,
  noteText: string = DEFAULT_SLIP_NOTE,
): Promise<Uint8Array> => {
  let letterhead: ArrayBuffer | null = null;
  try {
    const response = await fetch("/letterhead.pdf");
    if (response.ok) letterhead = await response.arrayBuffer();
  } catch {
    letterhead = null;
  }
  if (!letterhead) return renderPlain(item, employee, noteText);

  const pdf = await PDFDocument.load(letterhead);
  const page = pdf.getPages()[0];
  const { width } = page.getSize();
  const font = await pdf.embedStandardFont(StandardFonts.Helvetica);
  const bold = await pdf.embedStandardFont(StandardFonts.HelveticaBold);

  // The same calibrated geometry the letters use: the body stays inside the
  // text box, clear of the logo block above and the signature + stamp below.
  const layout = loadLayout();
  drawSlipBody(
    {
      page,
      font,
      bold,
      left: layout.marginLeft,
      right: width - layout.marginRight,
      y: page.getSize().height - layout.marginTop,
    },
    item,
    employee,
    noteText,
  );

  return pdf.save();
};
