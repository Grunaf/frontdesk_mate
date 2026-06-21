import { redirect } from 'next/navigation';
import { getTenantConfig, resolveTenantSlug } from '@/entities/tenant/server';
import { isReceptionAuthenticated, isReceptionSessionSecretConfigured } from '@/app/reception/lib/receptionSession';
import { isDeskPinConfigured } from '@/app/reception/lib/deskPin';
import { loginReceptionAction } from '@/app/reception/actions';

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

  const tenant = await getTenantConfig();
  const pinConfigured = isDeskPinConfigured(tenant?.settings.reception?.deskPinHash);
  const secretConfigured = isReceptionSessionSecretConfigured();

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">{tenant?.name ?? tenantSlug}</h2>
        <p className="text-sm text-muted-foreground">Enter your reception desk PIN.</p>
      </div>

      {!secretConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="text-xs">RECEPTION_SESSION_SECRET</code> or{' '}
          <code className="text-xs">ADMIN_SECRET</code> in <code className="text-xs">.env.local</code>.
        </p>
      )}

      {!pinConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Reception desk PIN is not configured yet. Set it in SaaS admin → Contacts & reception.
        </p>
      )}

      {error === 'invalid_pin' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Wrong PIN. Try again.
        </p>
      )}

      {error === 'pin_not_configured' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Desk PIN is not set for this hostel.
        </p>
      )}

      <form action={loginReceptionAction} className="space-y-4 rounded-xl border bg-background p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Desk PIN</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            disabled={!secretConfigured || !pinConfigured}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!secretConfigured || !pinConfigured}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
