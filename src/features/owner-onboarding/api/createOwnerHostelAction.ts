'use server';

import { createOwnerTenant } from '@/entities/hostel-owner/server/createOwnerTenant';
import { redirect } from 'next/navigation';

export type CreateOwnerHostelFormState = {
  error: string | null;
};

export async function createOwnerHostelAction(
  locale: string,
  _prevState: CreateOwnerHostelFormState,
  formData: FormData
): Promise<CreateOwnerHostelFormState> {
  const name = String(formData.get('name') ?? '');
  const slugRaw = String(formData.get('slug') ?? '');
  const cityPackId = String(formData.get('cityPackId') ?? '');

  const result = await createOwnerTenant({
    name,
    slugRaw,
    cityPackId,
    locale,
  });

  if (!result.ok) {
    return { error: result.message };
  }

  redirect(`/${locale}/setup`);
}
