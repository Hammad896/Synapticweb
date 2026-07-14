import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, EmptyState } from "@/components/kit";
import LetterComposer from "../LetterComposer";
import LetterheadSetup from "../LetterheadSetup";
import type { Employee } from "../types";
import type { IssuedDocument } from "../repository";

const LettersTab = ({
  employees,
  documents,
  onIssue,
  onGoToEmployees,
}: {
  employees: Employee[];
  documents: IssuedDocument[];
  onIssue: (doc: Omit<IssuedDocument, "id" | "createdAt">) => Promise<IssuedDocument>;
  onGoToEmployees: () => void;
}) => {
  const [calibrating, setCalibrating] = useState(false);

  if (calibrating) {
    return <LetterheadSetup onDone={() => setCalibrating(false)} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-display text-2xl text-foreground sm:text-4xl">
            Draft a letter
          </h1>
          <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
            Letters render onto the real letterhead. A draft has the signature and stamp
            covered; only issuing applies them and records it in the register.
          </p>
        </div>

        <Button variant="secondary" onClick={() => setCalibrating(true)}>
          <SlidersHorizontal size={15} aria-hidden="true" />
          Letterhead setup
        </Button>
      </div>

      <div className="mt-8">
        {employees.length === 0 ? (
          <EmptyState
            title="Add an employee first"
            description="Letters are generated from an employee record."
            action={<Button onClick={onGoToEmployees}>Go to employees</Button>}
          />
        ) : (
          <LetterComposer
            employees={employees}
            documents={documents}
            onIssue={onIssue}
          />
        )}
      </div>
    </>
  );
};

export default LettersTab;
