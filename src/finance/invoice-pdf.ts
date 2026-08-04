import { ink, line, muted, openLetterhead } from "@/hr/letterhead";
import { wrap } from "@/hr/pdf";
import { pkr } from "./calc";
import { invoiceTotal, type Invoice } from "./types";

/**
 * The customer invoice, on the real letterhead. The layout mirrors the last
 * invoice issued from the old tool (INV-00216): Bill To on the left, the
 * date/terms/due block on the right, an item table, totals, and the bank
 * details in the notes. Amounts are in the INVOICE currency.
 */

const money = (invoice: Pick<Invoice, "currency">, amount: number): string =>
  `${invoice.currency} ${pkr(amount)}`;

export const renderInvoicePdf = async (invoice: Invoice): Promise<Uint8Array> => {
  const { pdf, page, font, bold, left, right, top } = await openLetterhead(90);
  const total = invoiceTotal(invoice);
  let y = top;

  /* Title row: INVOICE + number right, Bill To left below. */
  const title = "INVOICE";
  page.drawText(title, {
    x: right - bold.widthOfTextAtSize(title, 20),
    y, size: 20, font: bold, color: ink,
  });
  y -= 16;
  const number = `# ${invoice.invoiceNo}`;
  page.drawText(number, {
    x: right - font.widthOfTextAtSize(number, 10.5),
    y, size: 10.5, font, color: muted,
  });

  /* Balance due, top right — the number the reader is looking for. */
  y -= 26;
  const dueLabel = invoice.status === "paid" ? "PAID" : "Balance Due";
  const dueValue =
    invoice.status === "paid" ? money(invoice, 0) : money(invoice, total);
  page.drawText(dueLabel, {
    x: right - font.widthOfTextAtSize(dueLabel, 9),
    y, size: 9, font: bold, color: muted,
  });
  y -= 15;
  page.drawText(dueValue, {
    x: right - bold.widthOfTextAtSize(dueValue, 13),
    y, size: 13, font: bold, color: ink,
  });

  /* Bill To (left) and the date block (right), side by side. */
  let leftY = top - 26;
  page.drawText("BILL TO", { x: left, y: leftY, size: 9, font: bold, color: muted });
  leftY -= 15;
  page.drawText(invoice.clientName, { x: left, y: leftY, size: 11, font: bold, color: ink });
  leftY -= 14;
  for (const addressLine of invoice.clientAddress.split("\n").filter(Boolean)) {
    page.drawText(addressLine, { x: left, y: leftY, size: 9.5, font, color: ink });
    leftY -= 12.5;
  }

  let rightY = y - 30;
  const detailRows: Array<[string, string]> = [
    ["Invoice Date :", formatDate(invoice.date)],
    ["Terms :", invoice.terms || "—"],
    ["Due Date :", invoice.dueDate ? formatDate(invoice.dueDate) : "—"],
    ...(invoice.status === "paid" && invoice.paidDate
      ? ([["Paid On :", formatDate(invoice.paidDate)]] as Array<[string, string]>)
      : []),
  ];
  const labelX = right - 180;
  for (const [label, value] of detailRows) {
    page.drawText(label, { x: labelX, y: rightY, size: 9.5, font, color: muted });
    page.drawText(value, {
      x: right - font.widthOfTextAtSize(value, 9.5),
      y: rightY, size: 9.5, font, color: ink,
    });
    rightY -= 15;
  }

  y = Math.min(leftY, rightY) - 24;

  /* Item table. */
  const colQty = right - 170;
  const colRate = right - 95;
  const rule = (at: number) =>
    page.drawLine({
      start: { x: left, y: at }, end: { x: right, y: at },
      thickness: 0.75, color: line,
    });

  page.drawText("#", { x: left, y, size: 9, font: bold, color: muted });
  page.drawText("ITEM & DESCRIPTION", { x: left + 22, y, size: 9, font: bold, color: muted });
  page.drawText("QTY", {
    x: colQty - bold.widthOfTextAtSize("QTY", 9), y, size: 9, font: bold, color: muted,
  });
  page.drawText("RATE", {
    x: colRate - bold.widthOfTextAtSize("RATE", 9), y, size: 9, font: bold, color: muted,
  });
  page.drawText("AMOUNT", {
    x: right - bold.widthOfTextAtSize("AMOUNT", 9), y, size: 9, font: bold, color: muted,
  });
  y -= 8;
  rule(y);
  y -= 16;

  invoice.lines.forEach((item, index) => {
    const descriptionLines = wrap(item.description, font, 10, colQty - left - 60);
    page.drawText(String(index + 1), { x: left, y, size: 10, font, color: muted });
    for (const [i, text] of descriptionLines.entries()) {
      page.drawText(text, { x: left + 22, y: y - i * 13, size: 10, font, color: ink });
    }
    const qty = item.qty.toFixed(2);
    const rate = pkr(item.rate);
    const amount = pkr(Math.round(item.qty * item.rate * 100) / 100);
    page.drawText(qty, {
      x: colQty - font.widthOfTextAtSize(qty, 10), y, size: 10, font, color: ink,
    });
    page.drawText(rate, {
      x: colRate - font.widthOfTextAtSize(rate, 10), y, size: 10, font, color: ink,
    });
    page.drawText(amount, {
      x: right - font.widthOfTextAtSize(amount, 10), y, size: 10, font, color: ink,
    });
    y -= 13 * descriptionLines.length + 5;
  });

  y += 1;
  rule(y);
  y -= 18;

  /* Totals, right-aligned like the sample. */
  const totalsLabelX = right - 180;
  const totalRow = (label: string, value: string, emphasize = false) => {
    const face = emphasize ? bold : font;
    const size = emphasize ? 10.5 : 10;
    page.drawText(label, {
      x: totalsLabelX, y, size, font: face, color: emphasize ? ink : muted,
    });
    page.drawText(value, {
      x: right - face.widthOfTextAtSize(value, size), y, size, font: face, color: ink,
    });
    y -= 17;
  };
  totalRow("Sub Total", pkr(total));
  totalRow("Total", money(invoice, total), true);
  totalRow(
    invoice.status === "paid" ? "Paid" : "Balance Due",
    money(invoice, invoice.status === "paid" ? total : total),
    true,
  );
  y -= 16;

  /* Notes — the bank block. */
  if (invoice.notes.trim()) {
    page.drawText("Notes", { x: left, y, size: 9, font: bold, color: muted });
    y -= 14;
    for (const noteLine of invoice.notes.split("\n")) {
      if (!noteLine.trim()) {
        y -= 6;
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
