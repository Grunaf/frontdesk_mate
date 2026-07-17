'use server';

import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import {
  linkOwnerToTenant,
  type LinkOwnerToTenantResult,
} from '@/entities/hostel-owner/server/linkOwnerToTenant';

export type LinkTenantOwnerActionResult = LinkOwnerToTenantResult;

export async function linkTenantOwnerAction(input: {
  tenantId: string;
  email: string;
}): Promise<LinkTenantOwnerActionResult> {
  await assertAdminAuthenticated();
  return linkOwnerToTenant({
    tenantId: input.tenantId,
    email: input.email,
  });
}
