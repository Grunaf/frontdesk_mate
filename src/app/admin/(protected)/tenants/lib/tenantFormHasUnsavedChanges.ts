import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { diffTenantSettingsForAudit } from '@/entities/tenant/lib/diffTenantSettingsForAudit';
import { inferLaunchBookingPath } from '@/entities/tenant/lib/resolveGuestPathReadiness';
import { mergeDraftSettings, type TenantFormDraft } from '../ui/TenantFormDraftContext';

export interface TenantFormBaseline {
  slug: string;
  name: string;
  cityPackId: CityPackId;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  settings?: TenantSettings;
}

export function tenantFormHasUnsavedChanges(input: {
  baseline: TenantFormBaseline;
  identity: { slug: string; name: string; cityPackId: CityPackId };
  subscription: { subscriptionStartsAt: string; subscriptionEndsAt: string };
  draft: TenantFormDraft;
  receptionDeskPinInput?: string;
}): boolean {
  const { baseline, identity, subscription, draft, receptionDeskPinInput } = input;

  if (identity.slug !== baseline.slug) return true;
  if (identity.name !== baseline.name) return true;
  if (identity.cityPackId !== baseline.cityPackId) return true;
  if (subscription.subscriptionStartsAt !== baseline.subscriptionStartsAt) return true;
  if (subscription.subscriptionEndsAt !== baseline.subscriptionEndsAt) return true;

  if ((receptionDeskPinInput ?? '').trim().length > 0) return true;

  const baseSettings = mergeDraftSettings(baseline.settings ?? {}, {});
  const liveSettings = mergeDraftSettings(baseline.settings ?? {}, draft);
  const diff = diffTenantSettingsForAudit(baseSettings, liveSettings);
  if (diff.changedKeys.length > 0 || diff.deskPinChanged) {
    return true;
  }

  const basePath = inferLaunchBookingPath(baseSettings);
  const livePath = draft.launchBookingPath ?? inferLaunchBookingPath(liveSettings);
  if (basePath !== livePath) {
    return true;
  }

  return false;
}

export function clearReceptionDeskPinInputs(form: HTMLFormElement | null) {
  form?.querySelectorAll<HTMLInputElement>('input[name="receptionDeskPin"]').forEach((input) => {
    input.value = '';
  });
}
