import type { HrRepository } from "@/admin/repository";
import { nextEmployeeId, type Employee, type EmployeeDraft } from "@/admin/types";
import type { FinanceRepository } from "./repository";
import type { PayrollDraft, TransactionDraft } from "./types";
import { totalsOf } from "./calc";

/**
 * One-click import of the Excel export (finance-data-for-import/, checked in as
 * src/finance/seed/finance-seed.json). Idempotent end to end:
 *
 *   - transactions dedupe on their export ID (T001…T262)
 *   - payroll rows dedupe on their slip number
 *   - employees match by name — existing people are UPDATED (status, type,
 *     salary, blanks filled), never duplicated, and nobody is ever deleted
 *
 * Ends by reconciling the ledger against the workbook's published totals, so
 * the caller can show "verified" or the exact discrepancy.
 */

interface SeedEmployee {
  fullName: string;
  status: "active" | "inactive";
  staffType: string;
  role: string;
  salaryAmount: number;
  phone: string;
  cnic: string;
  address: string;
  skills: string;
  emergencyPhone: string;
  emergencyName: string;
  joinedAt: string;
}

interface Seed {
  categories: { incomeSources: string[]; expenseCategories: string[] };
  employees: SeedEmployee[];
  transactions: Array<Omit<TransactionDraft, "legacyId"> & { legacyId: string }>;
  payroll: Array<Omit<PayrollDraft, "employeeId" | "status" | "transactionId">>;
  expected: {
    transactionCount: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
}

export interface ImportReport {
  transactionsAdded: number;
  payrollAdded: number;
  employeesCreated: number;
  employeesUpdated: number;
  verified: boolean;
  discrepancy: string | null;
}

export const importFinanceSeed = async (
  hr: HrRepository,
  finance: FinanceRepository,
): Promise<ImportReport> => {
  // The seed holds the company's ledger and employee PII, and the repo (and
  // therefore the Vercel bundle) is public — so the file is gitignored and only
  // exists on the owner's machine. import.meta.glob makes it OPTIONAL: present
  // locally, absent (without breaking the build) in production.
  const seedModules = import.meta.glob<{ default: unknown }>("./seed/finance-seed.json");
  const loadSeed = seedModules["./seed/finance-seed.json"];
  if (!loadSeed) {
    throw new Error(
      "The import seed is not part of this build (it holds PII and the repo is public). " +
        "Run the import from a local checkout: npm run dev, then press this button — " +
        "it writes to the live database.",
    );
  }
  const seed = (await loadSeed()).default as unknown as Seed;

  /* 1 — categories */
  await finance.ensureCategories("income_source", seed.categories.incomeSources);
  await finance.ensureCategories("expense_category", seed.categories.expenseCategories);

  /* 2 — employees, matched by name */
  const existing = await hr.listEmployees();
  const byName = new Map(existing.map((e) => [e.fullName.trim().toLowerCase(), e]));
  const roster = [...existing];

  let employeesCreated = 0;
  let employeesUpdated = 0;

  for (const person of seed.employees) {
    const match = byName.get(person.fullName.trim().toLowerCase());
    const staffType = (person.staffType === "outsource" ? "outsource" : "internal") as Employee["staffType"];

    if (match) {
      // The workbook is authoritative for the finance facts; everything else
      // only fills blanks so richer HR data is never overwritten.
      const draft: EmployeeDraft = {
        ...match,
        status: person.status,
        staffType,
        salaryAmount: person.salaryAmount,
        role: match.role || person.role,
        phone: match.phone || person.phone,
        cnic: match.cnic || person.cnic,
        address: match.address || person.address,
        notes: match.notes || (person.skills ? `Skills: ${person.skills}` : ""),
        emergencyContact: {
          name: match.emergencyContact.name || person.emergencyName,
          relationship: match.emergencyContact.relationship,
          phone: match.emergencyContact.phone || person.emergencyPhone,
        },
      };
      await hr.updateEmployee(match.id, draft);
      employeesUpdated++;
    } else {
      const draft: EmployeeDraft = {
        employeeId: nextEmployeeId(roster, person.joinedAt),
        verifyToken: "",
        fullName: person.fullName,
        role: person.role,
        department: "",
        manager: "",
        email: "",
        phone: person.phone,
        cnic: person.cnic,
        dateOfBirth: "",
        address: person.address,
        status: person.status,
        employmentType: "full-time",
        workMode: "onsite",
        staffType,
        joinedAt: person.joinedAt,
        probationMonths: 3,
        exitDate: "",
        salaryAmount: person.salaryAmount,
        salaryCurrency: "PKR",
        emergencyContact: {
          name: person.emergencyName,
          relationship: "",
          phone: person.emergencyPhone,
        },
        photoPath: "",
        notes: person.skills ? `Skills: ${person.skills}` : "",
        showOnWebsite: false,
        publicBio: "",
      };
      const created = await hr.createEmployee(draft);
      roster.push(created);
      byName.set(created.fullName.trim().toLowerCase(), created);
      employeesCreated++;
    }
  }

  /* 3 — the ledger, verbatim, deduped on export ID. System numbers (NNN-YYYY)
         are assigned chronologically so the history reads in order. */
  const counters = new Map<string, number>();
  const numberFor = (date: string) => {
    const year = date.slice(0, 4);
    const n = (counters.get(year) ?? 0) + 1;
    counters.set(year, n);
    return `${String(n).padStart(3, "0")}-${year}`;
  };
  const chronological = [...seed.transactions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.legacyId.localeCompare(b.legacyId),
  );
  const numbers = new Map(chronological.map((t) => [t.legacyId, numberFor(t.date)]));

  const transactionsAdded = await finance.insertTransactions(
    seed.transactions.map((t) => ({
      legacyId: t.legacyId,
      txnNo: numbers.get(t.legacyId) ?? "",
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      notes: "",
      amount: t.amount,
    })),
  );

  /* 4 — payroll register, deduped on slip number, linked to people and to the
         Salary ledger rows that already exist for those months */
  const ledger = await finance.listTransactions();
  const employeesNow = await hr.listEmployees();
  const employeeByName = new Map(
    employeesNow.map((e) => [e.fullName.trim().toLowerCase(), e]),
  );

  const payrollAdded = await finance.insertPayroll(
    seed.payroll.map((p) => {
      const person = employeeByName.get(p.employeeName.trim().toLowerCase());
      // Best-effort reconciliation: the salary expense entered in the ledger on
      // this row's pay date, mentioning this person.
      const matchingSalary = ledger.find(
        (t) =>
          t.type === "expense" &&
          t.category === "Salary" &&
          t.date === p.payDate &&
          t.description.toLowerCase().includes(p.employeeName.trim().toLowerCase()),
      );
      return {
        payMonth: p.payMonth,
        employeeId: person?.id ?? null,
        employeeName: p.employeeName,
        designation: p.designation,
        cnic: p.cnic,
        basic: p.basic,
        bonus: p.bonus,
        deduction: p.deduction,
        payDate: p.payDate,
        paymentMode: p.paymentMode,
        slipNo: p.slipNo,
        status: "confirmed" as const,
        transactionId: matchingSalary?.id ?? null,
      };
    }),
  );

  /* 5 — reconcile */
  const totals = totalsOf(ledger.filter((t) => t.legacyId));
  const problems: string[] = [];
  if (totals.count !== seed.expected.transactionCount)
    problems.push(`count ${totals.count} ≠ ${seed.expected.transactionCount}`);
  if (totals.income !== seed.expected.totalIncome)
    problems.push(`income ${totals.income} ≠ ${seed.expected.totalIncome}`);
  if (totals.expenses !== seed.expected.totalExpenses)
    problems.push(`expenses ${totals.expenses} ≠ ${seed.expected.totalExpenses}`);
  if (totals.net !== seed.expected.netBalance)
    problems.push(`net ${totals.net} ≠ ${seed.expected.netBalance}`);

  return {
    transactionsAdded,
    payrollAdded,
    employeesCreated,
    employeesUpdated,
    verified: problems.length === 0,
    discrepancy: problems.length ? problems.join("; ") : null,
  };
};
