import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  CalendarClock,
  Database,
  Download,
  Ellipsis,
  FileText,
  History,
  IdCard as IdCardIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge, Button, EmptyState, Label, Stat, inputClass } from "@/components/kit";
import { useAuth } from "@/auth/auth";
import { buildAlerts, joinerAnnouncement } from "@/hr/automations";
import IdCard from "@/hr/IdCard";
import EmployeeForm from "./EmployeeForm";
import JobForm from "./JobForm";
import LetterComposer from "./LetterComposer";
import Reports from "./Reports";
import { ActionSheet, Drawer, SheetAction } from "./Sheet";
import {
  getRepository,
  isRemote,
  toCsv,
  type Announcement,
  type AuditEntry,
  type IssuedDocument,
  type Job,
  type JobDraft,
} from "./repository";
import type { Employee, EmployeeDraft } from "./types";
import { cn } from "@/lib/utils";

type Tab =
  | "overview"
  | "employees"
  | "letters"
  | "documents"
  | "reports"
  | "careers"
  | "announcements"
  | "audit";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "letters", label: "Letters", icon: FileText },
  { id: "documents", label: "Register", icon: BadgeCheck },
  { id: "reports", label: "Reports", icon: TrendingUp },
  { id: "careers", label: "Careers", icon: Briefcase },
  { id: "announcements", label: "Website", icon: Megaphone },
  { id: "audit", label: "Audit log", icon: History },
];

/** The four that earn a permanent slot on a phone. The rest live behind "More". */
const PRIMARY_TABS: Tab[] = ["overview", "employees", "letters", "documents"];
const MORE_TABS: Tab[] = ["reports", "careers", "announcements", "audit"];

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? "compact" : "standard",
  }).format(amount);

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const WARNING_DISMISSED = "synapticlab.admin.warningDismissed";

