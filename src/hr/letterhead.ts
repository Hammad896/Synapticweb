import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { loadLayout, type LetterheadLayout } from "./layout";

/**
 * The prelude every letterhead PDF shares — slip, certificate, financial
 * report, balance sheet. One place owns the fetch-or-blank fallback, the
 * fonts, and the geometry, including the ONE copy of the rule that content
 * starts at min(marginTop, 148): the letters' calibrated margin is sized for
 * long prose, but compact documents begin just below the header band.
 */

export const ink = rgb(0.08, 0.08, 0.1);
export const muted = rgb(0.42, 0.42, 0.47);
export const line = rgb(0.8, 0.8, 0.84);

export interface LetterheadDoc {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  layout: LetterheadLayout;
  width: number;
  height: number;
  left: number;
  right: number;
  /** Where the first line of content goes. */
  top: number;
  /** False when /letterhead.pdf could not be loaded (blank-page fallback). */
  hasArtwork: boolean;
}

export const openLetterhead = async (plainTop = 90): Promise<LetterheadDoc> => {
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

  return {
    pdf,
    page,
    font,
    bold,
    layout,
    width,
    height,
    left: layout.marginLeft,
    right: width - layout.marginRight,
    top: height - (base ? Math.min(layout.marginTop, 148) : plainTop),
    hasArtwork: Boolean(base),
  };
};
