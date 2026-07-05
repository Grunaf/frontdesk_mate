import { isCityPackId } from '@/entities/hostel';
import { normalizeTenantSlugInput } from '@/shared/config';

const RESERVED_TENANT_SLUGS = new Set(['www', 'admin', 'app', 'reception', 'dashboard']);

export type ValidateTenantSlugFailureCode = 'empty' | 'invalid_format' | 'reserved';

export type ValidateTenantSlugResult =
  | { ok: true; slug: string }
  | { ok: false; code: ValidateTenantSlugFailureCode };

export function isReservedTenantSlug(slug: string): boolean {
  const normalized = normalizeTenantSlugInput(slug);
  const firstLabel = normalized.split('.')[0] ?? normalized;
  return RESERVED_TENANT_SLUGS.has(firstLabel);
}

export function validateTenantSlugInput(raw: string): ValidateTenantSlugResult {
  const slug = normalizeTenantSlugInput(raw);

  if (!slug) {
    return { ok: false, code: 'empty' };
  }

  if (!isCityPackId(slug)) {
    return { ok: false, code: 'invalid_format' };
  }

  if (isReservedTenantSlug(slug)) {
    return { ok: false, code: 'reserved' };
  }

  return { ok: true, slug };
}

export function tenantSlugValidationMessage(code: ValidateTenantSlugFailureCode): string {
  switch (code) {
    case 'empty':
      return 'Slug is required.';
    case 'invalid_format':
      return 'Use lowercase letters, numbers, and hyphens (2–49 characters, start with a letter).';
    case 'reserved':
      return 'This slug is reserved. Choose another.';
    default:
      return 'Invalid slug.';
  }
}
