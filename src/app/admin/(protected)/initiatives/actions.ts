'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  CreateInitiativeInput,
  InitiativeListInput,
  InitiativeMutationResult,
  RecalculateInitiativesInput,
  UpdateInitiativePatch,
} from '@/entities/initiative';
import {
  createInitiative,
  listInitiatives,
  markInitiativeReviewed,
  recalculateInitiativesStale,
  toInitiativeErrorPayload,
  updateInitiative,
} from '@/entities/initiative/server';
import { assertAdminAuthenticated } from '../../lib/adminSession';

interface InitiativeActionSuccess<T> {
  ok: true;
  data: T;
}

interface InitiativeActionFailure {
  ok: false;
  error: ReturnType<typeof toInitiativeErrorPayload>;
}

type InitiativeActionResult<T> = InitiativeActionSuccess<T> | InitiativeActionFailure;

export async function listInitiativesAction(
  input: InitiativeListInput = {}
): Promise<InitiativeActionResult<Awaited<ReturnType<typeof listInitiatives>>>> {
  await assertAdminAuthenticated();
  try {
    const data = await listInitiatives(input);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function createInitiativeAction(
  input: CreateInitiativeInput
): Promise<InitiativeActionResult<InitiativeMutationResult>> {
  await assertAdminAuthenticated();
  try {
    const data = await createInitiative(input);
    revalidatePath('/admin/initiatives');
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function updateInitiativeAction(
  id: string,
  patch: UpdateInitiativePatch
): Promise<InitiativeActionResult<InitiativeMutationResult>> {
  await assertAdminAuthenticated();
  try {
    const data = await updateInitiative(id, patch);
    revalidatePath('/admin/initiatives');
    revalidatePath(`/admin/initiatives/${id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function markInitiativeReviewedAction(
  id: string
): Promise<InitiativeActionResult<Awaited<ReturnType<typeof markInitiativeReviewed>>>> {
  await assertAdminAuthenticated();
  try {
    const data = await markInitiativeReviewed(id);
    revalidatePath('/admin/initiatives');
    revalidatePath(`/admin/initiatives/${id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function recalculateInitiativesStaleAction(
  input: RecalculateInitiativesInput = {}
): Promise<InitiativeActionResult<Awaited<ReturnType<typeof recalculateInitiativesStale>>>> {
  await assertAdminAuthenticated();
  try {
    const data = await recalculateInitiativesStale(input);
    revalidatePath('/admin/initiatives');
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toInitiativeErrorPayload(error) };
  }
}

export async function recalculateInitiativesAction() {
  await assertAdminAuthenticated();
  await recalculateInitiativesStale();
  revalidatePath('/admin/initiatives');
}

export async function markInitiativeAsReviewedAction(formData: FormData) {
  await assertAdminAuthenticated();

  const id = String(formData.get('id') || '').trim();
  if (!id) {
    redirect('/admin/initiatives?error=missing-id');
  }

  const result = await markInitiativeReviewedAction(id);
  if (!result.ok) {
    redirect(`/admin/initiatives/${id}?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath('/admin/initiatives');
  revalidatePath(`/admin/initiatives/${id}`);
  redirect(`/admin/initiatives/${id}?saved=1`);
}
