import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Database, LogOut, TrendingUp, TriangleAlert, Undo2, X } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge, Button } from "@/components/kit";
import { useAuth } from "@/auth/auth";
import { buildAlerts } from "@/hr/automations";
import { MobileNav, SideNav, TABS, type Tab } from "./AdminNav";
import { useHrData } from "./useHrData";
import { isRemote, toCsv, type IssuedDocument } from "./repository";
import Reports from "./Reports";
import FinanceTab from "./tabs/FinanceTab";
import OverviewTab from "./tabs/OverviewTab";
import EmployeesTab from "./tabs/EmployeesTab";
import LettersTab from "./tabs/LettersTab";
import RegisterTab from "./tabs/RegisterTab";
import CareersTab from "./tabs/CareersTab";
import WebsiteTab from "./tabs/WebsiteTab";
import AuditTab from "./tabs/AuditTab";
import ContentTab from "./tabs/ContentTab";
import type { Employee } from "./types";

const WARNING_DISMISSED = "synapticlab.admin.warningDismissed";

/**
 * The admin shell — and ONLY the shell.
 *
 * This file used to be 1,500 lines carrying eight unrelated responsibilities.
 * The knowledge graph scored its cohesion at 0.06, the lowest in the codebase —
 * which does not mean "complex", it means "the things inside are not related to
 * each other". Each one now lives in its own file. What's left here is the
 * frame: header, nav, the tab switch, and the data hook. Nothing else.
 */
const AdminPage = () => {
  const { user, signOut } = useAuth();
  const data = useHrData();

  /* The active tab lives in the URL (?tab=finance), so the browser's Back
     button steps between admin sections instead of dumping the admin onto the
     public site — the single biggest "did it just log me out?" confusion.
     (It never logged anyone out; the session survives regardless.) */
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "overview";
  const setTab = (next: Tab) =>
    setSearchParams(next === "overview" ? {} : { tab: next });

  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(
    () => sessionStorage.getItem(WARNING_DISMISSED) === "1",
  );

  const alertCount = buildAlerts(data.employees).length;

  const exportCsv = () => {
    const blob = new Blob([toCsv(data.employees)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synapticlab-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const revoke = async (doc: IssuedDocument) => {
    const reason = window.prompt(
      `Revoke ${doc.reference}?\n\nState the reason — it is recorded permanently.`,
    );
    if (reason) await data.revokeDocument(doc, reason);
  };

  const dismissWarning = () => {
    setWarningDismissed(true);
    sessionStorage.setItem(WARNING_DISMISSED, "1");
  };

  // The Undo window: a deleted employee can be restored for 15 seconds.
  useEffect(() => {
    if (!data.lastDeleted) return;
    const timer = window.setTimeout(data.dismissUndo, 15_000);
    return () => window.clearTimeout(timer);
  }, [data.lastDeleted, data.dismissUndo]);

  return (
    <div className="w-full overflow-x-hidden bg-background">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        {/* Full width: the admin is a working surface, not an article — dead
            side margins are rows and columns we could be showing. */}
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
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
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-transform duration-200 hover:border-accent hover:text-accent active:scale-95"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* pb-28 clears the fixed bottom bar on mobile. Desktop: grouped sidebar
          on the left, content filling the rest of the viewport. */}
      <main className="flex gap-6 px-4 pb-28 pt-6 sm:px-6 sm:py-10 md:pb-12 lg:gap-8 lg:px-8">
        <SideNav tab={tab} onChange={setTab} alertCount={alertCount} />

        <div className="min-w-0 flex-1">
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
                Add the Supabase keys to <code className="text-foreground">.env</code> and
                run <code className="text-foreground">docs/supabase/schema.sql</code>. Until
                then records live in this browser alone and the login is cosmetic.
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

        {data.error && (
          <p role="alert" className="mb-6 text-sm text-red-500">
            {data.error}
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "overview" && (
              <OverviewTab
                employees={data.employees}
                documents={data.documents}
                metrics={data.metrics}
                onOpenEmployee={(employee) => {
                  setEditing(employee);
                  setTab("employees");
                }}
              />
            )}

            {tab === "finance" && (
              <FinanceTab
                employees={data.employees}
                onEmployeesChanged={data.refresh}
              />
            )}

            {tab === "employees" && (
              <EmployeesTab
                employees={data.employees}
                activeCount={data.metrics.active.length}
                editing={editing}
                setEditing={setEditing}
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                onSave={async (draft, photo) => {
                  await data.saveEmployee(draft, photo, editing);
                  setEditing(null);
                  setIsCreating(false);
                }}
                onDelete={data.deleteEmployee}
                onSetStatus={data.setEmployeeStatus}
                onImport={data.importEmployees}
                onExportCsv={exportCsv}
              />
            )}

            {tab === "letters" && (
              <LettersTab
                employees={data.employees}
                documents={data.documents}
                onIssue={data.issueDocument}
                onGoToEmployees={() => setTab("employees")}
              />
            )}

            {tab === "documents" && (
              <RegisterTab documents={data.documents} onRevoke={revoke} />
            )}

            {tab === "reports" && (
              <>
                <h1 className="no-print type-display flex items-center gap-3 text-2xl text-foreground sm:text-4xl">
                  <TrendingUp size={22} aria-hidden="true" className="text-accent" />
                  Reports
                </h1>
                <div className="mt-6 sm:mt-8">
                  <Reports employees={data.employees} documents={data.documents} />
                </div>
              </>
            )}

            {tab === "careers" && (
              <CareersTab
                jobs={data.jobs}
                applications={data.applications}
                onSave={data.saveJob}
                onToggle={data.toggleJob}
                onDelete={data.deleteJob}
                onApplicationStatus={data.setApplicationStatus}
              />
            )}

            {tab === "announcements" && (
              <WebsiteTab
                employees={data.employees}
                announcements={data.announcements}
                partners={data.partners}
                capabilities={data.capabilities}
                onSaveAnnouncement={data.createAnnouncement}
                onUpdateAnnouncement={data.editAnnouncement}
                onToggleAnnouncement={data.toggleAnnouncement}
                onDeleteAnnouncement={data.deleteAnnouncement}
                onSavePartner={data.savePartner}
                onDeletePartner={data.deletePartner}
                onSaveCapability={data.saveCapability}
                onDeleteCapability={data.deleteCapability}
              />
            )}

            {tab === "content" && (
              <ContentTab content={data.content} onSave={data.saveContent} />
            )}

            {tab === "audit" && <AuditTab audit={data.audit} />}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>

      {/* Undo toast — sits above the mobile bottom bar. */}
      <AnimatePresence>
        {data.lastDeleted && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6"
          >
            <div className="surface flex items-center gap-3 rounded-full border border-border py-2 pl-5 pr-2 shadow-lg">
              <p className="text-sm text-foreground">
                Deleted <strong>{data.lastDeleted.fullName}</strong>
              </p>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() => void data.undoDeleteEmployee()}
              >
                <Undo2 size={13} aria-hidden="true" />
                Undo
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={data.dismissUndo}
                className="tap rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav
        tab={tab}
        onChange={setTab}
        alertCount={alertCount}
        onExportCsv={exportCsv}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
      />
    </div>
  );
};

export default AdminPage;
