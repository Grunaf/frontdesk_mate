import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '../lib/adminSession';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login?next=/admin/tenants');
  }

  return children;
}
