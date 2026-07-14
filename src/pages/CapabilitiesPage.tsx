import Layout from "@/components/Layout";
import Capabilities from "@/components/sections/Capabilities";
import Technologies from "@/components/sections/Technologies";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/** What we build, and the stack we build it on. */
const CapabilitiesPage = () => (
  <Layout>
    <Capabilities />
    <Technologies />
    <ContactEndpoint />
  </Layout>
);

export default CapabilitiesPage;
