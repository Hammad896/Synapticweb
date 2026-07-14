import Layout from "@/components/Layout";
import Careers from "@/components/sections/Careers";
import ContactEndpoint from "@/components/sections/ContactEndpoint";

/** `showEmpty` — on the dedicated page an honest "no open roles" is correct. */
const CareersPage = () => (
  <Layout>
    <Careers showEmpty />
    <ContactEndpoint />
  </Layout>
);

export default CareersPage;