const AdminPage = () => {
  const repository = getRepository();
  const { user, signOut } = useAuth();
  const actor = user?.email ?? "unknown";

  const [tab, setTab] = useState<Tab>("overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<IssuedDocument[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [cardFor, setCardFor] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mobile-only surfaces.
  const [sheetFor, setSheetFor] = useState<Employee | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(
    () => sessionStorage.getItem(WARNING_DISMISSED) === "1",
  );

  const refresh = useCallback(async () => {
    try {
      const [e, d, a, l, j] = await Promise.all([
        repository.listEmployees(),
        repository.listDocuments(),
        repository.listAnnouncements(),
        repository.listAudit(),
        repository.listJobs(),
      ]);
      setEmployees(e);
      setDocuments(d);
      setAnnouncements(a);
      setAudit(l);
      setJobs(j);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Could not load data: ${caught.message}`
          : "Could not load data.",
      );
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const alerts = useMemo(() => buildAlerts(employees), [employees]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
      .filter((e) =>
        !q
          ? true
          : [e.fullName, e.role, e.department, e.email, e.employeeId].some((field) =>
              field.toLowerCase().includes(q),
            ),
      );
  }, [employees, query, statusFilter]);

  const metrics = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");

    const payroll = active.reduce<Record<string, number>>((totals, e) => {
      totals[e.salaryCurrency] = (totals[e.salaryCurrency] ?? 0) + e.salaryAmount;
      return totals;
    }, {});

    const avgTenure = active.length
      ? active.reduce(
          (sum, e) =>
            sum +
            (e.joinedAt
              ? (Date.now() - new Date(e.joinedAt).getTime()) /
                (1000 * 60 * 60 * 24 * 30.44)
              : 0),
          0,
        ) / active.length
      : 0;

    return { active, payroll, avgTenure };
  }, [employees]);

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const handleSaveEmployee = async (draft: EmployeeDraft, photo: File | null) => {
    const wasPublished = editing?.showOnWebsite ?? false;

    let saved = editing
      ? await repository.updateEmployee(editing.id, draft)
      : await repository.createEmployee(draft);

    if (photo) {
      const path = await repository.uploadPhoto(saved.id, photo);
      saved = await repository.updateEmployee(saved.id, { ...draft, photoPath: path });
    }

    await repository.audit(
      actor,
      editing ? "employee.update" : "employee.create",
      saved.fullName,
      { employeeId: saved.employeeId },
    );

    /* Automation: publishing raises the site announcement — but only on the
       TRANSITION, so editing an already-published employee doesn't re-announce. */
    if (saved.showOnWebsite && !wasPublished) {
      await repository.createAnnouncement(joinerAnnouncement(saved));
      await repository.audit(actor, "announcement.create", saved.fullName, {
        reason: "published to website",
      });
    }

    setEditing(null);
    setIsCreating(false);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    const employee = employees.find((e) => e.id === id);
    await repository.removeEmployee(id);
    await repository.audit(actor, "employee.delete", employee?.fullName ?? id);
    setConfirmDelete(null);
    setSheetFor(null);
    await refresh();
  };

  const handleIssue = async (doc: Omit<IssuedDocument, "id" | "createdAt">) => {
    const saved = await repository.saveDocument(doc);
    await repository.audit(actor, "document.issue", doc.employeeName, {
      reference: doc.reference,
      letterType: doc.letterType,
    });
    await refresh();
    // Returned so the composer can render the QR with the DB-minted token.
    return saved;
  };

  const handleRevoke = async (doc: IssuedDocument) => {
    const reason = window.prompt(
      `Revoke ${doc.reference}?\n\nState the reason — it is recorded permanently.`,
    );
    if (!reason) return;

    await repository.updateDocument(doc.id, {
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokeReason: reason,
    });
    await repository.audit(actor, "document.revoke", doc.employeeName, {
      reference: doc.reference,
      reason,
    });
    await refresh();
  };

  const handleSaveJob = async (draft: JobDraft) => {
    if (editingJob) {
      await repository.updateJob(editingJob.id, draft);
      await repository.audit(actor, "job.update", draft.role, { type: draft.type });
    } else {
      await repository.createJob(draft);
      await repository.audit(actor, "job.create", draft.role, { type: draft.type });
    }

    setEditingJob(null);
    setIsCreatingJob(false);
    await refresh();
  };

  const toggleJob = async (job: Job) => {
    await repository.updateJob(job.id, { isActive: !job.isActive });
    await repository.audit(actor, job.isActive ? "job.close" : "job.reopen", job.role);
    await refresh();
  };

  const deleteJob = async (job: Job) => {
    if (!window.confirm(`Delete the "${job.role}" role? This cannot be undone.`)) return;
    await repository.removeJob(job.id);
    await repository.audit(actor, "job.delete", job.role);
    await refresh();
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(employees)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synapticlab-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const dismissWarning = () => {
    setWarningDismissed(true);
    sessionStorage.setItem(WARNING_DISMISSED, "1");
  };

  const payrollEntries = Object.entries(metrics.payroll);
  const isEditorOpen = isCreating || editing !== null;
  const editorTitle = editing ? `Edit — ${editing.fullName}` : "New employee";

  const employeeForm = (
    <EmployeeForm
      employee={editing ?? undefined}
      allEmployees={employees}
      onSave={handleSaveEmployee}
      onCancel={() => {
        setEditing(null);
        setIsCreating(false);
      }}
    />
  );

  return (
    <div className="w-full overflow-x-hidden bg-background">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Back to the public site">
              <Logo className="h-6 sm:h-7" />
            </Link>
            <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              HR
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Badge tone={isRemote() ? "success" : "warning"} className="hidden lg:flex">
              <Database size={11} aria-hidden="true" />
              {isRemote() ? "Supabase" : "Local only"}
            </Badge>

            {user && (
              <span className="hidden text-xs text-muted-foreground xl:inline">
                {user.email}
              </span>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-transform duration-200 active:scale-95 hover:border-accent hover:text-accent"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Desktop tabs. On mobile these become the bottom bar. */}
        <nav
          aria-label="Admin sections"
          className="mx-auto hidden max-w-7xl px-4 sm:px-6 md:block"
        >
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs transition-colors",
                    tab === id
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                  {id === "overview" && alerts.length > 0 && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] tabular-nums text-accent">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* pb-28 clears the fixed bottom bar on mobile — content must never hide
          underneath it. */}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:py-12 md:pb-12">
        {!isRemote() && !warningDismissed && (
          <div className="no-print mb-6 flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:mb-8 sm:gap-4 sm:p-5">
            <TriangleAlert
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Local storage — not safe for real employee data
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Add the Supabase keys to <code className="text-foreground">.env</code> and run{" "}
                <code className="text-foreground">docs/supabase/schema.sql</code>. Until then
                records live in this browser alone and the login is cosmetic.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissWarning}
              aria-label="Dismiss warning"
              className="tap -mr-1 -mt-1 shrink-0 rounded-full text-muted-foreground transition-transform active:scale-95"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-6 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* Cross-fade between tabs. Cheap, and it makes tab switching read as a
            navigation rather than a repaint. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ── Overview ────────────────────────────────────────────────── */}
            {tab === "overview" && (
              <>
                <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                  Overview
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Derived live from the records.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 xl:grid-cols-4">
                  <Stat
                    icon={Users}
                    label="Headcount"
                    value={String(employees.length)}
                    detail={`${metrics.active.length} active`}
                  />
                  <Stat
                    icon={Wallet}
                    label="Payroll"
                    value={
                      payrollEntries.length
                        ? money(payrollEntries[0][1], payrollEntries[0][0])
                        : "—"
                    }
                    detail={
                      payrollEntries.length > 1
                        ? payrollEntries
                            .slice(1)
                            .map(([c, t]) => money(t, c))
                            .join(" + ")
                        : "Active staff"
                    }
                  />
                  <Stat
                    icon={CalendarClock}
                    label="Avg tenure"
                    value={
                      metrics.avgTenure >= 12
                        ? `${(metrics.avgTenure / 12).toFixed(1)} yr`
                        : `${Math.round(metrics.avgTenure)} mo`
                    }
                    detail="Active staff"
                  />
                  <Stat
                    icon={BadgeCheck}
                    label="Letters"
                    value={String(documents.filter((d) => d.status === "issued").length)}
                    detail={`${documents.length} in register`}
                  />
                </div>

                <section className="mt-10 sm:mt-12" aria-label="Alerts">
                  <div className="flex items-center gap-3">
                    <Bell size={16} aria-hidden="true" className="text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Needs attention
                    </h2>
                    {alerts.length > 0 && <Badge tone="accent">{alerts.length}</Badge>}
                  </div>

                  {alerts.length === 0 ? (
                    <div className="surface mt-5 p-8 text-center">
                      <p className="text-sm text-foreground">Nothing needs attention.</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Probation dates, expiring contracts and incomplete records surface
                        here automatically.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-5 flex flex-col gap-3">
                      {alerts.map((alert) => (
                        <li key={alert.id} className="surface p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <Badge
                                tone={
                                  alert.severity === "critical"
                                    ? "danger"
                                    : alert.severity === "warning"
                                      ? "warning"
                                      : "accent"
                                }
                                dot
                              >
                                {alert.severity}
                              </Badge>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {alert.title}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {alert.employeeName}
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                  {alert.detail}
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="secondary"
                              className="shrink-0 px-3 py-1.5 text-xs"
                              onClick={() => {
                                const employee = employees.find(
                                  (e) => e.id === alert.employeeId,
                                );
                                if (employee) {
                                  setEditing(employee);
                                  setTab("employees");
                                }
                              }}
                            >
                              Open
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {/* ── Employees ───────────────────────────────────────────────── */}
            {tab === "employees" && (
              <>
                {cardFor ? (
                  <div>
                    <div className="no-print mb-6 flex items-center justify-between gap-4">
                      <h1 className="type-display text-xl text-foreground sm:text-2xl">
                        ID card
                      </h1>
                      <Button variant="ghost" onClick={() => setCardFor(null)}>
                        Back
                      </Button>
                    </div>
                    <IdCard employee={cardFor} />
                  </div>
                ) : (
                  <>
                    {/* Desktop: the editor is inline. Mobile: it's a Drawer (below). */}
                    {isEditorOpen && (
                      <section className="surface card-pad hidden md:block">
                        <h1 className="type-display mb-8 text-2xl text-foreground">
                          {editorTitle}
                        </h1>
                        {employeeForm}
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
                              {employees.length} total · {metrics.active.length} active
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            <Button
                              variant="secondary"
                              onClick={exportCsv}
                              disabled={!employees.length}
                              className="hidden sm:inline-flex"
                            >
                              <Download size={15} aria-hidden="true" />
                              CSV
                            </Button>
                            <Button
                              onClick={() => {
                                setEditing(null);
                                setIsCreating(true);
                              }}
                            >
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
                                onClick={() => setStatusFilter(option)}
                                aria-pressed={statusFilter === option}
                                className={cn(
                                  "flex-1 rounded-full border px-4 py-2 text-xs capitalize transition-transform active:scale-95 sm:flex-none",
                                  statusFilter === option
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
                              title={
                                employees.length === 0
                                  ? "No employees yet"
                                  : "No matches"
                              }
                              description={
                                employees.length === 0
                                  ? "Add the first record to start building the roster."
                                  : "Try a different name, ID, role or department."
                              }
                            />
                          </div>
                        ) : (
                          <>
                            {/* ── MOBILE: cards, not a table ──────────────────
                                A 60rem-wide table on a 390px screen is a
                                horizontal-scroll puzzle. Cards show what matters
                                and put the rest behind an action sheet. */}
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
                                          tone={
                                            employee.status === "active"
                                              ? "success"
                                              : "neutral"
                                          }
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

                            {/* ── DESKTOP: the full table ─────────────────── */}
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
                                          tone={
                                            employee.status === "active"
                                              ? "success"
                                              : "neutral"
                                          }
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
                                          ? money(
                                              employee.salaryAmount,
                                              employee.salaryCurrency,
                                            )
                                          : "—"}
                                      </td>
                                      <td className="px-5 py-4">
                                        {employee.showOnWebsite ? (
                                          <Badge tone="accent">Live</Badge>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            —
                                          </span>
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
                                              onClick={() => void handleDelete(employee.id)}
                                              className="px-3 py-1 text-xs"
                                            >
                                              Delete
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              onClick={() => setConfirmDelete(null)}
                                              className="px-3 py-1 text-xs"
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
                  </>
                )}
              </>
            )}

            {/* ── Letters ─────────────────────────────────────────────────── */}
            {tab === "letters" && (
              <>
                <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                  Draft a letter
                </h1>
                <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
                  Letters render onto the real letterhead. A draft has the signature and stamp
                  covered; only issuing applies them and records it in the register.
                </p>

                <div className="mt-8">
                  {employees.length === 0 ? (
                    <EmptyState
                      title="Add an employee first"
                      description="Letters are generated from an employee record."
                      action={
                        <Button onClick={() => setTab("employees")}>Go to employees</Button>
                      }
                    />
                  ) : (
                    <LetterComposer
                      employees={employees}
                      documents={documents}
                      onIssue={handleIssue}
                    />
                  )}
                </div>
              </>
            )}

            {/* ── Register ────────────────────────────────────────────────── */}
            {tab === "documents" && (
              <>
                <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                  Document register
                </h1>
                <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
                  Every letter issued under the company signature. Revoking one keeps the
                  record — it never disappears.
                </p>

                {documents.length === 0 ? (
                  <div className="mt-8">
                    <EmptyState
                      title="No letters issued yet"
                      description="Issued letters appear here with their reference and status."
                    />
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <ul className="mt-6 flex flex-col gap-3 md:hidden">
                      {documents.map((doc) => (
                        <li key={doc.id} className="surface p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs tabular-nums text-accent">
                                {doc.reference}
                              </p>
                              <p className="mt-1 truncate text-sm font-medium capitalize text-foreground">
                                {doc.letterType.replace(/-/g, " ")}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {doc.employeeName} · {shortDate(doc.issuedAt)}
                              </p>
                            </div>

                            <Badge
                              tone={
                                doc.status === "issued"
                                  ? "success"
                                  : doc.status === "revoked"
                                    ? "danger"
                                    : "neutral"
                              }
                              dot
                            >
                              {doc.status}
                            </Badge>
                          </div>

                          {doc.status === "issued" && (
                            <Button
                              variant="secondary"
                              className="mt-4 w-full py-2 text-xs"
                              onClick={() => void handleRevoke(doc)}
                            >
                              Revoke
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Desktop table */}
                    <div className="surface mt-8 hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[52rem] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border">
                            {["Reference", "Type", "Employee", "Issued", "Status", ""].map(
                              (h) => (
                                <th
                                  key={h}
                                  scope="col"
                                  className="whitespace-nowrap px-5 py-4 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc) => (
                            <tr
                              key={doc.id}
                              className="border-b border-border last:border-b-0"
                            >
                              <td className="px-5 py-4 text-xs tabular-nums text-accent">
                                {doc.reference}
                              </td>
                              <td className="px-5 py-4 text-sm capitalize text-foreground">
                                {doc.letterType.replace(/-/g, " ")}
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">
                                {doc.employeeName}
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">
                                {shortDate(doc.issuedAt)}
                              </td>
                              <td className="px-5 py-4">
                                <Badge
                                  tone={
                                    doc.status === "issued"
                                      ? "success"
                                      : doc.status === "revoked"
                                        ? "danger"
                                        : "neutral"
                                  }
                                  dot
                                >
                                  {doc.status}
                                </Badge>
                              </td>
                              <td className="px-5 py-4 text-right">
                                {doc.status === "issued" && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => void handleRevoke(doc)}
                                    className="px-3 py-1 text-xs"
                                  >
                                    Revoke
                                  </Button>
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

            {/* ── Reports ─────────────────────────────────────────────────── */}
            {tab === "reports" && (
              <>
                <h1 className="no-print type-display text-2xl text-foreground sm:text-4xl">
                  Reports
                </h1>
                <div className="mt-6 sm:mt-8">
                  <Reports employees={employees} documents={documents} />
                </div>
              </>
            )}

            {/* ── Careers ────────────────────────────────────── */}
            {tab === "careers" && (
              <>
                {isCreatingJob || editingJob ? (
                  <section className="surface card-pad">
                    <h1 className="type-display mb-8 text-2xl text-foreground">
                      {editingJob ? `Edit — ${editingJob.role}` : "Post a role"}
                    </h1>
                    <JobForm
                      job={editingJob ?? undefined}
                      onSave={handleSaveJob}
                      onCancel={() => {
                        setEditingJob(null);
                        setIsCreatingJob(false);
                      }}
                    />
                  </section>
                ) : (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                          Careers
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {jobs.filter((j) => j.isActive).length} open ·{" "}
                          {jobs.filter((j) => !j.isActive).length} closed
                        </p>
                      </div>

                      <Button onClick={() => setIsCreatingJob(true)}>
                        <Plus size={15} aria-hidden="true" />
                        Post role
                      </Button>
                    </div>

                    {jobs.length === 0 ? (
                      <div className="mt-8">
                        <EmptyState
                          title="No roles posted"
                          description="Posting a role adds it to the careers section on the public site immediately."
                        />
                      </div>
                    ) : (
                      <ul className="mt-8 flex flex-col gap-3">
                        {jobs.map((job) => (
                          <li key={job.id} className="surface p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-foreground">
                                    {job.role}
                                  </p>
                                  <Badge tone={job.isActive ? "success" : "neutral"} dot>
                                    {job.isActive ? "open" : "closed"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {job.type} · {job.location}
                                </p>
                                {job.pitch && (
                                  <p className="measure mt-2 text-xs leading-relaxed text-muted-foreground">
                                    {job.pitch}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  className="px-3 py-1.5 text-xs"
                                  onClick={() => void toggleJob(job)}
                                >
                                  {job.isActive ? "Close" : "Reopen"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="px-3 py-1.5 text-xs"
                                  onClick={() => setEditingJob(job)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="px-3 py-1.5 text-xs"
                                  onClick={() => void deleteJob(job)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Website ─────────────────────────────────────────────────── */}
            {tab === "announcements" && (
              <>
                <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                  Website
                </h1>
                <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
                  Publishing an employee adds them to the Team section and posts an
                  announcement automatically.
                </p>

                <section className="mt-8">
                  <Label>On the team page</Label>
                  {employees.filter((e) => e.showOnWebsite && e.status === "active")
                    .length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="Nobody is published yet"
                        description="Tick “Show on the public website” on an employee record."
                      />
                    </div>
                  ) : (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {employees
                        .filter((e) => e.showOnWebsite && e.status === "active")
                        .map((e) => (
                          <li key={e.id}>
                            <Badge tone="accent">
                              {e.fullName} — {e.role}
                            </Badge>
                          </li>
                        ))}
                    </ul>
                  )}
                </section>

                <section className="mt-10">
                  <Label>Announcements</Label>
                  {announcements.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="No announcements"
                        description="These appear in the bar beneath the site header."
                      />
                    </div>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-3">
                      {announcements.map((a) => (
                        <li key={a.id} className="surface p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <Badge tone={a.isActive ? "success" : "neutral"} dot>
                              {a.isActive ? "live" : "off"}
                            </Badge>
                            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {a.title}
                            </p>
                          </div>

                          {a.body && (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {a.body}
                            </p>
                          )}

                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="secondary"
                              className="flex-1 py-2 text-xs sm:flex-none"
                              onClick={async () => {
                                await repository.updateAnnouncement(a.id, {
                                  isActive: !a.isActive,
                                });
                                await repository.audit(
                                  actor,
                                  a.isActive ? "announcement.hide" : "announcement.show",
                                  a.title,
                                );
                                await refresh();
                              }}
                            >
                              {a.isActive ? "Take down" : "Publish"}
                            </Button>
                            <Button
                              variant="ghost"
                              className="flex-1 py-2 text-xs sm:flex-none"
                              onClick={async () => {
                                await repository.removeAnnouncement(a.id);
                                await repository.audit(
                                  actor,
                                  "announcement.delete",
                                  a.title,
                                );
                                await refresh();
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {/* ── Audit ───────────────────────────────────────────────────── */}
            {tab === "audit" && (
              <>
                <h1 className="type-display text-2xl text-foreground sm:text-4xl">
                  Audit log
                </h1>
                <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
                  Append-only. Every record change, every letter issued or revoked, every
                  website change — who did it, and when. It cannot be edited by anyone,
                  including you. A log you can rewrite is not a log.
                </p>

                {audit.length === 0 ? (
                  <div className="mt-8">
                    <EmptyState
                      title="Nothing recorded yet"
                      description="Actions taken in this panel will appear here."
                    />
                  </div>
                ) : (
                  <ul className="mt-8 border-t border-border">
                    {audit.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-1.5 border-b border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                      >
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                          <code className="shrink-0 text-xs text-accent">
                            {entry.action}
                          </code>
                          <p className="truncate text-sm text-foreground">{entry.target}</p>
                          {Object.keys(entry.detail).length > 0 && (
                            <p className="truncate text-xs text-muted-foreground">
                              {Object.entries(entry.detail)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(" · ")}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-baseline gap-3">
                          <span className="text-xs text-muted-foreground">
                            {entry.actor}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom navigation ───────────────────────────────────────── */}
      <nav
        aria-label="Admin sections"
        className="no-print safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      >
        <ul className="flex items-stretch">
          {PRIMARY_TABS.map((id) => {
            const meta = TABS.find((t) => t.id === id)!;
            const Icon = meta.icon;
            const isActive = tab === id;

            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex w-full flex-col items-center gap-1 py-2.5 transition-transform active:scale-90"
                >
                  {isActive && (
                    // The moving indicator is a single shared layout animation —
                    // it slides between tabs instead of blinking on and off.
                    <motion.span
                      layoutId="admin-tab-indicator"
                      aria-hidden="true"
                      className="gradient-synapse absolute inset-x-4 top-0 h-0.5 rounded-full"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}

                  <span className="relative">
                    <Icon
                      size={19}
                      aria-hidden="true"
                      className={isActive ? "text-accent" : "text-muted-foreground"}
                    />
                    {id === "overview" && alerts.length > 0 && (
                      <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium tabular-nums text-white">
                        {alerts.length}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "text-[10px]",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {meta.label}
                  </span>
                </button>
              </li>
            );
          })}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More sections"
              className="flex w-full flex-col items-center gap-1 py-2.5 transition-transform active:scale-90"
            >
              <LayoutGrid
                size={19}
                aria-hidden="true"
                className={
                  MORE_TABS.includes(tab) ? "text-accent" : "text-muted-foreground"
                }
              />
              <span
                className={cn(
                  "text-[10px]",
                  MORE_TABS.includes(tab) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Mobile surfaces ────────────────────────────────────────────────── */}

      <ActionSheet open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        {MORE_TABS.map((id) => {
          const meta = TABS.find((t) => t.id === id)!;
          return (
            <SheetAction
              key={id}
              icon={meta.icon}
              label={meta.label}
              onClick={() => {
                setTab(id);
                setMoreOpen(false);
              }}
            />
          );
        })}
        <SheetAction icon={Download} label="Export employees (CSV)" onClick={exportCsv} />
      </ActionSheet>

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
          onClick={() => {
            if (
              sheetFor &&
              window.confirm(`Delete ${sheetFor.fullName}? This cannot be undone.`)
            ) {
              void handleDelete(sheetFor.id);
            }
          }}
        />
      </ActionSheet>

      {/* The employee form gets the whole screen on mobile. A 30-field record
          squeezed into a card is a form nobody finishes. */}
      <Drawer
        open={isEditorOpen}
        title={editorTitle}
        onClose={() => {
          setEditing(null);
          setIsCreating(false);
        }}
      >
        {employeeForm}
      </Drawer>
    </div>
  );
};

export default AdminPage;
