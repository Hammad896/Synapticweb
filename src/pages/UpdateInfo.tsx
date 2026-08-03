import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { Button, Field, inputClass } from "@/components/kit";
import { supabase } from "@/lib/supabase";

/**
 * The employee's side of a self-service update link. The token in the URL is
 * the whole capability: it unlocks exactly one person's editable contact
 * fields for 24 hours, once. Nothing here writes to the employee record —
 * submissions wait for the admin's approval.
 */

interface RequestInfo {
  valid: boolean;
  full_name?: string;
  role?: string;
  phone?: string;
  cnic?: string;
  date_of_birth?: string;
  address?: string;
  email?: string;
  emergency_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  father_name?: string;
  blood_group?: string;
  ntn?: string;
  bank_name?: string;
  bank_iban?: string;
}

const FIELDS: Array<{ key: string; label: string; type?: string; hint?: string }> = [
  { key: "full_name", label: "Full name", hint: "As written on your CNIC" },
  { key: "phone", label: "Phone number" },
  { key: "cnic", label: "CNIC", hint: "e.g. 37405-1234567-1" },
  { key: "father_name", label: "Father / guardian name" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "blood_group", label: "Blood group", hint: "e.g. B+" },
  { key: "email", label: "Email" },
  { key: "address", label: "City / address" },
  { key: "ntn", label: "NTN (if you are an FBR filer)", hint: "Leave empty if you don't have one" },
  { key: "bank_name", label: "Bank name", hint: "Where your salary should go" },
  { key: "bank_iban", label: "IBAN / account number" },
  { key: "emergency_name", label: "Emergency contact — name" },
  { key: "emergency_relationship", label: "Emergency contact — relationship" },
  { key: "emergency_phone", label: "Emergency contact — phone" },
];

const UpdateInfo = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") ?? "";

  const [state, setState] = useState<"loading" | "form" | "invalid" | "done" | "error">("loading");
  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token || !supabase) {
        setState("invalid");
        return;
      }
      const { data, error } = await supabase.rpc("get_update_request", { req_token: token });
      const payload = data as RequestInfo | null;
      if (error || !payload?.valid) {
        setState("invalid");
        return;
      }
      setInfo(payload);
      const raw = payload as unknown as Record<string, unknown>;
      setValues(
        Object.fromEntries(
          FIELDS.map((field) => [field.key, String(raw[field.key] ?? "")]),
        ),
      );
      setState("form");
    })();
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_update_request", {
        req_token: token,
        payload: values,
      });
      setState(error || data !== true ? "error" : "done");
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center px-6 py-5">
        <Link to="/" aria-label="Synaptic Lab">
          <Logo className="h-7" />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          {state === "loading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Checking your link…
            </p>
          )}

          {state === "invalid" && (
            <div className="surface p-8 text-center">
              <Clock size={22} aria-hidden="true" className="mx-auto text-amber-500" />
              <h1 className="type-display mt-4 text-2xl text-foreground">
                This link has expired
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Update links are valid for 24 hours and can be used once. Ask
                HR to send you a fresh one.
              </p>
            </div>
          )}

          {state === "done" && (
            <div className="surface p-8 text-center">
              <CheckCircle2 size={22} aria-hidden="true" className="mx-auto text-emerald-500" />
              <h1 className="type-display mt-4 text-2xl text-foreground">
                Thank you — details sent
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your information has been submitted for review. It will appear
                in the company records once HR approves it. You can close this
                page.
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="surface p-8 text-center">
              <h1 className="type-display text-2xl text-foreground">Something went wrong</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                The submission didn't go through — the link may have just
                expired. Ask HR for a fresh one.
              </p>
            </div>
          )}

          {state === "form" && info && (
            <>
              <h1 className="type-display text-3xl text-foreground">
                Hi {info.full_name?.split(" ")[0]} 👋
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Synaptic Lab is updating its records. Please check the details
                below, correct anything that changed, and submit. HR reviews
                every change before it is saved.
              </p>

              <form onSubmit={submit} className="surface mt-6 flex flex-col gap-5 p-6">
                {FIELDS.map((field) => (
                  <Field key={field.key} id={`u-${field.key}`} label={field.label} hint={field.hint}>
                    <input
                      id={`u-${field.key}`}
                      type={field.type ?? "text"}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      className={inputClass()}
                    />
                  </Field>
                ))}

                <Button type="submit" disabled={submitting} className="mt-2">
                  {submitting && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  {submitting ? "Sending…" : "Submit my details"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  This link works once and expires 24 hours after it was issued.
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UpdateInfo;
