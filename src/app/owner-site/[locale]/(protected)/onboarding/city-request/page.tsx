import { redirect } from 'next/navigation';

interface OwnerCityRequestRedirectPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pack?: string }>;
}

export default async function OwnerCityRequestRedirectPage({
  params,
  searchParams,
}: OwnerCityRequestRedirectPageProps) {
  const { locale } = await params;
  const { pack } = await searchParams;
  const query = typeof pack === 'string' && pack.trim() ? `?pack=${encodeURIComponent(pack.trim())}` : '';
  redirect(`/${locale}/city-request${query}`);
}
