import { describe, expect, it } from "vitest";
import {
  applyFilter,
  breakdown,
  EMPTY_FILTER,
  monthlyClosings,
  totalsOf,
  yearlyClosings,
} from "@/finance/calc";
import { defaultPayDate, netPay, nextSlipNo, type PayrollItem, type Transaction } from "@/finance/types";
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
  date: t.date,
  type: t.type as Transaction["type"],
  category: t.category,
  description: t.description,
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
