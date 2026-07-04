export type TenantLastMileInterviewQuestionId =
  | 'start-point'
  | 'walk-directions'
  | 'building-notes';

export type TenantLastMileAnswerStatus = 'unanswered' | 'answered' | 'unknown';

export type TenantLastMileInterviewAnswer = {
  status: TenantLastMileAnswerStatus;
  value: string;
};

export type TenantLastMileAnswerMap = Partial<
  Record<TenantLastMileInterviewQuestionId, TenantLastMileInterviewAnswer>
>;

export type TenantLastMileInterviewQuestion = {
  id: TenantLastMileInterviewQuestionId;
  label: string;
  hint?: string;
  multiline?: boolean;
  required: boolean;
};

export type TenantLastMileOpenQuestion = {
  id: string;
  question: string;
};

export type TenantLastMileFillPreview = {
  walkEn: string;
  tipsEn?: string[];
  openQuestions: TenantLastMileOpenQuestion[];
};

export type TenantLastMileFillRequest = {
  tenantSlug: string;
  routeId: string;
  hubLabel: string;
  cityContext?: string;
  rawInput: string;
  followUpAnswers?: Record<string, string>;
  mode: 'full' | 'regenerate';
};

export type TenantLastMileFillResult =
  | { ok: true; preview: TenantLastMileFillPreview }
  | {
      ok: false;
      error: 'unauthorized' | 'not_configured' | 'rate_limited' | 'invalid_input' | 'provider_error';
    };
