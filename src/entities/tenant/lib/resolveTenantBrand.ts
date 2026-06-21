export type TenantBrandResolved =
  | { kind: 'logo'; src: string; alt: string }
  | { kind: 'name'; name: string };

export function resolveTenantBrand(input: {
  name?: string | null;
  logoUrl?: string | null;
}): TenantBrandResolved {
  const logoUrl = input.logoUrl?.trim();
  const displayName = input.name?.trim() || 'Hostel';

  if (logoUrl) {
    return { kind: 'logo', src: logoUrl, alt: displayName };
  }

  return { kind: 'name', name: displayName };
}
