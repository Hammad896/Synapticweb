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

const App = () => (
  <ThemeProvider>
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
  </ThemeProvider>
);

export default App;
