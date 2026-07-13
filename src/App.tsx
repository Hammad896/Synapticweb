import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Internal only. Not linked from the public site and excluded in
            robots.txt — though note that robots.txt is a request, not a guard.
            Real protection arrives with the authenticated backend. */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
