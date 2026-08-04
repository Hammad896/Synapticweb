import { useMemo, useState } from "react";
import {
  Check,
  Download,
  Ellipsis,
  IdCard as IdCardIcon,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { Badge, Button, EmptyState, inputClass } from "@/components/kit";
import { SortTh, useSort } from "@/lib/useSort";
import IdCard from "@/hr/IdCard";
import EmployeeForm from "../EmployeeForm";
import ImportEmployees from "../ImportEmployees";
import { ActionSheet, Drawer, SheetAction } from "../Sheet";
import { initialsOf, money, shortDate } from "../format";
import type { Employee, EmployeeDraft } from "../types";
import type { UpdateRequest } from "../repository";
import { submissionChanges } from "../selfService";
import { cn, errorMessage } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

interface Props {
  employees: Employee[];
  activeCount: number;
  editing: Employee | null;
  setEditing: (employee: Employee | null) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  onSave: (draft: EmployeeDraft, photo: File | null) => Promise<void>;
  onDelete: (id: string, force?: boolean) => Promise<void>;
  onSetStatus: (employee: Employee, status: Employee["status"]) => Promise<void>;
  onImport: (drafts: EmployeeDraft[]) => Promise<void>;
  onExportCsv: () => void;
  updateRequests: UpdateRequest[];
  onRequestLink: (employee: Employee) => Promise<string>;
  onAddViaLink: (fullName: string) => Promise<string>;
  onApproveUpdate: (request: UpdateRequest) => Promise<void>;
  onRejectUpdate: (request: UpdateRequest) => Promise<void>;
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
  onSetStatus,
  onImport,
  onExportCsv,
  updateRequests,
  onRequestLink,
  onAddViaLink,
  onApproveUpdate,
  onRejectUpdate,
}: Props) => {
  const [query, setQuery] = useState("");
  // Active by default: Former employees are history, revealed on demand.
  const [filter, setFilter] = useState<Filter>("active");
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

  const { sorted, sort, toggle } = useSort(visible, {
    name: (e) => e.fullName.toLowerCase(),
    id: (e) => e.employeeId,
    department: (e) => e.department.toLowerCase(),
    status: (e) => `${e.status} ${e.staffType}`,
    joined: (e) => e.joinedAt,
    salary: (e) => e.salaryAmount,
    lastRaise: (e) => e.lastRaiseAt,
  });

  const isEditorOpen = isCreating || editing !== null;
  const editorTitle = editing ? `Edit — ${editing.fullName}` : "New employee";

  /** The submission waiting on the person being edited, surfaced IN the form. */
  const editingSubmission = editing
    ? updateRequests.find((r) => r.status === "submitted" && r.employeeId === editing.id) ?? null
    : null;

  /** The latest APPLIED submission — provenance for "who filled this field". */
  const editingApplied = editing
    ? updateRequests.find((r) => r.status === "approved" && r.employeeId === editing.id) ?? null
    : null;

  const approveWithFeedback = async (request: UpdateRequest) => {
    try {
      await onApproveUpdate(request);
      window.alert(
        `Applied ${Object.keys(request.submitted).length} field${Object.keys(request.submitted).length === 1 ? "" : "s"} to ${request.employeeName || "the record"}. ✓`,
      );
      // The record just changed under the editor — close it so it reopens fresh.
      setEditing(null);
    } catch (caught) {
      window.alert(`Could not apply the update: ${errorMessage(caught)}`);
    }
  };

  const rejectWithFeedback = async (request: UpdateRequest) => {
    if (!window.confirm("Reject this submission? Nothing will change on the record.")) return;
    try {
      await onRejectUpdate(request);
    } catch (caught) {
      window.alert(`Could not reject: ${errorMessage(caught)}`);
    }
  };

  /** Opens the owner's own mail client with a ready-to-send draft — the mail
   *  genuinely goes out from their account (qhammad286@gmail.com), free. */
  const openEmailDraft = (to: string, subject: string, body: string) => {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const requestLink = async (employee: Employee) => {
    try {
      const url = await onRequestLink(employee);
      await navigator.clipboard.writeText(url).catch(() => {});
      const sendEmail = window.confirm(
        `Update link for ${employee.fullName} — copied to your clipboard, valid 24 hours:\n\n${url}\n\nOK = open a ready-made email draft to send it.\nCancel = just keep it on the clipboard (e.g. for WhatsApp).`,
      );
      if (sendEmail) {
        openEmailDraft(
          employee.email,
          "Synaptic Lab — please update your details",
          `Salam ${employee.fullName.split(" ")[0]},\n\nPlease check and update your details for our records using this link (valid 24 hours):\n\n${url}\n\nIt takes about two minutes. Thank you!\n\n— Synaptic Lab`,
        );
      }
    } catch (caught) {
      const message = errorMessage(caught, "Could not create the link.");
      window.alert(
        message.includes("employee_update_requests")
          ? "The self-service table isn't in the database yet — run docs/supabase/self-service.sql in the Supabase SQL editor first."
          : `Could not create the link: ${message}`,
      );
    }
  };

  /** One delete path: hard blocks alert, same-name warnings ask, then force. */
  const deleteWithChecks = async (id: string) => {
    try {
      await onDelete(id);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "NameMatchWarning") {
        if (window.confirm(`${caught.message}\n\nDelete anyway?`)) {
          try {
            await onDelete(id, true);
          } catch (forced) {
            window.alert(errorMessage(forced, "Could not delete."));
          }
        }
        return;
      }
      window.alert(errorMessage(caught, "Could not delete."));
    }
  };

  const submittedRequests = updateRequests.filter((r) => r.status === "submitted");
  // Dead links don't count: a pending request past its 24h expiry can never
  // be submitted, so it isn't "awaiting" anything.
  const awaitingCount = updateRequests.filter(
    (r) => r.status === "pending" && new Date(r.expiresAt) > new Date(),
  ).length;

  const addViaLink = async () => {
    const name = window.prompt(
      "New employee's full name?\n\nThey'll fill in everything else themselves (CNIC, bank, contacts…) through the link — you just approve it.",
    )?.trim();
    if (!name) return;
    try {
      const url = await onAddViaLink(name);
      await navigator.clipboard.writeText(url).catch(() => {});
      const sendEmail = window.confirm(
        `${name} added to the roster.\n\nOnboarding link copied — valid 24 hours:\n\n${url}\n\nOK = open a ready-made welcome email to send it.\nCancel = just keep it on the clipboard.`,
      );
      if (sendEmail) {
        openEmailDraft(
          "",
          "Welcome to Synaptic Lab — complete your details",
          `Salam ${name.split(" ")[0]},\n\nWelcome aboard! Please complete your employee record using this link (valid 24 hours):\n\n${url}\n\nIt covers your CNIC, bank account for salary, and emergency contact — takes about two minutes.\n\n— Synaptic Lab`,
        );
      }
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not create the onboarding link."));
    }
  };

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
      pendingUpdate={editingSubmission}
      appliedUpdate={editingApplied}
      onApplyUpdate={approveWithFeedback}
      onRejectUpdate={rejectWithFeedback}
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
              <Button
                variant="secondary"
                onClick={() => void addViaLink()}
                title="Create the person with just a name and send them a link to fill in the rest"
              >
                <Link2 size={15} aria-hidden="true" />
                Add via link
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus size={15} aria-hidden="true" />
                Add
              </Button>
            </div>
          </div>

          {/* ── Submitted self-service updates, awaiting review ──────────── */}
          {submittedRequests.length > 0 && (
            <div className="surface mt-6 border-accent/40 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">
                {submittedRequests.length} update{submittedRequests.length === 1 ? "" : "s"} awaiting your review
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {submittedRequests.map((request) => {
                  const employee = employees.find((e) => e.id === request.employeeId);
                  const changes = submissionChanges(request.submitted, employee);
                  return (
                    <li key={request.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {request.employeeName || employee?.fullName || "Unknown"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          submitted {shortDate(request.submittedAt)}
                        </span>
                        <span className="ml-auto flex gap-2">
                          <Button
                            className="px-3 py-1.5 text-xs"
                            onClick={() => void approveWithFeedback(request)}
                          >
                            <Check size={13} aria-hidden="true" /> Approve
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-3 py-1.5 text-xs text-red-500"
                            onClick={() => void rejectWithFeedback(request)}
                          >
                            <X size={13} aria-hidden="true" /> Reject
                          </Button>
                        </span>
                      </div>
                      {changes.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No changes — everything matches the current record.
                        </p>
                      ) : (
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {changes.map((change) => (
                            <li key={change.key} className="text-xs">
                              <span className="text-muted-foreground">{change.label}: </span>
                              <span className="text-muted-foreground line-through">
                                {change.from || "—"}
                              </span>{" "}
                              <span className="font-medium text-emerald-600">{change.to || "—"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {awaitingCount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {awaitingCount} update link{awaitingCount === 1 ? "" : "s"} sent, awaiting the employee's response.
            </p>
          )}

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
              {(
                [
                  ["active", "Active"],
                  ["inactive", "Former"],
                  ["all", "All"],
                ] as const
              ).map(([option, label]) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={cn(
                    "flex-1 rounded-full border px-4 py-2 text-xs transition-transform active:scale-95 sm:flex-none",
                    filter === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {label}
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
                {sorted.map((employee) => (
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
                            {employee.status === "active" ? "active" : "former"}
                          </Badge>
                          {employee.staffType === "outsource" && (
                            <Badge tone="accent">Outsource</Badge>
                          )}
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
                      <SortTh label="Employee" sortKey="name" sort={sort} onToggle={toggle} />
                      <SortTh label="ID" sortKey="id" sort={sort} onToggle={toggle} />
                      <SortTh label="Department" sortKey="department" sort={sort} onToggle={toggle} />
                      <SortTh label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                      <SortTh label="Joined" sortKey="joined" sort={sort} onToggle={toggle} />
                      <SortTh label="Salary" sortKey="salary" sort={sort} onToggle={toggle} />
                      <SortTh label="Last raise" sortKey="lastRaise" sort={sort} onToggle={toggle} />
                      <th scope="col" className="whitespace-nowrap px-5 py-4 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        Site
                      </th>
                      <th scope="col" className="px-5 py-4" />
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.map((employee) => (
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
                          <div className="flex items-center gap-1.5">
                            <Badge
                              tone={employee.status === "active" ? "success" : "neutral"}
                              dot
                            >
                              {employee.status === "active" ? "active" : "former"}
                            </Badge>
                            {employee.staffType === "outsource" && (
                              <Badge tone="accent">Outsource</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {shortDate(employee.joinedAt)}
                        </td>
                        <td className="px-5 py-4 text-sm tabular-nums text-foreground">
                          {employee.salaryAmount
                            ? money(employee.salaryAmount, employee.salaryCurrency)
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {shortDate(employee.lastRaiseAt || null)}
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
                              onClick={() =>
                                void onSetStatus(
                                  employee,
                                  employee.status === "active" ? "inactive" : "active",
                                )
                              }
                              aria-label={
                                employee.status === "active"
                                  ? `Mark ${employee.fullName} as Former`
                                  : `Reactivate ${employee.fullName}`
                              }
                              title={
                                employee.status === "active"
                                  ? "Mark Former (keeps all history, leaves future payroll)"
                                  : "Reactivate (returns to default views and payroll)"
                              }
                              className="tap rounded-full text-muted-foreground hover:text-accent"
                            >
                              {employee.status === "active" ? (
                                <UserX size={15} aria-hidden="true" />
                              ) : (
                                <UserCheck size={15} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void requestLink(employee)}
                              aria-label={`Request info update from ${employee.fullName}`}
                              title="Copy a 24h self-service update link for this employee"
                              className="tap rounded-full text-muted-foreground hover:text-accent"
                            >
                              <Link2 size={15} aria-hidden="true" />
                            </button>
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
                                  await deleteWithChecks(employee.id);
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
        {sheetFor && (
          <SheetAction
            icon={Link2}
            label="Request info update (24h link)"
            onClick={async () => {
              const target = sheetFor;
              setSheetFor(null);
              await requestLink(target);
            }}
          />
        )}
        {sheetFor && (
          <SheetAction
            icon={sheetFor.status === "active" ? UserX : UserCheck}
            label={sheetFor.status === "active" ? "Mark as Former" : "Reactivate"}
            onClick={async () => {
              await onSetStatus(
                sheetFor,
                sheetFor.status === "active" ? "inactive" : "active",
              );
              setSheetFor(null);
            }}
          />
        )}
        <SheetAction
          icon={Trash2}
          label="Delete"
          destructive
          onClick={async () => {
            if (
              sheetFor &&
              window.confirm(
                `Delete ${sheetFor.fullName}?\n\nIf they just left the company, use "Mark as Former" instead — it keeps all their history. You can Undo a delete for a short while.`,
              )
            ) {
              await deleteWithChecks(sheetFor.id);
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
