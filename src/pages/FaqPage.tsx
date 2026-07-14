import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import PageNext from "@/components/PageNext";
import Faq from "@/components/sections/Faq";
import { useSiteContent } from "@/hooks/use-site-content";

const FaqPage = () => {
  const { content } = useSiteContent();
  const intro = content.intros.faq;

  return (
    <Layout>
      <PageHero
        eyebrow="FAQ"
        title={intro.headline}
        description={intro.description}
      />

      <Faq hideHeader />

      <PageNext
        links={[
          { label: "How we work", title: "Two ways to put us to work", to: "/how-we-work" },
          { label: "Contact", title: "Ask us directly", to: "/contact" },
        ]}
      />
    </Layout>
  );
};

export default FaqPage;
