import { EmptyState } from "@/components/kit";
import type { AuditEntry } from "../repository";

const AuditTab = ({ audit }: { audit: AuditEntry[] }) => (
  <>
    <h1 className="type-display text-2xl text-foreground sm:text-4xl">Audit log</h1>
    <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
      Append-only. Every record change, every letter issued or revoked, every website
      change — who did it, and when. It cannot be edited by anyone, including you. A log you
      can rewrite is not a log.
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
              <code className="shrink-0 text-xs text-accent">{entry.action}</code>
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
        ))}
      </ul>
    )}
  </>
);

export default AuditTab;
