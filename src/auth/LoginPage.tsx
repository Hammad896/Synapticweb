import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, TriangleAlert } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "./auth";

const FIELD =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors duration-300 " +
  "focus:border-accent focus:outline-none";

const LABEL = "text-xs uppercase tracking-[0.2em] text-muted-foreground";

/** Slows a UI brute-force to a crawl. It is friction, not a security boundary. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

const LoginPage = () => {
  const { user, isReady, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  if (isReady && user) return <Navigate to="/admin" replace />;

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLocked) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      // On success the guard above redirects — nothing else to do here.
    } catch (caught) {
      const next = attempts + 1;
      setAttempts(next);

      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError("Too many attempts. Try again in 30 seconds.");
      } else {
        setError(
          caught instanceof Error ? caught.message : "Sign-in failed. Try again.",
        );
      }

      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" aria-label="Back to the public site">
          <Logo className="h-7" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-9 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-accent">
              <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h1 className="type-display mt-6 text-3xl text-foreground">Staff sign-in</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Internal access only. Employee records are not public.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="surface flex flex-col gap-6 p-7">
            <div>
              <label htmlFor="email" className={LABEL}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@synaptic.com"
                className={`${FIELD} mt-2.5`}
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL}>
                Password
              </label>
              <div className="relative mt-2.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={`${FIELD} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="flex items-center justify-center gap-2 rounded-full bg-accent-solid px-6 py-3.5 text-base font-medium text-accent-foreground transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              )}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* This must stay on the page. Hiding it would be the actual dishonesty:
              it looks like a login, so someone will assume it protects something. */}
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
            <TriangleAlert
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Development gate — not real authentication.
              </span>{" "}
              The credentials are checked in the browser, so they exist in the shipped
              JavaScript. This keeps casual visitors out; it will not stop anyone who opens
              DevTools. Wire OAuth or Supabase Auth before storing real salary data.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
