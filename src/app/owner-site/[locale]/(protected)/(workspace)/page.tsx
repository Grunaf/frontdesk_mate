import { redirect } from 'next/navigation';
import { getOwnerTenantContext } from '@/entities/hostel-owner';

interface OwnerHomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerHomePage({ params }: OwnerHomePageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  redirect(`/${locale}/setup`);
}
