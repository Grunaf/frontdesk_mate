'use server';

import { revalidatePath } from 'next/cache';
import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import {
  countOpenGuestIssues,
  createGuestIssue,
  listGuestIssues,
  resolveGuestIssue,
} from '@/entities/guest-issue/server';
import type {
  CreateGuestIssueResult,
  GuestIssueCategory,
  GuestIssueRecord,
  ListGuestIssuesFilter,
  ResolveGuestIssueResult,
} from '@/entities/guest-issue/server';

export async function createGuestIssueAction(input: {
  tenantSlug: string;
  stayId: string;
  category: GuestIssueCategory;
  note?: string;
}): Promise<CreateGuestIssueResult> {
  try {
    return await createGuestIssue(input);
  } catch (error) {
    console.error('createGuestIssueAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}

export async function listGuestIssuesAction(
  tenantSlug: string,
  filter: ListGuestIssuesFilter
): Promise<GuestIssueRecord[]> {
  try {
    await assertReceptionAuthenticated(tenantSlug);
  } catch {
    return [];
  }

  return listGuestIssues(tenantSlug, filter);
}

export async function countOpenGuestIssuesAction(tenantSlug: string): Promise<number> {
  try {
    await assertReceptionAuthenticated(tenantSlug);
  } catch {
    return 0;
  }

  return countOpenGuestIssues(tenantSlug);
}

export async function resolveGuestIssueAction(input: {
  tenantSlug: string;
  issueId: string;
}): Promise<ResolveGuestIssueResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const result = await resolveGuestIssue(input);
    if (result.ok) {
      revalidatePath('/');
    }
    return result;
  } catch (error) {
    console.error('resolveGuestIssueAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
