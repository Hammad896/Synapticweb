import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { Card, Section, SectionHeader } from "@/components/kit";
import { supabase } from "@/lib/supabase";

interface TeamMember {
  full_name: string;
  role: string;
  department: string;
  public_bio: string;
  photo_path: string | null;
  joined_at: string;
}

/**
 * The live team roster. Flip "Show on website" for an employee in the admin panel
 * and they appear here — no code change, no redeploy.
 *
 * It reads the `public_team` view, which exposes only name, role, department, bio
 * and photo. Salary, CNIC, address and emergency contacts are not "hidden by the
 * UI" — Row Level Security means they are never sent to this page at all.
 *
 * The section renders NOTHING when the roster is empty (or the DB isn't wired),
 * so the marketing page never shows an empty "Our Team" heading — the worst
 * possible look for a firm claiming to have one.
 */
const Team = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data } = await supabase
        .from("public_team")
        .select("*")
        .order("public_order");

      if (!data?.length) return;
      setMembers(data as TeamMember[]);

      // Photos live in a private bucket, so each needs a signed URL.
      const signed: Record<string, string> = {};
      for (const member of data as TeamMember[]) {
        if (!member.photo_path) continue;
        const { data: url } = await supabase!.storage
          .from("employee-photos")
          .createSignedUrl(member.photo_path, 3600);
        if (url?.signedUrl) signed[member.photo_path] = url.signedUrl;
      }
      setPhotos(signed);
    };

    void load();
  }, []);

  if (members.length === 0) return null;

  return (
    <Section id="team">
      <SectionHeader
        eyebrow="The Team"
        title="The people behind the work."
        description="Engineers, not account managers. The people who architect your system are the people who build it."
      />

      <div className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {members.map((member, i) => {
          const photo = member.photo_path ? photos[member.photo_path] : null;
          const initials = member.full_name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase();

          return (
            <Reveal key={member.full_name} index={i}>
              <Card as="article" hover className="h-full">
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-sm font-medium text-accent transition-colors duration-500 group-hover:border-white/40 group-hover:text-white">
                    {initials}
                  </div>
                )}

                <h3 className="type-display mt-6 text-xl text-foreground transition-colors duration-500 group-hover:text-white">
                  {member.full_name}
                </h3>

                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 group-hover:text-white/70">
                  {member.role}
                </p>

                {member.public_bio && (
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground transition-colors duration-500 group-hover:text-white/80">
                    {member.public_bio}
                  </p>
                )}
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
};

export default Team;
