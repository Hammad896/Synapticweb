import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge, Button } from "@/components/kit";
import { supabase } from "@/lib/supabase";

type Result =
  | { state: "loading" }
  | { state: "none" }
  | {
      state: "valid";
      kind: "document" | "employee";
      title: string;
      rows: Array<[string, string]>;
    }
  | { state: "revoked"; title: string; rows: Array<[string, string]> }
  | { state: "invalid"; reason: string };

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

const LETTER_NAMES: Record<string, string> = {
  offer: "Offer Letter",
  appointment: "Appointment Letter",
  internship: "Internship Letter",
  "internship-completion": "Internship Completion Certificate",
  experience: "Experience Certificate",
  relieving: "Relieving Letter",
  termination: "Termination Letter",
  "resignation-acceptance": "Resignation Acceptance",
  warning: "Warning Letter",
  "show-cause": "Show-Cause Notice",
};

/**
 * The public end of the QR codes.
 *
 * An outsider — a bank, a landlord, a future employer — scans a letter or an ID
 * card and lands here. They are NOT signed in, so this page reads from the
 * narrow `document_verifications` / `employee_verifications` views, which expose
 * only what proves authenticity: reference, type, name, date, validity.
 *
 * No salary. No CNIC. No address. Not "hidden by the UI" — structurally
 * unreachable, because Row Level Security never sends those columns here.
 */
const Verify = () => {
  const [params] = useSearchParams();
  const [result, setResult] = useState<Result>({ state: "loading" });

  // ONE opaque token. There is no listable endpoint any more: the old public
  // views let anyone `select *` and dump the entire staff roster in a single
  // query. This calls a SECURITY DEFINER function that takes one uuid and
  // returns at most one row.
  const token = params.get("t");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setResult({ state: "none" });
        return;
      }

      if (!supabase) {
        setResult({
          state: "invalid",
          reason:
            "Verification is unavailable — this deployment has no database configured.",
        });
        return;
      }

      const { data, error } = await supabase.rpc("verify_credential", { token });

      if (error || !data || data.kind === "unknown") {
        setResult({
          state: "invalid",
          reason:
            "This code does not match any credential we have issued. It may be a forgery, or the link may have been mistyped.",
        });
        return;
      }

      if (data.kind === "document") {
        const rows: Array<[string, string]> = [
          ["Reference", data.reference],
          ["Document", LETTER_NAMES[data.type] ?? data.type],
          ["Issued to", data.name],
          ["Issued on", formatDate(data.issued_at)],
        ];

        setResult(
          data.status === "revoked"
            ? { state: "revoked", title: "This document has been revoked", rows }
            : {
                state: "valid",
                kind: "document",
                title: "This is a genuine Synaptic Lab document",
                rows,
              },
        );
        return;
      }

      // kind === "employee"
      setResult(
        data.status === "active"
          ? {
              state: "valid",
              kind: "employee",
              title: "This is a current member of Synaptic Lab staff",
              rows: [
                ["Employee ID", data.employee_id],
                ["Name", data.name],
                ["Role", data.role],
                ["Status", "Active"],
              ],
            }
          : {
              state: "revoked",
              title: "This person is no longer with Synaptic Lab",
              rows: [
                ["Employee ID", data.employee_id],
                ["Name", data.name],
                ["Status", "Inactive"],
              ],
            },
      );
    };

    void run();
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" aria-label="Synaptic Lab home">
          <Logo className="h-7" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {result.state === "loading" && (
            <p className="text-center text-sm text-muted-foreground">Verifying…</p>
          )}

          {result.state === "none" && (
            <div className="surface p-10 text-center">
              <h1 className="type-display text-2xl text-foreground">
                Document verification
              </h1>
              <p className="measure mx-auto mt-4 text-sm leading-relaxed text-muted-foreground">
                Scan the QR code on a Synaptic Lab letter or staff ID card to confirm it is
                genuine. You can also open the link printed beneath the code.
              </p>
            </div>
          )}

          {(result.state === "valid" || result.state === "revoked") && (
            <div className="surface overflow-hidden">
              <div
                className={
                  result.state === "valid"
                    ? "gradient-fill flex items-center gap-4 p-7"
                    : "flex items-center gap-4 bg-amber-500/10 p-7"
                }
              >
                {result.state === "valid" ? (
                  <BadgeCheck
                    size={28}
                    aria-hidden="true"
                    className="shrink-0 text-white"
                  />
                ) : (
                  <ShieldAlert
                    size={28}
                    aria-hidden="true"
                    className="shrink-0 text-amber-500"
                  />
                )}

                <p
                  className={
                    result.state === "valid"
                      ? "text-base font-medium text-white"
                      : "text-base font-medium text-foreground"
                  }
                >
                  {result.title}
                </p>
              </div>

              <dl className="divide-y divide-border">
                {result.rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-6 px-7 py-4"
                  >
                    <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-right text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              {result.state === "revoked" && (
                <p className="border-t border-border px-7 py-5 text-sm leading-relaxed text-muted-foreground">
                  This record exists in our register but is no longer valid. If it has been
                  presented to you as current, please contact us before relying on it.
                </p>
              )}
            </div>
          )}

          {result.state === "invalid" && (
            <div className="surface p-10 text-center">
              <ShieldX
                size={32}
                aria-hidden="true"
                className="mx-auto text-red-500"
              />
              <h1 className="type-display mt-5 text-2xl text-foreground">
                Could not be verified
              </h1>
              <p className="measure mx-auto mt-4 text-sm leading-relaxed text-muted-foreground">
                {result.reason}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                If someone has presented this to you as a genuine Synaptic Lab document,
                please treat it with caution and contact us.
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <Link to="/" className="no-underline">
              <Button variant="secondary">Synaptic Lab</Button>
            </Link>
            <a href="mailto:qhammad286@gmail.com" className="no-underline">
              <Button variant="ghost">Report a problem</Button>
            </a>
          </div>

          <Badge tone="neutral" className="mx-auto mt-8 flex w-fit">
            Verified against the Synaptic Lab document register
          </Badge>
        </div>
      </main>
    </div>
  );
};

export default Verify;
