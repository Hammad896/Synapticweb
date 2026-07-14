import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/kit";
import { getRepository } from "@/admin/repository";
import type { Employee } from "@/admin/types";

/**
 * A printable staff ID card at CR80 (85.6 × 54 mm) — the real credit-card size,
 * so it fits a lanyard holder and a standard card printer.
 *
 * Printing is done with `@media print` rather than a PDF: the browser's own
 * print dialog already offers "save as PDF", exact scaling, and card stock —
 * and it keeps the card in the site's live theme instead of a second renderer
 * that would drift from it.
 */
const IdCard = ({ employee }: { employee: Employee }) => {
  const [qr, setQr] = useState<string>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col items-center gap-6">
      {/* The card. Fixed px at 96dpi ≈ CR80; the print stylesheet re-asserts mm. */}
      <div
        ref={printRef}
        id="id-card-print"
        className="relative overflow-hidden rounded-2xl bg-[#020202] text-white shadow-2xl"
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
                src="/logo-dark.png"
                alt="Synaptic Lab"
                className="h-5 w-auto"
                width={871}
                height={209}
              />
              <p className="mt-1 text-[7px] uppercase tracking-[0.25em] text-white/50">
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
                className="h-[74px] w-[60px] shrink-0 rounded-md object-cover ring-1 ring-white/20"
              />
            ) : (
              <div className="flex h-[74px] w-[60px] shrink-0 items-center justify-center rounded-md bg-white/5 text-lg font-semibold text-white/60 ring-1 ring-white/20">
                {initials || "—"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]">
                {employee.fullName}
              </p>
              <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.18em] text-white/60">
                {employee.role}
              </p>

              <div className="mt-2.5 flex items-center gap-3 text-[8px] text-white/70">
                <span className="tabular-nums text-[#00C2FF]">
                  {employee.employeeId || "SL-————"}
                </span>
                <span className="text-white/25">|</span>
                <span className="capitalize">{employee.employmentType}</span>
              </div>
            </div>
          </div>

          <p className="text-[6.5px] leading-relaxed text-white/35">
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
