import { useMemo, useState } from "react";
import { Banknote, Download, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import { SortTh, useSort } from "@/lib/useSort";
import { openPdf } from "@/hr/pdf";
import { shortDate } from "@/admin/format";
import { errorMessage } from "@/lib/utils";
import { pkr } from "../calc";
import { renderInvoicePdf } from "../invoice-pdf";
import {
  DEFAULT_INVOICE_NOTE,
  dueDateFor,
  invoiceTotal,
  isOverdue,
  nextInvoiceNo,
  type Client,
  type FinanceCategory,
  type Invoice,
  type InvoiceDraft,
} from "../types";

interface Props {
  invoices: Invoice[];
  clients: Client[];
  incomeSources: FinanceCategory[];
  onSave: (draft: InvoiceDraft, editing: Invoice | null) => Promise<void>;
  onDelete: (invoice: Invoice) => Promise<void>;
  onMarkSent: (invoice: Invoice) => Promise<void>;
  onRecordPayment: (
    invoice: Invoice,
    payment: { date: string; amountPkr: number; incomeSource: string },
  ) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Receivables: invoices out, money owed, money in. An invoice lives through
 * draft → sent → paid; recording a payment writes the PKR that actually
 * landed after remittance into the ledger as income.
 */
const InvoicesPanel = ({
  invoices,
  clients,
  incomeSources,
  onSave,
  onDelete,
  onMarkSent,
  onRecordPayment,
}: Props) => {
  const [editing, setEditing] = useState<Invoice | null>(null);
  // A non-null draft IS the open form.
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // The invoice a payment is being recorded against, and the payment fields.
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState({ date: "", amountPkr: 0, incomeSource: "" });

  /* ── Receivables at a glance — outstanding per currency ────────────────── */
  const outstanding = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.status !== "sent") continue;
      byCurrency.set(
        invoice.currency,
        (byCurrency.get(invoice.currency) ?? 0) + invoiceTotal(invoice),
      );
    }
    return [...byCurrency.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [invoices]);
  const overdueCount = useMemo(
    () => invoices.filter((i) => isOverdue(i, today())).length,
    [invoices],
  );

  const { sorted, sort, toggle } = useSort(invoices, {
    no: (i) => i.invoiceNo,
    client: (i) => i.clientName.toLowerCase(),
    date: (i) => i.date,
    due: (i) => i.dueDate,
    status: (i) => i.status,
    total: (i) => invoiceTotal(i),
  });

  const statusBadge = (invoice: Invoice) =>
    isOverdue(invoice, today()) ? (
      <Badge tone="danger" dot>overdue</Badge>
    ) : invoice.status === "paid" ? (
      <Badge tone="success" dot>paid</Badge>
    ) : invoice.status === "sent" ? (
      <Badge tone="warning" dot>sent</Badge>
    ) : (
      <Badge dot>draft</Badge>
    );

  /* ── Create / edit ─────────────────────────────────────────────────────── */

  const startCreate = () => {
    const client = clients.find((c) => c.isActive) ?? null;
    const date = today();
    setEditing(null);
    setDraft({
      invoiceNo: nextInvoiceNo(invoices),
      clientId: client?.id ?? null,
      clientName: client?.name ?? "",
      clientAddress: client?.address ?? "",
      date,
      terms: "Net 30",
      dueDate: dueDateFor(date, "Net 30") ?? "",
      currency: client?.currency ?? "PKR",
      lines: [{ description: "IT Support Services", qty: 1, rate: 0 }],
      notes: DEFAULT_INVOICE_NOTE,
      status: "draft",
      transactionId: null,
      paidAmount: 0,
      paidDate: "",
    });
  };

  const startEdit = (invoice: Invoice) => {
    const { id: _id, createdAt: _createdAt, ...rest } = invoice;
    setEditing(invoice);
    setDraft({ ...rest, lines: rest.lines.map((l) => ({ ...l })) });
  };

  const close = () => {
    setDraft(null);
    setEditing(null);
    setFormError(null);
  };

  const pickClient = (id: string) => {
    if (!draft) return;
    const client = clients.find((c) => c.id === id);
    setDraft({
      ...draft,
      clientId: client?.id ?? null,
      clientName: client?.name ?? draft.clientName,
      clientAddress: client?.address ?? draft.clientAddress,
      currency: client?.currency ?? draft.currency,
    });
  };

  /** Date or terms changed: Net-N terms recompute the due date. */
  const applyDates = (date: string, terms: string) => {
    if (!draft) return;
    setDraft({ ...draft, date, terms, dueDate: dueDateFor(date, terms) ?? draft.dueDate });
  };

  const setLine = (index: number, patch: Partial<InvoiceDraft["lines"][number]>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      lines: draft.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    // Say why, never just refuse — a dead Save button explains nothing.
    if (!draft.clientName.trim())
      return setFormError(
        clients.length === 0
          ? "No customers yet — add one in the Customers tab first."
          : "Pick a customer.",
      );
    if (!draft.date) return setFormError("Pick an invoice date.");
    const lines = draft.lines.filter((l) => l.description.trim() || l.rate > 0);
    if (lines.length === 0)
      return setFormError("Add at least one item with a description or a rate.");

    setFormError(null);
    setSaving(true);
    try {
      await onSave({ ...draft, lines }, editing);
      close();
    } catch (caught) {
      setFormError(errorMessage(caught, "Could not save the invoice."));
    } finally {
      setSaving(false);
    }
  };

  /* ── Row actions ───────────────────────────────────────────────────────── */

  const downloadPdf = async (invoice: Invoice) => {
    try {
      openPdf(await renderInvoicePdf(invoice), `${invoice.invoiceNo}.pdf`);
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not render the PDF."));
    }
  };

  const startPayment = (invoice: Invoice) => {
    const client = clients.find((c) => c.id === invoice.clientId);
    setPaying(invoice);
    setPayment({
      date: today(),
      // PKR invoices arrive at face value; remittances need the real figure.
      amountPkr: invoice.currency === "PKR" ? invoiceTotal(invoice) : 0,
      incomeSource: client?.incomeSource || incomeSources[0]?.name || "Others",
    });
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paying || payment.amountPkr <= 0 || !payment.date) return;
    try {
      await onRecordPayment(paying, payment);
      setPaying(null);
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not record the payment."));
    }
  };

  const remove = async (invoice: Invoice) => {
    const warning =
      invoice.status === "paid"
        ? `Delete ${invoice.invoiceNo}?\n\nIt is PAID — deleting it also removes the income entry its payment created (PKR ${pkr(invoice.paidAmount)}).`
        : `Delete ${invoice.invoiceNo}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    try {
      await onDelete(invoice);
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not delete the invoice."));
    }
  };

  const total = draft ? invoiceTotal(draft) : 0;

  return (
    <div>
      {/* ── Receivables summary ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {outstanding.length === 0 ? (
            "Nothing outstanding — every sent invoice is paid."
          ) : (
            <>
              Outstanding:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {outstanding.map(([currency, sum]) => `${currency} ${pkr(sum)}`).join(" · ")}
              </span>
              {overdueCount > 0 && (
                <span className="ml-2 font-medium text-red-500">
                  {overdueCount} overdue
                </span>
              )}
            </>
          )}
        </p>
        <Button className="px-4 py-2 text-xs" onClick={startCreate}>
          <Plus size={14} aria-hidden="true" />
          New invoice
        </Button>
      </div>

      {/* ── Create / edit form ────────────────────────────────────────────── */}
      {draft && (
        <form onSubmit={submit} className="surface mt-4 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            {editing ? `Edit ${editing.invoiceNo}` : "New invoice"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Field
              id="inv-no"
              label="Invoice number"
              hint="Suggested by the system — edit it before saving if needed."
            >
              <input
                id="inv-no"
                required
                className={inputClass("tabular-nums")}
                value={draft.invoiceNo}
                onChange={(e) => setDraft({ ...draft, invoiceNo: e.target.value })}
              />
            </Field>

            <Field id="inv-client" label="Customer" hint="Managed in the Customers tab.">
              <select
                id="inv-client"
                required
                className={inputClass()}
                value={draft.clientId ?? ""}
                onChange={(e) => pickClient(e.target.value)}
              >
                <option value="" disabled>Pick a customer…</option>
                {clients
                  .filter((c) => c.isActive || c.id === draft.clientId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </Field>

            <Field id="inv-date" label="Invoice date">
              <input
                id="inv-date"
                type="date"
                required
                className={inputClass()}
                value={draft.date}
                onChange={(e) => applyDates(e.target.value, draft.terms)}
              />
            </Field>

            <Field id="inv-terms" label="Terms" hint='"Net 30" sets the due date itself.'>
              <input
                id="inv-terms"
                className={inputClass()}
                placeholder="Net 30"
                value={draft.terms}
                onChange={(e) => applyDates(draft.date, e.target.value)}
              />
            </Field>

            <Field id="inv-due" label="Due date">
              <input
                id="inv-due"
                type="date"
                className={inputClass()}
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              />
            </Field>

            <Field id="inv-currency" label="Currency">
              <input
                id="inv-currency"
                required
                maxLength={3}
                className={inputClass("uppercase tabular-nums")}
                value={draft.currency}
                onChange={(e) =>
                  setDraft({ ...draft, currency: e.target.value.toUpperCase() })
                }
              />
            </Field>
          </div>

          {/* Line items */}
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Items
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {draft.lines.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem_7rem_auto] items-center gap-2 sm:grid-cols-[1fr_6rem_9rem_auto]">
                <input
                  aria-label={`Item ${index + 1} description`}
                  className={inputClass("py-2 text-sm")}
                  placeholder="IT Support Services"
                  value={item.description}
                  onChange={(e) => setLine(index, { description: e.target.value })}
                />
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass("py-2 text-sm tabular-nums")}
                  value={Number.isNaN(item.qty) ? "" : item.qty}
                  onChange={(e) => setLine(index, { qty: e.target.valueAsNumber })}
                />
                <input
                  aria-label={`Item ${index + 1} rate`}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass("py-2 text-sm tabular-nums")}
                  placeholder="Rate"
                  value={Number.isNaN(item.rate) ? "" : item.rate}
                  onChange={(e) => setLine(index, { rate: e.target.valueAsNumber })}
                />
                <button
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={draft.lines.length === 1}
                  className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-30"
                  onClick={() =>
                    setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })
                  }
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() =>
                setDraft({
                  ...draft,
                  lines: [...draft.lines, { description: "", qty: 1, rate: 0 }],
                })
              }
            >
              <Plus size={13} aria-hidden="true" /> Add line
            </Button>
            <p className="text-sm tabular-nums text-foreground">
              Total: <strong>{draft.currency} {pkr(total)}</strong>
            </p>
          </div>

          <div className="mt-4">
            <Field
              id="inv-notes"
              label="Notes on the invoice"
              hint="Bank details by default — printed under the item table."
            >
              <textarea
                id="inv-notes"
                rows={4}
                className={inputClass("resize-y")}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
          </div>

          {formError && (
            <p role="alert" className="mt-4 text-sm text-red-500">
              {formError}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <Button type="submit" disabled={saving} className="px-4 py-2 text-xs">
              {saving ? "Saving…" : editing ? "Save changes" : "Save invoice"}
            </Button>
            <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Record payment ────────────────────────────────────────────────── */}
      {paying && (
        <form onSubmit={submitPayment} className="surface mt-4 border-accent/40 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            Record payment — {paying.invoiceNo}, {paying.clientName}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              invoiced {paying.currency} {pkr(invoiceTotal(paying))}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Field id="pay-date" label="Received on">
              <input
                id="pay-date"
                type="date"
                required
                className={inputClass()}
                value={payment.date}
                onChange={(e) => setPayment({ ...payment, date: e.target.value })}
              />
            </Field>
            <Field
              id="pay-amount"
              label="Received (PKR)"
              hint="What actually landed in the bank after remittance."
            >
              <input
                id="pay-amount"
                type="number"
                min={0}
                step="0.01"
                required
                className={inputClass("tabular-nums")}
                value={payment.amountPkr || ""}
                onChange={(e) =>
                  setPayment({ ...payment, amountPkr: e.target.valueAsNumber || 0 })
                }
              />
            </Field>
            <Field id="pay-source" label="Income source">
              <select
                id="pay-source"
                className={inputClass()}
                value={payment.incomeSource}
                onChange={(e) => setPayment({ ...payment, incomeSource: e.target.value })}
              >
                {incomeSources.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-2 pb-0.5">
              <Button type="submit" className="px-4 py-2 text-xs">
                <Banknote size={14} aria-hidden="true" /> Record
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs"
                onClick={() => setPaying(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── The list ──────────────────────────────────────────────────────── */}
      {invoices.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No invoices yet"
            description="The numbering continues from the old tool — the next invoice is INV-00217."
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {sorted.map((invoice) => (
              <li key={invoice.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="tabular-nums text-accent">{invoice.invoiceNo}</span>
                      {" · "}{invoice.clientName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shortDate(invoice.date)}
                      {invoice.dueDate && <> · due {shortDate(invoice.dueDate)}</>}
                    </p>
                  </div>
                  {statusBadge(invoice)}
                </div>
                <p className="mt-2 text-sm tabular-nums text-foreground">
                  {invoice.currency} {pkr(invoiceTotal(invoice))}
                  {invoice.status === "paid" && (
                    <span className="ml-2 text-xs text-emerald-500">
                      received PKR {pkr(invoice.paidAmount)}
                    </span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-1.5 text-xs"
                    onClick={() => void downloadPdf(invoice)}
                  >
                    <Download size={12} aria-hidden="true" /> PDF
                  </Button>
                  {invoice.status === "draft" && (
                    <Button
                      variant="secondary"
                      className="flex-1 py-1.5 text-xs"
                      onClick={() => void onMarkSent(invoice)}
                    >
                      <Send size={12} aria-hidden="true" /> Mark sent
                    </Button>
                  )}
                  {invoice.status === "sent" && (
                    <Button
                      variant="secondary"
                      className="flex-1 py-1.5 text-xs"
                      onClick={() => startPayment(invoice)}
                    >
                      <Banknote size={12} aria-hidden="true" /> Payment
                    </Button>
                  )}
                  {invoice.status !== "paid" && (
                    <Button
                      variant="secondary"
                      className="flex-1 py-1.5 text-xs"
                      onClick={() => startEdit(invoice)}
                    >
                      <Pencil size={12} aria-hidden="true" /> Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="flex-1 py-1.5 text-xs text-red-500"
                    onClick={() => void remove(invoice)}
                  >
                    <Trash2 size={12} aria-hidden="true" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="surface mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <SortTh label="No." sortKey="no" sort={sort} onToggle={toggle} className="!px-4" />
                  <SortTh label="Customer" sortKey="client" sort={sort} onToggle={toggle} />
                  <SortTh label="Date" sortKey="date" sort={sort} onToggle={toggle} />
                  <SortTh label="Due" sortKey="due" sort={sort} onToggle={toggle} />
                  <SortTh label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                  <SortTh label="Total" sortKey="total" sort={sort} onToggle={toggle} />
                  <th scope="col" className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-accent">
                      {invoice.invoiceNo}
                    </td>
                    <td className="max-w-[16rem] truncate px-5 py-3 text-sm text-foreground">
                      {invoice.clientName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm tabular-nums text-muted-foreground">
                      {shortDate(invoice.date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm tabular-nums text-muted-foreground">
                      {invoice.dueDate ? shortDate(invoice.dueDate) : "—"}
                    </td>
                    <td className="px-5 py-3">{statusBadge(invoice)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums text-foreground">
                      {invoice.currency} {pkr(invoiceTotal(invoice))}
                      {invoice.status === "paid" && (
                        <span
                          className="block text-xs text-emerald-500"
                          title="What actually landed in the bank"
                        >
                          PKR {pkr(invoice.paidAmount)}
                        </span>
                      )}
                    </td>
                    <td className="w-36 px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Download ${invoice.invoiceNo} as PDF`}
                          title="Download PDF"
                          className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                          onClick={() => void downloadPdf(invoice)}
                        >
                          <Download size={15} aria-hidden="true" />
                        </button>
                        {invoice.status === "draft" && (
                          <button
                            type="button"
                            aria-label={`Mark ${invoice.invoiceNo} as sent`}
                            title="Mark sent"
                            className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                            onClick={() => void onMarkSent(invoice)}
                          >
                            <Send size={15} aria-hidden="true" />
                          </button>
                        )}
                        {invoice.status === "sent" && (
                          <button
                            type="button"
                            aria-label={`Record payment for ${invoice.invoiceNo}`}
                            title="Record payment"
                            className="tap rounded-full text-muted-foreground transition-colors hover:text-emerald-500"
                            onClick={() => startPayment(invoice)}
                          >
                            <Banknote size={15} aria-hidden="true" />
                          </button>
                        )}
                        {invoice.status !== "paid" && (
                          <button
                            type="button"
                            aria-label={`Edit ${invoice.invoiceNo}`}
                            title="Edit"
                            className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                            onClick={() => startEdit(invoice)}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete ${invoice.invoiceNo}`}
                          title="Delete"
                          className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500"
                          onClick={() => void remove(invoice)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoicesPanel;
