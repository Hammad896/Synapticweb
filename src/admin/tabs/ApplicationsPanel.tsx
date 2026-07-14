import { ExternalLink, Mail, Phone } from "lucide-react";
import { Badge, EmptyState, Label } from "@/components/kit";
import { shortDate } from "../format";
import type { Application } from "../repository";
import { cn } from "@/lib/utils";

const STATUSES: Application["status"][] = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
];

const tone = (status: Application["status"]) =>
  status === "hired"
    ? "success"
    : status === "shortlisted"
      ? "accent"
      : status === "rejected"
        ? "danger"
        : status === "reviewing"
          ? "warning"
          : "neutral";

/**
 * Applications from the public careers page.
 *
 * They are recorded in the database BEFORE the notification email is sent, so an
 * application survives even if the mail relay is down. A candidate you never
 * knew applied is the worst possible failure mode for hiring.
 */
const ApplicationsPanel = ({
  applications,
  onStatus,
}: {
  applications: Application[];
  onStatus: (id: string, status: Application["status"], name: string) => Promise<void>;
}) => {
  const fresh = applications.filter((a) => a.status === "new").length;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3">
        <Label>Applications</Label>
        {fresh > 0 && <Badge tone="accent">{fresh} new</Badge>}
      </div>

      {applications.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No applications yet"
            description="Applications submitted from the careers page land here — and are emailed to you."
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {applications.map((application) => (
            <li key={application.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {application.fullName}
                    </p>
                    <Badge tone={tone(application.status)} dot>
                      {application.status}
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-accent">{application.role}</p>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <a
                      href={`mailto:${application.email}`}
                      className="flex items-center gap-1.5 transition-colors hover:text-accent"
                    >
                      <Mail size={12} aria-hidden="true" />
                      {application.email}
                    </a>
                    {application.phone && (
                      <a
                        href={`tel:${application.phone}`}
                        className="flex items-center gap-1.5 transition-colors hover:text-accent"
                      >
                        <Phone size={12} aria-hidden="true" />
                        {application.phone}
                      </a>
                    )}
                    {application.portfolio && (
                      <a
                        href={application.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 transition-colors hover:text-accent"
                      >
                        <ExternalLink size={12} aria-hidden="true" />
                        CV / Portfolio
                      </a>
                    )}
                    <span>{shortDate(application.createdAt)}</span>
                  </div>

                  {application.experience && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      <span className="text-foreground">Experience:</span>{" "}
                      {application.experience}
                    </p>
                  )}

                  {application.coverNote && (
                    <p className="measure mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {application.coverNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        void onStatus(application.id, status, application.fullName)
                      }
                      aria-pressed={application.status === status}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] capitalize transition-transform active:scale-95",
                        application.status === status
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ApplicationsPanel;
