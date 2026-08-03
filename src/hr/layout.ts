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
  // The blue band ends ≈121pt from the top (the registration line above it was
  // removed from the artwork); 150 starts the body just below it.
  marginTop: 150,
  marginBottom: 250,
  marginLeft: 64,
  marginRight: 64,
  fontSize: 10.5,
  lineHeight: 15.5,
  // Measured off the real artwork: signature ≈ y 166-238, stamp ≈ y 81-156,
  // both in the right column x ≈ 460-560. One box covers the pair.
  signatureBox: { x: 448, y: 72, width: 130, height: 175 },
};

// v2: the geometry was remeasured after the registration line was removed
// from the artwork (2026-08). Any layout saved under the old key was
// calibrated against the wrong signature position, so it is left behind.
const STORAGE_KEY = "synapticlab.letterhead.layout.v2";

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
