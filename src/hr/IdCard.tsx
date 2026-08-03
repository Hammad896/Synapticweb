import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/kit";
import { getRepository } from "@/admin/repository";
import type { Employee } from "@/admin/types";
import { cn } from "@/lib/utils";

/**
 * A printable staff ID card at CR80 (85.6 × 54 mm) — the real credit-card size,
 * so it fits a lanyard holder and a standard card printer.
 *
 * Three templates share one layout; only the palette changes. Light exists
 * because dark cards read poorly in print and daylight — pick per print run.
 *
 * Printing is done with `@media print` rather than a PDF: the browser's own
 * print dialog already offers "save as PDF", exact scaling, and card stock.
 */

type CardTheme = "dark" | "light" | "brand";

const THEMES: Record<
  CardTheme,
  {
    label: string;
    card: string;
    /** The logo variant that stays legible on this background. */
    logo: string;
    subtle: string;
    body: string;
    divider: string;
    footer: string;
    id: string;
    blood: string;
  }
> = {
  dark: {
    label: "Dark",
    card: "bg-[#020202] text-white",
    logo: "/logo-dark.png",
    subtle: "text-white/50",
    body: "text-white/70",
    divider: "text-white/25",
    footer: "text-white/35",
    id: "text-[#00C2FF]",
    blood: "text-[#FF5A5A]",
  },
  light: {
    label: "Light",
    card: "bg-white text-slate-900 ring-1 ring-slate-200",
    logo: "/logo-light.png",
    subtle: "text-slate-400",
    body: "text-slate-600",
    divider: "text-slate-300",
    footer: "text-slate-400",
    id: "text-[#0077B6]",
    blood: "text-red-600",
  },
  brand: {
    label: "Brand",
    card: "bg-gradient-to-br from-[#02182e] via-[#00365c] to-[#0077B6] text-white",
    logo: "/logo-dark.png",
    subtle: "text-white/60",
    body: "text-white/75",
    divider: "text-white/30",
    footer: "text-white/45",
    id: "text-[#7FE3FF]",
    blood: "text-[#FF7A7A]",
  },
};

const IdCard = ({ employee }: { employee: Employee }) => {
  const [qr, setQr] = useState<string>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [theme, setTheme] = useState<CardTheme>("light");
  const printRef = useRef<HTMLDivElement>(null);
  const palette = THEMES[theme];

  useEffect(() => {
    // The token, never the employee ID: IDs are sequential and would let anyone
    // enumerate the entire roster by counting SL-2026-001, -002, -003…
    const verifyUrl = `${window.location.origin}/verify?t=${encodeURIComponent(
      employee.verifyToken,
    )}`;

    void QRCode.toDataURL(verifyUrl, {
      margin: 0,
      width: 240,
      errorCorrectionLevel: "M",
      color: { dark: "#001463FF", light: "#FFFFFF00" },
    }).then(setQr);
  }, [employee.verifyToken]);

  useEffect(() => {
    if (!employee.photoPath) {
      setPhoto(null);
      return;
    }
    void getRepository().photoUrl(employee.photoPath).then(setPhoto);
  }, [employee.photoPath]);

  const initials = employee.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const photoRing = theme === "light" ? "ring-slate-200" : "ring-white/20";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Template picker — not printed. */}
      <div className="no-print flex gap-2">
        {(Object.keys(THEMES) as CardTheme[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-pressed={theme === key}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs transition-transform active:scale-95",
              theme === key
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground",
            )}
          >
            {THEMES[key].label}
          </button>
        ))}
      </div>

      {/* The card. Fixed px at 96dpi ≈ CR80; the print stylesheet re-asserts mm. */}
      <div
        ref={printRef}
        id="id-card-print"
        className={cn("relative overflow-hidden rounded-2xl shadow-2xl", palette.card)}
        style={{ width: "340px", height: "214px" }}
      >
        <div
          aria-hidden="true"
          className="gradient-synapse absolute inset-x-0 top-0 h-1.5"
        />

        <div className="flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div>
              <img
                src={palette.logo}
                alt="Synaptic Lab"
                className="h-5 w-auto"
                width={871}
                height={209}
              />
              <p className={cn("mt-1 text-[7px] uppercase tracking-[0.25em]", palette.subtle)}>
                Staff Identification
              </p>
            </div>

            {qr && (
              <img
                src={qr}
                alt={`QR code verifying ${employee.fullName}`}
                className="h-12 w-12 rounded bg-white p-0.5"
              />
            )}
          </div>

          <div className="flex items-end gap-4">
            {photo ? (
              <img
                src={photo}
                alt=""
                className={cn("h-[74px] w-[60px] shrink-0 rounded-md object-cover ring-1", photoRing)}
              />
            ) : (
              <div
                className={cn(
                  "flex h-[74px] w-[60px] shrink-0 items-center justify-center rounded-md text-lg font-semibold ring-1",
                  photoRing,
                  theme === "light" ? "bg-slate-50 text-slate-400" : "bg-white/5 text-white/60",
                )}
              >
                {initials || "—"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]">
                {employee.fullName}
              </p>
              <p className={cn("mt-0.5 truncate text-[9px] uppercase tracking-[0.18em]", palette.subtle)}>
                {employee.role}
              </p>

              <div className={cn("mt-2.5 flex items-center gap-3 text-[8px]", palette.body)}>
                <span className={cn("tabular-nums", palette.id)}>
                  {employee.employeeId || "SL-————"}
                </span>
                <span className={palette.divider}>|</span>
                <span className="capitalize">{employee.employmentType}</span>
                {employee.bloodGroup && (
                  <>
                    <span className={palette.divider}>|</span>
                    <span className={cn("font-semibold", palette.blood)}>
                      {employee.bloodGroup}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className={cn("text-[6.5px] leading-relaxed", palette.footer)}>
            Property of Synaptic Lab. If found, return to Islamabad head office.
            Scan the QR to verify this credential.
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={() => window.print()}>
        <Printer size={15} aria-hidden="true" />
        Print ID card
      </Button>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Prints at CR80 (85.6 × 54 mm) — standard card size. In the print dialog set
        margins to none and scale to 100%.
      </p>
    </div>
  );
};

export default IdCard;
