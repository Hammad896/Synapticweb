import type { Employee } from "@/admin/types";

/**
 * HR automations.
 *
 * These are the things a real HR module does *for* you — the difference between
 * a database and a system. Each one is a derived alert: nothing is stored, so an
 * alert can never go stale or disagree with the record it came from.
 *
 * They exist because every item here is something a small company discovers
 * exactly too late: the probation you forgot to confirm, the contractor whose
 * term quietly lapsed, the emergency contact you needed on the one day you
 * didn't have it.
 */

export type AlertSeverity = "critical" | "warning" | "info";

export interface HrAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  employeeId: string;
  employeeName: string;
  /** Days until (positive) or since (negative) the event. */
  days: number;
  action?: "confirm-probation" | "complete-record" | "review-exit" | "celebrate";
}

const DAY = 1000 * 60 * 60 * 24;

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY);

const addMonths = (iso: string, months: number): Date => {
  const date = new Date(iso);
  date.setMonth(date.getMonth() + months);
  return date;
};

/** Next occurrence of a month/day, ignoring the year. */
const nextAnniversary = (iso: string, today: Date): Date => {
  const source = new Date(iso);
  const next = new Date(today.getFullYear(), source.getMonth(), source.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
};

export const buildAlerts = (employees: Employee[], today = new Date()): HrAlert[] => {
  const alerts: HrAlert[] = [];

  for (const employee of employees) {
    const active = employee.status === "active";

    /* ── Probation confirmation is due ─────────────────────────────────────
       The single most-missed HR deadline in a small company. Someone silently
       passes probation, nobody confirms it, and their terms stay ambiguous. */
    if (active && employee.joinedAt && employee.probationMonths > 0) {
      const due = addMonths(employee.joinedAt, employee.probationMonths);
      const days = daysBetween(today, due);

      if (days <= 14) {
        alerts.push({
          id: `probation-${employee.id}`,
          severity: days < 0 ? "critical" : "warning",
          title:
            days < 0
              ? "Probation ended — confirmation overdue"
              : "Probation ending soon",
          detail:
            days < 0
              ? `Probation ended ${Math.abs(days)} day${
                  Math.abs(days) === 1 ? "" : "s"
                } ago. The employment terms are unconfirmed until a letter is issued.`
              : `Probation ends in ${days} day${days === 1 ? "" : "s"}. Issue a confirmation letter.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days,
          action: "confirm-probation",
        });
      }
    }

    /* ── A contract or internship is running out ──────────────────────────── */
    if (
      active &&
      employee.exitDate &&
      (employee.employmentType === "contract" || employee.employmentType === "intern")
    ) {
      const days = daysBetween(today, new Date(employee.exitDate));

      if (days <= 30) {
        alerts.push({
          id: `contract-${employee.id}`,
          severity: days < 0 ? "critical" : "warning",
          title:
            days < 0
              ? `${employee.employmentType === "intern" ? "Internship" : "Contract"} has expired`
              : `${employee.employmentType === "intern" ? "Internship" : "Contract"} ending`,
          detail:
            days < 0
              ? `The end date passed ${Math.abs(days)} day${
                  Math.abs(days) === 1 ? "" : "s"
                } ago, but the record is still marked active. Renew it or close it out.`
              : `Ends in ${days} day${days === 1 ? "" : "s"}. Renew, convert, or prepare the completion letter.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days,
          action: "review-exit",
        });
      }
    }

    /* ── Still marked active after their exit date ─────────────────────────
       A leaver left on the books keeps drawing salary in every report you run. */
    if (active && employee.exitDate) {
      const days = daysBetween(today, new Date(employee.exitDate));
      if (days < 0 && employee.employmentType === "full-time") {
        alerts.push({
          id: `stale-active-${employee.id}`,
          severity: "critical",
          title: "Left, but still marked active",
          detail: `Exit date was ${Math.abs(days)} day${
            Math.abs(days) === 1 ? "" : "s"
          } ago. This person is still counted in headcount and payroll.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days,
          action: "review-exit",
        });
      }
    }

    /* ── Incomplete record ────────────────────────────────────────────────── */
    if (active) {
      const missing: string[] = [];
      if (!employee.emergencyContact.name || !employee.emergencyContact.phone) {
        missing.push("emergency contact");
      }
      if (!employee.photoPath) missing.push("photo");
      if (!employee.cnic) missing.push("CNIC");
      if (!employee.employeeId) missing.push("employee ID");

      if (missing.length > 0) {
        alerts.push({
          id: `incomplete-${employee.id}`,
          severity: missing.includes("emergency contact") ? "warning" : "info",
          title: "Incomplete record",
          detail: `Missing: ${missing.join(", ")}.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days: 0,
          action: "complete-record",
        });
      }
    }

    /* ── Work anniversary and birthday (the good kind of alert) ───────────── */
    if (active && employee.joinedAt) {
      const anniversary = nextAnniversary(employee.joinedAt, today);
      const days = daysBetween(today, anniversary);
      const years = anniversary.getFullYear() - new Date(employee.joinedAt).getFullYear();

      if (days <= 7 && years >= 1) {
        alerts.push({
          id: `anniversary-${employee.id}`,
          severity: "info",
          title: `${years} year${years === 1 ? "" : "s"} at Synaptic Lab`,
          detail:
            days === 0
              ? "Their work anniversary is today."
              : `Work anniversary in ${days} day${days === 1 ? "" : "s"}.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days,
          action: "celebrate",
        });
      }
    }

    if (active && employee.dateOfBirth) {
      const birthday = nextAnniversary(employee.dateOfBirth, today);
      const days = daysBetween(today, birthday);

      if (days <= 7) {
        alerts.push({
          id: `birthday-${employee.id}`,
          severity: "info",
          title: "Birthday",
          detail:
            days === 0
              ? "Their birthday is today."
              : `Birthday in ${days} day${days === 1 ? "" : "s"}.`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          days,
          action: "celebrate",
        });
      }
    }
  }

  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.days - b.days,
  );
};

/** Copy for the auto-announcement raised when someone is published to the site. */
export const joinerAnnouncement = (employee: Employee) => ({
  kind: "joiner" as const,
  title: `${employee.fullName} has joined Synaptic Lab`,
  body: employee.role
    ? `${employee.fullName} joins us as ${employee.role}${
        employee.department ? ` in ${employee.department}` : ""
      }.`
    : `${employee.fullName} joins the team.`,
  link: "#leadership",
  isActive: true,
});
