import { permanentRedirect } from 'next/navigation';

interface LegacyOwnerActivityRedirectProps {
  params: Promise<{ locale: string }>;
}

export default async function LegacyOwnerActivityRedirect({
  params,
}: LegacyOwnerActivityRedirectProps) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/activity`);
}
