import { useState, type FormEvent } from "react";
import {
  CURRENCIES,
  EMPLOYMENT_TYPES,
  EMPTY_DRAFT,
  WORK_MODES,
  type Employee,
  type EmployeeDraft,
} from "./types";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors duration-300 focus:border-accent focus:outline-none";

const LABEL = "text-xs uppercase tracking-[0.15em] text-muted-foreground";

interface Props {
  employee?: Employee;
  onSave: (draft: EmployeeDraft) => void;
  onCancel: () => void;
}

const Field = ({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={id} className={LABEL}>
      {label}
    </label>
    <div className="mt-2">{children}</div>
  </div>
);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-9">
      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">Identity</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="employeeId" label="Employee ID">
            <input
              id="employeeId"
              value={draft.employeeId}
              onChange={(e) => set("employeeId", e.target.value)}
              placeholder="SL-014"
              className={FIELD}
            />
          </Field>

          <Field id="fullName" label="Full name">
            <input
              id="fullName"
              required
              value={draft.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Abdul Wahab"
              className={FIELD}
            />
          </Field>

          <Field id="email" label="Email">
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@synapticlab.com"
              className={FIELD}
            />
          </Field>

          <Field id="phone" label="Phone">
            <input
              id="phone"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92 300 0000000"
              className={FIELD}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">Role</legend>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="role" label="Job title">
            <input
              id="role"
              required
              value={draft.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Software Engineer"
              className={FIELD}
            />
          </Field>

          <Field id="department" label="Department">
            <input
              id="department"
              value={draft.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="Engineering"
              className={FIELD}
            />
          </Field>

          <Field id="manager" label="Reports to">
            <input
              id="manager"
              value={draft.manager}
              onChange={(e) => set("manager", e.target.value)}
              placeholder="Muhammad Umer"
              className={FIELD}
            />
          </Field>

          <Field id="employmentType" label="Employment type">
            <select
              id="employmentType"
              value={draft.employmentType}
              onChange={(e) =>
                set("employmentType", e.target.value as EmployeeDraft["employmentType"])
              }
              className={FIELD}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field id="workMode" label="Work mode">
            <select
              id="workMode"
              value={draft.workMode}
              onChange={(e) => set("workMode", e.target.value as EmployeeDraft["workMode"])}
              className={FIELD}
            >
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode} className="capitalize">
                  {mode}
                </option>
              ))}
            </select>
          </Field>

          <Field id="status" label="Status">
            <select
              id="status"
              value={draft.status}
              onChange={(e) => set("status", e.target.value as EmployeeDraft["status"])}
              className={FIELD}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">
          Employment & compensation
        </legend>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="joinedAt" label="Joined on">
            <input
              id="joinedAt"
              type="date"
              required
              value={draft.joinedAt}
              onChange={(e) => set("joinedAt", e.target.value)}
              className={FIELD}
            />
          </Field>

          <Field id="exitDate" label="Exit date (if any)">
            <input
              id="exitDate"
              type="date"
              value={draft.exitDate}
              onChange={(e) => set("exitDate", e.target.value)}
              className={FIELD}
            />
          </Field>

          <Field id="salaryAmount" label="Salary (monthly)">
            <input
              id="salaryAmount"
              type="number"
              min="0"
              step="1"
              value={draft.salaryAmount}
              onChange={(e) => set("salaryAmount", Number(e.target.value))}
              className={FIELD}
            />
          </Field>

          <Field id="salaryCurrency" label="Currency">
            <select
              id="salaryCurrency"
              value={draft.salaryCurrency}
              onChange={(e) => set("salaryCurrency", e.target.value)}
              className={FIELD}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">
          Emergency contact
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="ecName" label="Name">
            <input
              id="ecName"
              value={draft.emergencyContact.name}
              onChange={(e) => setContact("name", e.target.value)}
              className={FIELD}
            />
          </Field>

          <Field id="ecRelationship" label="Relationship">
            <input
              id="ecRelationship"
              value={draft.emergencyContact.relationship}
              onChange={(e) => setContact("relationship", e.target.value)}
              placeholder="Brother"
              className={FIELD}
            />
          </Field>

          <Field id="ecPhone" label="Phone">
            <input
              id="ecPhone"
              value={draft.emergencyContact.phone}
              onChange={(e) => setContact("phone", e.target.value)}
              placeholder="+92 300 0000000"
              className={FIELD}
            />
          </Field>
        </div>
      </fieldset>

      <Field id="notes" label="Notes">
        <textarea
          id="notes"
          rows={3}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={`${FIELD} resize-none`}
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="rounded-full bg-accent-solid px-6 py-3 text-sm font-medium text-accent-foreground transition-all duration-300 hover:opacity-90"
        >
          {employee ? "Save changes" : "Add employee"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-6 py-3 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
