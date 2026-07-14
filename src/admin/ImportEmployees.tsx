import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/kit";
import { EMPTY_DRAFT, type EmployeeDraft } from "./types";

/**
 * Bulk-load employees from a JSON file the admin picks off their own disk.
 *
 * Why a file picker rather than a seed file in the repo: employee records carry
 * salaries, CNICs and emergency contacts. This repository is PUBLIC, and git
 * history is permanent — committing that data would publish it irreversibly.
 * So the data never enters the codebase at all. It sits on the admin's machine
 * and is read straight into the database.
 *
 * Template: docs/seed-employees.example.json
 */
const ImportEmployees = ({
  onImport,
}: {
  onImport: (drafts: EmployeeDraft[]) => Promise<void>;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setBusy(true);
    setResult(null);

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) {
        throw new Error("The file must contain a JSON array of employees.");
      }

      // Merge onto EMPTY_DRAFT so a partial record still imports cleanly rather
      // than exploding on a missing field.
      const drafts: EmployeeDraft[] = parsed.map((raw: Partial<EmployeeDraft>) => ({
        ...EMPTY_DRAFT,
        ...raw,
        emergencyContact: {
          ...EMPTY_DRAFT.emergencyContact,
          ...(raw.emergencyContact ?? {}),
        },
      }));

      const missingName = drafts.findIndex((d) => !d.fullName.trim());
      if (missingName !== -1) {
        throw new Error(`Record ${missingName + 1} has no fullName.`);
      }

      await onImport(drafts);
      setResult(`Imported ${drafts.length} employee${drafts.length === 1 ? "" : "s"}.`);
    } catch (caught) {
      setResult(
        caught instanceof Error ? `Import failed: ${caught.message}` : "Import failed.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <Button
        variant="secondary"
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <Upload size={15} aria-hidden="true" />
        )}
        Import JSON
      </Button>

      {result && <p className="text-xs text-muted-foreground">{result}</p>}
    </div>
  );
};

export default ImportEmployees;
