import { motion } from "framer-motion";
import {
  BadgeCheck,
  Briefcase,
  Download,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  PenLine,
  TrendingUp,
  Users,
} from "lucide-react";
import { ActionSheet, SheetAction } from "./Sheet";
import { cn } from "@/lib/utils";

export type Tab =
  | "overview"
  | "finance"
  | "employees"
  | "letters"
  | "documents"
  | "reports"
  | "careers"
  | "announcements"
  | "content"
  | "audit";

export const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "finance", label: "Finance", icon: Landmark },
  { id: "employees", label: "Employees", icon: Users },
  { id: "letters", label: "Letters", icon: FileText },
  { id: "documents", label: "Register", icon: BadgeCheck },
  { id: "reports", label: "Reports", icon: TrendingUp },
  { id: "careers", label: "Careers", icon: Briefcase },
  { id: "announcements", label: "Website", icon: Megaphone },
  { id: "content", label: "Content", icon: PenLine },
  { id: "audit", label: "Audit log", icon: History },
];

/** The four that earn a permanent slot on a phone. The rest live behind "More". */
const PRIMARY_TABS: Tab[] = ["overview", "finance", "employees", "letters"];
const MORE_TABS: Tab[] = ["documents", "reports", "careers", "announcements", "content", "audit"];

/** The desktop sidebar: one subject per group, headed, in workload order. */
export const NAV_GROUPS: Array<{ heading: string; ids: Tab[] }> = [
  { heading: "Dashboard", ids: ["overview"] },
  { heading: "Money", ids: ["finance"] },
  { heading: "People", ids: ["employees", "letters", "documents"] },
  { heading: "Website", ids: ["careers", "announcements", "content"] },
  { heading: "System", ids: ["reports", "audit"] },
];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
  alertCount: number;
  onExportCsv: () => void;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
}

/** Desktop: a grouped sidebar with headings — the map of the whole back office. */
export const SideNav = ({
  tab,
  onChange,
  alertCount,
}: Pick<Props, "tab" | "onChange" | "alertCount">) => (
  <nav aria-label="Admin sections" className="hidden w-52 shrink-0 md:block">
    <div className="sticky top-24 flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {group.heading}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.ids.map((id) => {
              const meta = TABS.find((t) => t.id === id)!;
              const Icon = meta.icon;
              const isActive = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onChange(id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-muted-foreground hover:bg-accent/5 hover:text-foreground",
                    )}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {meta.label}
                    {id === "overview" && alertCount > 0 && (
                      <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] tabular-nums text-accent">
                        {alertCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </nav>
);

/** Mobile: a fixed bottom bar, the way a native app does it. */
export const MobileNav = ({
  tab,
  onChange,
  alertCount,
  onExportCsv,
  moreOpen,
  setMoreOpen,
}: Props) => (
  <>
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
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className="relative flex w-full flex-col items-center gap-1 py-2.5 transition-transform active:scale-90"
              >
                {isActive && (
                  // One shared layout animation: the indicator SLIDES between
                  // tabs instead of blinking off and on.
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
                  {id === "overview" && alertCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium tabular-nums text-white">
                      {alertCount}
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
              className={MORE_TABS.includes(tab) ? "text-accent" : "text-muted-foreground"}
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

    <ActionSheet open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
      {MORE_TABS.map((id) => {
        const meta = TABS.find((t) => t.id === id)!;
        return (
          <SheetAction
            key={id}
            icon={meta.icon}
            label={meta.label}
            onClick={() => {
              onChange(id);
              setMoreOpen(false);
            }}
          />
        );
      })}
      <SheetAction icon={Download} label="Export employees (CSV)" onClick={onExportCsv} />
    </ActionSheet>
  </>
);
