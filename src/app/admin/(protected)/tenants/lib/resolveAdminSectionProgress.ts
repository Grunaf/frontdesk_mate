import type { AdminSectionId } from './adminSections';
import {
  resolveTenantReadiness,
  type TenantReadinessInput,
} from '@/entities/tenant/lib/resolveTenantReadiness';

export interface AdminSectionGuestProgress {
  complete: number;
  total: number;
}

export function getAdminSectionGuestProgress(
  sectionId: AdminSectionId,
  input: TenantReadinessInput
): AdminSectionGuestProgress | null {
  const items = resolveTenantReadiness(input).filter((entry) => entry.sectionId === sectionId);

  if (items.length === 0) {
    return null;
  }

  const complete = items.filter((entry) => entry.status === 'complete').length;

  return {
    complete,
    total: items.length,
  };
}

export function formatAdminSectionGuestProgress(progress: AdminSectionGuestProgress): string {
  return `${progress.complete}/${progress.total} for guests`;
}
