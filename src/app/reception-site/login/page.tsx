import { redirect } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { isReceptionAuthenticated, isReceptionSessionSecretConfigured } from '@/app/reception/lib/receptionSession';
import { ReceptionUnknownHostelContent } from '@/views/reception/ui/ReceptionUnknownHostelContent';

interface ReceptionLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ReceptionLoginPage({ searchParams }: ReceptionLoginPageProps) {
  const { error } = await searchParams;
  const tenantSlug = await resolveTenantSlug();

  if (!tenantSlug) {
    return (
      <div className="mx-auto max-w-sm space-y-3 py-12 text-center">
        <h1 className="text-lg font-semibold">Reception sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your hostel reception link, e.g.{' '}
          <code className="text-xs">yourhostel.reception.domain</code>.
        </p>
      </div>
    );
  }

  if (await isReceptionAuthenticated(tenantSlug)) {
    redirect('/');
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return <ReceptionUnknownHostelContent />;
  }

  const secretConfigured = isReceptionSessionSecretConfigured();
  const formDisabled = !secretConfigured;

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">{tenant.name}</h2>
        <p className="text-sm text-muted-foreground">Sign in with your staff login and PIN.</p>
      </div>

      {!secretConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="text-xs">RECEPTION_SESSION_SECRET</code> or{' '}
          <code className="text-xs">ADMIN_SECRET</code> in <code className="text-xs">.env.local</code>.
        </p>
      )}

      {error === 'invalid_credentials' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Wrong login or PIN. Try again.
        </p>
      )}

      {error === 'user_disabled' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          This staff account is disabled. Contact your manager.
        </p>
      )}

      {error === 'rate_limited' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Too many attempts. Wait about 15 minutes and try again.
        </p>
      )}

      {error === 'no_tenant' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Hostel not found for this reception URL.
        </p>
      )}

      <form
        method="POST"
        action="/api/reception/login"
        className="space-y-4 rounded-xl border bg-background p-6"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Login</span>
          <input
            name="login"
            type="text"
            autoComplete="username"
            required
            disabled={formDisabled}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">PIN</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            disabled={formDisabled}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={formDisabled}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
