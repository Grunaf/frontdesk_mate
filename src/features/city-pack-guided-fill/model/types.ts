import type { RouteMetadataImport } from '@/entities/city-pack/lib/patchRouteMetadataFromImport';
import type { RouteMode } from '@/entities/hostel';

export type GuidedRouteCopyFieldKey =
  | 'publicTitle'
  | 'publicSummary'
  | 'publicText'
  | 'publicGetOffAt'
  | 'publicPreview'
  | 'transitScheduleAdvice'
  | 'transitTicketPayment';

export type GuidedRouteFillFieldKey = GuidedRouteCopyFieldKey | 'tips';

export type GuidedRouteCopyPayload = {
  publicTitle?: string;
  publicSummary?: string;
  publicText?: string;
  publicGetOffAt?: string;
  publicPreview?: string;
  transitScheduleAdvice?: string[];
  transitTicketPayment?: string[];
};

export type GuidedRouteOpenQuestion = {
  id: string;
  field: GuidedRouteFillFieldKey | 'routeMode';
  question: string;
};

/** EN-only strings from AI; RU stays empty until Copy EN → RU. */
export type GuidedRouteFillPreview = {
  routeMode?: RouteMode;
  locationLabelEn?: string;
  copy: GuidedRouteCopyPayload;
  tips?: string[];
  metadata?: RouteMetadataImport;
  openQuestions: GuidedRouteOpenQuestion[];
};

export type GuidedRouteFillRequest = {
  packId: string;
  routeId: string;
  hubLabel: string;
  /** Compiled interview and/or optional paste — source of truth for the model. */
  rawInput: string;
  followUpAnswers?: Record<string, string>;
  mode: 'full' | 'single_field';
  field?: GuidedRouteFillFieldKey;
  existingPreview?: GuidedRouteFillPreview;
  currentRouteMode?: RouteMode;
  transportCurrencyMode?: 'eur_only' | 'local_and_eur';
};

export type GuidedRouteFillSuccess = {
  ok: true;
  preview: GuidedRouteFillPreview;
};

export type GuidedRouteFillErrorCode =
  | 'unauthorized'
  | 'not_configured'
  | 'rate_limited'
  | 'invalid_input'
  | 'provider_error';

export type GuidedRouteFillResult =
  | GuidedRouteFillSuccess
  | { ok: false; error: GuidedRouteFillErrorCode };
