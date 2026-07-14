import { BadgeCheck, Bell, CalendarClock, Users, Wallet } from "lucide-react";
import { Badge, Button, Stat } from "@/components/kit";
import { buildAlerts } from "@/hr/automations";
import { money } from "../format";
import type { Employee } from "../types";
import type { IssuedDocument } from "../repository";

const OverviewTab = ({
  employees,
  documents,
  metrics,
  onOpenEmployee,
}: {
  employees: Employee[];
  documents: IssuedDocument[];
  metrics: { active: Employee[]; payroll: Record<string, number>; avgTenure: number };
  onOpenEmployee: (employee: Employee) => void;
}) => {
  const alerts = buildAlerts(employees);
  const payrollEntries = Object.entries(metrics.payroll);

  return (
    <>
      <h1 className="type-display text-2xl text-foreground sm:text-4xl">Overview</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Derived live from the records.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 xl:grid-cols-4">
        <Stat
          icon={Users}
          label="Headcount"
          value={String(employees.length)}
          detail={`${metrics.active.length} active`}
        />
        <Stat
          icon={Wallet}
          label="Payroll"
          value={
            payrollEntries.length
              ? money(payrollEntries[0][1], payrollEntries[0][0])
              : "—"
          }
          detail={
            payrollEntries.length > 1
              ? payrollEntries
                  .slice(1)
                  .map(([c, t]) => money(t, c))
                  .join(" + ")
              : "Active staff"
          }
        />
        <Stat
          icon={CalendarClock}
          label="Avg tenure"
          value={
            metrics.avgTenure >= 12
              ? `${(metrics.avgTenure / 12).toFixed(1)} yr`
              : `${Math.round(metrics.avgTenure)} mo`
          }
          detail="Active staff"
        />
        <Stat
          icon={BadgeCheck}
          label="Letters"
          value={String(documents.filter((d) => d.status === "issued").length)}
          detail={`${documents.length} in register`}
        />
      </div>

      <section className="mt-10 sm:mt-12" aria-label="Alerts">
        <div className="flex items-center gap-3">
          <Bell size={16} aria-hidden="true" className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
          {alerts.length > 0 && <Badge tone="accent">{alerts.length}</Badge>}
        </div>

        {alerts.length === 0 ? (
          <div className="surface mt-5 p-8 text-center">
            <p className="text-sm text-foreground">Nothing needs attention.</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Probation dates, expiring contracts and incomplete records surface here
              automatically.
            </p>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Badge
                      tone={
                        alert.severity === "critical"
                          ? "danger"
                          : alert.severity === "warning"
                            ? "warning"
                            : "accent"
                      }
                      dot
                    >
                      {alert.severity}
                    </Badge>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {alert.employeeName}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {alert.detail}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    className="shrink-0 px-3 py-1.5 text-xs"
                    onClick={() => {
                      const employee = employees.find((e) => e.id === alert.employeeId);
                      if (employee) onOpenEmployee(employee);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default OverviewTab;
