import Layout from "@/components/Layout";
import Hero from "@/components/sections/Hero";
import Engagements from "@/components/sections/Engagements";
import Capabilities from "@/components/sections/Capabilities";
import Partners from "@/components/sections/Partners";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/**
 * The home page. Deliberately NOT every section any more.
 *
 * It carries the offer (Hero), what you can buy (Engagements), what we build
 * (Capabilities) and the proof (Partners) — then hands off to the dedicated
 * pages. A home page that contains the whole site gives a visitor nowhere to go
 * and nothing to be curious about.
 */
const HomePage = () => (
  <Layout>
    <Hero />
    <Engagements />
    <Capabilities />
    <Partners />
    <ContactEndpoint />
  </Layout>
);

export default HomePage;
