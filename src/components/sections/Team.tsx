import Reveal from "@/components/Reveal";
import { Section, SectionHeader } from "@/components/kit";
import { TEAM, TEAM_INTRO, type TeamMemberProfile } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The org chart.
 *
 * Deliberately hierarchical rather than a flat grid of equal cards: the CEO's
 * card spans the full width at the top, the two managers sit beneath, and the
 * senior engineers below them. The layout IS the reporting line — a visitor
 * understands who answers to whom without reading a word of it.
 *
 * Names and roles only. Salary, CNIC, phone and emergency contacts live in the
 * database behind row-level security and are never compiled into this bundle.
 */
const MemberCard = ({
  member,
  index,
  featured = false,
}: {
  member: TeamMemberProfile;
  index: number;
  featured?: boolean;
}) => (
  <Reveal
    as="article"
    index={index}
    className={cn(
      "group surface card-pad relative isolate overflow-hidden",
      "transition-transform duration-500 ease-apple hover:scale-[1.02]",
      featured && "lg:col-span-2",
    )}
  >
    <span
      aria-hidden="true"
      className="gradient-fill absolute inset-0 -z-10 origin-bottom scale-y-0 transition-transform duration-500 ease-apple group-hover:scale-y-100"
    />

    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-border font-medium text-accent transition-colors duration-500 group-hover:border-white/40 group-hover:text-white",
        featured ? "h-20 w-20 text-lg" : "h-14 w-14 text-sm",
      )}
    >
      {member.initials}
    </div>

    <header className={featured ? "mt-8" : "mt-6"}>
      <h3
        className={cn(
          "type-display text-foreground transition-colors duration-500 group-hover:text-white",
          featured ? "text-3xl md:text-5xl" : "text-2xl",
        )}
      >
        {member.name}
      </h3>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-accent transition-colors duration-500 group-hover:text-white/80">
        {member.role}
      </p>
    </header>

    <p
      className={cn(
        "measure mt-6 leading-relaxed text-muted-foreground transition-colors duration-500 group-hover:text-white/80",
        featured ? "text-base md:text-lg" : "text-sm",
      )}
    >
      {member.summary}
    </p>

    <ul className="mt-8 border-t border-border pt-2 transition-colors duration-500 group-hover:border-white/20">
      {member.domains.map((domain) => (
        <li
          key={domain}
          className="border-b border-border py-3 text-sm text-foreground transition-colors duration-500 last:border-b-0 group-hover:border-white/15 group-hover:text-white/90"
        >
          {domain}
        </li>
      ))}
    </ul>
  </Reveal>
);

/** A vertical rule in the brand gradient — the reporting line, drawn. */
const Connector = () => (
  <div className="flex justify-center py-6" aria-hidden="true">
    <span className="gradient-synapse h-10 w-px opacity-60" />
  </div>
);

const Team = () => {
  const ceo = TEAM.find((m) => m.level === 0);
  const managers = TEAM.filter((m) => m.level === 1);
  const engineers = TEAM.filter((m) => m.level === 2);

  return (
    <Section id="team">
      <SectionHeader
        eyebrow={TEAM_INTRO.eyebrow}
        title={TEAM_INTRO.headline}
        description={TEAM_INTRO.description}
      />

      <div className="mt-12 sm:mt-16">
        {ceo && (
          <div className="grid lg:grid-cols-2">
            <MemberCard member={ceo} index={0} featured />
          </div>
        )}

        {managers.length > 0 && (
          <>
            <Connector />
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
              {managers.map((member, i) => (
                <MemberCard key={member.name} member={member} index={i + 1} />
              ))}
            </div>
          </>
        )}

        {engineers.length > 0 && (
          <>
            <Connector />
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
              {engineers.map((member, i) => (
                <MemberCard key={member.name} member={member} index={i + 3} />
              ))}
            </div>
          </>
        )}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Everyone reports to the CEO. There is no layer between you and the people writing
        your code.
      </p>
    </Section>
  );
};

export default Team;
