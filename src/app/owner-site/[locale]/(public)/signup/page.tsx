import { Suspense } from 'react';
import { OwnerSignupForm } from '@/features/owner-auth';

interface OwnerSignupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSignupPage({ params }: OwnerSignupPageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">Register as a hostel owner.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <OwnerSignupForm locale={locale} />
      </Suspense>
    </div>
  );
}
