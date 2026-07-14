import { describe, expect, it } from "vitest";
import { nextEmployeeId, type Employee, EMPTY_DRAFT } from "@/admin/types";
import { nextReference } from "@/hr/letters";
import { buildAlerts } from "@/hr/automations";
import { LIMITS, validate } from "@/data/limits";

const employee = (over: Partial<Employee>): Employee => ({
  ...EMPTY_DRAFT,
  id: crypto.randomUUID(),
  ...over,
});

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe("nextEmployeeId", () => {
  it("scopes the sequence to the joining year", () => {
    expect(nextEmployeeId([], "2026-03-01")).toBe("SL-2026-001");
  });

  it("takes max+1, so deleting a record cannot cause a collision", () => {
    // The bug this guards: counting rows would return 002 here and collide.
    const existing = [
      employee({ employeeId: "SL-2026-001" }),
      employee({ employeeId: "SL-2026-007" }),
    ];
    expect(nextEmployeeId(existing, "2026-05-01")).toBe("SL-2026-008");
  });

  it("ignores other years", () => {
    const existing = [employee({ employeeId: "SL-2025-042" })];
    expect(nextEmployeeId(existing, "2026-01-01")).toBe("SL-2026-001");
  });
});

describe("nextReference", () => {
  it("mints a per-year sequence and never reuses one", () => {
    expect(nextReference([], 2026)).toBe("SL/HR/2026/001");
    expect(nextReference(["SL/HR/2026/001", "SL/HR/2026/009"], 2026)).toBe(
      "SL/HR/2026/010",
    );
  });
});

describe("buildAlerts", () => {
  it("flags an overdue probation confirmation as critical", () => {
    const alerts = buildAlerts([
      employee({
        fullName: "Test Person",
        joinedAt: daysAgo(200),
        probationMonths: 3,
        status: "active",
      }),
    ]);

    const probation = alerts.find((a) => a.id.startsWith("probation-"));
    expect(probation?.severity).toBe("critical");
  });

  it("flags a leaver still marked active — they keep drawing salary in reports", () => {
    const alerts = buildAlerts([
      employee({
        fullName: "Departed",
        joinedAt: daysAgo(400),
        exitDate: daysAgo(30),
        status: "active",
        employmentType: "full-time",
      }),
    ]);

    expect(alerts.some((a) => a.id.startsWith("stale-active-"))).toBe(true);
  });

  it("says nothing about an inactive employee", () => {
    const alerts = buildAlerts([
      employee({ fullName: "Gone", joinedAt: daysAgo(400), status: "inactive" }),
    ]);
    expect(alerts).toHaveLength(0);
  });
});

describe("content limits", () => {
  it("rejects a capability title that would wrap and break the row", () => {
    const tooLong = "A".repeat(LIMITS.capability.title.max + 1);
    expect(validate(tooLong, LIMITS.capability.title, "Title")).toContain("over");
  });

  it("rejects a description under the minimum", () => {
    expect(validate("short", LIMITS.capability.description, "Description")).toContain(
      "at least",
    );
  });

  it("accepts content inside the budget", () => {
    expect(
      validate(
        "Large-scale resource planning platforms unifying finance and inventory.",
        LIMITS.capability.description,
        "Description",
      ),
    ).toBeNull();
  });
});
