import { OwnerLoginForm } from '@/features/owner-auth';

interface OwnerLoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerLoginPage({ params }: OwnerLoginPageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Owner portal for your hostel.</p>
      </div>
      <OwnerLoginForm locale={locale} />
    </div>
  );
}
