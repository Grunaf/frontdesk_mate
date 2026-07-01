import { TenantNotFoundView } from '@/views/platform/ui/TenantNotFoundView';

interface AppTenantNotFoundProps {
  params: Promise<{ locale: string }>;
}

export default async function AppTenantNotFound({ params }: AppTenantNotFoundProps) {
  const { locale } = await params;

  return <TenantNotFoundView site="app" locale={locale} />;
}
