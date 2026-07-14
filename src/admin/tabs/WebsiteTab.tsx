import { Badge, Button, EmptyState, Label } from "@/components/kit";
import type { Employee } from "../types";
import type { Announcement } from "../repository";

const WebsiteTab = ({
  employees,
  announcements,
  onToggle,
  onDelete,
}: {
  employees: Employee[];
  announcements: Announcement[];
  onToggle: (announcement: Announcement) => Promise<void>;
  onDelete: (announcement: Announcement) => Promise<void>;
}) => {
  const published = employees.filter((e) => e.showOnWebsite && e.status === "active");

  return (
    <>
      <h1 className="type-display text-2xl text-foreground sm:text-4xl">Website</h1>
      <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
        Publishing an employee adds them to the Team page and posts an announcement
        automatically.
      </p>

      <section className="mt-8">
        <Label>On the team page</Label>
        {published.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nobody is published yet"
              description="Tick “Show on the public website” on an employee record."
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {published.map((e) => (
              <li key={e.id}>
                <Badge tone="accent">
                  {e.fullName} — {e.role}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <Label>Announcements</Label>
        {announcements.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No announcements"
              description="These appear in the bar beneath the site header."
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {announcements.map((a) => (
              <li key={a.id} className="surface p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Badge tone={a.isActive ? "success" : "neutral"} dot>
                    {a.isActive ? "live" : "off"}
                  </Badge>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {a.title}
                  </p>
                </div>

                {a.body && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-2 text-xs sm:flex-none"
                    onClick={() => void onToggle(a)}
                  >
                    {a.isActive ? "Take down" : "Publish"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 py-2 text-xs sm:flex-none"
                    onClick={() => void onDelete(a)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default WebsiteTab;
