import { describe, expect, it } from "vitest";
import {
  applyFilter,
  breakdown,
  EMPTY_FILTER,
  fiscalYearClosings,
  fiscalYearOf,
  fiscalYearRange,
  inRange,
  monthlyClosings,
  openingBalance,
  round2,
  totalsOf,
  yearlyClosings,
} from "@/finance/calc";
import {
  defaultPayDate,
  netPay,
  nextSlipNo,
  nextTransactionNo,
  type PayrollItem,
  type Transaction,
} from "@/finance/types";
import { parseTransactionsCsv, transactionsToCsv } from "@/finance/csv";
import seed from "@/finance/seed/finance-seed.json";

/**
 * The seed is the real exported ledger, and 04-BUSINESS-RULES.md publishes the
 * workbook's own totals. These tests replay the whole history through calc.ts
 * and demand the same numbers — if the closing logic or the import ever drifts
 * from the Excel truth, this fails.
 */

const ledger: Transaction[] = seed.transactions.map((t, i) => ({
  id: String(i),
  legacyId: t.legacyId,
  txnNo: "",
  date: t.date,
  type: t.type as Transaction["type"],
  category: t.category,
  description: t.description,
  notes: "",
  amount: t.amount,
  createdAt: "",
}));

describe("finance totals against the workbook", () => {
  it("reproduces the all-time totals", () => {
    const totals = totalsOf(ledger);
    expect(totals.count).toBe(262);
    expect(totals.income).toBe(11_915_314.18);
    expect(totals.expenses).toBe(11_771_096);
    expect(totals.net).toBe(144_218.18);
  });

  it("reproduces the yearly closings, carried forward", () => {
    const years = yearlyClosings(ledger);
    expect(years.map((y) => y.period)).toEqual(["2024", "2025", "2026"]);
    expect(years[0]).toMatchObject({ opening: 0, income: 1_280_025, expenses: 1_387_164, closing: -107_139 });
    expect(years[1]).toMatchObject({ opening: -107_139, income: 6_326_250, expenses: 6_257_932, closing: -38_821 });
    expect(years[2]).toMatchObject({ opening: -38_821, income: 4_309_039.18, expenses: 4_126_000, closing: 144_218.18 });
  });

  it("reproduces the recent monthly closings", () => {
    const months = monthlyClosings(ledger);
    const byPeriod = Object.fromEntries(months.map((m) => [m.period, m]));
    expect(byPeriod["2026-04"]).toMatchObject({ opening: 524_118.18, income: 50_000, expenses: 541_200, closing: 32_918.18 });
    expect(byPeriod["2026-05"]).toMatchObject({ closing: 68_718.18 });
    expect(byPeriod["2026-06"]).toMatchObject({ closing: 386_218.18 });
    expect(byPeriod["2026-07"]).toMatchObject({ closing: 550_218.18 });
    expect(byPeriod["2026-08"]).toMatchObject({ income: 0, expenses: 406_000, closing: 144_218.18 });
  });

  it("reproduces the expense breakdown by category", () => {
    const byCategory = Object.fromEntries(
      breakdown(ledger, "expense").map((b) => [b.category, b.amount]),
    );
    expect(byCategory).toEqual({
      Salary: 7_132_700,
      Outsource: 3_336_932,
      "Social Media": 700_844,
      Subscription: 301_390,
      Loan: 100_000,
      Bonus: 75_000,
      Accessories: 68_000,
      Legal: 54_230,
      Other: 2_000,
    });
  });

  it("reproduces the income breakdown by source", () => {
    const bySource = Object.fromEntries(
      breakdown(ledger, "income").map((b) => [b.category, b.amount]),
    );
    expect(bySource).toEqual({
      Qamar: 11_376_314.18,
      Waleed: 530_000,
      Others: 5_000,
      Hammad: 4_000,
    });
  });
});

describe("filters", () => {
  it("filters by year, month, type, category and text together", () => {
    const july = applyFilter(ledger, {
      ...EMPTY_FILTER,
      year: "2026",
      month: "07",
      type: "expense",
    });
    expect(july.length).toBeGreaterThan(0);
    expect(july.every((t) => t.date.startsWith("2026-07") && t.type === "expense")).toBe(true);

    const loan = applyFilter(ledger, { ...EMPTY_FILTER, category: "Loan" });
    expect(loan).toHaveLength(1);
    expect(loan[0].amount).toBe(100_000);

    const search = applyFilter(ledger, { ...EMPTY_FILTER, search: "kundeportal" });
    expect(search.length).toBeGreaterThanOrEqual(4);
  });
});

describe("payroll rules", () => {
  const row = (slipNo: string): PayrollItem => ({
    id: slipNo,
    payMonth: "2026-07-01",
    employeeId: null,
    employeeName: "",
    designation: "",
    cnic: "",
    basic: 0,
    bonus: 0,
    deduction: 0,
    payDate: "",
    paymentMode: "Bank Transfer",
    slipNo,
    status: "confirmed",
    transactionId: null,
    createdAt: "",
  });

  it("net pay = basic + bonus − deduction", () => {
    expect(netPay({ basic: 70_000, bonus: 5_000, deduction: 10_000 })).toBe(65_000);
  });

  it("slip numbers continue within a month and restart the next month", () => {
    const existing = [row("SYN-SS-202607-001"), row("SYN-SS-202607-002")];
    expect(nextSlipNo(existing, "2026-07-01")).toBe("SYN-SS-202607-003");
    expect(nextSlipNo(existing, "2026-08-01")).toBe("SYN-SS-202608-001");
  });

  it("pay date defaults to the 5th of the following month, across year end", () => {
    expect(defaultPayDate("2026-07-01")).toBe("2026-08-05");
    expect(defaultPayDate("2026-12-01")).toBe("2027-01-05");
  });
});

