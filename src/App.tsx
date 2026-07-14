import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/auth/auth";
import RequireAuth from "@/auth/RequireAuth";
import ScrollToTop from "@/components/ScrollToTop";
import HomePage from "@/pages/HomePage";
import HowWeWorkPage from "@/pages/HowWeWorkPage";
import CapabilitiesPage from "@/pages/CapabilitiesPage";
import PartnersPage from "@/pages/PartnersPage";
import TeamPage from "@/pages/TeamPage";
import CareersPage from "@/pages/CareersPage";
import FaqPage from "@/pages/FaqPage";
import ContactPage from "@/pages/ContactPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * The HR module carries pdf-lib, qrcode and the whole admin surface — roughly
 * half the bundle. Lazy-loading it means a visitor to the marketing site never
 * downloads a single byte of it. They are the 99%; they should not pay for the
 * back office.
 */
const AdminPage = lazy(() => import("@/admin/AdminPage"));
const LoginPage = lazy(() => import("@/auth/LoginPage"));
const Verify = lazy(() => import("@/pages/Verify"));

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">Loading…</p>
  </div>
);

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ── The public site — one page per subject, one URL each ────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/how-we-work" element={<HowWeWorkPage />} />
            <Route path="/capabilities" element={<CapabilitiesPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Public — where the QR codes on letters and ID cards land. */}
            <Route path="/verify" element={<Verify />} />

            <Route path="/staff-login" element={<LoginPage />} />

            {/* Guarded. With Supabase configured the guard is backed by real auth
                and RLS: employee data is never sent to an unauthenticated
                browser at all. Without it, the guard is cosmetic — see ADMIN.md. */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            />

            {/* A real 404. Silently rendering the home page for any unknown URL
                tells the visitor nothing and tells Google the wrong thing. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
