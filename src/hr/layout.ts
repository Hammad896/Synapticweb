/**
 * Letterhead geometry.
 *
 * These numbers decide where body text sits on the page — and, critically, where
 * the DRAFT mask covers the signature and stamp. They cannot be derived reliably
 * from the PDF (the artwork is nested inside transformed form XObjects), and
 * guessing them is how you end up printing a paragraph across the CEO's
 * signature.
 *
 * So they are DATA, not constants: calibrated once through the setup screen,
 * persisted, and re-calibrated in a minute if the letterhead ever changes.
 *
 * All units are PDF points, measured from the BOTTOM-LEFT of the page (the PDF
 * origin), on A4: 595.3 × 841.9pt.
 */

export interface LetterheadLayout {
  /** Body text starts this far below the top edge. Must clear the logo block. */
  marginTop: number;
  /** Body text stops this far above the bottom edge. Must clear the signature. */
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  lineHeight: number;
  /** The white box a DRAFT paints over the signature + stamp. */
  signatureBox: { x: number; y: number; width: number; height: number };
}

export const DEFAULT_LAYOUT: LetterheadLayout = {
  marginTop: 210,
  marginBottom: 250,
  marginLeft: 64,
  marginRight: 64,
  fontSize: 10.5,
  lineHeight: 15.5,
  signatureBox: { x: 50, y: 90, width: 300, height: 150 },
};

const STORAGE_KEY = "synapticlab.letterhead.layout";

export const loadLayout = (): LetterheadLayout => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;

    // Merge, so a layout saved before a new field existed still loads.
    const saved = JSON.parse(raw) as Partial<LetterheadLayout>;
    return {
      ...DEFAULT_LAYOUT,
      ...saved,
      signatureBox: { ...DEFAULT_LAYOUT.signatureBox, ...saved.signatureBox },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
};

export const saveLayout = (layout: LetterheadLayout) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
};

export const resetLayout = () => {
  localStorage.removeItem(STORAGE_KEY);
};
