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

/**
 * Renders letters onto the REAL Letterhead.pdf — the one with the company's
 * actual signature and stamp. We embed the original page rather than recreating
 * it, so the artwork is pixel-exact and can never drift from the real thing.
 *
 * ⚠️ LAYOUT CONSTANTS BELOW NEED ONE VISUAL CHECK.
 * The letterhead is A4 (595 × 842pt) with the logo at the top and the signature
 * + stamp near the bottom. These margins keep body text clear of both. If the
 * first preview shows text colliding with the artwork, adjust ONLY these
 * numbers — nothing else depends on them.
 */
export const LAYOUT = {
  /** Body text starts this far below the top edge. Clears the logo block. */
  marginTop: 210,
  /** Body text stops this far above the bottom edge. Clears signature + stamp. */
  marginBottom: 250,
  marginLeft: 64,
  marginRight: 64,
  fontSize: 10.5,
  lineHeight: 15.5,
  /**
   * The signature + stamp live in this box (measured from the bottom-left).
   * A DRAFT covers it with white so an unsigned letter cannot masquerade as a
   * signed one — the single most important safety property of this whole module.
   */
  signatureBox: { x: 50, y: 90, width: 300, height: 150 },
};

export type RenderMode = "draft" | "issued";

export interface LetterInput {
  employee: Employee;
  letterType: LetterType;
  values: Record<string, string>;
  mode: RenderMode;
  /** Present only when issued. */
  reference?: string;
  /**
   * The QR encodes THIS, not the reference. References are sequential
   * (SL/HR/2026/014), so a QR built from one would let anyone enumerate the
   * whole register by counting upward. The token is a uuid4 from the database.
   */
  verifyToken?: string;
  issuedAt?: Date;
  /** Origin used to build the QR verification URL. */
  origin: string;
}

/** Greedy wrap. Preserves the blank lines and indentation the templates rely on. */
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

const drawFooter = (
  page: PDFPage,
  font: PDFFont,
  reference: string,
  issuedAt: Date,
) => {
  const stamp = `Ref: ${reference}   ·   Issued: ${issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;

  page.drawText(stamp, {
    x: LAYOUT.marginLeft,
    y: 42,
    size: 7.5,
    font,
    color: rgb(0.45, 0.45, 0.47),
  });
};

export const renderLetter = async (input: LetterInput): Promise<Uint8Array> => {
  const template = getTemplate(input.letterType);

  // The letterhead is fetched, not bundled, so replacing it is a file swap.
  const response = await fetch("/letterhead.pdf");
  if (!response.ok) {
    throw new Error(
      "Could not load /letterhead.pdf. It must be present in the public folder.",
    );
  }
  const letterheadBytes = await response.arrayBuffer();

  const pdf = await PDFDocument.load(letterheadBytes);
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();

  const body = pdf.embedStandardFont(StandardFonts.Helvetica);
  const bold = pdf.embedStandardFont(StandardFonts.HelveticaBold);
  const font = await body;
  const fontBold = await bold;

  // ── DRAFT: hide the signature and stamp, and say so loudly ───────────────
  if (input.mode === "draft") {
    const box = LAYOUT.signatureBox;
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

  const contentWidth = width - LAYOUT.marginLeft - LAYOUT.marginRight;
  let cursorY = height - LAYOUT.marginTop;

  // Date, right-aligned at the top of the body block.
  const when = (input.issuedAt ?? new Date()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(when, {
    x: width - LAYOUT.marginRight - font.widthOfTextAtSize(when, LAYOUT.fontSize),
    y: cursorY,
    size: LAYOUT.fontSize,
    font,
    color: rgb(0.2, 0.2, 0.22),
  });
  cursorY -= LAYOUT.lineHeight * 2;

  // Subject.
  page.drawText(template.subject.toUpperCase(), {
    x: LAYOUT.marginLeft,
    y: cursorY,
    size: LAYOUT.fontSize + 1,
    font: fontBold,
    color: rgb(0.02, 0.02, 0.02),
  });
  cursorY -= LAYOUT.lineHeight * 2;

  // Body.
  const text = template.build(input.employee, input.values);
  const lines = wrap(text, font, LAYOUT.fontSize, contentWidth);

  for (const line of lines) {
    if (cursorY < LAYOUT.marginBottom) {
      // Overflow onto a clean continuation page rather than printing over the
      // signature. A letter that runs long must not silently lose its tail.
      const extra = pdf.addPage([width, height]);
      cursorY = height - 90;
      extra.drawText("(continued)", {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      cursorY -= LAYOUT.lineHeight * 2;
    }

    const target = pdf.getPages()[pdf.getPageCount() - 1];
    if (line) {
      target.drawText(line, {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: LAYOUT.fontSize,
        font,
        color: rgb(0.05, 0.05, 0.06),
      });
    }
    cursorY -= LAYOUT.lineHeight;
  }

  // ── ISSUED: reference, footer, and a verification QR ─────────────────────
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
      x: width - LAYOUT.marginRight - qrSize,
      y: 52,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("Scan to verify", {
      x: width - LAYOUT.marginRight - qrSize,
      y: 42,
      size: 6,
      font,
      color: rgb(0.5, 0.5, 0.52),
    });

    drawFooter(page, font, input.reference, issuedAt);
  }

  return pdf.save();
};

/** Opens the rendered PDF in a new tab — the browser gives us print + save free. */
export const openPdf = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  // Revoke late: revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

export const pdfBlobUrl = (bytes: Uint8Array): string =>
  URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
