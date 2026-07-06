import { notFound } from 'next/navigation';
import { normalizeAdminSectionId } from '../../../lib/adminSections';

interface AdminTenantSettingsSectionPageProps {
  params: Promise<{ slug: string; sectionId: string }>;
}

export default async function AdminTenantSettingsSectionPage({ params }: AdminTenantSettingsSectionPageProps) {
  const { sectionId } = await params;
  if (!normalizeAdminSectionId(sectionId)) {
    notFound();
  }
  return null;
}
