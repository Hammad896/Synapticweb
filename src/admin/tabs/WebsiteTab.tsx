import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, Label } from "@/components/kit";
import { AnnouncementForm, CapabilityForm, PartnerForm } from "../ContentForms";
import type {
  Announcement,
  SiteCapability,
  SiteCapabilityDraft,
  SitePartner,
  SitePartnerDraft,
} from "../repository";
import type { Employee } from "../types";

type Editing =
  | { kind: "announcement"; value?: Announcement }
  | { kind: "partner"; value?: SitePartner }
  | { kind: "capability"; value?: SiteCapability }
  | null;

interface Props {
  employees: Employee[];
  announcements: Announcement[];
  partners: SitePartner[];
  capabilities: SiteCapability[];
  onSaveAnnouncement: (draft: Omit<Announcement, "id" | "createdAt">) => Promise<void>;
  onUpdateAnnouncement: (
    announcement: Announcement,
    draft: Omit<Announcement, "id" | "createdAt">,
  ) => Promise<void>;
  onToggleAnnouncement: (announcement: Announcement) => Promise<void>;
  onDeleteAnnouncement: (announcement: Announcement) => Promise<void>;
  onSavePartner: (draft: SitePartnerDraft, id?: string) => Promise<void>;
  onDeletePartner: (partner: SitePartner) => Promise<void>;
  onSaveCapability: (draft: SiteCapabilityDraft, id?: string) => Promise<void>;
  onDeleteCapability: (capability: SiteCapability) => Promise<void>;
}

/**
 * Everything the public site shows, editable from one place.
 *
 * Before this, the announcement bar, the partners and the capabilities were
 * hardcoded in the bundle: changing a single word meant a code change and a
 * redeploy. Now the site reads them from the database and the admin owns them.
 */
const WebsiteTab = ({
  employees,
  announcements,
  partners,
  capabilities,
  onSaveAnnouncement,
  onUpdateAnnouncement,
  onToggleAnnouncement,
  onDeleteAnnouncement,
  onSavePartner,
  onDeletePartner,
  onSaveCapability,
  onDeleteCapability,
}: Props) => {
  const [editing, setEditing] = useState<Editing>(null);

  const published = employees.filter((e) => e.showOnWebsite && e.status === "active");
  const close = () => setEditing(null);

  if (editing?.kind === "announcement") {
    return (
      <AnnouncementForm
        announcement={editing.value}
        onSave={async (draft) => {
          if (editing.value) await onUpdateAnnouncement(editing.value, draft);
          else await onSaveAnnouncement(draft);
          close();
        }}
        onCancel={close}
      />
    );
  }

  if (editing?.kind === "partner") {
    return (
      <PartnerForm
        partner={editing.value}
        onSave={async (draft, id) => {
          await onSavePartner(draft, id);
          close();
        }}
        onCancel={close}
      />
    );
  }

  if (editing?.kind === "capability") {
    return (
      <CapabilityForm
        capability={editing.value}
        onSave={async (draft, id) => {
          await onSaveCapability(draft, id);
          close();
        }}
        onCancel={close}
      />
    );
  }

  return (
    <>
      <h1 className="type-display text-2xl text-foreground sm:text-4xl">Website</h1>
      <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
        Everything the public site shows. Changes appear immediately — no deploy.
      </p>

      {/* ── Announcements ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Label>Announcement bar</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              A single line beneath the site header. The newest live one shows.
            </p>
          </div>

          <Button onClick={() => setEditing({ kind: "announcement" })}>
            <Plus size={15} aria-hidden="true" />
            New announcement
          </Button>
        </div>

        {announcements.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No announcements"
              description="Create one and it appears in the bar under the site header."
              action={
                <Button onClick={() => setEditing({ kind: "announcement" })}>
                  Create the first one
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {announcements.map((a) => (
              <li key={a.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={a.isActive ? "success" : "neutral"} dot>
                        {a.isActive ? "live" : "off"}
                      </Badge>
                      <Badge>{a.kind}</Badge>
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.title}
                      </p>
                    </div>
                    {a.body && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {a.body}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => void onToggleAnnouncement(a)}
                    >
                      {a.isActive ? "Take down" : "Publish"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setEditing({ kind: "announcement", value: a })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        if (window.confirm(`Delete "${a.title}"?`)) {
                          void onDeleteAnnouncement(a);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Partners ──────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Label>Partners</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown on the home page and{" "}
              <Link to="/partners" className="text-accent hover:opacity-70">
                /partners
              </Link>
              .
            </p>
          </div>

          <Button onClick={() => setEditing({ kind: "partner" })}>
            <Plus size={15} aria-hidden="true" />
            Add partner
          </Button>
        </div>

        {partners.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No partners added"
              description="Until one is added, the site falls back to the built-in Noregna / Superlogics entries."
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {partners.map((p) => (
              <li key={p.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={p.isActive ? "success" : "neutral"} dot>
                        {p.isActive ? "live" : "hidden"}
                      </Badge>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      {p.country && <Badge>{p.country}</Badge>}
                    </div>
                    <p className="mt-1.5 text-xs text-accent">{p.relationship}</p>
                    {p.description && (
                      <p className="measure mt-2 text-xs leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setEditing({ kind: "partner", value: p })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        if (window.confirm(`Remove ${p.name} from the site?`)) {
                          void onDeletePartner(p);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Capabilities ──────────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Label>Capabilities</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              The numbered product lines. Length limits keep the rows from breaking.
            </p>
          </div>

          <Button onClick={() => setEditing({ kind: "capability" })}>
            <Plus size={15} aria-hidden="true" />
            Add capability
          </Button>
        </div>

        {capabilities.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No capabilities added"
              description="Until one is added, the site falls back to the five built-in product lines."
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {capabilities.map((c, i) => (
              <li key={c.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs tabular-nums text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Badge tone={c.isActive ? "success" : "neutral"} dot>
                        {c.isActive ? "live" : "hidden"}
                      </Badge>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                    </div>
                    <p className="measure mt-2 text-xs leading-relaxed text-muted-foreground">
                      {c.description}
                    </p>
                    {c.detail.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {c.detail.join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setEditing({ kind: "capability", value: c })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        if (window.confirm(`Delete "${c.title}"?`)) {
                          void onDeleteCapability(c);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Label>Team page</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Tick “Show on the public website” on an employee to publish them to{" "}
              <Link to="/team" className="text-accent hover:opacity-70">
                /team
              </Link>
              .
            </p>
          </div>

          <a
            href="/team"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent"
          >
            <ExternalLink size={13} aria-hidden="true" />
            View live
          </a>
        </div>

        {published.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nobody is published yet"
              description="Until someone is published, /team falls back to the built-in org chart."
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
    </>
  );
};

export default WebsiteTab;
