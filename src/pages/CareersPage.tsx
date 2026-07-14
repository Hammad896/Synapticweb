import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Careers from "@/components/sections/Careers";

/** `showEmpty` — on the dedicated page an honest "no open roles" is correct. */
const CareersPage = () => (
  <Layout>
    <PageHero
      eyebrow="Careers"
      title="Build things that carry real weight."
      description="We are a small team shipping large systems for clients abroad. If you want to own real work rather than a ticket queue, and put your name on it, we would like to hear from you."
    />

    <Careers showEmpty hideHeader />

    <PageNext
      links={[
        { label: "Team", title: "Who you would be working with", to: "/team" },
        { label: "Capabilities", title: "What we build", to: "/capabilities" },
      ]}
    />
  </Layout>
);

export default CareersPage;
