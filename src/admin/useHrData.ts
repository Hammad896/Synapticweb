import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/auth";
import { joinerAnnouncement } from "@/hr/automations";
import {
  getRepository,
  type Announcement,
  type AuditEntry,
  type IssuedDocument,
  type Job,
  type JobDraft,
} from "./repository";
import { monthsSince } from "./format";
import type { Employee, EmployeeDraft } from "./types";

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [e, d, a, l, j] = await Promise.all([
        repository.listEmployees(),
        repository.listDocuments(),
        repository.listAnnouncements(),
        repository.listAudit(),
        repository.listJobs(),
      ]);

      setEmployees(e);
      setDocuments(d);
      setAnnouncements(a);
      setAudit(l);
      setJobs(j);
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
      await repository.removeEmployee(id);
      await repository.audit(actor, "employee.delete", employee?.fullName ?? id);
      await refresh();
    },
    [repository, actor, refresh, employees],
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
    metrics,
    error,
    isLoading,
    refresh,
    saveEmployee,
    deleteEmployee,
    importEmployees,
    issueDocument,
    revokeDocument,
    saveJob,
    toggleJob,
    deleteJob,
    toggleAnnouncement,
    deleteAnnouncement,
  };
};

export type HrData = ReturnType<typeof useHrData>;
