import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import type { Employee } from "@/admin/types";
import { getTemplate, type LetterType } from "./letters";
import { loadLayout, type LetterheadLayout } from "./layout";

/**
 * Renders letters onto the REAL Letterhead.pdf — the one carrying the company's
 * actual signature and stamp. We embed the original page rather than recreating
 * it, so the artwork is pixel-exact and can never drift from the real thing.
 *
 * Geometry comes from `layout.ts` (calibrated once via the setup screen), not
 * from constants here — see that file for why.
 */

export type RenderMode = "draft" | "issued";

export interface LetterInput {
  employee: Employee;
  letterType: LetterType;
  values: Record<string, string>;
  mode: RenderMode;
  reference?: string;
  /**
   * The QR encodes THIS, not the reference. References are sequential
   * (SL/HR/2026/014), so a QR built from one would let anyone enumerate the
   * whole register by counting upward. The token is a uuid4 from the database.
   */
  verifyToken?: string;
  issuedAt?: Date;
  origin: string;
  /** Overrides the saved layout. Used live by the calibration screen. */
  layout?: LetterheadLayout;
  /** Draws a measurement grid. Calibration only — never on a real letter. */
  calibrate?: boolean;
}

/** Greedy wrap. Preserves the blank lines the templates rely on. */
const wrap = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
};

/**
 * The calibration overlay: a 50pt grid with labelled rulers, the text box drawn
 * in blue, and the signature mask in red. Read the numbers straight off the page
 * — no guessing, no measuring in an image editor.
 */
const drawGrid = (
  page: PDFPage,
  font: PDFFont,
  layout: LetterheadLayout,
  width: number,
  height: number,
) => {
  for (let y = 0; y <= height; y += 50) {
    page.drawLine({
      start: { x: 0, y },
      end: { x: width, y },
      thickness: 0.3,
      color: rgb(0.6, 0.6, 0.65),
      opacity: 0.5,
    });
    page.drawText(String(y), {
      x: 3,
      y: y + 2,
      size: 5.5,
      font,
      color: rgb(0.4, 0.4, 0.5),
    });
  }

  for (let x = 0; x <= width; x += 50) {
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: 0.3,
      color: rgb(0.6, 0.6, 0.65),
      opacity: 0.5,
    });
    page.drawText(String(x), {
      x: x + 2,
      y: 4,
      size: 5.5,
      font,
      color: rgb(0.4, 0.4, 0.5),
    });
  }

  // The text box: everything inside this must be clear of the artwork.
  page.drawRectangle({
    x: layout.marginLeft,
    y: layout.marginBottom,
    width: width - layout.marginLeft - layout.marginRight,
    height: height - layout.marginTop - layout.marginBottom,
    borderColor: rgb(0, 0.4, 0.9),
    borderWidth: 1,
    opacity: 0,
  });

  page.drawText("TEXT BOX — body copy lives here", {
    x: layout.marginLeft + 4,
    y: height - layout.marginTop + 5,
    size: 6.5,
    font,
    color: rgb(0, 0.4, 0.9),
  });

  // The signature mask: this must cover the signature AND the stamp exactly.
  const box = layout.signatureBox;
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    borderColor: rgb(0.9, 0.1, 0.1),
    borderWidth: 1,
    opacity: 0,
  });

  page.drawText("SIGNATURE MASK — must cover signature + stamp", {
    x: box.x + 4,
    y: box.y + box.height + 4,
    size: 6.5,
    font,
    color: rgb(0.9, 0.1, 0.1),
  });
};

