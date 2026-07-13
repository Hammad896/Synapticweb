import { useState, type FormEvent } from "react";
import { EMPTY_DRAFT, type Employee, type EmployeeDraft } from "./types";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors duration-300 focus:border-accent focus:outline-none";

const LABEL = "text-xs uppercase tracking-[0.15em] text-muted-foreground";

interface Props {
  /** Present when editing; absent when creating. */
  employee?: Employee;
  onSave: (draft: EmployeeDraft) => void;
  onCancel: () => void;
}

const EmployeeForm = ({ employee, onSave, onCancel }: Props) => {
  const [draft, setDraft] = useState<EmployeeDraft>(employee ?? EMPTY_DRAFT);

  const set = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setContact = (key: keyof EmployeeDraft["emergencyContact"], value: string) =>
    setDraft((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [key]: value },
    }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">Basics</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className={LABEL}>Full name</label>
            <input
              id="fullName" required value={draft.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Abdul Wahab" className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="role" className={LABEL}>Role</label>
            <input
              id="role" required value={draft.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Software Engineer" className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="department" className={LABEL}>Department</label>
            <input
              id="department" value={draft.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="Engineering" className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="status" className={LABEL}>Status</label>
            <select
              id="status" value={draft.status}
              onChange={(e) => set("status", e.target.value as EmployeeDraft["status"])}
              className={`${FIELD} mt-2`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <input
              id="email" type="email" value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@synapticlab.com" className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="phone" className={LABEL}>Phone</label>
            <input
              id="phone" value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92 300 0000000" className={`${FIELD} mt-2`}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Employment
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="joinedAt" className={LABEL}>Joined on</label>
            <input
              id="joinedAt" type="date" required value={draft.joinedAt}
              onChange={(e) => set("joinedAt", e.target.value)}
              className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="salaryAmount" className={LABEL}>Salary (monthly)</label>
            <input
              id="salaryAmount" type="number" min="0" step="1"
              value={draft.salaryAmount}
              onChange={(e) => set("salaryAmount", Number(e.target.value))}
              className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="salaryCurrency" className={LABEL}>Currency</label>
            <select
              id="salaryCurrency" value={draft.salaryCurrency}
              onChange={(e) => set("salaryCurrency", e.target.value)}
              className={`${FIELD} mt-2`}
            >
              {["PKR", "USD", "EUR", "NOK", "GBP"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Emergency contact
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="ecName" className={LABEL}>Name</label>
            <input
              id="ecName" value={draft.emergencyContact.name}
              onChange={(e) => setContact("name", e.target.value)}
              className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="ecRelationship" className={LABEL}>Relationship</label>
            <input
              id="ecRelationship" value={draft.emergencyContact.relationship}
              onChange={(e) => setContact("relationship", e.target.value)}
              placeholder="Brother" className={`${FIELD} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="ecPhone" className={LABEL}>Phone</label>
            <input
              id="ecPhone" value={draft.emergencyContact.phone}
              onChange={(e) => setContact("phone", e.target.value)}
              placeholder="+92 300 0000000" className={`${FIELD} mt-2`}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="notes" className={LABEL}>Notes</label>
        <textarea
          id="notes" rows={3} value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={`${FIELD} mt-2 resize-none`}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-full bg-accent-solid px-6 py-2.5 text-sm font-medium text-accent-foreground transition-all duration-300 hover:opacity-90"
        >
          {employee ? "Save changes" : "Add employee"}
        </button>
        <button
          type="button" onClick={onCancel}
          className="rounded-full border border-border px-6 py-2.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
