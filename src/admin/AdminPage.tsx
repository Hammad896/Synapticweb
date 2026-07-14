import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Database, LogOut, TrendingUp, TriangleAlert, X } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge } from "@/components/kit";
import { useAuth } from "@/auth/auth";
import { buildAlerts } from "@/hr/automations";
import { DesktopTabs, MobileNav, type Tab } from "./AdminNav";
import { useHrData } from "./useHrData";
import { isRemote, toCsv, type IssuedDocument } from "./repository";
import Reports from "./Reports";
import OverviewTab from "./tabs/OverviewTab";
import EmployeesTab from "./tabs/EmployeesTab";
import LettersTab from "./tabs/LettersTab";
import RegisterTab from "./tabs/RegisterTab";
import CareersTab from "./tabs/CareersTab";
import WebsiteTab from "./tabs/WebsiteTab";
import AuditTab from "./tabs/AuditTab";
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

  const [tab, setTab] = useState<Tab>("overview");
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

  return (
    <div className="w-full overflow-x-hidden bg-background">
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
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-transform duration-200 hover:border-accent hover:text-accent active:scale-95"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <DesktopTabs tab={tab} onChange={setTab} alertCount={alertCount} />
      </header>

      {/* pb-28 clears the fixed bottom bar on mobile. */}
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
                onSave={data.saveJob}
                onToggle={data.toggleJob}
                onDelete={data.deleteJob}
              />
            )}

            {tab === "announcements" && (
              <WebsiteTab
                employees={data.employees}
                announcements={data.announcements}
                onToggle={data.toggleAnnouncement}
                onDelete={data.deleteAnnouncement}
              />
            )}

            {tab === "audit" && <AuditTab audit={data.audit} />}
          </motion.div>
        </AnimatePresence>
      </main>

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
