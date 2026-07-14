import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button, EmptyState, Label } from "@/components/kit";
import { toCsv } from "./repository";
import type { Employee } from "./types";
import type { IssuedDocument } from "./repository";

/**
 * HR reports.
 *
 * Every figure is computed from the live records — nothing is cached, so a report
 * can never quietly disagree with the table it came from. Each report prints
 * (black on white, via `.print-area`) and exports to CSV.
 *
 * Design rule applied throughout: money is NEVER summed across currencies. A
 * single "total payroll" number mixing PKR and NOK would be confident and wrong,
 * which is worse than no number at all.
 */

const DAY = 1000 * 60 * 60 * 24;

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const monthsSince = (iso: string) =>
  iso ? (Date.now() - new Date(iso).getTime()) / (DAY * 30.44) : 0;

const download = (content: string, filename: string, type = "text/csv") => {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

type ReportId =
  | "headcount"
  | "payroll"
  | "attrition"
  | "tenure"
  | "probation"
  | "documents";

const REPORTS: Array<{ id: ReportId; name: string; blurb: string }> = [
  { id: "headcount", name: "Headcount", blurb: "By department, type and work mode." },
  { id: "payroll", name: "Payroll", blurb: "Monthly cost, split by currency and department." },
  { id: "attrition", name: "Joiners & leavers", blurb: "Movement over the last 12 months." },
  { id: "tenure", name: "Tenure", blurb: "How long people stay." },
  { id: "probation", name: "Probation pipeline", blurb: "Who is due for confirmation." },
  { id: "documents", name: "Document register", blurb: "Every letter issued, with references." },
];

const Table = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) => (
  <div className="surface overflow-x-auto">
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          {headers.map((h) => (
            <th
              key={h}
              scope="col"
              className="whitespace-nowrap px-5 py-3.5 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border last:border-b-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`px-5 py-3.5 text-sm ${
                  j === 0 ? "text-foreground" : "tabular-nums text-muted-foreground"
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Reports = ({
  employees,
  documents,
}: {
  employees: Employee[];
  documents: IssuedDocument[];
}) => {
  const [active, setActive] = useState<ReportId>("headcount");

  const activeStaff = useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees],
  );

  const report = useMemo(() => {
    switch (active) {
      /* ── Headcount ─────────────────────────────────────────────────────── */
      case "headcount": {
        const byDept = new Map<string, Employee[]>();
        for (const e of activeStaff) {
          const key = e.department.trim() || "Unassigned";
          byDept.set(key, [...(byDept.get(key) ?? []), e]);
        }

        const rows = [...byDept.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([dept, staff]) => [
            dept,
            staff.length,
            staff.filter((e) => e.employmentType === "full-time").length,
            staff.filter((e) => e.employmentType === "contract").length,
            staff.filter((e) => e.employmentType === "intern").length,
            staff.filter((e) => e.workMode === "remote").length,
          ]);

        return {
          headers: ["Department", "Total", "Full-time", "Contract", "Intern", "Remote"],
          rows,
          note: `${activeStaff.length} active · ${
            employees.length - activeStaff.length
          } inactive · ${byDept.size} departments`,
        };
      }

      /* ── Payroll ───────────────────────────────────────────────────────── */
      case "payroll": {
        const byCurrency = new Map<string, Employee[]>();
        for (const e of activeStaff) {
          byCurrency.set(e.salaryCurrency, [
            ...(byCurrency.get(e.salaryCurrency) ?? []),
            e,
          ]);
        }

        const rows: Array<Array<string | number>> = [];
        for (const [currency, staff] of byCurrency) {
          const byDept = new Map<string, number>();
          for (const e of staff) {
            const key = e.department.trim() || "Unassigned";
            byDept.set(key, (byDept.get(key) ?? 0) + e.salaryAmount);
          }

          for (const [dept, total] of byDept) {
            const count = staff.filter(
              (e) => (e.department.trim() || "Unassigned") === dept,
            ).length;
            rows.push([
              dept,
              currency,
              count,
              money(total, currency),
              money(Math.round(total / Math.max(count, 1)), currency),
            ]);
          }

          rows.push([
            `Total (${currency})`,
            currency,
            staff.length,
            money(
              staff.reduce((sum, e) => sum + e.salaryAmount, 0),
              currency,
            ),
            "—",
          ]);
        }

        return {
          headers: ["Department", "Currency", "Staff", "Monthly cost", "Average"],
          rows,
          note: "Active staff only. Currencies are reported separately — never summed together.",
        };
      }

      /* ── Attrition ─────────────────────────────────────────────────────── */
      case "attrition": {
        const months: Array<{ label: string; joined: number; left: number }> = [];

        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

          months.push({
            label: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
            joined: employees.filter((e) => e.joinedAt?.startsWith(key)).length,
            left: employees.filter((e) => e.exitDate?.startsWith(key)).length,
          });
        }

        const totalJoined = months.reduce((sum, m) => sum + m.joined, 0);
        const totalLeft = months.reduce((sum, m) => sum + m.left, 0);

        // Standard attrition: leavers ÷ average headcount over the period.
        const avgHeadcount = Math.max(
          (employees.length + (employees.length - totalJoined + totalLeft)) / 2,
          1,
        );
        const rate = ((totalLeft / avgHeadcount) * 100).toFixed(1);

        return {
          headers: ["Month", "Joined", "Left", "Net"],
          rows: months.map((m) => [m.label, m.joined, m.left, m.joined - m.left]),
          note: `Last 12 months: ${totalJoined} joined, ${totalLeft} left. Attrition ≈ ${rate}%.`,
        };
      }

      /* ── Tenure ────────────────────────────────────────────────────────── */
      case "tenure": {
        const bands = [
          { label: "Under 6 months", test: (m: number) => m < 6 },
          { label: "6–12 months", test: (m: number) => m >= 6 && m < 12 },
          { label: "1–2 years", test: (m: number) => m >= 12 && m < 24 },
          { label: "2–5 years", test: (m: number) => m >= 24 && m < 60 },
          { label: "5+ years", test: (m: number) => m >= 60 },
        ];

        const rows = bands.map((band) => {
          const staff = activeStaff.filter((e) => band.test(monthsSince(e.joinedAt)));
          const share = activeStaff.length
            ? ((staff.length / activeStaff.length) * 100).toFixed(0)
            : "0";
          return [band.label, staff.length, `${share}%`];
        });

        const avg = activeStaff.length
          ? activeStaff.reduce((sum, e) => sum + monthsSince(e.joinedAt), 0) /
            activeStaff.length
          : 0;

        return {
          headers: ["Tenure band", "Staff", "Share"],
          rows,
          note: `Average tenure: ${
            avg >= 12 ? `${(avg / 12).toFixed(1)} years` : `${Math.round(avg)} months`
          }.`,
        };
      }

      /* ── Probation ─────────────────────────────────────────────────────── */
      case "probation": {
        const rows = activeStaff
          .filter((e) => e.joinedAt && e.probationMonths > 0)
          .map((e) => {
            const due = new Date(e.joinedAt);
            due.setMonth(due.getMonth() + e.probationMonths);
            const days = Math.round((due.getTime() - Date.now()) / DAY);
            return { e, due, days };
          })
          .filter((row) => row.days <= 45)
          .sort((a, b) => a.days - b.days)
          .map(({ e, due, days }) => [
            e.fullName,
            e.role || "—",
            due.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            days < 0 ? `${Math.abs(days)} days overdue` : `in ${days} days`,
          ]);

        return {
          headers: ["Employee", "Role", "Confirmation due", "Status"],
          rows,
          note:
            rows.length === 0
              ? "Nobody is due for probation confirmation in the next 45 days."
              : `${rows.length} confirmation${rows.length === 1 ? "" : "s"} due or overdue.`,
        };
      }

      /* ── Document register ─────────────────────────────────────────────── */
      case "documents": {
        const rows = documents.map((d) => [
          d.reference,
          d.letterType,
          d.employeeName,
          d.status,
          d.issuedAt
            ? new Date(d.issuedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
        ]);

        const issued = documents.filter((d) => d.status === "issued").length;
        const revoked = documents.filter((d) => d.status === "revoked").length;

        return {
          headers: ["Reference", "Type", "Employee", "Status", "Issued"],
          rows,
          note: `${documents.length} in the register · ${issued} issued · ${revoked} revoked.`,
        };
      }
    }
  }, [active, activeStaff, employees, documents]);

  const exportCsv = () => {
    if (active === "headcount" && employees.length) {
      download(toCsv(employees), "synapticlab-employees.csv");
      return;
    }

    const csv = [
      report.headers.join(","),
      ...report.rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    download(csv, `synapticlab-${active}-report.csv`);
  };

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActive(r.id)}
              aria-pressed={active === r.id}
              className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                active === r.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={!report.rows.length}>
            <Download size={15} aria-hidden="true" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      <div className="print-area mt-8">
        <div className="mb-5">
          <h2 className="type-display text-2xl text-foreground">
            {REPORTS.find((r) => r.id === active)?.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{report.note}</p>
          <Label className="mt-3 block">
            Synaptic Lab · generated{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Label>
        </div>

        {report.rows.length === 0 ? (
          <EmptyState
            title="Nothing to report yet"
            description="This report will populate once there are records to draw on."
          />
        ) : (
          <Table headers={report.headers} rows={report.rows} />
        )}
      </div>
    </div>
  );
};

export default Reports;
