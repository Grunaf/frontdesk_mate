import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loginDevPanelAction } from '../actions';
import { isDevPanelAuthenticated, isDevPanelSecretConfigured } from '../lib/devPanelSession';
import { assertDevPanelAvailable } from '../lib/guardDevPanel';

interface DevPanelLoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function DevPanelLoginPage({ searchParams }: DevPanelLoginPageProps) {
  assertDevPanelAvailable();

  const { error, next } = await searchParams;

  if (await isDevPanelAuthenticated()) {
    redirect(next?.startsWith('/dev-panel') ? next : '/dev-panel');
  }

  const secretConfigured = isDevPanelSecretConfigured();

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-12">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Dev panel</h2>
        <p className="text-sm text-muted-foreground">Development diagnostics only.</p>
      </div>

      {!secretConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="text-xs">DEV_PANEL_SECRET</code> or{' '}
          <code className="text-xs">ADMIN_SECRET</code> in <code className="text-xs">.env.local</code>.
        </p>
      )}

      {error === '1' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Wrong password.
        </p>
      )}

      <form action={loginDevPanelAction} className="space-y-4 rounded-xl border bg-background p-6">
        <input type="hidden" name="next" value={next ?? '/dev-panel'} />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={!secretConfigured}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!secretConfigured}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Sign in
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Back to app
        </Link>
      </p>
    </div>
  );
}
