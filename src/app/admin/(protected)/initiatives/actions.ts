'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { markInitiativeAsReviewed, recalculateInitiativesForAdmin } from '@/entities/initiative/server';
import { assertAdminAuthenticated } from '../../lib/adminSession';

export async function recalculateInitiativesAction() {
  await assertAdminAuthenticated();
  await recalculateInitiativesForAdmin();
  revalidatePath('/admin/initiatives');
}

export async function markInitiativeAsReviewedAction(formData: FormData) {
  await assertAdminAuthenticated();

  const id = String(formData.get('id') || '').trim();
  if (!id) {
    redirect('/admin/initiatives?error=missing-id');
  }

  const result = await markInitiativeAsReviewed(id);
  if (!result.ok) {
    redirect(`/admin/initiatives/${id}?error=${encodeURIComponent(result.error ?? 'save-failed')}`);
  }

  revalidatePath('/admin/initiatives');
  revalidatePath(`/admin/initiatives/${id}`);
  redirect(`/admin/initiatives/${id}?saved=1`);
}
