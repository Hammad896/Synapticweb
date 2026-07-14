import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/kit";
import { EMPTY_JOB, JOB_TYPES, type Job, type JobDraft } from "./repository";

/** Same fields, same inputs, same buttons as EmployeeForm — one form language. */
const JobForm = ({
  job,
  onSave,
  onCancel,
}: {
  job?: Job;
  onSave: (draft: JobDraft) => Promise<void>;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<JobDraft>(job ?? EMPTY_JOB);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="job-role" label="Job title">
          <input
            id="job-role"
            required
            value={draft.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Senior Backend Engineer"
            className={inputClass()}
          />
        </Field>

        <Field id="job-type" label="Type">
          <select
            id="job-type"
            value={draft.type}
            onChange={(e) => set("type", e.target.value)}
            className={inputClass()}
          >
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field id="job-location" label="Location">
          <input
            id="job-location"
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Islamabad / Remote"
            className={inputClass()}
          />
        </Field>
      </div>

      <Field
        id="job-pitch"
        label="Pitch"
        hint="One or two lines. This is what shows on the careers list."
      >
        <textarea
          id="job-pitch"
          rows={2}
          required
          value={draft.pitch}
          onChange={(e) => set("pitch", e.target.value)}
          placeholder="Own the data layer of a multi-entity ERP running in production."
          className={inputClass("resize-none")}
        />
      </Field>

      <Field id="job-description" label="Full description" hint="Internal for now.">
        <textarea
          id="job-description"
          rows={5}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          className={inputClass("resize-none")}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#0067AE]"
        />
        <span>
          <span className="text-sm text-foreground">Open — show on the website</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Closing a role removes it from the public careers section immediately. A closed
            role is never sent to the browser at all.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {job ? "Save changes" : "Post role"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default JobForm;
