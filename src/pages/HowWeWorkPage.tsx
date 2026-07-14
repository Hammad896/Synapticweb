import Layout from "@/components/Layout";
import Engagements from "@/components/sections/Engagements";
import Process from "@/components/sections/Process";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/** How we work — the two engagement models, then the delivery method. */
const HowWeWorkPage = () => (
  <Layout>
    <Engagements />
    <Process />
    <ContactEndpoint />
  </Layout>
);

export default HowWeWorkPage;
