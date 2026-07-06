import { redirect } from 'next/navigation';
import { adminTenantSettingsDefaultPath } from '../../lib/adminSections';

interface AdminTenantSettingsIndexProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminTenantSettingsIndexPage({ params }: AdminTenantSettingsIndexProps) {
  const { slug } = await params;
  redirect(adminTenantSettingsDefaultPath(slug));
}
