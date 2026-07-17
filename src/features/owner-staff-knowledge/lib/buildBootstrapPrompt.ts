import type {
  BootstrapClarificationTurn,
  BootstrapOtherNotes,
  StaffKnowledgeBootstrapContextDocument,
  StaffKnowledgeBootstrapIntake,
  StaffKnowledgeBootstrapRoleDraft,
} from '../model/types';

function formatChipValue(
  value: string,
  note: string | undefined
): string {
  if (value === 'other') {
    const trimmed = note?.trim() ?? '';
    return trimmed ? `other: ${trimmed}` : 'other: (not specified)';
  }
  return value;
}

function formatOtherNotesBlock(notes: BootstrapOtherNotes): string {
  const lines: string[] = [];
  const entries: Array<[keyof BootstrapOtherNotes, string]> = [
    ['laundry', notes.laundry],
    ['nightCoverage', notes.nightCoverage],
    ['cleaningOwner', notes.cleaningOwner],
    ['cleaningDepth', notes.cleaningDepth],
    ['laundryOps', notes.laundryOps],
    ['guestPayments', notes.guestPayments],
    ['keysAccess', notes.keysAccess],
  ];
  for (const [field, note] of entries) {
    const trimmed = note.trim();
    if (trimmed) lines.push(`${field}=other: ${trimmed}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(none beyond chip values)';
}

/** Structured intake block for A/B/C prompts and Manual copy. */
export function buildBootstrapIntakeSummary(
  intake: StaffKnowledgeBootstrapIntake
): string {
  const sizeLine =
    intake.sizeSource === 'guestStay'
      ? `Size: rooms=${intake.roomCount ?? 0}, beds=${intake.bedCount ?? 0}, floors=${intake.floorCount ?? 0} (from room map)`
      : `Size: rooms=${intake.roomCount ?? 'unknown'}, beds=${intake.bedCount ?? 'unknown'} (manual / unknown)`;

  const laundryOpsLine =
    intake.laundry === 'yes'
      ? `Laundry ops (who washes/handles): ${formatChipValue(intake.laundryOps, intake.otherNotes.laundryOps)}`
      : 'Laundry ops: n/a';

  return `Check-in: ${intake.checkInTime.trim() || 'unknown'}
Check-out: ${intake.checkOutTime.trim() || 'unknown'}
Reception open/close: ${intake.receptionOpen.trim() || 'unknown'} / ${intake.receptionClose.trim() || 'unknown'}
Reception hours hint: ${intake.receptionHint.trim() || 'none'}
Property timezone: ${intake.propertyTimeZone.trim() || 'unknown'}
Quiet hours: ${intake.quietHours.trim() || 'unknown'}
${sizeLine}
Laundry on site: ${formatChipValue(intake.laundry, intake.otherNotes.laundry)}
${laundryOpsLine}

Labor model: ${intake.laborModel}
Night coverage: ${formatChipValue(intake.nightCoverage, intake.otherNotes.nightCoverage)}
Who cleans (turnovers): ${formatChipValue(intake.cleaningOwner, intake.otherNotes.cleaningOwner)}
Deep cleaning owner: ${formatChipValue(intake.cleaningDepth, intake.otherNotes.cleaningDepth)}
Who takes guest payments / deposits: ${formatChipValue(intake.guestPayments, intake.otherNotes.guestPayments)}
Who issues keys / codes: ${formatChipValue(intake.keysAccess, intake.otherNotes.keysAccess)}
Peak days / seasonality: ${intake.peakDays.trim() || 'unknown'}

Other-field notes (per chip):
${formatOtherNotesBlock(intake.otherNotes)}

Special constraints (permanent rules — not follow-up chat):
${intake.specialConstraints.trim() || '(none)'}`;
}

const MAX_TRANSCRIPT_TURNS = 6;

/** Compact Q→A history for the readiness cycle (last N answered pairs). */
export function buildClarificationTranscriptBlock(
  transcript: BootstrapClarificationTurn[]
): string {
  if (transcript.length === 0) return '(none yet)';
  const recent = transcript.slice(-MAX_TRANSCRIPT_TURNS);
  return recent
    .map((turn, index) => {
      const n = transcript.length - recent.length + index + 1;
      return `Q${n}: ${turn.question}\nA${n}: ${turn.answer}`;
    })
    .join('\n');
}

function laborConstraintsBlock(
  laborModel: StaffKnowledgeBootstrapIntake['laborModel']
): string {
  if (laborModel === 'volunteers') {
    return `Labor constraints (MUST follow):
- Workers are mostly volunteers.
- Do NOT assign heavy lifting, toxic chemicals, cash handling, or high-risk incident response to volunteer roles.
- Prefer short, simple, safe duties; rotation-friendly.
- Keys, money, chemicals, serious guest incidents → paid staff or owner role.`;
  }
  if (laborModel === 'mix') {
    return `Labor constraints (MUST follow):
- Mix of paid staff and volunteers.
- Mark each role laborType as "paid" or "volunteer".
- Volunteer roles: no heavy/toxic/cash/high-risk work.
- Paid roles own keys, money, chemicals, incidents when needed.`;
  }
  return `Labor constraints:
- Paid staff / employees.
- Normal small-hostel operational load is OK.`;
}

/** Final full paste prompt (Manual mode / advanced). */
export function buildStaffKnowledgeBootstrapPrompt(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  clarifications?: BootstrapClarificationTurn[];
  /** @deprecated ignored — questionnaire summary replaces notes */
  hostelNotes?: string;
}): string {
  const hostelName = input.hostelName.trim() || 'this hostel';
  const intake = input.intake;
  const clarifications = input.clarifications ?? [];

  return `You are an operations consultant for small hostels.

Hostel name: ${hostelName}

${buildBootstrapIntakeSummary(intake)}

Clarification cycle answers (owner replies to readiness follow-ups):
${buildClarificationTranscriptBlock(clarifications)}

${laborConstraintsBlock(intake.laborModel)}

Task:
1) Propose a practical staff structure for THIS hostel (not a generic hotel).
2) Recommend how many people are needed for each role (headcount).
3) For each role, list a static responsibility checklist (what the role owns — not a daily task tracker).
4) Set laborType on each role: "paid" or "volunteer" (required when labor model is mix; for volunteers prefer volunteer; for paid prefer paid).

