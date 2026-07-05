import type {
  ArrivalAccessPlan,
  ArrivalAccessStep,
  ArrivalBannerKeys,
  ArrivalLandmark,
} from '@/entities/tenant';

/** Matches `FindHostelSection` / `sections.find.*` banner keys. */
export const DOOR_ACCESS_LANDMARK_BANNER: ArrivalBannerKeys = {
  titleKey: 'sections.find.title',
  bannerKey: 'sections.find.banner',
  hasIcon: false,
};

export type DoorAccessSlideMedia = 'photo' | 'text';

export type DoorAccessLandmarkSlide = {
  kind: 'landmark';
  landmark: ArrivalLandmark;
  banner: ArrivalBannerKeys;
};

export type DoorAccessAccessSlide = {
  kind: 'access';
  step: ArrivalAccessStep;
  media: DoorAccessSlideMedia;
};

export type DoorAccessSlide = DoorAccessLandmarkSlide | DoorAccessAccessSlide;

export interface BuildDoorAccessSlidesFlags {
  isNightMode: boolean;
}

export interface DoorAccessSlidesResult {
  slides: DoorAccessSlide[];
  /** Day or night section banner; not repeated on each slide. */
  sectionBanner: ArrivalBannerKeys | null;
}

/**
 * Night: always `plan.nightAccess.steps` (same as `plan.steps` when `isNightMode`).
 * Day: `plan.dayAccess.steps` (guide/photo filter), not raw `plan.steps`.
 */
function resolveAccessSteps(plan: ArrivalAccessPlan, isNightMode: boolean): ArrivalAccessStep[] {
  if (isNightMode) {
    return plan.nightAccess?.steps ?? plan.steps;
  }
  return plan.dayAccess?.steps ?? plan.steps;
}

function resolveSectionBanner(plan: ArrivalAccessPlan, isNightMode: boolean): ArrivalBannerKeys | null {
  if (isNightMode) {
    return plan.nightAccess?.banner ?? null;
  }
  return plan.dayAccess?.banner ?? null;
}

function resolveAccessSlideMedia(step: ArrivalAccessStep, isNightMode: boolean): DoorAccessSlideMedia | null {
  if (step.imageSrc) return 'photo';
  if (step.guideKey) return 'text';
  if (isNightMode && (step.code || step.showCode || step.missingCode)) return 'text';
  return null;
}

export function buildDoorAccessSlides(
  plan: ArrivalAccessPlan,
  flags: BuildDoorAccessSlidesFlags
): DoorAccessSlidesResult {
  const { isNightMode } = flags;
  const slides: DoorAccessSlide[] = [];

  if (plan.landmark) {
    slides.push({
      kind: 'landmark',
      landmark: plan.landmark,
      banner: DOOR_ACCESS_LANDMARK_BANNER,
    });
  }

  for (const step of resolveAccessSteps(plan, isNightMode)) {
    const media = resolveAccessSlideMedia(step, isNightMode);
    if (!media) continue;
    slides.push({ kind: 'access', step, media });
  }

  return {
    slides,
    sectionBanner: resolveSectionBanner(plan, isNightMode),
  };
}
