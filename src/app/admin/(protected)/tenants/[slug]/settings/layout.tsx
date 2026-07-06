import Link from 'next/link';
import { Suspense } from 'react';
import { TenantForm } from '../../TenantForm';
import { loadTenantAdminFormData } from '../../lib/loadTenantAdminFormData';
import { isSupabaseAdminConfigured } from '@/shared/lib/db/admin';

interface AdminTenantSettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminTenantSettingsLayout({
  children,
  params,
}: AdminTenantSettingsLayoutProps) {
  const { slug } = await params;
  const adminWriteReady = isSupabaseAdminConfigured();
  const { isNew, tenant, cityPackOptions, cityPackGateSnapshot, cityPackContentsById, initial } =
    await loadTenantAdminFormData(slug);

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{isNew ? 'New tenant' : `Edit: ${slug}`}</h2>
        {!isNew ? (
          <p className="text-sm text-muted-foreground">
            Subscription and city pack are edited here. Settings and guest access use the command bar in
            the form.
          </p>
        ) : null}
      </div>

      {!adminWriteReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="text-xs">SUPABASE_SECRET_KEY</code> to <code className="text-xs">.env.local</code>{' '}
          (Supabase → Settings → API → Secret key, no <code className="text-xs">NEXT_PUBLIC_</code>) and restart{' '}
          <code className="text-xs">npm run dev</code> — otherwise Save will fail.
        </p>
      )}

      {!isNew && !tenant && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tenant not found in database. You can create it with this slug below.
        </p>
      )}

      {!isNew && tenant ? (
        <p className="text-sm">
          <Link
            href={`/admin/tenants/${tenant.slug}/owner`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Owner & activity
          </Link>
          <span className="text-muted-foreground"> — self-service account and save history</span>
        </p>
      ) : null}

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tenant form…</p>}>
        <TenantForm
          originalSlug={isNew ? '' : slug}
          cityPackOptions={cityPackOptions}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContentsById={cityPackContentsById}
          initial={initial}
        />
      </Suspense>
      {children}
    </div>
  );
}
