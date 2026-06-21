import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loginAdminAction } from '../actions';
import { isAdminAuthenticated, isAdminSecretConfigured } from '../lib/adminSession';

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error, next } = await searchParams;

  if (await isAdminAuthenticated()) {
    redirect(next?.startsWith('/admin') ? next : '/admin/tenants');
  }

  const secretConfigured = isAdminSecretConfigured();

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-12">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Admin sign in</h2>
        <p className="text-sm text-muted-foreground">Session lasts 7 days on this browser.</p>
      </div>

      {!secretConfigured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="text-xs">ADMIN_SECRET</code> in <code className="text-xs">.env.local</code> and
          restart dev.
        </p>
      )}

      {error === '1' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Wrong password. Try again.
        </p>
      )}

      <form action={loginAdminAction} className="space-y-4 rounded-xl border bg-background p-6">
        <input type="hidden" name="next" value={next ?? '/admin/tenants'} />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Admin password</span>
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
