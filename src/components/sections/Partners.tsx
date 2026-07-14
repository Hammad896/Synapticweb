import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { getRepository } from "@/admin/repository";
import { PARTNERS, PARTNERS_INTRO, type Partner } from "@/data/site";

const PartnerCard = ({ partner, index }: { partner: Partner; index: number }) => (
  <Reveal
    as="article"
    index={index}
    className="group surface card-pad relative isolate overflow-hidden transition-transform duration-500 ease-apple hover:scale-[1.02]"
  >
    {/* Same signature fill as the capability cards, so the page reads as one system. */}
    <div
      aria-hidden="true"
      className="gradient-fill absolute inset-0 -z-10 origin-bottom scale-y-0 transition-transform duration-500 ease-apple group-hover:scale-y-100"
    />

    <header className="flex items-baseline justify-between gap-6">
      <h3 className="type-display text-3xl text-foreground transition-colors duration-500 ease-apple group-hover:text-white md:text-4xl">
        {partner.name}
      </h3>
      <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-accent transition-colors duration-500 ease-apple group-hover:text-white/80">
        {partner.country}
      </span>
    </header>

    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 ease-apple group-hover:text-white/70">
      {partner.relationship}
    </p>

    <p className="measure mt-8 text-base leading-relaxed text-muted-foreground transition-colors duration-500 ease-apple group-hover:text-white/80">
      {partner.description}
    </p>
  </Reveal>
);

const Partners = () => {
  /* Managed content wins; the built-in entries are the fallback so the page is
     never empty before anything has been added in the admin. */
  const [live, setLive] = useState<Partner[] | null>(null);

  useEffect(() => {
    void getRepository()
      .listPartners()
      .then((rows) => {
        const active = rows.filter((r) => r.isActive);
        if (active.length > 0) {
          setLive(
            active.map((r) => ({
              name: r.name,
              country: r.country,
              relationship: r.relationship,
              description: r.description,
            })),
          );
        }
      })
      .catch(() => {
        /* fall back to the built-ins */
      });
  }, []);

  const partners = live ?? PARTNERS;

  return (
  <section id="partners" className="px-6 py-24 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal as="header" className="max-w-4xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {PARTNERS_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-5 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground sm:mt-6 md:text-6xl">
          {PARTNERS_INTRO.headline}
        </h2>
        <p className="measure mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          {PARTNERS_INTRO.description}
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:mt-16 sm:gap-6 lg:mt-20 md:grid-cols-2">
        {partners.map((partner, i) => (
          <PartnerCard key={partner.name} partner={partner} index={i} />
        ))}
      </div>
    </div>
  </section>
  );
};

export default Partners;
