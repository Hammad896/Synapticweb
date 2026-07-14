import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { Section } from "@/components/kit";

export interface NextLink {
  label: string;
  title: string;
  to: string;
}

/**
 * The end of a page should be a door, not a wall.
 *
 * Every sub-page previously just… stopped. A visitor who read to the bottom of
 * "How we work" had nowhere to go but the browser's back button, which is the
 * point at which people leave. Two deliberate next steps, chosen per page.
 */
const PageNext = ({ links }: { links: NextLink[] }) => (
  <Section className="pt-0">
    <div className="rule mb-16" />

    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
      Keep going
    </p>

    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {links.map((link, i) => (
        <Reveal key={link.to} index={i}>
          <Link
            to={link.to}
            className="group surface relative isolate flex items-center justify-between gap-6 overflow-hidden p-6 transition-transform duration-500 ease-apple hover:scale-[1.02] sm:p-8"
          >
            <span
              aria-hidden="true"
              className="gradient-fill absolute inset-0 -z-10 origin-left scale-x-0 transition-transform duration-500 ease-apple group-hover:scale-x-100"
            />

            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-[0.2em] text-accent transition-colors duration-500 group-hover:text-white/80">
                {link.label}
              </span>
              <span className="type-display mt-2 block text-xl text-foreground transition-colors duration-500 group-hover:text-white sm:text-2xl">
                {link.title}
              </span>
            </span>

            <ArrowUpRight
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-all duration-500 ease-apple group-hover:translate-x-0.5 group-hover:text-white"
            />
          </Link>
        </Reveal>
      ))}
    </div>
  </Section>
);

export default PageNext;
