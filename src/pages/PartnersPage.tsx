import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Partners from "@/components/sections/Partners";
import { useSiteContent } from "@/hooks/use-site-content";

const PartnersPage = () => {
  const { content } = useSiteContent();
  const intro = content.intros.partners;

  return (
    <Layout>
      <PageHero
        eyebrow="Partners"
        title={intro.headline}
        description={intro.description}
      />

      <Partners hideHeader />

      <PageNext
        links={[
          { label: "Team", title: "The people who do the work", to: "/team" },
          { label: "How we work", title: "Two ways to put us to work", to: "/how-we-work" },
        ]}
      />
    </Layout>
  );
};

export default PartnersPage;
