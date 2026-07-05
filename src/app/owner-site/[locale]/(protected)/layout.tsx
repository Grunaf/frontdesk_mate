import { redirect } from 'next/navigation';
import { getOwnerSession } from '@/entities/hostel-owner';

interface OwnerProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerProtectedLayout({ children, params }: OwnerProtectedLayoutProps) {
  const { locale } = await params;
  const session = await getOwnerSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return children;
}
