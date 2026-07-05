import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { redirect } from 'next/navigation';

interface OwnerSetupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSetupPage({ params }: OwnerSetupPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Setup</h1>
      <p className="text-sm text-muted-foreground">
        Launch wizard for <span className="font-medium text-foreground">{context.name}</span> (
        {context.slug}) — Module 3+.
      </p>
      <form action={`/${locale}/auth/logout`} method="post">
        <button type="submit" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
