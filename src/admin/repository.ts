import type { Employee, EmployeeDraft } from "./types";

/**
 * The seam between the admin UI and wherever employee records actually live.
 *
 * The UI talks ONLY to this interface, and every method is async even though the
 * current adapter is synchronous. That is the whole point: when you move to a
 * real backend (Supabase, or your own API), you write one new class that
 * implements `EmployeeRepository` and change a single line in `getRepository()`.
 * No component changes. No refactor.
 */
export interface EmployeeRepository {
  list(): Promise<Employee[]>;
  create(draft: EmployeeDraft): Promise<Employee>;
  update(id: string, draft: EmployeeDraft): Promise<Employee>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = "synapticlab.admin.employees";

/**
 * ⚠️ LOCAL-ONLY ADAPTER — NOT FOR PRODUCTION SALARY DATA.
 *
 * Records are kept in this browser's localStorage. That means:
 *   • the data never leaves the machine it was entered on (no sync, no backup),
 *   • clearing site data destroys it,
 *   • and it offers NO access control whatsoever.
 *
 * It exists so the admin panel is fully usable and reviewable today. Before real
 * salaries or emergency contacts go in, replace this with a backed adapter that
 * has authentication and row-level authorisation. See docs/ADMIN.md.
 */
class LocalStorageEmployeeRepository implements EmployeeRepository {
  private read(): Employee[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Employee[]) : [];
    } catch {
      // Corrupt payload or storage disabled — fail to an empty list rather than
      // taking the whole panel down.
      return [];
    }
  }

  private write(employees: Employee[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }

  async list(): Promise<Employee[]> {
    return this.read().sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async create(draft: EmployeeDraft): Promise<Employee> {
    const employee: Employee = { ...draft, id: crypto.randomUUID() };
    this.write([...this.read(), employee]);
    return employee;
  }

  async update(id: string, draft: EmployeeDraft): Promise<Employee> {
    const updated: Employee = { ...draft, id };
    this.write(this.read().map((e) => (e.id === id ? updated : e)));
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((e) => e.id !== id));
  }
}

let instance: EmployeeRepository | null = null;

/** The single line to change when a real backend arrives. */
export const getRepository = (): EmployeeRepository => {
  if (!instance) instance = new LocalStorageEmployeeRepository();
  return instance;
};

/** CSV export — the escape hatch, so the data is never trapped in a browser. */
export const toCsv = (employees: Employee[]): string => {
  const headers = [
    "Full name", "Role", "Department", "Email", "Phone", "Status", "Joined",
    "Salary", "Currency", "Emergency contact", "Relationship", "Emergency phone", "Notes",
  ];

  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  const rows = employees.map((e) =>
    [
      e.fullName, e.role, e.department, e.email, e.phone, e.status, e.joinedAt,
      e.salaryAmount, e.salaryCurrency,
      e.emergencyContact.name, e.emergencyContact.relationship, e.emergencyContact.phone,
      e.notes,
    ].map(escape).join(","),
  );

  return [headers.map(escape).join(","), ...rows].join("\n");
};
