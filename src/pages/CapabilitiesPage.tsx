import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Capabilities from "@/components/sections/Capabilities";
import Technologies from "@/components/sections/Technologies";
import { useSiteContent } from "@/hooks/use-site-content";

const CapabilitiesPage = () => {
  const { content } = useSiteContent();
  const intro = content.intros.capabilities;

  return (
    <Layout>
      <PageHero
        eyebrow="Capabilities"
        title={intro.headline}
        description={intro.description}
      />

      <Capabilities hideHeader />
      <Technologies />

      <PageNext
        links={[
          { label: "How we work", title: "Two ways to put us to work", to: "/how-we-work" },
          { label: "Contact", title: "Tell us what you are building", to: "/contact" },
        ]}
      />
    </Layout>
  );
};

export default CapabilitiesPage;
