import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { Button, Label } from "@/components/kit";
import { renderLetter, pdfBlobUrl } from "@/hr/pdf";
import {
  DEFAULT_LAYOUT,
  loadLayout,
  resetLayout,
  saveLayout,
  type LetterheadLayout,
} from "@/hr/layout";
import type { Employee } from "./types";

/**
 * Letterhead calibration.
 *
 * The artwork on the letterhead (logo, signature, stamp) is nested inside
 * transformed form XObjects, so its position cannot be reliably derived from the
 * PDF — and guessing is how you print a paragraph across the CEO's signature.
 *
 * So: overlay a measured grid on the real letterhead, draw the text box in blue
 * and the signature mask in red, and let a human read the numbers straight off
 * the page. Calibrated once in a minute; re-done in a minute if the letterhead
 * ever changes.
 */

/** A real employee is not required — this is geometry, not content. */
const SAMPLE: Employee = {
  id: "sample",
  employeeId: "SL-2026-001",
  verifyToken: "00000000-0000-0000-0000-000000000000",
  fullName: "Sample Employee",
  role: "Software Engineer",
  department: "Engineering",
  manager: "Muhammad Umer",
  email: "sample@synapticlab.com",
  phone: "+92 300 0000000",
  cnic: "61101-0000000-0",
  dateOfBirth: "1998-01-01",
  address: "Islamabad",
  status: "active",
  employmentType: "full-time",
  workMode: "onsite",
  joinedAt: "2024-01-15",
  probationMonths: 3,
  exitDate: "",
  salaryAmount: 150000,
  salaryCurrency: "PKR",
  emergencyContact: { name: "—", relationship: "—", phone: "—" },
  photoPath: "",
  notes: "",
  showOnWebsite: false,
  publicBio: "",
};

const Slider = ({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <div>
    <div className="flex items-baseline justify-between">
      <label htmlFor={id}>
        <Label>{label}</Label>
      </label>
      <span className="text-xs tabular-nums text-accent">{value}pt</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-2 w-full accent-[#0067AE]"
    />
  </div>
);

const LetterheadSetup = ({ onDone }: { onDone: () => void }) => {
  const [layout, setLayout] = useState<LetterheadLayout>(loadLayout);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof LetterheadLayout>(key: K, value: LetterheadLayout[K]) =>
    setLayout((current) => ({ ...current, [key]: value }));

  const setBox = (key: keyof LetterheadLayout["signatureBox"], value: number) =>
    setLayout((current) => ({
      ...current,
      signatureBox: { ...current.signatureBox, [key]: value },
    }));

  // Re-render on every change, debounced — a live preview is the entire point.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError(null);

      try {
        const bytes = await renderLetter({
          employee: SAMPLE,
          letterType: "experience",
          values: {},
          mode: "draft",
          origin: window.location.origin,
          layout,
          calibrate: true,
        });

        if (cancelled) return;
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return pdfBlobUrl(bytes);
        });
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not render the preview.",
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [layout]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-2xl text-foreground sm:text-3xl">
            Letterhead setup
          </h1>
          <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
            Drag the sliders until the <span className="text-[#0067AE]">blue text box</span>{" "}
            sits clear of the logo and the signature, and the{" "}
            <span className="text-red-500">red mask</span> completely covers the signature
            and the stamp. The grid is in PDF points, measured from the bottom-left.
          </p>
        </div>

        <Button variant="ghost" onClick={onDone}>
          Back to letters
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-7">
          <section className="surface flex flex-col gap-5 p-6">
            <p className="text-sm font-semibold text-foreground">Text box</p>

            <Slider
              id="marginTop"
              label="Top margin (clears the logo)"
              value={layout.marginTop}
              min={60}
              max={400}
              onChange={(v) => set("marginTop", v)}
            />
            <Slider
              id="marginBottom"
              label="Bottom margin (clears the signature)"
              value={layout.marginBottom}
              min={60}
              max={400}
              onChange={(v) => set("marginBottom", v)}
            />
            <Slider
              id="marginLeft"
              label="Left margin"
              value={layout.marginLeft}
              min={30}
              max={140}
              onChange={(v) => set("marginLeft", v)}
            />
            <Slider
              id="marginRight"
              label="Right margin"
              value={layout.marginRight}
              min={30}
              max={140}
              onChange={(v) => set("marginRight", v)}
            />
          </section>

          <section className="surface flex flex-col gap-5 p-6">
            <p className="text-sm font-semibold text-foreground">
              Signature mask{" "}
              <span className="font-normal text-muted-foreground">(drafts only)</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This white box hides the real signature and stamp on a draft. If it does not
              cover them completely, an unsigned letter could pass for a signed one.
            </p>

            <Slider
              id="boxX"
              label="Left edge"
              value={layout.signatureBox.x}
              min={0}
              max={400}
              onChange={(v) => setBox("x", v)}
            />
            <Slider
              id="boxY"
              label="Bottom edge"
              value={layout.signatureBox.y}
              min={0}
              max={400}
              onChange={(v) => setBox("y", v)}
            />
            <Slider
              id="boxW"
              label="Width"
              value={layout.signatureBox.width}
              min={50}
              max={550}
              onChange={(v) => setBox("width", v)}
            />
            <Slider
              id="boxH"
              label="Height"
              value={layout.signatureBox.height}
              min={30}
              max={400}
              onChange={(v) => setBox("height", v)}
            />
          </section>

          <section className="surface flex flex-col gap-5 p-6">
            <p className="text-sm font-semibold text-foreground">Type</p>
            <Slider
              id="fontSize"
              label="Font size"
              value={layout.fontSize}
              min={8}
              max={14}
              onChange={(v) => set("fontSize", v)}
            />
            <Slider
              id="lineHeight"
              label="Line height"
              value={layout.lineHeight}
              min={10}
              max={24}
              onChange={(v) => set("lineHeight", v)}
            />
          </section>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                saveLayout(layout);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
              }}
            >
              <Save size={15} aria-hidden="true" />
              {saved ? "Saved" : "Save layout"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                resetLayout();
                setLayout(DEFAULT_LAYOUT);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <Label>Live preview — calibration grid</Label>
            {busy && (
              <Loader2
                size={14}
                aria-hidden="true"
                className="animate-spin text-muted-foreground"
              />
            )}
          </div>

          <div className="surface mt-3 flex-1 overflow-hidden p-0">
            {preview ? (
              <iframe
                src={preview}
                title="Letterhead calibration preview"
                className="h-full min-h-[46rem] w-full"
              />
            ) : (
              <div className="flex h-full min-h-[46rem] items-center justify-center">
                <p className="text-sm text-muted-foreground">Rendering…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterheadSetup;
