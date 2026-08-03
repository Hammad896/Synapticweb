import { useSearchParams } from "react-router-dom";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceData } from "@/finance/useFinanceData";
import DashboardPanel from "@/finance/ui/DashboardPanel";
import TransactionsPanel from "@/finance/ui/TransactionsPanel";
import PayrollPanel from "@/finance/ui/PayrollPanel";
import ReportsPanel from "@/finance/ui/ReportsPanel";
import SettingsPanel from "@/finance/ui/SettingsPanel";
import type { Employee } from "../types";

type Panel = "dashboard" | "transactions" | "payroll" | "reports" | "settings";

const PANELS: Array<{ id: Panel; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Transactions" },
  { id: "payroll", label: "Payroll" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

/**
 * The money module — what the Excel workbook used to be. One top-level tab
 * with its own sub-navigation, because finance is one subject with five views,
 * not five subjects.
 */
const FinanceTab = ({
  employees,
  onEmployeesChanged,
}: {
  employees: Employee[];
  /** The import updates/creates employees; the HR views must hear about it. */
  onEmployeesChanged: () => Promise<void>;
}) => {
  const data = useFinanceData();

  /* Panel in the URL (?tab=finance&panel=payroll) for the same reason the main
     tab is: Back walks through where you have been instead of leaving /admin. */
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPanel = searchParams.get("panel");
  const panel: Panel = PANELS.some((p) => p.id === rawPanel) ? (rawPanel as Panel) : "dashboard";
  const setPanel = (next: Panel) =>
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === "dashboard") params.delete("panel");
      else params.set("panel", next);
      return params;
    });

  return (
    <>
      <h1 className="type-display flex items-center gap-3 text-2xl text-foreground sm:text-4xl">
        <Landmark size={22} aria-hidden="true" className="text-accent" />
        Finance
      </h1>

      <nav aria-label="Finance sections" className="mt-5 overflow-x-auto">
        <ul className="flex gap-1 rounded-full border border-border p-1 w-max">
          {PANELS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setPanel(id)}
                aria-current={panel === id ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-xs transition-colors",
                  panel === id
                    ? "bg-accent-solid text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {data.error && (
        <p role="alert" className="mt-4 text-sm text-red-500">{data.error}</p>
      )}

      <div className="mt-6">
        {data.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading finance data…</p>
        ) : (
          <>
            {panel === "dashboard" && (
              <DashboardPanel transactions={data.transactions} settings={data.settings} />
            )}

            {panel === "transactions" && (
              <TransactionsPanel
                transactions={data.transactions}
                incomeSources={data.incomeSources}
                expenseCategories={data.expenseCategories}
                onSave={data.saveTransaction}
                onDelete={data.deleteTransaction}
                onDeleteMany={data.deleteTransactions}
                onImportCsv={data.importTransactionsCsv}
              />
            )}

            {panel === "payroll" && (
              <PayrollPanel
                payroll={data.payroll}
                employees={employees}
                settings={data.settings}
                onGenerate={data.generateRun}
                onConfirm={data.confirmRun}
                onSaveItem={data.savePayrollItem}
                onDeleteItem={data.deletePayrollItem}
                onDeleteItems={data.deletePayrollItems}
              />
            )}

            {panel === "reports" && (
              <ReportsPanel transactions={data.transactions} categories={data.categories} />
            )}

            {panel === "settings" && (
              <SettingsPanel
                categories={data.categories}
                settings={data.settings}
                transactionCount={data.transactions.length}
                onSaveCategory={data.saveCategory}
                onToggleCategory={data.toggleCategory}
                onDeleteCategory={data.deleteCategory}
                onSaveSettings={data.saveSettings}
                onImport={async () => {
                  const report = await data.runImport();
                  await onEmployeesChanged();
                  return report;
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default FinanceTab;
