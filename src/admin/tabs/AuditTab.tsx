import { useMemo, useState } from "react";
import { Bug, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button, EmptyState, inputClass } from "@/components/kit";
import { downloadFile } from "@/lib/utils";
import type { AuditEntry } from "../repository";

/**
 * The audit log, and the system's black box. Errors captured anywhere in the
 * admin land here as `system.error.*` entries; "Download bug report" exports
 * them with context so the owner can hand the file straight to the AI that
 * maintains this codebase and get fixes back — the self-improvement loop.
 */

const PAGE_SIZE = 50;

/** finance.transaction.create → finance. One chip per subsystem. */
const areaOf = (action: string) => action.split(".")[0] || "other";

const AuditTab = ({ audit }: { audit: AuditEntry[] }) => {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [page, setPage] = useState(0);

  const areas = useMemo(
    () => [...new Set(audit.map((e) => areaOf(e.action)))].sort(),
    [audit],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return audit.filter((e) => {
      if (errorsOnly && !e.action.startsWith("system.error")) return false;
      if (area && areaOf(e.action) !== area) return false;
      if (
        needle &&
        !e.action.toLowerCase().includes(needle) &&
        !e.target.toLowerCase().includes(needle) &&
        !e.actor.toLowerCase().includes(needle) &&
        !JSON.stringify(e.detail).toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [audit, search, area, errorsOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const errorCount = useMemo(
    () => audit.filter((e) => e.action.startsWith("system.error")).length,
    [audit],
  );

  /** The file to feed back to the AI: errors first, recent activity after. */
  const downloadBugReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      app: "synapticlab-admin",
      url: window.location.origin,
      userAgent: navigator.userAgent,
      instructions:
        "This is a diagnostic export from the Synaptic Lab admin. Errors are in `errors`; " +
        "recent activity for context is in `recentActivity`. Reproduce, fix root causes, " +
        "and prefer deep fixes over bandaids.",
      errors: audit
        .filter((e) => e.action.startsWith("system.error"))
        .map((e) => ({ at: e.createdAt, action: e.action, target: e.target, detail: e.detail })),
      recentActivity: audit
        .slice(0, 100)
        .map((e) => ({ at: e.createdAt, actor: e.actor, action: e.action, target: e.target })),
    };
    downloadFile(
      `synaptic-bug-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      "application/json",
    );
  };

  return (
    <>
      <h1 className="type-display text-2xl text-foreground sm:text-4xl">Audit log</h1>
      <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
        Append-only. Every record change, every letter issued or revoked, every
        error the app hits — who or what did it, and when. It cannot be edited
        by anyone, including you. A log you can rewrite is not a log.
      </p>

      {/* ── Filters + the bug-report loop ─────────────────────────────────── */}
      <div className="surface mt-6 flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <input
          type="search"
          aria-label="Search the audit log"
          placeholder="Search action, target, actor…"
          className={inputClass("max-w-xs")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select
          aria-label="Filter by area"
          className={inputClass("w-40")}
          value={area}
          onChange={(e) => { setArea(e.target.value); setPage(0); }}
        >
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={errorsOnly}
          onClick={() => { setErrorsOnly(!errorsOnly); setPage(0); }}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-transform active:scale-95 ${
            errorsOnly
              ? "border-red-500/60 bg-red-500/10 text-red-500"
              : "border-border text-muted-foreground"
          }`}
        >
          <Bug size={13} aria-hidden="true" />
          Errors only ({errorCount})
        </button>

        <Button
          variant="secondary"
          className="ml-auto px-4 py-2 text-xs"
          title="Everything the AI needs to fix what broke — download and paste it into the chat"
          onClick={downloadBugReport}
        >
          <Download size={13} aria-hidden="true" />
          Download bug report
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={audit.length === 0 ? "Nothing recorded yet" : "Nothing matches these filters"}
            description={
              audit.length === 0
                ? "Actions taken in this panel will appear here."
                : "Loosen a filter to see more."
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-6 border-t border-border">
            {paged.map((entry) => {
              const isError = entry.action.startsWith("system.error");
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1.5 border-b border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <code className={`shrink-0 text-xs ${isError ? "text-red-500" : "text-accent"}`}>
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
                    <span className="text-xs text-muted-foreground">{entry.actor}</span>
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
              );
            })}
          </ul>

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs tabular-nums text-muted-foreground">
                {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary" className="px-3 py-1.5 text-xs"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={13} aria-hidden="true" /> Prev
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {currentPage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary" className="px-3 py-1.5 text-xs"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next <ChevronRight size={13} aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AuditTab;
