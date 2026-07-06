import { redirect } from 'next/navigation';
import { adminTenantSettingsDefaultPath } from '../lib/adminSections';

interface AdminTenantPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminTenantPage({ params, searchParams }: AdminTenantPageProps) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const base = adminTenantSettingsDefaultPath(slug);
  redirect(saved === '1' ? `${base}?saved=1` : base);
}
