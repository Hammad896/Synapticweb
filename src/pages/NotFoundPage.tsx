import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button, Section } from "@/components/kit";

/**
 * A real 404. Rendering the home page for an unknown URL hides broken links from
 * you and tells search engines the page exists when it doesn't.
 */
const NotFoundPage = () => (
  <Layout>
    <Section className="flex min-h-[60vh] items-center">
      <div className="mx-auto max-w-xl text-center">
        <p className="type-display text-6xl text-accent">404</p>
        <h1 className="type-display mt-6 text-3xl text-foreground md:text-5xl">
          That page doesn't exist.
        </h1>
        <p className="measure mx-auto mt-5 text-base leading-relaxed text-muted-foreground">
          The link may be out of date, or the address mistyped. Everything we do is one
          click away below.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
          <Link to="/capabilities">
            <Button variant="secondary">See what we build</Button>
          </Link>
          <Link to="/contact">
            <Button variant="ghost">Talk to us</Button>
          </Link>
        </div>
      </div>
    </Section>
  </Layout>
);

export default NotFoundPage;
