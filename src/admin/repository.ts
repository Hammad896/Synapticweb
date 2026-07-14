import { supabase } from "@/lib/supabase";
import type { Employee, EmployeeDraft } from "./types";

/* ── Domain types that live alongside employees ───────────────────────────── */

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Announcement {
  id: string;
  kind: "joiner" | "news" | "milestone";
  title: string;
  body: string;
  link: string;
  isActive: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  role: string;
  type: string;
  location: string;
  pitch: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export type JobDraft = Omit<Job, "id" | "createdAt">;

export const EMPTY_JOB: JobDraft = {
  role: "",
  type: "Full-time",
  location: "Islamabad / Remote",
  pitch: "",
  description: "",
  isActive: true,
};

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

export interface Application {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  portfolio: string;
  coverNote: string;
  status: "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
  createdAt: string;
}

export interface IssuedDocument {
  id: string;
  reference: string;
  /** DB-generated, unguessable. The letter's QR encodes this, not the reference. */
  verifyToken: string;
  letterType: string;
  employeeId: string | null;
  employeeName: string;
  status: "draft" | "issued" | "revoked";
  subject: string;
  body: string;
  fields: Record<string, string>;
  issuedAt: string | null;
  issuedBy: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  createdAt: string;
}

/* ── The seam ─────────────────────────────────────────────────────────────── */

export interface HrRepository {
  listEmployees(): Promise<Employee[]>;
  createEmployee(draft: EmployeeDraft): Promise<Employee>;
  updateEmployee(id: string, draft: EmployeeDraft): Promise<Employee>;
  removeEmployee(id: string): Promise<void>;
  uploadPhoto(employeeId: string, file: File): Promise<string>;
  photoUrl(path: string): Promise<string | null>;

  listDocuments(): Promise<IssuedDocument[]>;
  saveDocument(doc: Omit<IssuedDocument, "id" | "createdAt">): Promise<IssuedDocument>;
  updateDocument(id: string, patch: Partial<IssuedDocument>): Promise<void>;

  listApplications(): Promise<Application[]>;
  updateApplication(id: string, status: Application["status"]): Promise<void>;

  listJobs(): Promise<Job[]>;
  createJob(draft: JobDraft): Promise<Job>;
  updateJob(id: string, patch: Partial<JobDraft>): Promise<void>;
  removeJob(id: string): Promise<void>;

  listAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(a: Omit<Announcement, "id" | "createdAt">): Promise<Announcement>;
  updateAnnouncement(id: string, patch: Partial<Announcement>): Promise<void>;
  removeAnnouncement(id: string): Promise<void>;

  listAudit(limit?: number): Promise<AuditEntry[]>;
  audit(actor: string, action: string, target: string, detail?: Record<string, unknown>): Promise<void>;
}

/* ── Supabase adapter (the real one) ──────────────────────────────────────── */

/**
 * A row exactly as Postgres returns it: snake_case, and every column nullable
 * as far as the client can prove. `unknown` rather than `any` — it forces the
 * mappers below to actually coerce, instead of silently trusting the shape.
 */
type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : Number(value ?? fallback) || fallback;

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

/** DB rows are snake_case; the app is camelCase. This is the only place they meet. */
const toEmployee = (row: Row): Employee => ({
  id: str(row.id),
  employeeId: str(row.employee_id),
  verifyToken: str(row.verify_token),
  fullName: str(row.full_name),
  role: str(row.role),
  department: str(row.department),
  manager: str(row.manager),
  email: str(row.email),
  phone: str(row.phone),
  cnic: str(row.cnic),
  dateOfBirth: str(row.date_of_birth),
  address: str(row.address),
  status: str(row.status, "active") as Employee["status"],
  employmentType: str(row.employment_type, "full-time") as Employee["employmentType"],
  workMode: str(row.work_mode, "onsite") as Employee["workMode"],
  joinedAt: str(row.joined_at),
  probationMonths: num(row.probation_months, 3),
  exitDate: str(row.exit_date),
  salaryAmount: num(row.salary_amount),
  salaryCurrency: str(row.salary_currency, "PKR"),
  emergencyContact: {
    name: str(row.emergency_name),
    relationship: str(row.emergency_relationship),
    phone: str(row.emergency_phone),
  },
  photoPath: str(row.photo_path),
  notes: str(row.notes),
  showOnWebsite: bool(row.show_on_website),
  publicBio: str(row.public_bio),
});

/** NOTE: `verify_token` is deliberately absent — the DATABASE generates it and
 *  the client must never be able to set or overwrite it. */
const toRow = (draft: EmployeeDraft) => ({
  employee_id: draft.employeeId,
  full_name: draft.fullName,
  role: draft.role,
  department: draft.department,
  manager: draft.manager,
  email: draft.email,
  phone: draft.phone,
  cnic: draft.cnic,
  date_of_birth: draft.dateOfBirth || null,
  address: draft.address,
  status: draft.status,
  employment_type: draft.employmentType,
  work_mode: draft.workMode,
  joined_at: draft.joinedAt || null,
  probation_months: draft.probationMonths,
  exit_date: draft.exitDate || null,
  salary_amount: draft.salaryAmount,
  salary_currency: draft.salaryCurrency,
  emergency_name: draft.emergencyContact.name,
  emergency_relationship: draft.emergencyContact.relationship,
  emergency_phone: draft.emergencyContact.phone,
  photo_path: draft.photoPath || null,
  notes: draft.notes,
  show_on_website: draft.showOnWebsite,
  public_bio: draft.publicBio,
});

class SupabaseRepository implements HrRepository {
  private get db() {
    if (!supabase) throw new Error("Supabase is not configured.");
    return supabase;
  }

  async listEmployees(): Promise<Employee[]> {
    const { data, error } = await this.db
      .from("employees")
      .select("*")
      .order("full_name");
    if (error) throw error;
    return (data ?? []).map(toEmployee);
  }

  async createEmployee(draft: EmployeeDraft): Promise<Employee> {
    const { data, error } = await this.db
      .from("employees")
      .insert(toRow(draft))
      .select()
      .single();
    if (error) throw error;
    return toEmployee(data);
  }

  async updateEmployee(id: string, draft: EmployeeDraft): Promise<Employee> {
    const { data, error } = await this.db
      .from("employees")
      .update({ ...toRow(draft), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toEmployee(data);
  }

  async removeEmployee(id: string): Promise<void> {
    const { error } = await this.db.from("employees").delete().eq("id", id);
    if (error) throw error;
  }

  async uploadPhoto(employeeId: string, file: File): Promise<string> {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${employeeId}/${Date.now()}.${extension}`;

    const { error } = await this.db.storage
      .from("employee-photos")
      .upload(path, file, { upsert: true });
    if (error) throw error;

    return path;
  }

  async photoUrl(path: string): Promise<string | null> {
    if (!path) return null;
    // The bucket is private, so a short-lived signed URL — never a public link
    // to an employee's face.
    const { data, error } = await this.db.storage
      .from("employee-photos")
      .createSignedUrl(path, 3600);
    return error ? null : data.signedUrl;
  }

  async listDocuments(): Promise<IssuedDocument[]> {
    const { data, error } = await this.db
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      reference: str(row.reference),
      verifyToken: str(row.verify_token),
      letterType: str(row.letter_type),
      employeeId: row.employee_id ? str(row.employee_id) : null,
      employeeName: str(row.employee_name),
      status: str(row.status, "draft") as IssuedDocument["status"],
      subject: str(row.subject),
      body: str(row.body),
      fields: (row.fields ?? {}) as Record<string, string>,
      issuedAt: row.issued_at ? str(row.issued_at) : null,
      issuedBy: row.issued_by ? str(row.issued_by) : null,
      revokedAt: row.revoked_at ? str(row.revoked_at) : null,
      revokeReason: row.revoke_reason ? str(row.revoke_reason) : null,
      createdAt: str(row.created_at),
    }));
  }

  async saveDocument(
    doc: Omit<IssuedDocument, "id" | "createdAt">,
  ): Promise<IssuedDocument> {
    const { data, error } = await this.db
      .from("documents")
      .insert({
        reference: doc.reference,
        letter_type: doc.letterType,
        employee_id: doc.employeeId,
        employee_name: doc.employeeName,
        status: doc.status,
        subject: doc.subject,
        body: doc.body,
        fields: doc.fields,
        issued_at: doc.issuedAt,
        issued_by: doc.issuedBy,
      })
      .select()
      .single();
    if (error) throw error;
    // The token comes BACK from the database; it is never sent to it.
    return {
      ...doc,
      id: data.id,
      verifyToken: data.verify_token ?? "",
      createdAt: data.created_at,
    };
  }

  async updateDocument(id: string, patch: Partial<IssuedDocument>): Promise<void> {
    const { error } = await this.db
      .from("documents")
      .update({
        status: patch.status,
        issued_at: patch.issuedAt,
        issued_by: patch.issuedBy,
        revoked_at: patch.revokedAt,
        revoke_reason: patch.revokeReason,
      })
      .eq("id", id);
    if (error) throw error;
  }

  async listApplications(): Promise<Application[]> {
    const { data, error } = await this.db
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      role: str(row.role),
      fullName: str(row.full_name),
      email: str(row.email),
      phone: str(row.phone),
      location: str(row.location),
      experience: str(row.experience),
      portfolio: str(row.portfolio),
      coverNote: str(row.cover_note),
      status: str(row.status, "new") as Application["status"],
      createdAt: str(row.created_at),
    }));
  }

  async updateApplication(id: string, status: Application["status"]): Promise<void> {
    const { error } = await this.db
      .from("applications")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  }

  async listJobs(): Promise<Job[]> {
    const { data, error } = await this.db
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      role: str(row.role),
      type: str(row.type, "Full-time"),
      location: str(row.location),
      pitch: str(row.pitch),
      description: str(row.description),
      isActive: bool(row.is_active, true),
      createdAt: str(row.created_at),
    }));
  }

  async createJob(draft: JobDraft): Promise<Job> {
    const { data, error } = await this.db
      .from("jobs")
      .insert({
        role: draft.role,
        type: draft.type,
        location: draft.location,
        pitch: draft.pitch,
        description: draft.description,
        is_active: draft.isActive,
      })
      .select()
      .single();
    if (error) throw error;

    return { ...draft, id: data.id, createdAt: data.created_at };
  }

  async updateJob(id: string, patch: Partial<JobDraft>): Promise<void> {
    const { error } = await this.db
      .from("jobs")
      .update({
        role: patch.role,
        type: patch.type,
        location: patch.location,
        pitch: patch.pitch,
        description: patch.description,
        is_active: patch.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async removeJob(id: string): Promise<void> {
    const { error } = await this.db.from("jobs").delete().eq("id", id);
    if (error) throw error;
  }

  async listAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await this.db
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      kind: str(row.kind, "news") as Announcement["kind"],
      title: str(row.title),
      body: str(row.body),
      link: str(row.link),
      isActive: bool(row.is_active, true),
      createdAt: str(row.created_at),
    }));
  }

  async createAnnouncement(
    a: Omit<Announcement, "id" | "createdAt">,
  ): Promise<Announcement> {
    const { data, error } = await this.db
      .from("announcements")
      .insert({
        kind: a.kind,
        title: a.title,
        body: a.body,
        link: a.link,
        is_active: a.isActive,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...a, id: data.id, createdAt: data.created_at };
  }

  async updateAnnouncement(id: string, patch: Partial<Announcement>): Promise<void> {
    const { error } = await this.db
      .from("announcements")
      .update({
        title: patch.title,
        body: patch.body,
        is_active: patch.isActive,
      })
      .eq("id", id);
    if (error) throw error;
  }

  async removeAnnouncement(id: string): Promise<void> {
    const { error } = await this.db.from("announcements").delete().eq("id", id);
    if (error) throw error;
  }

  async listAudit(limit = 200): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data ?? []).map((row: Row) => ({
      id: String(row.id),
      actor: str(row.actor),
      action: str(row.action),
      target: str(row.target),
      detail: (row.detail ?? {}) as Record<string, unknown>,
      createdAt: str(row.created_at),
    }));
  }

  async audit(
    actor: string,
    action: string,
    target: string,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    // An audit write must never break the operation it is recording. Log and move on.
    const { error } = await this.db
      .from("audit_log")
      .insert({ actor, action, target, detail });
    if (error) console.error("Audit write failed:", error.message);
  }
}

/* ── Local adapter (fallback so a fresh clone still runs) ─────────────────── */

const KEY = {
  jobs: "synapticlab.hr.jobs",
  employees: "synapticlab.hr.employees",
  documents: "synapticlab.hr.documents",
  announcements: "synapticlab.hr.announcements",
  audit: "synapticlab.hr.audit",
};

const read = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
};
const write = <T,>(key: string, value: T[]) =>
  localStorage.setItem(key, JSON.stringify(value));

class LocalRepository implements HrRepository {
  async listEmployees() {
    return read<Employee>(KEY.employees).sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }

  async createEmployee(draft: EmployeeDraft) {
    const employee: Employee = {
      ...draft,
      id: crypto.randomUUID(),
      verifyToken: draft.verifyToken || crypto.randomUUID(),
    };
    write(KEY.employees, [...read<Employee>(KEY.employees), employee]);
    return employee;
  }

  async updateEmployee(id: string, draft: EmployeeDraft) {
    const updated: Employee = { ...draft, id };
    write(
      KEY.employees,
      read<Employee>(KEY.employees).map((e) => (e.id === id ? updated : e)),
    );
    return updated;
  }

  async removeEmployee(id: string) {
    write(
      KEY.employees,
      read<Employee>(KEY.employees).filter((e) => e.id !== id),
    );
  }

  /** No bucket locally — the photo becomes a data URL stored on the record. */
  async uploadPhoto(_employeeId: string, file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the image file."));
      reader.readAsDataURL(file);
    });
  }

  async photoUrl(path: string) {
    return path || null; // already a data URL
  }

  async listDocuments() {
    return read<IssuedDocument>(KEY.documents);
  }

  async saveDocument(doc: Omit<IssuedDocument, "id" | "createdAt">) {
    const saved: IssuedDocument = {
      ...doc,
      verifyToken: doc.verifyToken || crypto.randomUUID(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.documents, [saved, ...read<IssuedDocument>(KEY.documents)]);
    return saved;
  }

  async updateDocument(id: string, patch: Partial<IssuedDocument>) {
    write(
      KEY.documents,
      read<IssuedDocument>(KEY.documents).map((d) =>
        d.id === id ? { ...d, ...patch } : d,
      ),
    );
  }

  /** Applications arrive from strangers over the network. Without a backend
   *  there is nowhere for them to land, so the local adapter has none. */
  async listApplications() {
    return [] as Application[];
  }

  async updateApplication() {
    /* no-op without a backend */
  }

  async listJobs() {
    return read<Job>(KEY.jobs);
  }

  async createJob(draft: JobDraft) {
    const job: Job = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.jobs, [job, ...read<Job>(KEY.jobs)]);
    return job;
  }

  async updateJob(id: string, patch: Partial<JobDraft>) {
    write(
      KEY.jobs,
      read<Job>(KEY.jobs).map((j) => (j.id === id ? { ...j, ...patch } : j)),
    );
  }

  async removeJob(id: string) {
    write(
      KEY.jobs,
      read<Job>(KEY.jobs).filter((j) => j.id !== id),
    );
  }

  async listAnnouncements() {
    return read<Announcement>(KEY.announcements);
  }

  async createAnnouncement(a: Omit<Announcement, "id" | "createdAt">) {
    const saved: Announcement = {
      ...a,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.announcements, [saved, ...read<Announcement>(KEY.announcements)]);
    return saved;
  }

  async updateAnnouncement(id: string, patch: Partial<Announcement>) {
    write(
      KEY.announcements,
      read<Announcement>(KEY.announcements).map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    );
  }

  async removeAnnouncement(id: string) {
    write(
      KEY.announcements,
      read<Announcement>(KEY.announcements).filter((a) => a.id !== id),
    );
  }

  async listAudit(limit = 200) {
    return read<AuditEntry>(KEY.audit).slice(0, limit);
  }

  async audit(
    actor: string,
    action: string,
    target: string,
    detail: Record<string, unknown> = {},
  ) {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      actor,
      action,
      target,
      detail,
      createdAt: new Date().toISOString(),
    };
    write(KEY.audit, [entry, ...read<AuditEntry>(KEY.audit)].slice(0, 500));
  }
}

let instance: HrRepository | null = null;

export const getRepository = (): HrRepository => {
  if (!instance) {
    instance = supabase ? new SupabaseRepository() : new LocalRepository();
  }
  return instance;
};

export const isRemote = (): boolean => supabase !== null;

/* ── CSV export ───────────────────────────────────────────────────────────── */

export const toCsv = (employees: Employee[]): string => {
  const headers = [
    "Employee ID", "Full name", "Role", "Department", "Reports to", "Email", "Phone",
    "CNIC", "Date of birth", "Address", "Status", "Employment type", "Work mode",
    "Joined", "Exit date", "Salary", "Currency",
    "Emergency contact", "Relationship", "Emergency phone", "On website", "Notes",
  ];

  const escape = (value: string | number | boolean) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const rows = employees.map((e) =>
    [
      e.employeeId, e.fullName, e.role, e.department, e.manager, e.email, e.phone,
      e.cnic, e.dateOfBirth, e.address, e.status, e.employmentType, e.workMode,
      e.joinedAt, e.exitDate, e.salaryAmount, e.salaryCurrency,
      e.emergencyContact.name, e.emergencyContact.relationship, e.emergencyContact.phone,
      e.showOnWebsite, e.notes,
    ]
      .map(escape)
      .join(","),
  );

  return [headers.map(escape).join(","), ...rows].join("\n");
};