export const renderLetter = async (input: LetterInput): Promise<Uint8Array> => {
  const layout = input.layout ?? loadLayout();
  const template = getTemplate(input.letterType);

  // Fetched, not bundled — swapping the letterhead is a file swap.
  const response = await fetch("/letterhead.pdf");
  if (!response.ok) {
    throw new Error(
      "Could not load /letterhead.pdf. It must be present in the public folder.",
    );
  }

  const pdf = await PDFDocument.load(await response.arrayBuffer());
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();

  const font = await pdf.embedStandardFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedStandardFont(StandardFonts.HelveticaBold);

  // ── DRAFT: hide the signature and stamp, and say so loudly ───────────────
  if (input.mode === "draft" && !input.calibrate) {
    const box = layout.signatureBox;
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: rgb(1, 1, 1),
    });

    page.drawText("DRAFT — NOT SIGNED", {
      x: box.x,
      y: box.y + box.height / 2,
      size: 11,
      font: fontBold,
      color: rgb(0.75, 0.1, 0.1),
    });

    page.drawText("DRAFT", {
      x: width / 2 - 150,
      y: height / 2 - 60,
      size: 90,
      font: fontBold,
      color: rgb(0.9, 0.2, 0.2),
      opacity: 0.1,
      rotate: degrees(38),
    });
  }

  if (input.calibrate) {
    drawGrid(page, font, layout, width, height);
  }

  const contentWidth = width - layout.marginLeft - layout.marginRight;
  let cursorY = height - layout.marginTop;

  // Date, right-aligned at the top of the body block.
  const when = (input.issuedAt ?? new Date()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(when, {
    x: width - layout.marginRight - font.widthOfTextAtSize(when, layout.fontSize),
    y: cursorY,
    size: layout.fontSize,
    font,
    color: rgb(0.2, 0.2, 0.22),
  });
  cursorY -= layout.lineHeight * 2;

  page.drawText(template.subject.toUpperCase(), {
    x: layout.marginLeft,
    y: cursorY,
    size: layout.fontSize + 1,
    font: fontBold,
    color: rgb(0.02, 0.02, 0.02),
  });
  cursorY -= layout.lineHeight * 2;

  const text = template.build(input.employee, input.values);
  const lines = wrap(text, font, layout.fontSize, contentWidth);

  for (const line of lines) {
    if (cursorY < layout.marginBottom) {
      // Overflow onto a continuation page rather than printing over the
      // signature. A long letter must not silently lose its tail.
      const extra = pdf.addPage([width, height]);
      cursorY = height - 90;
      extra.drawText("(continued)", {
        x: layout.marginLeft,
        y: cursorY,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      cursorY -= layout.lineHeight * 2;
    }

    const target = pdf.getPages()[pdf.getPageCount() - 1];
    if (line) {
      target.drawText(line, {
        x: layout.marginLeft,
        y: cursorY,
        size: layout.fontSize,
        font,
        color: rgb(0.05, 0.05, 0.06),
      });
    }
    cursorY -= layout.lineHeight;
  }

  // ── ISSUED: reference, footer, verification QR ───────────────────────────
  if (input.mode === "issued" && input.reference) {
    const issuedAt = input.issuedAt ?? new Date();

    const verifyUrl = `${input.origin}/verify?t=${encodeURIComponent(
      input.verifyToken ?? "",
    )}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 0,
      width: 220,
      color: { dark: "#001463FF", light: "#FFFFFFFF" },
    });
    const qrImage = await pdf.embedPng(qrDataUrl);

    const qrSize = 52;
    page.drawImage(qrImage, {
      x: width - layout.marginRight - qrSize,
      y: 52,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("Scan to verify", {
      x: width - layout.marginRight - qrSize,
      y: 42,
      size: 6,
      font,
      color: rgb(0.5, 0.5, 0.52),
    });

    const stamp = `Ref: ${input.reference}   ·   Issued: ${issuedAt.toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "short", year: "numeric" },
    )}`;

    page.drawText(stamp, {
      x: layout.marginLeft,
      y: 42,
      size: 7.5,
      font,
      color: rgb(0.45, 0.45, 0.47),
    });
  }

  return pdf.save();
};

/** Downloads the PDF. The browser's viewer gives us print + save for free. */
export const openPdf = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  // Revoke late: revoking immediately cancels the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export const pdfBlobUrl = (bytes: Uint8Array): string =>
  URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
