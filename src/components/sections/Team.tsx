import { useEffect, useState, type ReactNode } from "react";
import Reveal from "@/components/Reveal";
import { Section, SectionHeader } from "@/components/kit";
import { getRepository } from "@/admin/repository";
import { useSiteContent } from "@/hooks/use-site-content";
import { TEAM, type TeamMemberProfile } from "@/data/site";

/**
 * The team, as an org structure — not a sales page.
 *
 * The previous version gave every person a huge card with a long bio and a
 * bulleted list of "domains of authority". It read like a pitch deck. A team
 * page's job is to show who works here and who answers to whom — the people, not
 * the positioning.
 *
 * So: one compact card each, grouped by tier, with the reporting line stated
 * plainly rather than dramatised. The CEO sits at the top because that is the
 * structure, not because he needs a bigger box.
 */
const MemberCard = ({
  member,
  index,
  photo,
}: {
  member: TeamMemberProfile;
  index: number;
  photo?: string;
}) => (
  <Reveal
    as="article"
    index={index}
    className="group surface flex items-start gap-4 p-5 transition-colors duration-500 ease-apple hover:border-accent/40"
  >
    {photo ? (
      <img
        src={photo}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-accent">
        {member.initials}
      </div>
    )}

    <div className="min-w-0">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {member.name}
      </h3>
      <p className="mt-0.5 text-xs text-accent">{member.role}</p>

      {member.summary && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {member.summary}
        </p>
      )}
    </div>
  </Reveal>
);

/** A quiet tier label with a hairline. Structure, not decoration. */
const Tier = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mt-10 first:mt-0">
    <div className="flex items-center gap-4">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </div>
);

const Team = () => {
  const { content } = useSiteContent();
  const intro = content.intros.team;

  const [live, setLive] = useState<TeamMemberProfile[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const repository = getRepository();

    void repository
      .listEmployees()
      .then(async (rows) => {
        const published = rows.filter((e) => e.showOnWebsite && e.status === "active");
        if (published.length === 0) return;

        setLive(
          published.map((e) => {
            /* Hierarchy is DERIVED from the manager field, never stored twice:
               nobody above them = CEO; reporting to the CEO = manager; the rest
               are engineers. */
            const hasManager = e.manager.trim() !== "";
            const reportsToCeo =
              hasManager &&
              published.some((m) => m.fullName === e.manager && m.manager.trim() === "");

            return {
              name: e.fullName,
              role: e.role,
              initials: e.fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase(),
              level: (!hasManager ? 0 : reportsToCeo ? 1 : 2) as 0 | 1 | 2,
              summary: e.publicBio,
              domains: [],
            };
          }),
        );

        // Photos live in a private bucket; each needs a signed URL.
        const signed: Record<string, string> = {};
        for (const e of published) {
          if (!e.photoPath) continue;
          const url = await repository.photoUrl(e.photoPath);
          if (url) signed[e.fullName] = url;
        }
        setPhotos(signed);
      })
      .catch(() => {
        /* fall back to the built-in chart */
      });
  }, []);

  const roster = live ?? TEAM;
  const ceo = roster.filter((m) => m.level === 0);
  const managers = roster.filter((m) => m.level === 1);
  const engineers = roster.filter((m) => m.level === 2);

  if (roster.length === 0) return null;

  return (
    <Section id="team">
      <SectionHeader
        eyebrow={intro.eyebrow}
        title={intro.headline}
        description={intro.description}
      />

      <div className="mt-12 sm:mt-16">
        {ceo.length > 0 && (
          <Tier label="Leadership">
            {ceo.map((m, i) => (
              <MemberCard key={m.name} member={m} index={i} photo={photos[m.name]} />
            ))}
          </Tier>
        )}

        {managers.length > 0 && (
          <Tier label="Management">
            {managers.map((m, i) => (
              <MemberCard key={m.name} member={m} index={i + 1} photo={photos[m.name]} />
            ))}
          </Tier>
        )}

        {engineers.length > 0 && (
          <Tier label="Engineering">
            {engineers.map((m, i) => (
              <MemberCard key={m.name} member={m} index={i + 2} photo={photos[m.name]} />
            ))}
          </Tier>
        )}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Everyone reports to the CEO. There is no layer between you and the people writing
        your code.
      </p>
    </Section>
  );
};

export default Team;
