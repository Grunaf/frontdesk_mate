export type StaffKnowledgePublicRole = {
  id: string;
  name: string;
  description: string;
  headcount: number;
  laborType: 'paid' | 'volunteer' | null;
  checklist: Array<{ id: string; body: string }>;
};

export type StaffKnowledgePublicArticle = {
  id: string;
  roleId: string | null;
  title: string;
  body: string;
  videoUrl: string | null;
};

export type StaffKnowledgePanelData = {
  roles: StaffKnowledgePublicRole[];
  articles: StaffKnowledgePublicArticle[];
};

export type StaffKnowledgeMutateResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'invalid' | 'write_failed' | 'not_found' };

export type StaffKnowledgeLaborModel = 'paid' | 'volunteers' | 'mix';

export type BootstrapAuthoringMode = 'auto' | 'manual';

export type BootstrapNightCoverage =
  | 'staff'
  | 'volunteer'
  | 'on_call_owner'
  | 'closed'
  | 'other';

export type BootstrapCleaningOwner =
  | 'staff'
  | 'volunteers'
  | 'outsource'
  | 'mixed'
  | 'other';

export type BootstrapCleaningDepth =
  | 'owner'
  | 'staff'
  | 'volunteers'
  | 'outsource'
  | 'other';

export type BootstrapLaundryOps =
  | 'staff'
  | 'volunteers'
  | 'outsource'
  | 'mixed'
  | 'other';

export type BootstrapGuestPayments = 'paid_staff' | 'owner' | 'none' | 'other';

export type BootstrapKeysAccess =
  | 'paid_staff'
  | 'owner'
  | 'volunteer'
  | 'self_service'
  | 'other';

/** Per-field free-text when a chip is set to `other`. */
export type BootstrapOtherNotes = {
  laundry: string;
  nightCoverage: string;
  cleaningOwner: string;
  cleaningDepth: string;
  laundryOps: string;
  guestPayments: string;
  keysAccess: string;
};

export type BootstrapOtherNoteField = keyof BootstrapOtherNotes;

/** Authoring questionnaire for Build structure (Auto + Manual). */
export type BootstrapQuestionnaire = {
  checkInTime: string;
  checkOutTime: string;
  receptionOpen: string;
  receptionClose: string;
  receptionHint: string;
  roomCount: number | null;
  bedCount: number | null;
  floorCount: number | null;
  sizeSource: 'guestStay' | 'empty';
  laundry: 'yes' | 'no' | 'other';
  quietHours: string;
  propertyTimeZone: string;
  laborModel: StaffKnowledgeLaborModel;
  nightCoverage: BootstrapNightCoverage;
  cleaningOwner: BootstrapCleaningOwner;
  cleaningDepth: BootstrapCleaningDepth;
  laundryOps: BootstrapLaundryOps;
  guestPayments: BootstrapGuestPayments;
  keysAccess: BootstrapKeysAccess;
  peakDays: string;
  /** Permanent constraints (shared free-text). Not a chat transcript. */
  specialConstraints: string;
  /** Required when the matching chip value is `other`. */
  otherNotes: BootstrapOtherNotes;
};

export type BootstrapPrefillFlags = {
  checkInTime: boolean;
  checkOutTime: boolean;
  receptionOpen: boolean;
  receptionClose: boolean;
  receptionHint: boolean;
  roomMap: boolean;
  laundry: boolean;
  quietHours: boolean;
};

export type GuestStaySizeSnapshot = {
  roomCount: number;
  bedCount: number;
  floorCount: number;
  source: 'guestStay' | 'empty';
};

/**
 * @deprecated Prefer BootstrapQuestionnaire. Kept as alias for generate pipeline input.
 */
export type StaffKnowledgeBootstrapIntake = BootstrapQuestionnaire;

export type StaffKnowledgeBootstrapReadyLevel = 'green' | 'yellow' | 'red';

export type StaffKnowledgeBootstrapContextDocument = {
  ready: StaffKnowledgeBootstrapReadyLevel;
  laborModel: StaffKnowledgeLaborModel;
  constraints: string[];
  mustUse: string[];
  missing: string[];
  unclear: string[];
  followUpQuestions: string[];
};

/** One answered follow-up turn (session UI only — not persisted). */
export type BootstrapClarificationTurn = {
  question: string;
  answer: string;
};

/**
 * Session-only readiness cycle state (clarifications are not written to
 * staffKnowledgeIntake).
 */
