import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import { errorMessage } from "@/lib/utils";
import { pkr } from "../calc";
import {
  EMPTY_CLIENT,
  invoiceTotal,
  type Client,
  type ClientDraft,
  type FinanceCategory,
  type Invoice,
} from "../types";

interface Props {
  clients: Client[];
  invoices: Invoice[];
  incomeSources: FinanceCategory[];
  onSave: (draft: ClientDraft, id?: string) => Promise<void>;
  onDelete: (client: Client) => Promise<void>;
}

/**
 * The customer book — who we invoice, in what currency, and what they still
 * owe. A customer is created here FIRST; the invoice form then just picks
 * them from a dropdown.
 */
const CustomersPanel = ({ clients, invoices, incomeSources, onSave, onDelete }: Props) => {
  const [editing, setEditing] = useState<Client | null>(null);
  // A non-null draft IS the open form.
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [saving, setSaving] = useState(false);

  /** What a customer still owes, in THEIR currency (sent, unpaid invoices). */
  const outstandingOf = (client: Client): number =>
    invoices
      .filter((i) => i.clientId === client.id && i.status === "sent")
      .reduce((sum, i) => sum + invoiceTotal(i), 0);

  const invoiceCountOf = (client: Client): number =>
    invoices.filter((i) => i.clientId === client.id).length;

  const startCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY_CLIENT, incomeSource: incomeSources[0]?.name ?? "" });
  };

  const startEdit = (client: Client) => {
    const { id: _id, createdAt: _createdAt, ...rest } = client;
    setEditing(client);
    setDraft(rest);
  };

  const close = () => {
    setDraft(null);
    setEditing(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave(draft, editing?.id);
      close();
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not save the customer."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (client: Client) => {
    if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    try {
      await onDelete(client);
    } catch (caught) {
      window.alert(errorMessage(caught, "Could not delete the customer."));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {clients.length} customer{clients.length === 1 ? "" : "s"} — add one here
          first, then pick them on the invoice form.
        </p>
        <Button className="px-4 py-2 text-xs" onClick={startCreate}>
          <Plus size={14} aria-hidden="true" />
          Add customer
        </Button>
      </div>

      {/* ── Add / edit form ───────────────────────────────────────────────── */}
      {draft && (
        <form onSubmit={submit} className="surface mt-4 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            {editing ? `Edit ${editing.name}` : "New customer"}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="cl-name" label="Name">
              <input
                id="cl-name"
                required
                className={inputClass()}
                placeholder="Superlogics AS"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>

            <Field id="cl-email" label="Email">
              <input
                id="cl-email"
                type="email"
                className={inputClass()}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>

            <Field id="cl-currency" label="Invoice currency" hint="What they pay in.">
              <input
                id="cl-currency"
                required
                maxLength={3}
                className={inputClass("uppercase tabular-nums")}
                placeholder="NOK"
                value={draft.currency}
                onChange={(e) =>
                  setDraft({ ...draft, currency: e.target.value.toUpperCase() })
                }
              />
            </Field>

            <Field
              id="cl-source"
              label="Income source"
              hint="Where their payments post in the ledger."
            >
              <select
                id="cl-source"
                className={inputClass()}
                value={draft.incomeSource}
                onChange={(e) => setDraft({ ...draft, incomeSource: e.target.value })}
              >
                {incomeSources.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                {draft.incomeSource &&
                  !incomeSources.some((s) => s.name === draft.incomeSource) && (
                    <option value={draft.incomeSource}>{draft.incomeSource}</option>
                  )}
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="cl-address"
              label="Billing address"
              hint="Printed under the name on invoices — one line per line."
            >
              <textarea
                id="cl-address"
                rows={4}
                className={inputClass("resize-y")}
                placeholder={"c/o Regnskapskontoret Oslo AS\nØstre Aker vei 17\n0581 Oslo\nNorway"}
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </Field>

            <Field id="cl-notes" label="Notes (internal)">
              <textarea
                id="cl-notes"
                rows={4}
                className={inputClass("resize-y")}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-current"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active — appears in the invoice form's customer dropdown
          </label>

          <div className="mt-4 flex gap-3">
            <Button type="submit" disabled={saving} className="px-4 py-2 text-xs">
              {saving ? "Saving…" : editing ? "Save changes" : "Add customer"}
            </Button>
            <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── The book ──────────────────────────────────────────────────────── */}
      {clients.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No customers yet"
            description="Add the people and companies you invoice. Superlogics AS is seeded by the database schema."
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {clients.map((client) => {
            const outstanding = outstandingOf(client);
            const count = invoiceCountOf(client);
            return (
              <li key={client.id} className="surface flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {client.name}
                      <Badge tone={client.isActive ? "success" : "neutral"} dot>
                        {client.isActive ? "active" : "inactive"}
                      </Badge>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {client.currency}
                      {client.email && <> · {client.email}</>}
                      {client.incomeSource && <> · posts to {client.incomeSource}</>}
                    </p>
                    {client.address && (
                      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                        {client.address}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${client.name}`}
                      className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                      onClick={() => startEdit(client)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${client.name}`}
                      className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500"
                      onClick={() => void remove(client)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-auto border-t border-border pt-3 text-xs text-muted-foreground">
                  {count} invoice{count === 1 ? "" : "s"}
                  {outstanding > 0 && (
                    <span className="ml-2 font-medium text-amber-500">
                      · owes {client.currency} {pkr(outstanding)}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomersPanel;