Rules:
- Be concrete and operational — only if relevant.
- Prefer fewer clear roles over many overlapping ones.
- headcount must be an integer >= 1.
- checklist items are short imperative sentences.
- Reply with ONLY one JSON object. JSON fence is OK.

Exact JSON shape:
{
  "summary": "1-3 sentences on how work is organized",
  "roles": [
    {
      "name": "Role name",
      "description": "What this role owns",
      "headcount": 1,
      "laborType": "paid",
      "checklist": [
        "Responsibility 1",
        "Responsibility 2"
      ]
    }
  ]
}`;
}

export function buildStaffKnowledgeBootstrapContextPrompt(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  clarifications?: BootstrapClarificationTurn[];
  /** 1-based Check readiness iteration in this session. */
  iteration?: number;
}): string {
  const hostelName = input.hostelName.trim() || 'this hostel';
  const iteration = input.iteration ?? 1;
  const clarifications = input.clarifications ?? [];

  const iterationGuidance =
    iteration >= 3
      ? `Iteration note: this is check #${iteration}. Prefer ready "yellow" with remaining gaps listed in missing/unclear and constraints, rather than "red", unless night/keys/money/cleaning remain completely unusable for this labor model.`
      : `Iteration note: this is check #${iteration}. Ask up to 3 short follow-up questions if needed.`;

  return `You assess whether a hostel owner gave enough information to design a staff/volunteer structure.

Hostel name: ${hostelName}

${buildBootstrapIntakeSummary(input.intake)}

Clarification cycle transcript (prior follow-up Q→A; treat answers as facts):
${buildClarificationTranscriptBlock(clarifications)}

${laborConstraintsBlock(input.intake.laborModel)}

${iterationGuidance}

Task:
1) Extract what MUST be used from the questionnaire + clarification answers.
2) List what is missing or unclear for a good staffing plan.
3) Set ready:
   - "green" if enough to propose roles confidently
   - "yellow" if workable but 1-3 gaps remain
   - "red" if critical gaps (especially unclear who handles night/keys/money/cleaning for this labor model)
4) Echo laborModel from intake.
5) List operational constraints for later generators.
6) Ask up to 3 short follow-up questions if needed. Do not repeat questions the owner already answered in the transcript.

Reply with ONLY one JSON object:
{
  "ready": "green",
  "laborModel": "volunteers",
  "constraints": ["..."],
  "mustUse": ["..."],
  "missing": ["..."],
  "unclear": ["..."],
  "followUpQuestions": ["..."]
}`;
}

export function buildStaffKnowledgeBootstrapRolesPrompt(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  context: StaffKnowledgeBootstrapContextDocument;
  clarifications?: BootstrapClarificationTurn[];
}): string {
  const hostelName = input.hostelName.trim() || 'this hostel';
  const clarifications = input.clarifications ?? [];

  return `You design HOSTEL ROLE STRUCTURE only (no duty checklists yet).

Hostel name: ${hostelName}

${buildBootstrapIntakeSummary(input.intake)}

Clarification cycle answers:
${buildClarificationTranscriptBlock(clarifications)}

${laborConstraintsBlock(input.intake.laborModel)}

Confirmed context from readiness step:
mustUse: ${JSON.stringify(input.context.mustUse)}
missing (still open): ${JSON.stringify(input.context.missing)}
unclear: ${JSON.stringify(input.context.unclear)}
constraints: ${JSON.stringify(input.context.constraints)}

Task:
Propose roles + headcount + short description + laborType.
Do NOT include checklist arrays yet.

Rules:
- Prefer fewer clear roles.
- Respect volunteer vs paid constraints.
- Reply with ONLY one JSON object:

{
  "summary": "1-3 sentences",
  "roles": [
    {
      "name": "Role name",
      "description": "What this role owns",
      "headcount": 1,
      "laborType": "volunteer"
    }
  ]
}`;
}

export function buildStaffKnowledgeBootstrapChecklistsPrompt(input: {
  hostelName: string;
  intake: StaffKnowledgeBootstrapIntake;
  context: StaffKnowledgeBootstrapContextDocument;
  rolesDocument: {
    summary?: string;
    roles: StaffKnowledgeBootstrapRoleDraft[];
  };
}): string {
  const hostelName = input.hostelName.trim() || 'this hostel';

  return `You write STATIC responsibility checklists for existing hostel roles.

Hostel name: ${hostelName}

${laborConstraintsBlock(input.intake.laborModel)}

Constraints: ${JSON.stringify(input.context.constraints)}

Roles to flesh out (keep names/headcount/laborType; add checklist only):
${JSON.stringify(input.rolesDocument, null, 2)}

Rules:
- checklist items = what the role owns (not a daily task tracker).
- Volunteer roles: simple/safe only — no heavy/toxic/cash/high-risk.
- Short imperative sentences.
- Reply with ONLY one JSON object (final apply shape):

{
  "summary": "1-3 sentences",
  "roles": [
    {
      "name": "Role name",
      "description": "What this role owns",
      "headcount": 1,
      "laborType": "volunteer",
      "checklist": ["Responsibility 1", "Responsibility 2"]
    }
  ]
}`;
}
