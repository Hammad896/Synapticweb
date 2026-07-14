import Layout from "@/components/Layout";
import Faq from "@/components/sections/Faq";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/** The questions every client asks before they start. */
const FaqPage = () => (
  <Layout>
    <Faq />
    <ContactEndpoint />
  </Layout>
);

export default FaqPage;
