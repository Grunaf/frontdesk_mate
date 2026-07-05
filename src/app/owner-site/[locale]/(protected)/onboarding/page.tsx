import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { redirect } from 'next/navigation';

interface OwnerOnboardingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerOnboardingPage({ params }: OwnerOnboardingPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (context) {
    redirect(`/${locale}/setup`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create your hostel</h1>
      <p className="text-sm text-muted-foreground">
        You are signed in. Self-service hostel creation and city pack selection ship in Module 3.
      </p>
      <p className="text-xs text-muted-foreground">Locale: {locale}</p>
      <form action={`/${locale}/auth/logout`} method="post">
        <button type="submit" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
