import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { Badge, Section, SectionHeader } from "@/components/kit";
import { COMPANY } from "@/data/site";
import { supabase } from "@/lib/supabase";

interface OpenRole {
  id: string;
  role: string;
  type: string;
  location: string;
  pitch: string;
}

/**
 * Open roles, published live from the admin panel.
 *
 * Closed roles are not merely filtered out in the client — the RLS policy on
 * `jobs` only returns rows where `is_active = true`, so a closed vacancy is
 * never sent to the browser at all. Filtering in JavaScript would leave the
 * closed roles sitting in the network response for anyone who looked.
 *
 * Renders NOTHING when there are no openings. A careers section reading "no
 * current vacancies" makes a growing firm look becalmed; absence says nothing.
 */
const Careers = () => {
  const [roles, setRoles] = useState<OpenRole[]>([]);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, role, type, location, pitch")
        .order("created_at", { ascending: false });

      if (data?.length) setRoles(data as OpenRole[]);
    };

    void load();
  }, []);

  if (roles.length === 0) return null;

  return (
    <Section id="careers">
      <SectionHeader
        eyebrow="Careers"
        title="We are hiring."
        description="We are a small team that ships large systems. If you want to own real work rather than a ticket queue, we would like to hear from you."
      />

      <ul className="mt-12 sm:mt-16">
        {roles.map((role, i) => (
          <Reveal
            as="li"
            key={role.id}
            index={i}
            className="group relative isolate border-b border-border first:border-t"
          >
            <span
              aria-hidden="true"
              className="gradient-fill absolute inset-0 -z-10 origin-left scale-x-0 transition-transform duration-500 ease-apple group-hover:scale-x-100"
            />

            <a
              href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(
                `Application — ${role.role}`,
              )}`}
              className="grid items-center gap-x-8 gap-y-3 px-1 py-7 transition-[padding] duration-500 ease-apple group-hover:px-3 sm:px-4 sm:group-hover:px-8 lg:grid-cols-12"
            >
              <div className="lg:col-span-4">
                <h3 className="type-display text-xl text-foreground transition-colors duration-500 group-hover:text-white sm:text-2xl">
                  {role.role}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    tone="accent"
                    className="transition-colors duration-500 group-hover:border-white/40 group-hover:text-white"
                  >
                    {role.type}
                  </Badge>
                  <Badge className="transition-colors duration-500 group-hover:border-white/30 group-hover:text-white/80">
                    {role.location}
                  </Badge>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground transition-colors duration-500 group-hover:text-white/80 lg:col-span-7">
                {role.pitch}
              </p>

              <ArrowUpRight
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
                className="hidden text-muted-foreground opacity-0 transition-all duration-500 ease-apple group-hover:translate-x-1 group-hover:text-white group-hover:opacity-100 lg:col-span-1 lg:block lg:justify-self-end"
              />
            </a>
          </Reveal>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted-foreground">
        Nothing that fits?{" "}
        <a
          href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(
            "Speculative application",
          )}`}
          className="text-accent transition-opacity hover:opacity-70"
        >
          Write to us anyway
        </a>{" "}
        — we hire good engineers when we meet them.
      </p>
    </Section>
  );
};

export default Careers;
