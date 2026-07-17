import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { OwnerTenantFormDraftBoundary } from '@/features/owner-settings';
import { OwnerPortalShell } from '@/features/owner-shell';

interface OwnerWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerWorkspaceLayout({
  children,
  params,
}: OwnerWorkspaceLayoutProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    return children;
  }

  return (
    <OwnerPortalShell locale={locale} context={context} chrome="full">
      <OwnerTenantFormDraftBoundary>{children}</OwnerTenantFormDraftBoundary>
    </OwnerPortalShell>
  );
}
