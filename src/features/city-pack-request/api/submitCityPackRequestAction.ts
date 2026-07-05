'use server';

import { assertOwnerAuthenticated, getOwnerTenantContext } from '@/entities/hostel-owner';
import {
  hasPendingDuplicateCityPackRequest,
  insertCityPackRequest,
  resolveRelatedCityPackId,
} from '@/entities/city-pack-request';
import { redirect } from 'next/navigation';
import { normalizeCityPackRequestInput } from '../lib/normalizeCityPackRequestInput';

export type CityPackRequestFormState = {
  error: 'validation' | 'duplicate' | 'save' | null;
};

export async function submitCityPackRequestAction(
  locale: string,
  _prevState: CityPackRequestFormState,
  formData: FormData
): Promise<CityPackRequestFormState> {
  const session = await assertOwnerAuthenticated().catch(() => null);
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const normalized = normalizeCityPackRequestInput({
    cityName: String(formData.get('cityName') ?? ''),
    countryOrRegion: String(formData.get('countryOrRegion') ?? ''),
    requestKind: String(formData.get('requestKind') ?? ''),
    message: String(formData.get('message') ?? ''),
  });

  if (!normalized.ok) {
    return { error: 'validation' };
  }

  const packQuery = String(formData.get('relatedCityPackId') ?? '').trim();
  const relatedCityPackId = await resolveRelatedCityPackId(packQuery);

  const duplicate = await hasPendingDuplicateCityPackRequest(session.id, normalized.data.cityName);
  if (duplicate) {
    return { error: 'duplicate' };
  }

  const context = await getOwnerTenantContext();

  const insertResult = await insertCityPackRequest({
    userId: session.id,
    tenantId: context?.tenantId ?? null,
    kind: normalized.data.requestKind,
    cityName: normalized.data.cityName,
    countryOrRegion: normalized.data.countryOrRegion,
    message: normalized.data.message,
    relatedCityPackId,
  });

  if (!insertResult.ok) {
    return { error: 'save' };
  }

  redirect(`/${locale}/city-request?submitted=1`);
}
