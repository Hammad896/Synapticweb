import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import ContactEndpoint from "@/components/sections/ContactEndpoint";
import Faq from "@/components/sections/Faq";

const ContactPage = () => (
  <Layout>
    <PageHero
      eyebrow="Contact"
      title="Tell us what you are building."
      description="Engagements begin with a technical conversation, not a sales call. Describe the system and we will come back with an architectural point of view — not a brochure."
    />

    <ContactEndpoint />
    <Faq />
  </Layout>
);

export default ContactPage;
