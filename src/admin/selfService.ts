import { BLOOD_GROUPS, type Employee, type EmployeeDraft } from "./types";

/**
 * THE single definition of what an employee can fill in about themselves.
 *
 * Four surfaces read this one list: the public /update-info form, the
 * review-diff cards, the edit form's pending-update banner, and the approve
 * routine that applies a submission. Before this file existed they were four
 * hand-synced copies — adding a field meant editing all four or silently
 * losing data. Now: add a row here (and to the database whitelist in
 * docs/supabase/self-service.sql) and every surface follows.
 *
 * ⚠ Adding a field is NOT done until self-service.sql has been RE-RUN in the
 * Supabase SQL editor. The deployed submit function keeps its old whitelist
 * and silently strips unknown keys — the form collects the value, the
 * database drops it, nobody sees an error. Cost us real data on 04 Aug 2026.
 */

export interface SelfServiceField {
  /** snake_case — matches the database whitelist and the submitted jsonb. */
  key: string;
  label: string;
  required?: boolean;
  type?: string;
  hint?: string;
  options?: string[];
  /** Current value on the record (draft or full employee). */
  get: (employee: EmployeeDraft) => string;
  /** Writes an approved value onto a draft. */
  applyTo: (draft: EmployeeDraft, value: string) => void;
}

export const SELF_SERVICE_FIELDS: SelfServiceField[] = [
  {
    key: "full_name", label: "Full name", hint: "As written on your CNIC", required: true,
    get: (e) => e.fullName,
    applyTo: (d, v) => { d.fullName = v; },
  },
  {
    key: "phone", label: "Phone number", required: true,
    get: (e) => e.phone,
    applyTo: (d, v) => { d.phone = v; },
  },
  {
    key: "cnic", label: "CNIC", hint: "e.g. 37405-1234567-1", required: true,
    get: (e) => e.cnic,
    applyTo: (d, v) => { d.cnic = v; },
  },
  {
    key: "father_name", label: "Father / guardian name", required: true,
    get: (e) => e.fatherName,
    applyTo: (d, v) => { d.fatherName = v; },
  },
  {
    key: "date_of_birth", label: "Date of birth", type: "date", required: true,
    get: (e) => e.dateOfBirth,
    applyTo: (d, v) => { d.dateOfBirth = v; },
  },
  {
    key: "blood_group", label: "Blood group", required: true, options: BLOOD_GROUPS,
    get: (e) => e.bloodGroup,
    applyTo: (d, v) => { d.bloodGroup = v; },
  },
  {
    key: "email", label: "Email", type: "email", required: true,
    get: (e) => e.email,
    applyTo: (d, v) => { d.email = v; },
  },
  {
    key: "address", label: "City / address", required: true,
    get: (e) => e.address,
    applyTo: (d, v) => { d.address = v; },
  },
  {
    key: "ntn", label: "NTN — only if you are an FBR filer", hint: "Leave empty if you don't have one",
    get: (e) => e.ntn,
    applyTo: (d, v) => { d.ntn = v; },
  },
  {
    key: "bank_name", label: "Bank name", hint: "Where your salary should go", required: true,
    get: (e) => e.bankName,
    applyTo: (d, v) => { d.bankName = v; },
  },
  {
    key: "bank_iban", label: "IBAN / account number", required: true,
    get: (e) => e.bankIban,
    applyTo: (d, v) => { d.bankIban = v; },
  },
  {
    key: "emergency_name", label: "Emergency contact — name", required: true,
    get: (e) => e.emergencyContact.name,
    applyTo: (d, v) => { d.emergencyContact = { ...d.emergencyContact, name: v }; },
  },
  {
    key: "emergency_relationship", label: "Emergency contact — relationship", required: true,
    get: (e) => e.emergencyContact.relationship,
    applyTo: (d, v) => { d.emergencyContact = { ...d.emergencyContact, relationship: v }; },
  },
  {
    key: "emergency_phone", label: "Emergency contact — phone", required: true,
    get: (e) => e.emergencyContact.phone,
    applyTo: (d, v) => { d.emergencyContact = { ...d.emergencyContact, phone: v }; },
  },
];

export const selfServiceLabel = (key: string): string =>
  SELF_SERVICE_FIELDS.find((f) => f.key === key)?.label ?? key;

/** The changed entries of a submission vs the current record. */
export const submissionChanges = (
  submitted: Record<string, string>,
  employee: EmployeeDraft | undefined,
): Array<{ key: string; label: string; from: string; to: string }> =>
  Object.entries(submitted)
    .map(([key, to]) => {
      const field = SELF_SERVICE_FIELDS.find((f) => f.key === key);
      return {
        key,
        label: field?.label ?? key,
        from: field && employee ? field.get(employee) : "",
        to,
      };
    })
    .filter((change) => change.to !== change.from);

/** Applies a submission onto a copy of the employee, ready for updateEmployee. */
export const applySubmission = (
  employee: Employee,
  submitted: Record<string, string>,
): EmployeeDraft => {
  const { id: _id, ...draft } = employee;
  const next: EmployeeDraft = { ...draft, emergencyContact: { ...draft.emergencyContact } };
  for (const field of SELF_SERVICE_FIELDS) {
    const value = submitted[field.key];
    if (value !== undefined) field.applyTo(next, value);
  }
  return next;
};

/** What still needs filling on a record, and by whom. */
export const missingFields = (draft: EmployeeDraft): { employee: string[]; admin: string[] } => {
  const employee = SELF_SERVICE_FIELDS
    .filter((f) => f.required && !f.get(draft).trim())
    .map((f) => f.label);
  const admin: string[] = [];
  if (!draft.role.trim()) admin.push("Role");
  if (!draft.salaryAmount) admin.push("Salary");
  if (!draft.joinedAt) admin.push("Joined date");
  return { employee, admin };
};
