import { notFound } from 'next/navigation';
import { normalizeOwnerSettingsSectionId } from '@/features/owner-settings/lib/ownerSettingsSections';

interface OwnerSettingsSectionPageProps {
  params: Promise<{ locale: string; sectionId: string }>;
}

export default async function OwnerSettingsSectionPage({ params }: OwnerSettingsSectionPageProps) {
  const { sectionId } = await params;
  if (!normalizeOwnerSettingsSectionId(sectionId)) {
    notFound();
  }
  return null;
}
