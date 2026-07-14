import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Team from "@/components/sections/Team";
import { useSiteContent } from "@/hooks/use-site-content";

const TeamPage = () => {
  const { content } = useSiteContent();
  const intro = content.intros.team;

  return (
    <Layout>
      <PageHero
        eyebrow="Team"
        title={intro.headline}
        description={intro.description}
      />

      <Team hideHeader />

      <PageNext
        links={[
          { label: "Careers", title: "Come and build with us", to: "/careers" },
          { label: "Partners", title: "Who we build for", to: "/partners" },
        ]}
      />
    </Layout>
  );
};

export default TeamPage;
