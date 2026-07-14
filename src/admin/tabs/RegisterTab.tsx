import { Badge, Button, EmptyState } from "@/components/kit";
import { shortDate } from "../format";
import type { IssuedDocument } from "../repository";

const statusTone = (status: IssuedDocument["status"]) =>
  status === "issued" ? "success" : status === "revoked" ? "danger" : "neutral";

const RegisterTab = ({
  documents,
  onRevoke,
}: {
  documents: IssuedDocument[];
  onRevoke: (doc: IssuedDocument) => Promise<void>;
}) => (
  <>
    <h1 className="type-display text-2xl text-foreground sm:text-4xl">
      Document register
    </h1>
    <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
      Every letter issued under the company signature. Revoking one keeps the record — it
      never disappears.
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
        {/* Mobile: cards */}
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

                <Badge tone={statusTone(doc.status)} dot>
                  {doc.status}
                </Badge>
              </div>

              {doc.status === "issued" && (
                <Button
                  variant="secondary"
                  className="mt-4 w-full py-2 text-xs"
                  onClick={() => void onRevoke(doc)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="surface mt-8 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Reference", "Type", "Employee", "Issued", "Status", ""].map((h) => (
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
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-b-0">
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
                    <Badge tone={statusTone(doc.status)} dot>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {doc.status === "issued" && (
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => void onRevoke(doc)}
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
);

export default RegisterTab;
