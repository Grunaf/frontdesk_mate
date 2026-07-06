import Link from 'next/link';
import { logoutAdminAction } from './actions';
import { isAdminAuthenticated } from './lib/adminSession';
import { AdminShellBackground } from './ui/AdminShellBackground';
import { countPendingCityPackRequestsForAdmin } from '@/features/city-pack-request/server/listCityPackRequestsForAdmin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = await isAdminAuthenticated();
  const pendingRequests = isAuthenticated ? await countPendingCityPackRequestsForAdmin() : 0;
  const pendingBadge =
    pendingRequests > 0 ? (pendingRequests > 9 ? '9+' : String(pendingRequests)) : null;

  return (
    <>
      <AdminShellBackground />
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
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
                <Link
                  href="/admin/city-pack-requests"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  City requests
                  {pendingBadge ? (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {pendingBadge}
                    </span>
                  ) : null}
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
      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-6 pt-8 pb-4">{children}</main>
    </>
  );
}
