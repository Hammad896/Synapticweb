export type EmployeeStatus = "active" | "inactive";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  /** Free text — "Engineering", "Operations", etc. Not an enum, so it stays flexible. */
  department: string;
  email: string;
  phone: string;
  status: EmployeeStatus;
  /** ISO date (YYYY-MM-DD). Stored as a string so it survives JSON round-trips. */
  joinedAt: string;
  /** Monthly gross, in minor-unit-free whole numbers. Currency kept alongside. */
  salaryAmount: number;
  salaryCurrency: string;
  emergencyContact: EmergencyContact;
  notes: string;
}

/** Everything except the generated id. */
export type EmployeeDraft = Omit<Employee, "id">;

export const EMPTY_DRAFT: EmployeeDraft = {
  fullName: "",
  role: "",
  department: "",
  email: "",
  phone: "",
  status: "active",
  joinedAt: "",
  salaryAmount: 0,
  salaryCurrency: "PKR",
  emergencyContact: { name: "", relationship: "", phone: "" },
  notes: "",
};
