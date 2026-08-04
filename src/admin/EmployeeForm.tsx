import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Globe, Inbox, Loader2, Upload, User, X } from "lucide-react";
import { Button, Field, inputClass } from "@/components/kit";
import { getRepository, type UpdateRequest } from "./repository";
import { SELF_SERVICE_FIELDS, missingFields, submissionChanges } from "./selfService";
import {
  BLOOD_GROUPS,
  CURRENCIES,
  EMPLOYMENT_TYPES,
  EMPTY_DRAFT,
  WORK_MODES,
  nextEmployeeId,
  type Employee,
  type EmployeeDraft,
} from "./types";

interface Props {
  employee?: Employee;
  /** Used to auto-assign the next employee ID. */
  allEmployees: Employee[];
  onSave: (draft: EmployeeDraft, photo: File | null) => Promise<void>;
  onCancel: () => void;
  /** A submitted self-service update waiting on this person, if any. */
  pendingUpdate?: UpdateRequest | null;
  onApplyUpdate?: (request: UpdateRequest) => Promise<void>;
  onRejectUpdate?: (request: UpdateRequest) => Promise<void>;
}

const MAX_PHOTO_MB = 5;

const EmployeeForm = ({
  employee,
  allEmployees,
  onSave,
  onCancel,
  pendingUpdate,
  onApplyUpdate,
  onRejectUpdate,
}: Props) => {
  const [draft, setDraft] = useState<EmployeeDraft>(employee ?? EMPTY_DRAFT);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Load the existing photo (signed URL from the private bucket).
  useEffect(() => {
    if (!employee?.photoPath) return;
    void getRepository().photoUrl(employee.photoPath).then(setPhotoPreview);
  }, [employee?.photoPath]);

  /* Automation: the employee ID assigns itself from the joining year, so nobody
     has to remember the sequence — and it cannot collide. */
  useEffect(() => {
    if (employee || !draft.joinedAt) return;
    setDraft((current) => ({
      ...current,
      employeeId: nextEmployeeId(allEmployees, current.joinedAt),
    }));
  }, [draft.joinedAt, employee, allEmployees]);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Photo must be under ${MAX_PHOTO_MB}MB.`);
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave(draft, photoFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const initials = draft.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  /* The incoming submission, editable before applying: the admin can fix a
     typo'd CNIC or tidy an address without rejecting the whole thing. */
  const [incoming, setIncoming] = useState<Record<string, string>>({});
  useEffect(() => {
    setIncoming(pendingUpdate?.submitted ?? {});
    // Re-seed only when a different request arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUpdate?.id]);

  // Row set fixed by what the employee CHANGED; values bound to the edits.
  const changes = pendingUpdate ? submissionChanges(pendingUpdate.submitted, draft) : [];
  const missing = missingFields(draft);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9">
      {/* ── A submitted update, right where the admin edits ───────────────── */}
      {pendingUpdate && onApplyUpdate && onRejectUpdate && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Inbox size={15} aria-hidden="true" className="text-accent" />
            {draft.fullName.split(" ")[0] || "This employee"} sent their details via the
            update link — apply them instead of typing.
          </p>
          {changes.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Everything they sent already matches this record.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Correct anything below before applying — what you see is what
                gets saved.
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {changes.map((change) => {
                  const meta = SELF_SERVICE_FIELDS.find((f) => f.key === change.key);
                  return (
                    <li key={change.key}>
                      <label htmlFor={`in-${change.key}`} className="text-xs text-muted-foreground">
                        {change.label}
                        {change.from && (
                          <span className="ml-2 line-through opacity-70">{change.from}</span>
                        )}
                      </label>
                      {meta?.options ? (
                        <select
                          id={`in-${change.key}`}
                          className={inputClass("mt-1 py-1.5 text-sm")}
                          value={incoming[change.key] ?? ""}
                          onChange={(e) =>
                            setIncoming((v) => ({ ...v, [change.key]: e.target.value }))
                          }
                        >
                          <option value="">—</option>
                          {meta.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`in-${change.key}`}
                          type={meta?.type ?? "text"}
                          className={inputClass("mt-1 py-1.5 text-sm")}
                          value={incoming[change.key] ?? ""}
                          onChange={(e) =>
                            setIncoming((v) => ({ ...v, [change.key]: e.target.value }))
                          }
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              className="px-4 py-2 text-xs"
              onClick={() =>
                void onApplyUpdate({ ...pendingUpdate, submitted: incoming })
              }
            >
              <Check size={13} aria-hidden="true" />
              Apply {changes.length > 0 ? "these details" : "their details"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs text-red-500"
              onClick={() => void onRejectUpdate(pendingUpdate)}
            >
              <X size={13} aria-hidden="true" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* ── What still needs filling, and by whom ─────────────────────────── */}
      {(missing.employee.length > 0 || missing.admin.length > 0) && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs leading-relaxed">
          {missing.admin.length > 0 && (
            <p>
              <span className="font-medium text-foreground">You still need to set:</span>{" "}
              {missing.admin.map((label) => (
                <span key={label} className="mr-1.5 inline-block rounded-full border border-amber-500/50 px-2 py-0.5 text-amber-600">
                  {label}
                </span>
              ))}
            </p>
          )}
          {missing.employee.length > 0 && (
            <p className={missing.admin.length > 0 ? "mt-2" : ""}>
              <span className="font-medium text-foreground">
                The employee can fill these via an update link:
              </span>{" "}
              {missing.employee.map((label) => (
                <span key={label} className="mr-1.5 inline-block rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  {label}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* ── Photo ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-6">
        {photoPreview ? (
          <img
            src={photoPreview}
            alt=""
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border text-lg font-medium text-muted-foreground">
            {initials || <User size={22} aria-hidden="true" />}
          </div>
        )}

        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} aria-hidden="true" />
            {photoPreview ? "Change photo" : "Upload photo"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Used on the ID card and, if published, the website. Max {MAX_PHOTO_MB}MB.
          </p>
        </div>
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">Identity</legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="fullName" label="Full name">
            <input
              id="fullName"
              required
              value={draft.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Abdul Wahab"
              className={inputClass()}
            />
          </Field>

          <Field id="employeeId" label="Employee ID" hint="Assigned automatically">
            <input
              id="employeeId"
              value={draft.employeeId}
              onChange={(e) => set("employeeId", e.target.value)}
              placeholder="SL-2026-014"
              className={inputClass("tabular-nums")}
            />
          </Field>

          <Field id="cnic" label="CNIC">
            <input
              id="cnic"
              value={draft.cnic}
              onChange={(e) => set("cnic", e.target.value)}
              placeholder="61101-1234567-1"
              className={inputClass()}
            />
          </Field>

          <Field id="fatherName" label="Father / guardian name">
            <input
              id="fatherName"
              value={draft.fatherName}
              onChange={(e) => set("fatherName", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <Field id="bloodGroup" label="Blood group" hint="Shown on the ID card.">
            <select
              id="bloodGroup"
              value={draft.bloodGroup}
              onChange={(e) => set("bloodGroup", e.target.value)}
              className={inputClass()}
            >
              <option value="">Not recorded</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </Field>

          <Field id="ntn" label="NTN" hint="For FBR filers — appears on salary certificates.">
            <input
              id="ntn"
              value={draft.ntn}
              onChange={(e) => set("ntn", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <Field id="email" label="Email">
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@synapticlab.com"
              className={inputClass()}
            />
          </Field>

          <Field id="phone" label="Phone">
            <input
              id="phone"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92 300 0000000"
              className={inputClass()}
            />
          </Field>

          <Field id="dateOfBirth" label="Date of birth">
            <input
              id="dateOfBirth"
              type="date"
              value={draft.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <div className="sm:col-span-2 lg:col-span-3">
            <Field id="address" label="Address">
              <input
                id="address"
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass()}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      {/* ── Role ──────────────────────────────────────────────────────────── */}
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
              className={inputClass()}
            />
          </Field>

          <Field id="department" label="Department">
            <input
              id="department"
              value={draft.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="Engineering"
              className={inputClass()}
            />
          </Field>

          <Field id="manager" label="Reports to">
            <input
              id="manager"
              value={draft.manager}
              onChange={(e) => set("manager", e.target.value)}
              placeholder="Muhammad Umer"
              className={inputClass()}
            />
          </Field>

          <Field id="employmentType" label="Employment type">
            <select
              id="employmentType"
              value={draft.employmentType}
              onChange={(e) =>
                set("employmentType", e.target.value as EmployeeDraft["employmentType"])
              }
              className={inputClass("capitalize")}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field id="workMode" label="Work mode">
            <select
              id="workMode"
              value={draft.workMode}
              onChange={(e) => set("workMode", e.target.value as EmployeeDraft["workMode"])}
              className={inputClass("capitalize")}
            >
              {WORK_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field id="status" label="Status">
            <select
              id="status"
              value={draft.status}
              onChange={(e) => set("status", e.target.value as EmployeeDraft["status"])}
              className={inputClass()}
            >
              <option value="active">Active</option>
              <option value="inactive">Former</option>
            </select>
          </Field>

          <Field
            id="staffType"
            label="Payroll type"
            hint="Internal = monthly payroll runs. Outsource = paid per project through the ledger."
          >
            <select
              id="staffType"
              value={draft.staffType}
              onChange={(e) => set("staffType", e.target.value as EmployeeDraft["staffType"])}
              className={inputClass("capitalize")}
            >
              <option value="internal">Internal</option>
              <option value="outsource">Outsource</option>
            </select>
          </Field>
        </div>
      </fieldset>

      {/* ── Employment ────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">
          Employment & compensation
        </legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field id="joinedAt" label="Joined on">
            <input
              id="joinedAt"
              type="date"
              required
              value={draft.joinedAt}
              onChange={(e) => set("joinedAt", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <Field id="probationMonths" label="Probation (months)">
            <input
              id="probationMonths"
              type="number"
              min="0"
              max="12"
              value={draft.probationMonths}
              onChange={(e) => set("probationMonths", Number(e.target.value))}
              className={inputClass()}
            />
          </Field>

          <Field id="exitDate" label="Exit date">
            <input
              id="exitDate"
              type="date"
              value={draft.exitDate}
              onChange={(e) => set("exitDate", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <Field id="salaryAmount" label="Salary (monthly)">
            <input
              id="salaryAmount"
              type="number"
              min="0"
              value={draft.salaryAmount}
              onChange={(e) => set("salaryAmount", Number(e.target.value))}
              className={inputClass("tabular-nums")}
            />
          </Field>

          <Field id="salaryCurrency" label="Currency">
            <select
              id="salaryCurrency"
              value={draft.salaryCurrency}
              onChange={(e) => set("salaryCurrency", e.target.value)}
              className={inputClass()}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field id="bankName" label="Bank">
            <input
              id="bankName"
              value={draft.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="Meezan Bank"
              className={inputClass()}
            />
          </Field>

          <Field id="bankIban" label="IBAN / account no." hint="Printed on salary slips when set.">
            <input
              id="bankIban"
              value={draft.bankIban}
              onChange={(e) => set("bankIban", e.target.value)}
              placeholder="PK00XXXX0000000000000000"
              className={inputClass("tabular-nums")}
            />
          </Field>

          <Field
            id="lastRaiseAt"
            label="Last raise on"
            hint="Stamps itself with today's date whenever you increase the salary."
          >
            <input
              id="lastRaiseAt"
              type="date"
              value={draft.lastRaiseAt}
              onChange={(e) => set("lastRaiseAt", e.target.value)}
              className={inputClass()}
            />
          </Field>
        </div>
      </fieldset>

      {/* ── Emergency ─────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="mb-5 text-sm font-semibold text-foreground">
          Emergency contact
        </legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="ecName" label="Name">
            <input
              id="ecName"
              value={draft.emergencyContact.name}
              onChange={(e) =>
                set("emergencyContact", {
                  ...draft.emergencyContact,
                  name: e.target.value,
                })
              }
              className={inputClass()}
            />
          </Field>

          <Field id="ecRelationship" label="Relationship">
            <input
              id="ecRelationship"
              value={draft.emergencyContact.relationship}
              onChange={(e) =>
                set("emergencyContact", {
                  ...draft.emergencyContact,
                  relationship: e.target.value,
                })
              }
              placeholder="Brother"
              className={inputClass()}
            />
          </Field>

          <Field id="ecPhone" label="Phone">
            <input
              id="ecPhone"
              value={draft.emergencyContact.phone}
              onChange={(e) =>
                set("emergencyContact", {
                  ...draft.emergencyContact,
                  phone: e.target.value,
                })
              }
              className={inputClass()}
            />
          </Field>
        </div>
      </fieldset>

      {/* ── Publishing ────────────────────────────────────────────────────── */}
      <fieldset className="surface p-6">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-foreground">
          <Globe size={15} aria-hidden="true" className="text-accent" />
          Website
        </legend>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={draft.showOnWebsite}
            onChange={(e) => set("showOnWebsite", e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#0067AE]"
          />
          <span>
            <span className="text-sm text-foreground">Show on the public website</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              Adds them to the Team section immediately, and posts a "has joined" announcement
              on the site. Only name, role, photo and bio are published — never salary, CNIC,
              address or contact details.
            </span>
          </span>
        </label>

        {draft.showOnWebsite && (
          <div className="mt-5">
            <Field id="publicBio" label="Public bio" hint="One or two sentences.">
              <textarea
                id="publicBio"
                rows={3}
                value={draft.publicBio}
                onChange={(e) => set("publicBio", e.target.value)}
                placeholder="Leads applied AI and delivers across web and mobile."
                className={inputClass("resize-none")}
              />
            </Field>
          </div>
        )}
      </fieldset>

      <Field id="notes" label="Internal notes">
        <textarea
          id="notes"
          rows={3}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputClass("resize-none")}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {employee ? "Save changes" : "Add employee"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
