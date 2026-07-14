import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/auth/auth";
import RequireAuth from "@/auth/RequireAuth";
import Layout from "@/components/Layout";
import Hero from "@/components/sections/Hero";
import Engagements from "@/components/sections/Engagements";
import Capabilities from "@/components/sections/Capabilities";
import Partners from "@/components/sections/Partners";
import Leadership from "@/components/sections/Leadership";
import Team from "@/components/sections/Team";
import Process from "@/components/sections/Process";
import Technologies from "@/components/sections/Technologies";
import Faq from "@/components/sections/Faq";
import Careers from "@/components/sections/Careers";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/**
 * The HR module carries pdf-lib, qrcode and the whole admin surface — roughly
 * half the bundle. Lazy-loading it means a visitor to the marketing site never
 * downloads a single byte of it. They are the 99%; they should not pay for the
 * back office.
 */
const AdminPage = lazy(() => import("@/admin/AdminPage"));
const LoginPage = lazy(() => import("@/auth/LoginPage"));
const Verify = lazy(() => import("@/pages/Verify"));

/** The public marketing site. Section order here IS the page outline. */
const HomePage = () => (
  <Layout>
    <Hero />
    <Engagements />
    <Capabilities />
    <Partners />
    <Leadership />
    {/* Renders only once someone is published from the admin panel. */}
    <Team />
    <Process />
    <Technologies />
    <Faq />
    {/* Renders only when a role is open in the admin panel. */}
    <Careers />
    <ContactEndpoint />
  </Layout>
);

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">Loading…</p>
  </div>
);

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/staff-login" element={<LoginPage />} />

            {/* Public — where the QR codes on letters and ID cards land. */}
            <Route path="/verify" element={<Verify />} />

            {/* Guarded. With Supabase configured, the guard is backed by real
                auth and RLS: employee data is never sent to an unauthenticated
                browser at all. Without it, the guard is cosmetic — see ADMIN.md. */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