describe("FBR fiscal years and custom periods", () => {
  it("maps dates to the 1 July – 30 June fiscal year", () => {
    expect(fiscalYearOf("2025-06-30")).toBe("2024-25");
    expect(fiscalYearOf("2025-07-01")).toBe("2025-26");
    expect(fiscalYearOf("2026-06-30")).toBe("2025-26");
    expect(fiscalYearOf("2026-07-01")).toBe("2026-27");
    expect(fiscalYearRange("2025-26")).toEqual(["2025-07-01", "2026-06-30"]);
  });

  it("fiscal closings chain and reconcile with the all-time totals", () => {
    const rows = fiscalYearClosings(ledger);
    expect(rows[0].opening).toBe(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].opening).toBe(rows[i - 1].closing);
    }
    const income = round2(rows.reduce((s, r) => s + r.income, 0));
    const expenses = round2(rows.reduce((s, r) => s + r.expenses, 0));
    expect(income).toBe(11_915_314.18);
    expect(expenses).toBe(11_771_096);
    expect(rows[rows.length - 1].closing).toBe(144_218.18);
  });

  it("answers 'salaries from 1 Jul 2025 to 30 Jun 2026' exactly", () => {
    const scoped = inRange(ledger, "2025-07-01", "2026-06-30").filter(
      (t) => t.type === "expense" && t.category === "Salary",
    );
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((t) => t.date >= "2025-07-01" && t.date <= "2026-06-30")).toBe(true);
    // The FY row must agree with the manual slice.
    const fy = fiscalYearClosings(ledger).find((r) => r.period === "2025-26")!;
    const manual = totalsOf(inRange(ledger, "2025-07-01", "2026-06-30"));
    expect(fy.income).toBe(manual.income);
    expect(fy.expenses).toBe(manual.expenses);
  });

  it("opening balance at a period start equals net of everything before it", () => {
    const opening = openingBalance(ledger, "2026-01-01");
    const before = totalsOf(ledger.filter((t) => t.date < "2026-01-01"));
    expect(opening).toBe(before.net);
    // Opening + period net = all-time net when the period runs to the end.
    const period = totalsOf(inRange(ledger, "2026-01-01", ""));
    expect(round2(opening + period.net)).toBe(144_218.18);
  });
});

describe("transaction numbering", () => {
  it("continues within a year and restarts for a new one", () => {
    const existing = [{ txnNo: "001-2026" }, { txnNo: "014-2026" }, { txnNo: "260-2025" }];
    expect(nextTransactionNo(existing, "2026-08-04")).toBe("015-2026");
    expect(nextTransactionNo(existing, "2025-12-31")).toBe("261-2025");
    expect(nextTransactionNo(existing, "2027-01-01")).toBe("001-2027");
    expect(nextTransactionNo([], "2026-01-01")).toBe("001-2026");
  });
});

describe("CSV backup round trip", () => {
  it("export → parse returns the whole ledger unchanged", () => {
    const csv = transactionsToCsv(ledger);
    const { drafts, errors } = parseTransactionsCsv(csv);
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(262);
    // Descriptions carry commas and quotes; totals prove nothing was mangled.
    const income = drafts.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0);
    expect(Math.round(income * 100) / 100).toBe(11_915_314.18);
    expect(drafts[0].legacyId).toBe("T001");
  });

  it("accepts Excel-style day-first dates, thousand separators, and any column order", () => {
    const { drafts, errors } = parseTransactionsCsv(
      [
        "amount,category,type,date,description",
        '"1,500",Subscription,Expense,05/08/2026,"Canva, yearly"',
        "2000,Qamar,income,2026-08-05,",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(drafts).toEqual([
      {
        legacyId: "",
        txnNo: "",
        date: "2026-08-05",
        type: "expense",
        category: "Subscription",
        description: "Canva, yearly",
        notes: "",
        amount: 1500,
      },
      {
        legacyId: "",
        txnNo: "",
        date: "2026-08-05",
        type: "income",
        category: "Qamar",
        description: "",
        notes: "",
        amount: 2000,
      },
    ]);
  });

  it("reports bad rows individually instead of failing the file", () => {
    const { drafts, errors } = parseTransactionsCsv(
      [
        "id,date,type,category,description,amount",
        "X1,2026-13-45,Expense,Other,bad date,100",
        "X2,2026-08-01,Transfer,Other,bad type,100",
        "X3,2026-08-01,Expense,,no category,100",
        "X4,2026-08-01,Expense,Other,bad amount,abc",
        "X5,2026-08-01,Expense,Other,fine,100",
      ].join("\n"),
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].legacyId).toBe("X5");
    expect(errors).toHaveLength(4);
  });

  it("rejects a file missing required columns with a clear message", () => {
    const { drafts, errors } = parseTransactionsCsv("date,amount\n2026-08-01,100");
    expect(drafts).toEqual([]);
    expect(errors[0]).toContain("type");
    expect(errors[0]).toContain("category");
  });
});
