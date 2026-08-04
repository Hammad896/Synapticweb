import { describe, expect, it } from "vitest";
import { dueDateFor, invoiceTotal, isOverdue, nextInvoiceNo } from "@/finance/types";

describe("invoice numbering", () => {
  it("continues from the old tool's last invoice (INV-00216)", () => {
    expect(nextInvoiceNo([])).toBe("INV-00217");
  });

  it("continues from the highest existing number", () => {
    expect(
      nextInvoiceNo([{ invoiceNo: "INV-00217" }, { invoiceNo: "INV-00220" }]),
    ).toBe("INV-00221");
  });

  it("ignores hand-edited numbers that don't match the pattern", () => {
    expect(nextInvoiceNo([{ invoiceNo: "2026/07-A" }])).toBe("INV-00217");
  });
});

describe("due dates from terms", () => {
  it("Net 30 adds 30 days", () => {
    expect(dueDateFor("2026-07-01", "Net 30")).toBe("2026-07-31");
  });

  it("crosses month and year ends", () => {
    expect(dueDateFor("2026-12-15", "Net 30")).toBe("2027-01-14");
  });

  it("Due on receipt is the invoice date", () => {
    expect(dueDateFor("2026-07-01", "Due on receipt")).toBe("2026-07-01");
  });

  it("free-text terms leave the due date manual", () => {
    expect(dueDateFor("2026-07-01", "50% advance")).toBeNull();
  });
});

describe("totals and overdue", () => {
  it("total is the sum of qty × rate, rounded to 2dp", () => {
    expect(
      invoiceTotal({ lines: [{ description: "a", qty: 1, rate: 12780 }, { description: "b", qty: 2.5, rate: 10.111 }] }),
    ).toBe(12805.28);
  });

  it("overdue = sent, unpaid, past due — never draft or paid", () => {
    const base = { dueDate: "2026-07-31" };
    expect(isOverdue({ ...base, status: "sent" }, "2026-08-04")).toBe(true);
    expect(isOverdue({ ...base, status: "paid" }, "2026-08-04")).toBe(false);
    expect(isOverdue({ ...base, status: "draft" }, "2026-08-04")).toBe(false);
    expect(isOverdue({ ...base, status: "sent" }, "2026-07-31")).toBe(false);
  });
});
