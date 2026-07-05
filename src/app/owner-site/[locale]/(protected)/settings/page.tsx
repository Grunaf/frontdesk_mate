import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { redirect } from 'next/navigation';

interface OwnerSettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSettingsPage({ params }: OwnerSettingsPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">Hostel settings editor — Module 7+.</p>
    </div>
  );
}
