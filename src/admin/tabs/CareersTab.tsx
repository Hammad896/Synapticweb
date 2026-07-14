import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/kit";
import JobForm from "../JobForm";
import type { Job, JobDraft } from "../repository";

const CareersTab = ({
  jobs,
  onSave,
  onToggle,
  onDelete,
}: {
  jobs: Job[];
  onSave: (draft: JobDraft, editing: Job | null) => Promise<void>;
  onToggle: (job: Job) => Promise<void>;
  onDelete: (job: Job) => Promise<void>;
}) => {
  const [editing, setEditing] = useState<Job | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const close = () => {
    setEditing(null);
    setIsCreating(false);
  };

  if (isCreating || editing) {
    return (
      <section className="surface card-pad">
        <h1 className="type-display mb-8 text-2xl text-foreground">
          {editing ? `Edit — ${editing.role}` : "Post a role"}
        </h1>
        <JobForm
          job={editing ?? undefined}
          onSave={async (draft) => {
            await onSave(draft, editing);
            close();
          }}
          onCancel={close}
        />
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-2xl text-foreground sm:text-4xl">Careers</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {jobs.filter((j) => j.isActive).length} open ·{" "}
            {jobs.filter((j) => !j.isActive).length} closed
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)}>
          <Plus size={15} aria-hidden="true" />
          Post role
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No roles posted"
            description="Posting a role adds it to the careers section on the public site immediately."
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {jobs.map((job) => (
            <li key={job.id} className="surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{job.role}</p>
                    <Badge tone={job.isActive ? "success" : "neutral"} dot>
                      {job.isActive ? "open" : "closed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.type} · {job.location}
                  </p>
                  {job.pitch && (
                    <p className="measure mt-2 text-xs leading-relaxed text-muted-foreground">
                      {job.pitch}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => void onToggle(job)}
                  >
                    {job.isActive ? "Close" : "Reopen"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => setEditing(job)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete the "${job.role}" role? This cannot be undone.`,
                        )
                      ) {
                        void onDelete(job);
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
    </>
  );
};

export default CareersTab;
