import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

/** Overridable at build time, but see the warning above: this is not a secret. */
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

/** ★ The single line to change when real auth arrives. */
const adapter: AuthAdapter = new DevCredentialAdapter();

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

  // Restore before first paint of the guarded route, so a signed-in admin never
  // sees the login screen flash on refresh.
  useEffect(() => {
    setUser(adapter.restore());
    setIsReady(true);
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
