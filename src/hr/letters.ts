import type { Employee } from "@/admin/types";

/**
 * Letter templates.
 *
 * Bodies are written as real HR prose, not fill-in-the-blank stubs — the whole
 * point is that an admin can issue a correct letter without rewriting it. Every
 * template declares the extra fields it needs beyond the employee record, so the
 * UI can ask for exactly those and nothing more.
 */

export type LetterType =
  | "offer"
  | "appointment"
  | "internship"
  | "internship-completion"
  | "experience"
  | "relieving"
  | "termination"
  | "resignation-acceptance"
  | "warning"
  | "show-cause";

export interface LetterField {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea";
  required: boolean;
  placeholder?: string;
}

export interface LetterTemplate {
  type: LetterType;
  title: string;
  /** Shown in the picker. */
  description: string;
  /** Grouping in the UI. */
  category: "employment" | "exit";
  /** Sensitive letters get a confirmation step and a mandatory reason. */
  sensitive: boolean;
  subject: string;
  fields: LetterField[];
  build: (employee: Employee, values: Record<string, string>) => string;
}

const formatDate = (iso: string): string =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(iso))
    : "____________";

const money = (amount: number, currency: string): string =>
  amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount)
    : "____________";

/** "he/she" is a landmine. Address the person; never guess a pronoun. */
const nameOf = (e: Employee) => e.fullName || "____________";

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    type: "offer",
    title: "Offer Letter",
    description: "Formal offer of employment, pending acceptance.",
    category: "employment",
    sensitive: false,
    subject: "Offer of Employment",
    fields: [
      { key: "startDate", label: "Proposed start date", type: "date", required: true },
      {
        key: "acceptBy",
        label: "Offer valid until",
        type: "date",
        required: true,
      },
      {
        key: "reportsTo",
        label: "Reports to",
        type: "text",
        required: false,
        placeholder: "Muhammad Umer, DevOps Manager",
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

We are pleased to offer you the position of ${e.role || "____________"} at Synaptic Lab.

Following our discussions and our assessment of your experience, we believe you will make a strong contribution to our engineering practice. The terms of this offer are set out below.

Position:            ${e.role || "____________"}
Department:          ${e.department || "____________"}
Employment type:     ${e.employmentType}
Work mode:           ${e.workMode}
Reporting to:        ${v.reportsTo || e.manager || "____________"}
Proposed start date: ${formatDate(v.startDate)}
Gross monthly salary: ${money(e.salaryAmount, e.salaryCurrency)}

This offer is subject to the successful completion of a probationary period of ${
      e.probationMonths || 3
    } months, during which your performance will be reviewed. On successful completion, your employment will be confirmed in writing.

Please confirm your acceptance by signing and returning a copy of this letter on or before ${formatDate(
      v.acceptBy,
    )}. Should we not hear from you by that date, this offer will lapse.

We look forward to welcoming you to the team.

Yours sincerely,`,
  },

  {
    type: "appointment",
    title: "Appointment / Joining Letter",
    description: "Confirms the employee has joined and sets out their terms.",
    category: "employment",
    sensitive: false,
    subject: "Letter of Appointment",
    fields: [
      {
        key: "workingHours",
        label: "Working hours",
        type: "text",
        required: false,
        placeholder: "Mon–Fri, 10:00–19:00 PKT",
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

With reference to your application and the interviews you attended, we are pleased to confirm your appointment at Synaptic Lab on the following terms.

Employee ID:         ${e.employeeId || "____________"}
Position:            ${e.role || "____________"}
Department:          ${e.department || "____________"}
Date of joining:     ${formatDate(e.joinedAt)}
Employment type:     ${e.employmentType}
Work mode:           ${e.workMode}
Reporting to:        ${e.manager || "____________"}
Gross monthly salary: ${money(e.salaryAmount, e.salaryCurrency)}
Working hours:       ${v.workingHours || "Monday to Friday, standard business hours"}

You will serve a probationary period of ${
      e.probationMonths || 3
    } months from your date of joining. During this period either party may terminate this engagement with one week's written notice. On confirmation, the notice period will be one month.

You are expected to maintain the confidentiality of all client and company information, both during and after your employment. All work product created in the course of your employment remains the property of Synaptic Lab and its clients.

We are glad to have you with us and look forward to your contribution.

Yours sincerely,`,
  },

  {
    type: "internship",
    title: "Internship Letter",
    description: "Confirms an internship engagement and its duration.",
    category: "employment",
    sensitive: false,
    subject: "Internship Engagement",
    fields: [
      { key: "startDate", label: "Internship start", type: "date", required: true },
      { key: "endDate", label: "Internship end", type: "date", required: true },
      {
        key: "stipend",
        label: "Monthly stipend (0 if unpaid)",
        type: "number",
        required: false,
      },
      {
        key: "mentor",
        label: "Assigned mentor",
        type: "text",
        required: false,
        placeholder: "Abdul Wahab",
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

We are pleased to confirm your selection for an internship at Synaptic Lab.

Position:        ${e.role || "Intern"}
Department:      ${e.department || "Engineering"}
Duration:        ${formatDate(v.startDate)} to ${formatDate(v.endDate)}
Work mode:       ${e.workMode}
Mentor:          ${v.mentor || e.manager || "____________"}
Monthly stipend: ${
      Number(v.stipend) > 0
        ? money(Number(v.stipend), e.salaryCurrency)
        : "This is an unpaid internship."
    }

During your internship you will work alongside our engineering team on live project work under the supervision of your mentor. You will be expected to observe the same standards of professionalism and confidentiality as our permanent staff.

This internship does not constitute an offer of employment, and either party may end it with one week's written notice. On satisfactory completion, you will be issued a certificate of completion.

We look forward to working with you.

Yours sincerely,`,
  },

  {
    type: "internship-completion",
    title: "Internship Completion Certificate",
    description: "Certifies that an internship was completed successfully.",
    category: "employment",
    sensitive: false,
    subject: "Certificate of Internship Completion",
    fields: [
      { key: "startDate", label: "Internship start", type: "date", required: true },
      { key: "endDate", label: "Internship end", type: "date", required: true },
      {
        key: "projects",
        label: "Projects / areas worked on",
        type: "textarea",
        required: false,
        placeholder: "Contributed to the ERP reporting module and internal tooling.",
      },
    ],
    build: (e, v) => `TO WHOM IT MAY CONCERN

This is to certify that ${nameOf(e)} ${
      e.cnic ? `(CNIC ${e.cnic})` : ""
    } successfully completed an internship at Synaptic Lab as ${
      e.role || "an Intern"
    } in the ${e.department || "Engineering"} department, from ${formatDate(
      v.startDate,
    )} to ${formatDate(v.endDate)}.

${
  v.projects
    ? `During the internship, ${nameOf(e)} worked on the following:\n\n${v.projects}\n`
    : ""
}
Throughout the engagement, ${nameOf(
      e,
    )} demonstrated a professional attitude, a willingness to learn, and the ability to work effectively within a team.

We wish ${nameOf(e)} every success in their future endeavours.

Yours sincerely,`,
  },

  {
    type: "experience",
    title: "Experience / Service Letter",
    description: "Certifies dates of service, role, and conduct.",
    category: "employment",
    sensitive: false,
    subject: "Certificate of Experience",
    fields: [
      {
        key: "conduct",
        label: "Conduct remark",
        type: "text",
        required: false,
        placeholder: "Their conduct throughout was found to be excellent.",
      },
    ],
    build: (e, v) => `TO WHOM IT MAY CONCERN

This is to certify that ${nameOf(e)} ${
      e.cnic ? `(CNIC ${e.cnic})` : ""
    } was employed at Synaptic Lab as ${e.role || "____________"} in the ${
      e.department || "____________"
    } department.

Employee ID:      ${e.employeeId || "____________"}
Period of service: ${formatDate(e.joinedAt)} to ${
      e.exitDate ? formatDate(e.exitDate) : "the present date"
    }
Employment type:   ${e.employmentType}

During this period, ${nameOf(
      e,
    )} carried out the responsibilities of the role with diligence and professionalism, and contributed to the delivery of client engagements to the standards this firm expects.

${v.conduct || "Their conduct throughout their service was found to be excellent."}

This certificate is issued at the request of the employee for whatever purpose it may serve.

Yours sincerely,`,
  },

  {
    type: "relieving",
    title: "Relieving Letter",
    description: "Confirms the employee has been formally relieved of duties.",
    category: "exit",
    sensitive: false,
    subject: "Relieving Letter",
    fields: [
      { key: "lastWorkingDay", label: "Last working day", type: "date", required: true },
      {
        key: "duesCleared",
        label: "Dues / handover status",
        type: "text",
        required: false,
        placeholder: "All company assets returned and final dues settled.",
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

This letter confirms that you have been relieved of your duties at Synaptic Lab with effect from the close of business on ${formatDate(
      v.lastWorkingDay,
    )}.

Employee ID:      ${e.employeeId || "____________"}
Position held:    ${e.role || "____________"}
Period of service: ${formatDate(e.joinedAt)} to ${formatDate(v.lastWorkingDay)}

${
  v.duesCleared ||
  "All company assets in your possession have been returned and your final dues have been settled."
}

We thank you for your service and your contribution during your time with us, and we wish you well in your next role.

Yours sincerely,`,
  },

  {
    type: "resignation-acceptance",
    title: "Resignation Acceptance",
    description: "Formally accepts a resignation and confirms the last working day.",
    category: "exit",
    sensitive: false,
    subject: "Acceptance of Resignation",
    fields: [
      {
        key: "resignationDate",
        label: "Date resignation received",
        type: "date",
        required: true,
      },
      { key: "lastWorkingDay", label: "Agreed last working day", type: "date", required: true },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

We acknowledge receipt of your resignation letter dated ${formatDate(
      v.resignationDate,
    )}, in which you tendered your resignation from the position of ${
      e.role || "____________"
    } at Synaptic Lab.

Your resignation is accepted, and your last working day will be ${formatDate(
      v.lastWorkingDay,
    )}. You are requested to complete the handover of your responsibilities, return all company assets, and settle any outstanding matters on or before that date.

Your relieving letter and experience certificate will be issued once the handover is complete.

We thank you for your contribution to Synaptic Lab and wish you success in your future career.

Yours sincerely,`,
  },

  {
    type: "termination",
    title: "Termination Letter",
    description: "Ends employment. Requires a stated reason and notice terms.",
    category: "exit",
    sensitive: true,
    subject: "Termination of Employment",
    fields: [
      {
        key: "reason",
        label: "Reason for termination (recorded permanently)",
        type: "textarea",
        required: true,
        placeholder:
          "State the specific grounds. This is retained in the document register.",
      },
      { key: "effectiveDate", label: "Effective date", type: "date", required: true },
      {
        key: "noticeTerms",
        label: "Notice / settlement terms",
        type: "textarea",
        required: false,
        placeholder: "One month's salary in lieu of notice will be paid with final dues.",
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

This letter serves as formal notice of the termination of your employment with Synaptic Lab, with effect from ${formatDate(
      v.effectiveDate,
    )}.

Employee ID:   ${e.employeeId || "____________"}
Position held: ${e.role || "____________"}
Date of joining: ${formatDate(e.joinedAt)}

Grounds for termination:

${v.reason}

${
  v.noticeTerms ||
  "Your final dues will be calculated in accordance with your terms of employment and settled in the next payroll cycle."
}

You are required to return all company property, including any equipment, access credentials, and confidential material, on or before your effective date. Your obligations of confidentiality survive the end of your employment.

Should you wish to discuss this decision, you may write to the undersigned within seven days of the date of this letter.

Yours sincerely,`,
  },

  {
    type: "warning",
    title: "Warning Letter",
    description: "A formal, recorded warning. Requires specifics.",
    category: "exit",
    sensitive: true,
    subject: "Formal Warning",
    fields: [
      {
        key: "incident",
        label: "Conduct / performance concern",
        type: "textarea",
        required: true,
        placeholder: "Describe the specific incident, with dates.",
      },
      {
        key: "expected",
        label: "Required improvement",
        type: "textarea",
        required: true,
        placeholder: "State exactly what must change, and by when.",
      },
      {
        key: "reviewDate",
        label: "Review date",
        type: "date",
        required: true,
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

This letter is a formal warning regarding the matter set out below. It will be placed on your employment record.

Employee ID:   ${e.employeeId || "____________"}
Position:      ${e.role || "____________"}

The concern:

${v.incident}

Required improvement:

${v.expected}

Your conduct and performance in this respect will be reviewed on ${formatDate(
      v.reviewDate,
    )}. Failure to demonstrate the required improvement may result in further disciplinary action, up to and including termination of employment.

You are entitled to respond to this warning in writing within seven days, and your response will be placed on record alongside it.

Yours sincerely,`,
  },

  {
    type: "show-cause",
    title: "Show-Cause Notice",
    description: "Requires the employee to explain themselves before any action.",
    category: "exit",
    sensitive: true,
    subject: "Show-Cause Notice",
    fields: [
      {
        key: "allegation",
        label: "Matter to be explained",
        type: "textarea",
        required: true,
        placeholder: "State the alleged conduct factually, with dates.",
      },
      {
        key: "respondBy",
        label: "Respond by",
        type: "date",
        required: true,
      },
    ],
    build: (e, v) => `Dear ${nameOf(e)},

You are required to show cause in respect of the matter set out below.

Employee ID: ${e.employeeId || "____________"}
Position:    ${e.role || "____________"}

The matter:

${v.allegation}

You are required to submit a written explanation to the undersigned on or before ${formatDate(
      v.respondBy,
    )}. Your explanation will be considered before any decision is taken.

Please note that no conclusion has been reached at this stage. This notice is issued to give you a fair opportunity to state your position. Should you fail to respond by the date above, a decision may be taken on the material available.

Yours sincerely,`,
  },
];

export const getTemplate = (type: LetterType): LetterTemplate => {
  const template = LETTER_TEMPLATES.find((t) => t.type === type);
  if (!template) throw new Error(`Unknown letter type: ${type}`);
  return template;
};

/**
 * SL/HR/2026/014 — permanent, unique, and never reused. Scoped per year, like
 * the employee ID, and derived from the highest existing number rather than a
 * count, so deleting a record can never cause a collision.
 */
export const nextReference = (existingRefs: string[], year = new Date().getFullYear()) => {
  const prefix = `SL/HR/${year}/`;

  const highest = existingRefs
    .filter((ref) => ref.startsWith(prefix))
    .map((ref) => Number.parseInt(ref.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
};
