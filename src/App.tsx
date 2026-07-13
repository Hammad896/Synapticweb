import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/auth/auth";
import RequireAuth from "@/auth/RequireAuth";
import LoginPage from "@/auth/LoginPage";
import Layout from "@/components/Layout";
import Hero from "@/components/sections/Hero";
import Engagements from "@/components/sections/Engagements";
import Capabilities from "@/components/sections/Capabilities";
import Partners from "@/components/sections/Partners";
import Leadership from "@/components/sections/Leadership";
import Process from "@/components/sections/Process";
import Technologies from "@/components/sections/Technologies";
import Faq from "@/components/sections/Faq";
import ContactEndpoint from "@/components/sections/ContactEndpoint";
import AdminPage from "@/admin/AdminPage";

/** The public marketing site. Section order here IS the page outline. */
const HomePage = () => (
  <Layout>
    <Hero />
    <Engagements />
    <Capabilities />
    <Partners />
    <Leadership />
    <Process />
    <Technologies />
    <Faq />
    <ContactEndpoint />
  </Layout>
);

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/staff-login" element={<LoginPage />} />

          {/* Guarded. Note that the guard decides what RENDERS — it is not a
              security boundary, because the bundle is already on the visitor's
              machine. Real protection is a server refusing to send the data. */}
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
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
