export type EmployeeStatus = "active" | "inactive";
export type EmploymentType = "full-time" | "part-time" | "contract" | "intern";
export type WorkMode = "onsite" | "remote" | "hybrid";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Employee {
  id: string;
  /** Internal staff number, e.g. "SL-014". Distinct from the generated id. */
  employeeId: string;
  fullName: string;
  role: string;
  /** Free text — "Engineering", "Operations". Not an enum, so it stays flexible. */
  department: string;
  email: string;
  phone: string;

  status: EmployeeStatus;
  employmentType: EmploymentType;
  workMode: WorkMode;
  /** Who they report to. Free text rather than a self-reference — no org-chart yet. */
  manager: string;

  /** ISO date (YYYY-MM-DD). Stored as a string so it survives JSON round-trips. */
  joinedAt: string;
  /** Set only when someone leaves. Drives the "inactive" state honestly. */
  exitDate: string;

  /** Monthly gross. Currency kept alongside so mixed-currency payroll still totals. */
  salaryAmount: number;
  salaryCurrency: string;

  emergencyContact: EmergencyContact;
  notes: string;
}

/** Everything except the generated id. */
export type EmployeeDraft = Omit<Employee, "id">;

export const EMPTY_DRAFT: EmployeeDraft = {
  employeeId: "",
  fullName: "",
  role: "",
  department: "",
  email: "",
  phone: "",
  status: "active",
  employmentType: "full-time",
  workMode: "onsite",
  manager: "",
  joinedAt: "",
  exitDate: "",
  salaryAmount: 0,
  salaryCurrency: "PKR",
  emergencyContact: { name: "", relationship: "", phone: "" },
  notes: "",
};

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "full-time",
  "part-time",
  "contract",
  "intern",
];

export const WORK_MODES: WorkMode[] = ["onsite", "remote", "hybrid"];

export const CURRENCIES = ["PKR", "USD", "EUR", "NOK", "GBP"];
