import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { Button, Field, inputClass } from "@/components/kit";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

/**
 * Where the password-recovery email lands. Supabase puts a short-lived
 * recovery session in the URL; supabase-js picks it up automatically, and
 * updateUser() is only honoured while that session is live — so this page is
 * useless to anyone who wasn't sent the email.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // The recovery link signs the browser in with a temporary session; wait
    // for it before showing the form so updateUser can actually succeed.
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      window.setTimeout(() => navigate("/admin"), 1800);
    } catch (caught) {
      setError(errorMessage(caught, "Could not update the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center px-6 py-5">
        <Link to="/" aria-label="Synaptic Lab">
          <Logo className="h-7" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {done ? (
            <div className="surface p-8 text-center">
              <CheckCircle2 size={22} aria-hidden="true" className="mx-auto text-emerald-500" />
              <h1 className="type-display mt-4 text-2xl text-foreground">Password updated</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Taking you to the admin…
              </p>
            </div>
          ) : !ready ? (
            <div className="surface p-8 text-center">
              <Lock size={20} aria-hidden="true" className="mx-auto text-accent" />
              <h1 className="type-display mt-4 text-2xl text-foreground">
                Waiting for your recovery link
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Open this page from the link in the password-reset email. If
                you landed here directly, request a reset from the{" "}
                <Link to="/staff-login" className="text-accent underline">
                  sign-in page
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="surface flex flex-col gap-5 p-7">
              <h1 className="type-display text-2xl text-foreground">Set a new password</h1>
              <Field id="new-password" label="New password">
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass()}
                />
              </Field>
              <Field id="confirm-password" label="Repeat it">
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass()}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
