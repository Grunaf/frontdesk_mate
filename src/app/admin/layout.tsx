import Link from 'next/link';
import { logoutAdminAction } from './actions';
import { isAdminAuthenticated } from './lib/adminSession';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = await isAdminAuthenticated();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal</p>
            <h1 className="text-lg font-semibold">Frontdesk Mate Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:text-foreground">
                  Tenants
                </Link>
                <Link href="/admin/city-packs" className="text-sm text-muted-foreground hover:text-foreground">
                  City packs
                </Link>
                <form action={logoutAdminAction}>
                  <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                    Sign out
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
