import { getOwnerSession, getOwnerTenantContext } from '@/entities/hostel-owner';
import { OwnerTenantFormDraftBoundary } from '@/features/owner-settings';
import { OwnerPortalShell } from '@/features/owner-shell';
import { redirect } from 'next/navigation';

interface OwnerProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerProtectedLayout({ children, params }: OwnerProtectedLayoutProps) {
  const { locale } = await params;
  const session = await getOwnerSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const context = await getOwnerTenantContext();
  if (!context) {
    return children;
  }

  return (
    <OwnerPortalShell locale={locale} context={context}>
      <OwnerTenantFormDraftBoundary>{children}</OwnerTenantFormDraftBoundary>
    </OwnerPortalShell>
  );
}
