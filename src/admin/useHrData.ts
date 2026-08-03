import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/auth";
import { joinerAnnouncement } from "@/hr/automations";
import { getFinanceRepository } from "@/finance/repository";
import { nameNeedle } from "@/finance/calc";
import {
  getRepository,
  type Announcement,
  type AuditEntry,
  type IssuedDocument,
  type Application,
  type Job,
  type JobDraft,
  type SiteCapability,
  type SiteCapabilityDraft,
  type SitePartner,
  type SitePartnerDraft,
  type UpdateRequest,
} from "./repository";
import { monthsSince } from "./format";
import { DEFAULT_CONTENT, type SiteContent } from "@/data/content";
import {
  EMPTY_DRAFT,
  nextEmployeeId,
  type Employee,
  type EmployeeDraft,
  type EmployeeStatus,
} from "./types";

/**
 * Every read and write the admin panel performs, in one place.
 *
 * This is the seam the knowledge graph made obvious: AdminPage was mixing data
 * orchestration with eight different views. Pulling the data layer out means the
 * views become pure presentation, and the rules that matter — audit on every
 * mutation, announce-on-publish, refresh-after-write — live in exactly one file
 * instead of being scattered through a 1,500-line component where the next
 * person will forget one.
 */
export const useHrData = () => {
  const repository = getRepository();
  const { user } = useAuth();
  const actor = user?.email ?? "unknown";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<IssuedDocument[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [partners, setPartners] = useState<SitePartner[]>([]);
  const [capabilities, setCapabilities] = useState<SiteCapability[]>([]);
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** The last deleted employee, held so the delete can be undone. */
  const [lastDeleted, setLastDeleted] = useState<Employee | null>(null);
  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([]);

  const refresh = useCallback(async () => {
    try {
      /* Seed on first load. Without this the panel showed empty lists while the
         website still displayed the built-in partners and capabilities — the
         admin was lying about what was live. Idempotent: a no-op once seeded. */
      await repository.seedDefaults();

      const [e, d, a, l, j, apps, prt, cap, cnt, upd] = await Promise.all([
        repository.listEmployees(),
        repository.listDocuments(),
        repository.listAnnouncements(),
        repository.listAudit(),
        repository.listJobs(),
        repository.listApplications(),
        repository.listPartners(),
        repository.listCapabilities(),
        repository.getContent(),
        // Tolerated failure: the table may not exist until the self-service
        // migration runs, and that must not blank the whole admin.
        repository.listUpdateRequests().catch(() => [] as UpdateRequest[]),
      ]);

      setEmployees(e);
      setDocuments(d);
      setAnnouncements(a);
      setAudit(l);
      setJobs(j);
      setApplications(apps);
      setPartners(prt);
      setCapabilities(cap);
      setContent(cnt);
      setUpdateRequests(upd);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Could not load data: ${caught.message}`
          : "Could not load data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ── Employees ─────────────────────────────────────────────────────────── */

  const saveEmployee = useCallback(
    async (draft: EmployeeDraft, photo: File | null, editing: Employee | null) => {
      const wasPublished = editing?.showOnWebsite ?? false;

      /* A raise stamps itself: salary went up and the date wasn't set by
         hand, so record today as the last raise. */
      if (
        editing &&
        draft.salaryAmount > editing.salaryAmount &&
        draft.lastRaiseAt === editing.lastRaiseAt
      ) {
        draft = { ...draft, lastRaiseAt: new Date().toISOString().slice(0, 10) };
      }

      let saved = editing
        ? await repository.updateEmployee(editing.id, draft)
        : await repository.createEmployee(draft);

      if (photo) {
        const path = await repository.uploadPhoto(saved.id, photo);
        saved = await repository.updateEmployee(saved.id, { ...draft, photoPath: path });
      }

      await repository.audit(
        actor,
        editing ? "employee.update" : "employee.create",
        saved.fullName,
        { employeeId: saved.employeeId },
      );

      /* Publishing raises the site announcement — but only on the TRANSITION,
         so editing an already-published employee does not re-announce them. */
      if (saved.showOnWebsite && !wasPublished) {
        await repository.createAnnouncement(joinerAnnouncement(saved));
        await repository.audit(actor, "announcement.create", saved.fullName, {
          reason: "published to website",
        });
      }

      await refresh();
      return saved;
    },
    [repository, actor, refresh],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const employee = employees.find((e) => e.id === id);

      /* A person with financial or document history is never deletable —
         deleting them would orphan payroll rows, unlink letters, and detach
         salary evidence from its subject. The block message says exactly what
         is linked; Former is the correct exit. */
      if (employee) {
        const finance = getFinanceRepository();
        const [payrollRows, transactions] = await Promise.all([
          finance.listPayroll().catch(() => []),
          finance.listTransactions().catch(() => []),
        ]);
        // The same matching rule the certificate and reconciliation use.
        const needle = nameNeedle(employee.fullName);

        const linkedPayroll = payrollRows.filter(
          (p) => p.employeeId === id || p.employeeName.toLowerCase().includes(needle),
        ).length;
        const linkedSalaries = transactions.filter(
          (t) =>
            t.type === "expense" &&
            t.category === "Salary" &&
            t.description.toLowerCase().includes(needle),
        ).length;
        const linkedLetters = documents.filter((d) => d.employeeId === id).length;

        if (linkedPayroll + linkedSalaries + linkedLetters > 0) {
          const parts = [
            linkedPayroll && `${linkedPayroll} payroll row${linkedPayroll === 1 ? "" : "s"}`,
            linkedSalaries && `${linkedSalaries} salary transaction${linkedSalaries === 1 ? "" : "s"}`,
            linkedLetters && `${linkedLetters} issued letter${linkedLetters === 1 ? "" : "s"}`,
          ].filter(Boolean);
          throw new Error(
            `${employee.fullName} cannot be deleted — linked records exist: ${parts.join(", ")}. ` +
              `Mark them as Former instead; that keeps the history and removes them from payroll and default views.`,
          );
        }
      }

      await repository.removeEmployee(id);
      await repository.audit(actor, "employee.delete", employee?.fullName ?? id);
      // Held in memory so the toast can offer Undo. Restoring re-creates the
      // record (fresh id and verify token — the DB mints those).
      setLastDeleted(employee ?? null);
      await refresh();
    },
    [repository, actor, refresh, employees, documents],
  );

  const undoDeleteEmployee = useCallback(async () => {
    if (!lastDeleted) return;
    const { id: _discarded, ...rest } = lastDeleted;
    const draft: EmployeeDraft = { ...rest, verifyToken: "" };
    await repository.createEmployee(draft);
    await repository.audit(actor, "employee.restore", lastDeleted.fullName, {
      employeeId: lastDeleted.employeeId,
    });
    setLastDeleted(null);
    await refresh();
  }, [lastDeleted, repository, actor, refresh]);

  const dismissUndo = useCallback(() => setLastDeleted(null), []);

  /** One-click Active ↔ Former. Former keeps every record; it is never a delete. */
  const setEmployeeStatus = useCallback(
    async (employee: Employee, status: EmployeeStatus) => {
      const { id, ...draft } = employee;
      await repository.updateEmployee(id, { ...draft, status });
      await repository.audit(
        actor,
        status === "active" ? "employee.reactivate" : "employee.deactivate",
        employee.fullName,
        { employeeId: employee.employeeId },
      );
      await refresh();
    },
    [repository, actor, refresh],
  );

  const importEmployees = useCallback(
    async (drafts: EmployeeDraft[]) => {
      for (const draft of drafts) {
        await repository.createEmployee(draft);
      }
      await repository.audit(actor, "employee.import", `${drafts.length} records`, {
        count: drafts.length,
      });
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Self-service update links ─────────────────────────────────────────── */

  /** Creates a 24h link for the employee and returns it, ready to send. */
  const requestUpdateLink = useCallback(
    async (employee: Employee): Promise<string> => {
      const request = await repository.createUpdateRequest(employee.id);
      await repository.audit(actor, "employee.update-link.create", employee.fullName, {
        expiresAt: request.expiresAt,
      });
      await refresh();
      return `${window.location.origin}/update-info?t=${request.token}`;
    },
    [repository, actor, refresh],
  );

  /**
   * The onboarding flow: create the person with just a name, hand back a
   * 24h link — they fill in their own CNIC, bank, contacts; the admin
   * approves and the record completes itself.
   */
  const addEmployeeViaLink = useCallback(
    async (fullName: string): Promise<string> => {
      const today = new Date().toISOString().slice(0, 10);
      const created = await repository.createEmployee({
        ...EMPTY_DRAFT,
        fullName,
        employeeId: nextEmployeeId(employees, today),
        joinedAt: today,
      });
      await repository.audit(actor, "employee.create", fullName, { via: "onboarding link" });
      const request = await repository.createUpdateRequest(created.id);
      await repository.audit(actor, "employee.update-link.create", fullName, {
        expiresAt: request.expiresAt,
        onboarding: true,
      });
      await refresh();
      return `${window.location.origin}/update-info?t=${request.token}`;
    },
    [repository, actor, employees, refresh],
  );

  /** Applies the submitted fields to the employee record. */
  const approveUpdateRequest = useCallback(
    async (request: UpdateRequest) => {
      const employee = employees.find((e) => e.id === request.employeeId);
      if (!employee) throw new Error("The employee for this request no longer exists.");
      const s = request.submitted;
      const { id, ...draft } = employee;
      await repository.updateEmployee(id, {
        ...draft,
        fullName: s.full_name ?? draft.fullName,
        phone: s.phone ?? draft.phone,
        cnic: s.cnic ?? draft.cnic,
        dateOfBirth: s.date_of_birth ?? draft.dateOfBirth,
        address: s.address ?? draft.address,
        email: s.email ?? draft.email,
        fatherName: s.father_name ?? draft.fatherName,
        bloodGroup: s.blood_group ?? draft.bloodGroup,
        ntn: s.ntn ?? draft.ntn,
        bankName: s.bank_name ?? draft.bankName,
        bankIban: s.bank_iban ?? draft.bankIban,
        emergencyContact: {
          name: s.emergency_name ?? draft.emergencyContact.name,
          relationship: s.emergency_relationship ?? draft.emergencyContact.relationship,
          phone: s.emergency_phone ?? draft.emergencyContact.phone,
        },
      });
      await repository.setUpdateRequestStatus(request.id, "approved");
      await repository.audit(actor, "employee.update-link.approve", employee.fullName, {
        fields: Object.keys(s),
      });
      await refresh();
    },
    [repository, actor, employees, refresh],
  );

  const rejectUpdateRequest = useCallback(
    async (request: UpdateRequest) => {
      await repository.setUpdateRequestStatus(request.id, "rejected");
      await repository.audit(actor, "employee.update-link.reject", request.employeeName);
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Documents ─────────────────────────────────────────────────────────── */

  const issueDocument = useCallback(
    async (doc: Omit<IssuedDocument, "id" | "createdAt">) => {
      const saved = await repository.saveDocument(doc);
      await repository.audit(actor, "document.issue", doc.employeeName, {
        reference: doc.reference,
        letterType: doc.letterType,
      });
      await refresh();
      // Returned so the composer can render the QR with the DB-minted token.
      return saved;
    },
    [repository, actor, refresh],
  );

  const revokeDocument = useCallback(
    async (doc: IssuedDocument, reason: string) => {
      await repository.updateDocument(doc.id, {
        status: "revoked",
        revokedAt: new Date().toISOString(),
        revokeReason: reason,
      });
      await repository.audit(actor, "document.revoke", doc.employeeName, {
        reference: doc.reference,
        reason,
      });
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Jobs ──────────────────────────────────────────────────────────────── */

  const saveJob = useCallback(
    async (draft: JobDraft, editing: Job | null) => {
      if (editing) {
        await repository.updateJob(editing.id, draft);
        await repository.audit(actor, "job.update", draft.role, { type: draft.type });
      } else {
        await repository.createJob(draft);
        await repository.audit(actor, "job.create", draft.role, { type: draft.type });
      }
      await refresh();
    },
    [repository, actor, refresh],
  );

  const setApplicationStatus = useCallback(
    async (id: string, status: Application["status"], name: string) => {
      await repository.updateApplication(id, status);
      await repository.audit(actor, "application.status", name, { status });
      await refresh();
    },
    [repository, actor, refresh],
  );

  const toggleJob = useCallback(
    async (job: Job) => {
      await repository.updateJob(job.id, { isActive: !job.isActive });
      await repository.audit(actor, job.isActive ? "job.close" : "job.reopen", job.role);
      await refresh();
    },
    [repository, actor, refresh],
  );

  const deleteJob = useCallback(
    async (job: Job) => {
      await repository.removeJob(job.id);
      await repository.audit(actor, "job.delete", job.role);
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Website content ───────────────────────────────────────────────────── */

  const saveContent = useCallback(
    async (next: SiteContent) => {
      await repository.saveContent(next);
      await repository.audit(actor, "content.update", "site content");
      await refresh();
    },
    [repository, actor, refresh],
  );

  const createAnnouncement = useCallback(
    async (draft: Omit<Announcement, "id" | "createdAt">) => {
      await repository.createAnnouncement(draft);
      await repository.audit(actor, "announcement.create", draft.title);
      await refresh();
    },
    [repository, actor, refresh],
  );

  const editAnnouncement = useCallback(
    async (announcement: Announcement, draft: Omit<Announcement, "id" | "createdAt">) => {
      await repository.updateAnnouncement(announcement.id, draft);
      await repository.audit(actor, "announcement.update", draft.title);
      await refresh();
    },
    [repository, actor, refresh],
  );

  const savePartner = useCallback(
    async (draft: SitePartnerDraft, id?: string) => {
      await repository.savePartner(draft, id);
      await repository.audit(actor, id ? "partner.update" : "partner.create", draft.name);
      await refresh();
    },
    [repository, actor, refresh],
  );

  const deletePartner = useCallback(
    async (partner: SitePartner) => {
      await repository.removePartner(partner.id);
      await repository.audit(actor, "partner.delete", partner.name);
      await refresh();
    },
    [repository, actor, refresh],
  );

  const saveCapability = useCallback(
    async (draft: SiteCapabilityDraft, id?: string) => {
      await repository.saveCapability(draft, id);
      await repository.audit(
        actor,
        id ? "capability.update" : "capability.create",
        draft.title,
      );
      await refresh();
    },
    [repository, actor, refresh],
  );

  const deleteCapability = useCallback(
    async (capability: SiteCapability) => {
      await repository.removeCapability(capability.id);
      await repository.audit(actor, "capability.delete", capability.title);
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Announcements ─────────────────────────────────────────────────────── */

  const toggleAnnouncement = useCallback(
    async (announcement: Announcement) => {
      await repository.updateAnnouncement(announcement.id, {
        isActive: !announcement.isActive,
      });
      await repository.audit(
        actor,
        announcement.isActive ? "announcement.hide" : "announcement.show",
        announcement.title,
      );
      await refresh();
    },
    [repository, actor, refresh],
  );

  const deleteAnnouncement = useCallback(
    async (announcement: Announcement) => {
      await repository.removeAnnouncement(announcement.id);
      await repository.audit(actor, "announcement.delete", announcement.title);
      await refresh();
    },
    [repository, actor, refresh],
  );

  /* ── Derived ───────────────────────────────────────────────────────────── */

  const metrics = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");

    // Grouped BY CURRENCY, never summed across them: adding PKR to NOK would
    // produce a confident, meaningless number — the worst kind.
    const payroll = active.reduce<Record<string, number>>((totals, e) => {
      totals[e.salaryCurrency] = (totals[e.salaryCurrency] ?? 0) + e.salaryAmount;
      return totals;
    }, {});

    const avgTenure = active.length
      ? active.reduce((sum, e) => sum + monthsSince(e.joinedAt), 0) / active.length
      : 0;

    return { active, payroll, avgTenure };
  }, [employees]);

  return {
    employees,
    documents,
    announcements,
    audit,
    jobs,
    applications,
    partners,
    capabilities,
    content,
    metrics,
    error,
    isLoading,
    refresh,
    saveEmployee,
    deleteEmployee,
    undoDeleteEmployee,
    dismissUndo,
    lastDeleted,
    setEmployeeStatus,
    updateRequests,
    requestUpdateLink,
    addEmployeeViaLink,
    approveUpdateRequest,
    rejectUpdateRequest,
    importEmployees,
    issueDocument,
    revokeDocument,
    saveJob,
    setApplicationStatus,
    toggleJob,
    deleteJob,
    toggleAnnouncement,
    deleteAnnouncement,
    createAnnouncement,
    editAnnouncement,
    savePartner,
    deletePartner,
    saveCapability,
    deleteCapability,
    saveContent,
  };
};

export type HrData = ReturnType<typeof useHrData>;
