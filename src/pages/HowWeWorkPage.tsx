import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Engagements from "@/components/sections/Engagements";
import Process from "@/components/sections/Process";
import { useSiteContent } from "@/hooks/use-site-content";

const HowWeWorkPage = () => {
  const { content } = useSiteContent();
  const intro = content.intros.engagements;

  return (
    <Layout>
      <PageHero
        eyebrow="How we work"
        title={intro.headline}
        description={intro.description}
      />

      <Engagements hideHeader />
      <Process />

      <PageNext
        links={[
          { label: "Capabilities", title: "What we build", to: "/capabilities" },
          { label: "Partners", title: "Who we do it for", to: "/partners" },
        ]}
      />
    </Layout>
  );
};

export default HowWeWorkPage;
