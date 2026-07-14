import { useMemo, useState } from "react";
import {
  Download,
  Ellipsis,
  IdCard as IdCardIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge, Button, EmptyState, inputClass } from "@/components/kit";
import IdCard from "@/hr/IdCard";
import EmployeeForm from "../EmployeeForm";
import ImportEmployees from "../ImportEmployees";
import { ActionSheet, Drawer, SheetAction } from "../Sheet";
import { initialsOf, money, shortDate } from "../format";
import type { Employee, EmployeeDraft } from "../types";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

interface Props {
  employees: Employee[];
  activeCount: number;
  editing: Employee | null;
  setEditing: (employee: Employee | null) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  onSave: (draft: EmployeeDraft, photo: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImport: (drafts: EmployeeDraft[]) => Promise<void>;
  onExportCsv: () => void;
}

/**
 * The employee roster.
 *
 * Two presentations of the same data, chosen by breakpoint rather than squeezed
 * into one: a full table on desktop, and cards + an action sheet on mobile. A
 * 60rem table on a 390px screen is a horizontal-scroll puzzle, not a UI.
 */
const EmployeesTab = ({
  employees,
  activeCount,
  editing,
  setEditing,
  isCreating,
  setIsCreating,
  onSave,
  onDelete,
  onImport,
  onExportCsv,
}: Props) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cardFor, setCardFor] = useState<Employee | null>(null);
  const [sheetFor, setSheetFor] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        !q
          ? true
          : [e.fullName, e.role, e.department, e.email, e.employeeId].some((field) =>
              field.toLowerCase().includes(q),
            ),
      );
  }, [employees, query, filter]);

  const isEditorOpen = isCreating || editing !== null;
  const editorTitle = editing ? `Edit — ${editing.fullName}` : "New employee";

  const close = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const form = (
    <EmployeeForm
      employee={editing ?? undefined}
      allEmployees={employees}
      onSave={onSave}
      onCancel={close}
    />
  );

  if (cardFor) {
    return (
      <div>
        <div className="no-print mb-6 flex items-center justify-between gap-4">
          <h1 className="type-display text-xl text-foreground sm:text-2xl">ID card</h1>
          <Button variant="ghost" onClick={() => setCardFor(null)}>
            Back
          </Button>
        </div>
        <IdCard employee={cardFor} />
      </div>
    );
  }

  return (
    <>
      {/* Desktop: the editor is inline. Mobile: a full-screen Drawer (below). */}
      {isEditorOpen && (
        <section className="surface card-pad hidden md:block">
          <h1 className="type-display mb-8 text-2xl text-foreground">{editorTitle}</h1>
          {form}
        </section>
      )}

      {!isEditorOpen && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                Employees
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {employees.length} total · {activeCount} active
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-2 sm:gap-3">
              <ImportEmployees onImport={onImport} />
              <Button
                variant="secondary"
                onClick={onExportCsv}
                disabled={!employees.length}
                className="hidden sm:inline-flex"
              >
                <Download size={15} aria-hidden="true" />
                CSV
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus size={15} aria-hidden="true" />
                Add
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="relative flex-1">
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, role…"
                className={inputClass("rounded-full bg-card pl-11")}
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
                    "flex-1 rounded-full border px-4 py-2 text-xs capitalize transition-transform active:scale-95 sm:flex-none",
                    filter === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title={employees.length === 0 ? "No employees yet" : "No matches"}
                description={
                  employees.length === 0
                    ? "Add the first record to start building the roster."
                    : "Try a different name, ID, role or department."
                }
              />
            </div>
          ) : (
            <>
              {/* ── Mobile: cards ─────────────────────────────────────────── */}
              <ul className="mt-6 flex flex-col gap-3 md:hidden">
                {visible.map((employee) => (
                  <li key={employee.id}>
                    <div className="surface flex items-center gap-4 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-accent">
                        {initialsOf(employee.fullName) || "—"}
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditing(employee)}
                        className="min-w-0 flex-1 text-left transition-transform active:scale-[0.99]"
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {employee.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {employee.role || "—"}
                          {employee.department && ` · ${employee.department}`}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            tone={employee.status === "active" ? "success" : "neutral"}
                            dot
                          >
                            {employee.status}
                          </Badge>
                          {employee.employeeId && (
                            <span className="text-[10px] tabular-nums text-accent">
                              {employee.employeeId}
                            </span>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSheetFor(employee)}
                        aria-label={`Actions for ${employee.fullName}`}
                        className="tap shrink-0 rounded-full text-muted-foreground transition-transform active:scale-90"
                      >
                        <Ellipsis size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* ── Desktop: the table ────────────────────────────────────── */}
              <div className="surface mt-8 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[60rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Employee",
                        "ID",
                        "Department",
                        "Status",
                        "Joined",
                        "Salary",
                        "Site",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="whitespace-nowrap px-5 py-4 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
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
                            {employee.role || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs tabular-nums text-accent">
                          {employee.employeeId || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {employee.department || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            tone={employee.status === "active" ? "success" : "neutral"}
                            dot
                          >
                            {employee.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {shortDate(employee.joinedAt)}
                        </td>
                        <td className="px-5 py-4 text-sm tabular-nums text-foreground">
                          {employee.salaryAmount
                            ? money(employee.salaryAmount, employee.salaryCurrency)
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {employee.showOnWebsite ? (
                            <Badge tone="accent">Live</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setCardFor(employee)}
                              aria-label={`ID card for ${employee.fullName}`}
                              className="tap rounded-full text-muted-foreground hover:text-accent"
                            >
                              <IdCardIcon size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(employee)}
                              aria-label={`Edit ${employee.fullName}`}
                              className="tap rounded-full text-muted-foreground hover:text-accent"
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(employee.id)}
                              aria-label={`Delete ${employee.fullName}`}
                              className="tap rounded-full text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>

                          {confirmDelete === employee.id && (
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <Button
                                variant="danger"
                                className="px-3 py-1 text-xs"
                                onClick={async () => {
                                  await onDelete(employee.id);
                                  setConfirmDelete(null);
                                }}
                              >
                                Delete
                              </Button>
                              <Button
                                variant="ghost"
                                className="px-3 py-1 text-xs"
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <ActionSheet
        open={sheetFor !== null}
        title={sheetFor?.fullName ?? ""}
        onClose={() => setSheetFor(null)}
      >
        <SheetAction
          icon={IdCardIcon}
          label="ID card"
          onClick={() => {
            setCardFor(sheetFor);
            setSheetFor(null);
          }}
        />
        <SheetAction
          icon={Pencil}
          label="Edit record"
          onClick={() => {
            setEditing(sheetFor);
            setSheetFor(null);
          }}
        />
        <SheetAction
          icon={Trash2}
          label="Delete"
          destructive
          onClick={async () => {
            if (
              sheetFor &&
              window.confirm(`Delete ${sheetFor.fullName}? This cannot be undone.`)
            ) {
              await onDelete(sheetFor.id);
            }
            setSheetFor(null);
          }}
        />
      </ActionSheet>

      {/* The form owns the whole screen on mobile: a 30-field record squeezed
          into a card is a form nobody finishes. */}
      <Drawer open={isEditorOpen} title={editorTitle} onClose={close}>
        {form}
      </Drawer>
    </>
  );
};

export default EmployeesTab;
