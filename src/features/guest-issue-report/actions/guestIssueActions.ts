'use server';

import { revalidatePath } from 'next/cache';
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
import {
  assertReceptionCheckInAccess,
  resolveReceptionStaffContext,
} from '@/features/guest-registration/lib/resolveReceptionStaffContext';

async function requireReceptionCheckIn(tenantSlug: string) {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) return staff;
  const gate = assertReceptionCheckInAccess(staff.ctx);
  if (!gate.ok) return gate;
  return staff;
}

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
  const staff = await requireReceptionCheckIn(tenantSlug);
  if (!staff.ok) return [];

  return listGuestIssues(tenantSlug, filter);
}

export async function countOpenGuestIssuesAction(tenantSlug: string): Promise<number> {
  const staff = await requireReceptionCheckIn(tenantSlug);
  if (!staff.ok) return 0;

  return countOpenGuestIssues(tenantSlug);
}

export async function resolveGuestIssueAction(input: {
  tenantSlug: string;
  issueId: string;
}): Promise<ResolveGuestIssueResult> {
  const staff = await requireReceptionCheckIn(input.tenantSlug);
  if (!staff.ok) {
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
