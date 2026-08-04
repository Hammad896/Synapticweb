import { rgb } from "pdf-lib";
import { ink, line, muted, openLetterhead } from "@/hr/letterhead";
import { wrap } from "@/hr/pdf";
import { money2 } from "./calc";
import { invoiceTotal, type Invoice } from "./types";

/**
 * The customer invoice, on the real letterhead — laid out to match the
 * invoices Synaptic Lab has always sent (INV-00216 and before):
 *
 *   [logo]                                   INVOICE
 *   Bill From block                          # INV-00217
 *                                            Balance Due  NOK 12,780.00
 *   Bill To block                            Invoice Date / Terms / Due Date
 *   ── dark item table ──
 *                                            Sub Total / Total / Balance Due
 *   Notes (bank details)
 *
 * Amounts print in the INVOICE currency; the "from" block comes from Finance
 * → Settings so an address change never needs a code change.
 */

const HEADER_BG = rgb(0.22, 0.22, 0.24);
const HEADER_TEXT = rgb(1, 1, 1);
const BAND_BG = rgb(0.94, 0.94, 0.95);

export const renderInvoicePdf = async (
  invoice: Invoice,
  billFrom: string,
): Promise<Uint8Array> => {
  const { pdf, page, font, bold, left, right, top } = await openLetterhead(90);
  const total = invoiceTotal(invoice);
  const money = (amount: number) => `${invoice.currency} ${money2(amount)}`;
  const outstanding = invoice.status === "paid" ? 0 : total;

  /* ── Right column: title, number, balance due ──────────────────────────── */
  let rightY = top;
  const title = "INVOICE";
  page.drawText(title, {
    x: right - bold.widthOfTextAtSize(title, 24),
    y: rightY, size: 24, font: bold, color: ink,
  });
  rightY -= 18;
  const number = `# ${invoice.invoiceNo}`;
  page.drawText(number, {
    x: right - bold.widthOfTextAtSize(number, 11),
    y: rightY, size: 11, font: bold, color: ink,
  });

  rightY -= 30;
  const dueLabel = invoice.status === "paid" ? "Paid in Full" : "Balance Due";
  page.drawText(dueLabel, {
    x: right - bold.widthOfTextAtSize(dueLabel, 9),
    y: rightY, size: 9, font: bold, color: muted,
  });
  rightY -= 16;
  const dueValue = money(outstanding);
  page.drawText(dueValue, {
    x: right - bold.widthOfTextAtSize(dueValue, 13),
    y: rightY, size: 13, font: bold, color: ink,
  });

  /* ── Left column: who this is from ─────────────────────────────────────── */
  let leftY = top;
  const fromLines = billFrom.split("\n").map((l) => l.trim()).filter(Boolean);
  if (fromLines.length) {
    page.drawText(fromLines[0], { x: left, y: leftY, size: 11, font: bold, color: ink });
    leftY -= 14;
    for (const fromLine of fromLines.slice(1)) {
      page.drawText(fromLine, { x: left, y: leftY, size: 9, font, color: muted });
      leftY -= 11.5;
    }
  }

  /* ── Bill To (left) and the date block (right) ─────────────────────────── */
  leftY = Math.min(leftY, rightY) - 26;
  const billToTop = leftY;
  page.drawText("Bill To", { x: left, y: leftY, size: 9, font, color: muted });
  leftY -= 15;
  page.drawText(invoice.clientName, { x: left, y: leftY, size: 10.5, font: bold, color: ink });
  leftY -= 13;
  for (const addressLine of invoice.clientAddress.split("\n").map((l) => l.trim()).filter(Boolean)) {
    page.drawText(addressLine, { x: left, y: leftY, size: 9, font, color: muted });
    leftY -= 11.5;
  }

  rightY = billToTop;
  const details: Array<[string, string]> = [
    ["Invoice Date :", formatDate(invoice.date)],
    ["Terms :", invoice.terms || "—"],
    ["Due Date :", invoice.dueDate ? formatDate(invoice.dueDate) : "—"],
    ...(invoice.status === "paid" && invoice.paidDate
      ? ([["Paid On :", formatDate(invoice.paidDate)]] as Array<[string, string]>)
      : []),
  ];
  for (const [label, value] of details) {
    const valueWidth = font.widthOfTextAtSize(value, 9.5);
    page.drawText(label, {
      x: right - valueWidth - 12 - font.widthOfTextAtSize(label, 9.5),
      y: rightY, size: 9.5, font, color: muted,
    });
    page.drawText(value, { x: right - valueWidth, y: rightY, size: 9.5, font, color: ink });
    rightY -= 16;
  }

  /* ── Item table with the dark header band ──────────────────────────────── */
  let y = Math.min(leftY, rightY) - 24;
  const colQty = right - 175;
  const colRate = right - 95;
  const rowHeight = 22;

  page.drawRectangle({
    x: left, y: y - 6, width: right - left, height: rowHeight, color: HEADER_BG,
  });
  const headerBaseline = y + 1;
  page.drawText("#", { x: left + 10, y: headerBaseline, size: 8.5, font: bold, color: HEADER_TEXT });
  page.drawText("Item & Description", {
    x: left + 32, y: headerBaseline, size: 8.5, font: bold, color: HEADER_TEXT,
  });
  for (const [text, edge] of [["Qty", colQty], ["Rate", colRate], ["Amount", right - 10]] as const) {
    page.drawText(text, {
      x: edge - bold.widthOfTextAtSize(text, 8.5), y: headerBaseline, size: 8.5,
      font: bold, color: HEADER_TEXT,
    });
  }
  y -= rowHeight + 8;

  for (const [index, item] of invoice.lines.entries()) {
    const descriptionLines = wrap(item.description, font, 9.5, colQty - left - 80);
    page.drawText(String(index + 1), { x: left + 10, y, size: 9.5, font, color: muted });
    for (const [i, text] of descriptionLines.entries()) {
      page.drawText(text, { x: left + 32, y: y - i * 12, size: 9.5, font, color: ink });
    }
    const cells: Array<[string, number]> = [
      [item.qty.toFixed(2), colQty],
      [money2(item.rate), colRate],
      [money2(Math.round(item.qty * item.rate * 100) / 100), right - 10],
    ];
    for (const [text, edge] of cells) {
      page.drawText(text, {
        x: edge - font.widthOfTextAtSize(text, 9.5), y, size: 9.5, font, color: ink,
      });
    }
    y -= 12 * descriptionLines.length + 10;
  }

  page.drawLine({
    start: { x: left, y: y + 6 }, end: { x: right, y: y + 6 },
    thickness: 0.75, color: line,
  });
  y -= 14;

  /* ── Totals, right-aligned; the balance sits in a shaded band ──────────── */
  const totalsLeft = right - 230;
  const totalsRight = right - 10;
  const totalRow = (label: string, value: string, emphasize = false) => {
    const face = emphasize ? bold : font;
    const size = emphasize ? 10 : 9.5;
    page.drawText(label, { x: totalsLeft, y, size, font: face, color: emphasize ? ink : muted });
    page.drawText(value, {
      x: totalsRight - face.widthOfTextAtSize(value, size), y, size, font: face, color: ink,
    });
    y -= 20;
  };
  totalRow("Sub Total", money2(total));
  totalRow("Total", money(total), true);

  page.drawRectangle({
    x: totalsLeft - 12, y: y - 6, width: right - totalsLeft + 12, height: 26, color: BAND_BG,
  });
  y += 1;
  totalRow(dueLabel, money(outstanding), true);
  y -= 12;

  /* ── Notes — the bank block ────────────────────────────────────────────── */
  if (invoice.notes.trim()) {
    page.drawText("Notes", { x: left, y, size: 9, font: bold, color: muted });
    y -= 15;
    for (const noteLine of invoice.notes.split("\n")) {
      if (!noteLine.trim()) {
        y -= 7;
        continue;
      }
      for (const text of wrap(noteLine, font, 9, right - left)) {
        page.drawText(text, { x: left, y, size: 9, font, color: ink });
        y -= 12;
      }
    }
  }

  return pdf.save();
};

const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