export type BootstrapReadinessSession = {
  context: StaffKnowledgeBootstrapContextDocument | null;
  /** True after questionnaire edits while a prior context is still shown. */
  contextStale: boolean;
  /** Open follow-up drafts for the current advice questions. */
  pendingAnswers: Record<string, string>;
  /** Compact Q→A history across Check → Answer → Check iterations. */
  transcript: BootstrapClarificationTurn[];
  /** How many successful Check readiness calls in this session. */
  iteration: number;
};

export type StaffKnowledgeBootstrapRoleDraft = {
  name: string;
  description: string;
  headcount: number;
  laborType?: 'paid' | 'volunteer' | null;
  checklist?: string[];
};

export type StaffKnowledgeBootstrapParseResult =
  | {
      ok: true;
      document: {
        summary?: string;
        roles: Array<{
          name: string;
          description: string;
          headcount: number;
          laborType?: 'paid' | 'volunteer' | null;
          checklist: string[];
        }>;
      };
    }
  | { ok: false; message: string };

export type StaffKnowledgeBootstrapContextParseResult =
  | { ok: true; document: StaffKnowledgeBootstrapContextDocument }
  | { ok: false; message: string };

export type StaffKnowledgeBootstrapRolesParseResult =
  | {
      ok: true;
      document: {
        summary?: string;
        roles: StaffKnowledgeBootstrapRoleDraft[];
      };
    }
  | { ok: false; message: string };

export type StaffKnowledgeArticleParseResult =
  | {
      ok: true;
      document: {
        title: string;
        body: string;
        videoUrl?: string | null;
        roleName?: string | null;
      };
    }
  | { ok: false; message: string };

export type StaffKnowledgeGenerateError =
  | 'unauthorized'
  | 'forbidden'
  | 'not_configured'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_input'
  | 'invalid'
  | 'not_ready';

export type StaffKnowledgeBootstrapGenerateResult =
  | {
      ok: true;
      rawText: string;
      document: Extract<StaffKnowledgeBootstrapParseResult, { ok: true }>['document'];
      context?: StaffKnowledgeBootstrapContextDocument;
      step?: 'context' | 'roles' | 'checklists';
    }
  | { ok: false; error: StaffKnowledgeGenerateError; message?: string };

export type StaffKnowledgeBootstrapContextGenerateResult =
  | {
      ok: true;
      rawText: string;
      document: StaffKnowledgeBootstrapContextDocument;
    }
  | { ok: false; error: StaffKnowledgeGenerateError; message?: string };

export type StaffKnowledgeArticleGenerateResult =
  | {
      ok: true;
      rawText: string;
      document: Extract<StaffKnowledgeArticleParseResult, { ok: true }>['document'];
    }
  | { ok: false; error: StaffKnowledgeGenerateError; message?: string };

export function createEmptyOtherNotes(
  overrides?: Partial<BootstrapOtherNotes>
): BootstrapOtherNotes {
  return {
    laundry: '',
    nightCoverage: '',
    cleaningOwner: '',
    cleaningDepth: '',
    laundryOps: '',
    guestPayments: '',
    keysAccess: '',
    ...overrides,
  };
}

export function createEmptyBootstrapQuestionnaire(
  overrides?: Partial<BootstrapQuestionnaire>
): BootstrapQuestionnaire {
  const { otherNotes: otherNotesOverride, ...rest } = overrides ?? {};
  return {
    checkInTime: '',
    checkOutTime: '',
    receptionOpen: '',
    receptionClose: '',
    receptionHint: '',
    roomCount: null,
    bedCount: null,
    floorCount: null,
    sizeSource: 'empty',
    laundry: 'no',
    quietHours: '',
    propertyTimeZone: '',
    laborModel: 'paid',
    nightCoverage: 'on_call_owner',
    cleaningOwner: 'staff',
    cleaningDepth: 'owner',
    laundryOps: 'staff',
    guestPayments: 'owner',
    keysAccess: 'owner',
    peakDays: '',
    specialConstraints: '',
    ...rest,
    otherNotes: createEmptyOtherNotes(otherNotesOverride),
  };
}

export function createEmptyReadinessSession(
  overrides?: Partial<BootstrapReadinessSession>
): BootstrapReadinessSession {
  return {
    context: null,
    contextStale: false,
    pendingAnswers: {},
    transcript: [],
    iteration: 0,
    ...overrides,
  };
}
