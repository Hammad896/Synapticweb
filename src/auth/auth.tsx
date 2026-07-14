import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * ⚠️ READ THIS BEFORE TRUSTING THIS FILE WITH ANYTHING.
 *
 * This is a DEVELOPMENT GATE, not authentication.
 *
 * The credential check runs in the browser, which means the expected email and
 * password exist in the shipped JavaScript bundle. Anyone can open DevTools and
 * read them. Putting them in a `VITE_*` env var changes nothing — Vite inlines
 * those into the client bundle at build time. There is no way to keep a secret
 * in front-end code. None.
 *
 * What this gate honestly provides:
 *   ✅ keeps casual visitors out of /admin
 *   ✅ a real session, route guard, and sign-out flow
 *   ✅ the exact shape a real auth provider will slot into
 *
 * What it does NOT provide:
 *   ❌ protection of salary or emergency-contact data from anyone determined
 *   ❌ anything you could call security
 *
 * To make it real, implement `AuthAdapter` against Supabase Auth / Auth0 /
 * Google OAuth and swap the one line in `adapter` below. The server then decides
 * who you are, and the data is never sent to an unauthenticated client — which
 * is the part that actually matters. See docs/ADMIN.md.
 */

export interface AuthUser {
  email: string;
  name: string;
  role: "admin";
}

export interface AuthAdapter {
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Restores a session on page load, or null. */
  restore(): AuthUser | null;
}

const SESSION_KEY = "synapticlab.admin.session";

/**
 * DEV ONLY. `__DEV_AUTH__` is defined by vite.config.ts as false in production,
 * so this whole adapter is dead code that the minifier strips — the password is
 * physically absent from a production bundle rather than merely unused.
 *
 * A production build also FAILS unless Supabase is configured (see vite.config),
 * so this path cannot reach a deployed site at all.
 */
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? "admin@synaptic.com";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "synaptic896";

class DevCredentialAdapter implements AuthAdapter {
  async signIn(email: string, password: string): Promise<AuthUser> {
    // A deliberate delay. It blunts trivial brute-forcing in the UI and stops the
    // form from flashing — but it is UX, not a defence. Do not mistake it for one.
    await new Promise((resolve) => setTimeout(resolve, 450));

    const emailMatches = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (!emailMatches || password !== ADMIN_PASSWORD) {
      throw new Error("Those credentials don't match an account.");
    }

    const user: AuthUser = { email: ADMIN_EMAIL, name: "Administrator", role: "admin" };

    // sessionStorage, NOT localStorage: the session dies when the tab closes, so
    // a shared or forgotten machine does not stay signed in indefinitely.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  async signOut(): Promise<void> {
    sessionStorage.removeItem(SESSION_KEY);
  }

  restore(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}

/**
 * The real one. Supabase verifies the password on ITS server and returns a JWT;
 * Row Level Security then means employee data is never even sent to a browser
 * that isn't signed in. That is the difference between a gate and a lock.
 */
class SupabaseAuthAdapter implements AuthAdapter {
  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // Never echo the provider's raw error — it can distinguish "no such user"
    // from "wrong password", which hands an attacker a valid-email oracle.
    if (error || !data.user) {
      throw new Error("Those credentials don't match an account.");
    }

    return {
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.name as string) ?? "Administrator",
      role: "admin",
    };
  }

  async signOut(): Promise<void> {
    await supabase?.auth.signOut();
  }

  /** Supabase restores asynchronously; `AuthProvider` handles that below. */
  restore(): AuthUser | null {
    return null;
  }
}

/**
 * ★ Real auth when Supabase is configured. The dev gate is only reachable in a
 * development build — production refuses to build without Supabase.
 */
const adapter: AuthAdapter = isSupabaseConfigured
  ? new SupabaseAuthAdapter()
  : __DEV_AUTH__
    ? new DevCredentialAdapter()
    : (() => {
        throw new Error(
          "Supabase is not configured. A production build must not run without it.",
        );
      })();

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Restore before the guarded route paints, so a signed-in admin never sees the
  // login screen flash on refresh.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(adapter.restore());
      setIsReady(true);
      return;
    }

    // Supabase restores from its own storage asynchronously, and also emits on
    // token refresh and on sign-out from another tab — so we subscribe rather
    // than reading once.
    void supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setUser(
        session?.user
          ? {
              email: session.user.email ?? "",
              name: (session.user.user_metadata?.name as string) ?? "Administrator",
              role: "admin",
            }
          : null,
      );
      setIsReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? {
              email: session.user.email ?? "",
              name: (session.user.user_metadata?.name as string) ?? "Administrator",
              role: "admin",
            }
          : null,
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await adapter.signIn(email, password));
  }, []);

  const signOut = useCallback(async () => {
    await adapter.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isReady, signIn, signOut }),
    [user, isReady, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an <AuthProvider>");
  return context;
};
