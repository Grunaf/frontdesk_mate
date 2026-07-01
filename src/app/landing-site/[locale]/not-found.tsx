import { TenantNotFoundView } from '@/views/platform/ui/TenantNotFoundView';

interface LandingTenantNotFoundProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingTenantNotFound({ params }: LandingTenantNotFoundProps) {
  const { locale } = await params;

  return <TenantNotFoundView site="landing" locale={locale} />;
}
