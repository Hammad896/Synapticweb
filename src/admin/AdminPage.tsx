import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import EmployeeForm from "./EmployeeForm";
import { getRepository, toCsv } from "./repository";
import type { Employee, EmployeeDraft, EmployeeStatus } from "./types";
import { cn } from "@/lib/utils";

type Filter = "all" | EmployeeStatus;

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(amount);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
};

/** Whole years of service, which is the number anyone actually wants. */
const tenure = (iso: string) => {
  if (!iso) return "—";
  const months =
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 1) return "New";
  if (months < 12) return `${Math.floor(months)} mo`;
  return `${(months / 12).toFixed(1)} yr`;
};

const AdminPage = () => {
  const repository = getRepository();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const refresh = () => repository.list().then(setEmployees);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        !q
          ? true
          : [e.fullName, e.role, e.department, e.email].some((field) =>
              field.toLowerCase().includes(q),
            ),
      );
  }, [employees, query, filter]);

  const activeCount = employees.filter((e) => e.status === "active").length;

  const handleSave = async (draft: EmployeeDraft) => {
    if (editing) await repository.update(editing.id, draft);
    else await repository.create(draft);

    setEditing(null);
    setIsCreating(false);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await repository.remove(id);
    setConfirmingDelete(null);
    await refresh();
  };

  const handleExport = () => {
    const blob = new Blob([toCsv(employees)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synapticlab-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const isEditorOpen = isCreating || editing !== null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link to="/" aria-label="Back to the public site">
              <Logo className="h-7" />
            </Link>
            <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* This warning is not decoration. Until a real backend is wired, these
            records live only in this browser and are protected by nothing. */}
        <div className="mb-10 flex gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <TriangleAlert
            size={20}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-500"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Local storage only — not yet safe for real salary data
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Records are saved in this browser alone: they don't sync, they aren't backed
              up, and there is no access control. Wire an authenticated backend before
              entering real salaries or emergency contacts. See{" "}
              <code className="text-foreground">docs/ADMIN.md</code>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="type-display text-4xl text-foreground">Employees</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {employees.length} total · {activeCount} active ·{" "}
              {employees.length - activeCount} inactive
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={employees.length === 0}
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            >
              <Download size={15} aria-hidden="true" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setIsCreating(true);
              }}
              className="flex items-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:opacity-90"
            >
              <Plus size={15} aria-hidden="true" />
              Add employee
            </button>
          </div>
        </div>

        {isEditorOpen ? (
          <section className="surface card-pad mt-10">
            <h2 className="type-display mb-8 text-2xl text-foreground">
              {editing ? `Edit — ${editing.fullName}` : "New employee"}
            </h2>
            <EmployeeForm
              employee={editing ?? undefined}
              onSave={handleSave}
              onCancel={() => {
                setEditing(null);
                setIsCreating(false);
              }}
            />
          </section>
        ) : (
          <>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[16rem]">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <label htmlFor="employee-search" className="sr-only">
                  Search employees
                </label>
                <input
                  id="employee-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, role, department or email…"
                  className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                {(["all", "active", "inactive"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    aria-pressed={filter === option}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs capitalize transition-colors",
                      filter === option
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="surface mt-8 p-16 text-center">
                <p className="text-base text-foreground">
                  {employees.length === 0
                    ? "No employees yet."
                    : "No employees match that search."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {employees.length === 0
                    ? 'Use "Add employee" to create the first record.'
                    : "Try a different name, role, or department."}
                </p>
              </div>
            ) : (
              // A data table cannot honestly become a phone layout — squeezing 8
              // columns into 390px produces something unreadable. So it stays a
              // table and scrolls horizontally, with a visible hint that it does.
              <div className="surface mt-8 overflow-x-auto">
                <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground lg:hidden">
                  Swipe the table sideways to see salary and emergency contact →
                </p>
                <table className="w-full min-w-[56rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {["Name", "Department", "Status", "Joined", "Tenure", "Salary", "Emergency", ""].map(
                        (heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className="px-5 py-4 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {visible.map((employee) => (
                      <tr
                        key={employee.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-foreground">
                            {employee.fullName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {employee.role}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {employee.department || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs capitalize",
                              employee.status === "active"
                                ? "border-emerald-500/40 text-emerald-500"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                employee.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground",
                              )}
                            />
                            {employee.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {formatDate(employee.joinedAt)}
                        </td>

                        <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground">
                          {tenure(employee.joinedAt)}
                        </td>

                        <td className="px-5 py-4 text-sm tabular-nums text-foreground">
                          {formatMoney(employee.salaryAmount, employee.salaryCurrency)}
                        </td>

                        <td className="px-5 py-4">
                          {employee.emergencyContact.name ? (
                            <>
                              <p className="text-sm text-foreground">
                                {employee.emergencyContact.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {employee.emergencyContact.phone}
                                {employee.emergencyContact.relationship &&
                                  ` · ${employee.emergencyContact.relationship}`}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditing(employee)}
                              aria-label={`Edit ${employee.fullName}`}
                              className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(employee.id)}
                              aria-label={`Delete ${employee.fullName}`}
                              className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>

                          {confirmingDelete === employee.id && (
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleDelete(employee.id)}
                                className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDelete(null)}
                                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
