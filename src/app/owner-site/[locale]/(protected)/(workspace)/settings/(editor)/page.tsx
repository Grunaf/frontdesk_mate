import { redirect } from 'next/navigation';
import { ownerSettingsDefaultPath } from '@/features/owner-settings/lib/ownerSettingsSections';

interface OwnerSettingsIndexPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function OwnerSettingsIndexPage({
  params,
  searchParams,
}: OwnerSettingsIndexPageProps) {
  const { locale } = await params;
  const { saved } = await searchParams;
  const base = ownerSettingsDefaultPath(locale);
  redirect(saved === '1' ? `${base}?saved=1` : base);
}
