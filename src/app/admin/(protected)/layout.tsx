import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '../lib/adminSession';

import { loadCityPackRegistryFromDb } from '@/entities/city-pack/server';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login?next=/admin/tenants');
  }

  await loadCityPackRegistryFromDb();

  return children;
}
