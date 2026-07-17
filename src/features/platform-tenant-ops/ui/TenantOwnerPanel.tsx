import type { TenantOwnerForAdmin } from '@/entities/hostel-owner/server/getTenantOwnerForAdmin';
import { LinkTenantOwnerForm } from './LinkTenantOwnerForm';

type TenantOwnerPanelProps = {
  tenantId: string;
  tenantSlug: string;
  owner: TenantOwnerForAdmin | null;
};

function formatLinkedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TenantOwnerPanel({ tenantId, tenantSlug, owner }: TenantOwnerPanelProps) {
  return (
    <section className="rounded-xl border bg-background p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Owner account</h3>
        <p className="text-xs text-muted-foreground">
          Self-service login linked to this hostel. Subscription and city pack assignment stay on this admin
          form only.
        </p>
      </div>

      {owner ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium">{owner.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Linked since</dt>
            <dd>{formatLinkedAt(owner.linkedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tenant</dt>
            <dd>
              {tenantSlug}{' '}
              <span className="text-muted-foreground text-xs">({tenantId})</span>
            </dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Self-service not linked — legacy or manual tenant. Assign an owner email below.
          </p>
          <LinkTenantOwnerForm tenantId={tenantId} />
        </div>
      )}
    </section>
  );
}
