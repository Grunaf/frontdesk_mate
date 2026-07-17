import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { OwnerPortalShell } from '@/features/owner-shell';
import { redirect } from 'next/navigation';

interface OwnerOpsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerOpsLayout({ children, params }: OwnerOpsLayoutProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <OwnerPortalShell locale={locale} context={context} chrome="minimal">
      {children}
    </OwnerPortalShell>
  );
}
