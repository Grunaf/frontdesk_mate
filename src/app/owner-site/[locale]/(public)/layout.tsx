import { redirect } from 'next/navigation';
import { getOwnerSession } from '@/entities/hostel-owner';

interface OwnerPublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerPublicLayout({ children, params }: OwnerPublicLayoutProps) {
  const { locale } = await params;
  const session = await getOwnerSession();

  if (session) {
    redirect(`/${locale}`);
  }

  return children;
}
