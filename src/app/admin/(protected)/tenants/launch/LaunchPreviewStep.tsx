'use client';

import { ExternalLink } from 'lucide-react';
import { getTenantPublicUrl } from '@/shared/config';
import {
  resolveGuestPathGate,
  type GuestPathReadinessInput,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

interface LaunchPreviewStepProps {
  slug: string;
  lifecycleStatus: TenantLifecycleStatus;
  readinessInput: GuestPathReadinessInput;
}

export function LaunchPreviewStep({ slug, lifecycleStatus, readinessInput }: LaunchPreviewStepProps) {
  const gate = resolveGuestPathGate(readinessInput);
  const trimmedSlug = slug.trim();
  const landingUrl = trimmedSlug ? getTenantPublicUrl(trimmedSlug, 'landing', 'en') : null;
  const appUrl = trimmedSlug ? getTenantPublicUrl(trimmedSlug, 'app', 'en') : null;
  const isAppLive = lifecycleStatus === 'active';
  const isLandingLive =
    lifecycleStatus === 'active' || lifecycleStatus === 'expired' || lifecycleStatus === 'scheduled';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Release gate</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ready when every guest-path must item is complete.
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
            gate.ready ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
          )}
        >
          {gate.ready ? 'Ready for guests' : `${gate.incompleteMust.length} must left`}
        </span>
      </div>

      {gate.ready ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Guest path is ready — you can share the landing link before arrival. WiFi and door codes
          unlock after check-in.
        </p>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-950">Still blocking guests</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {gate.incompleteMust.map((item) => (
              <li key={item.id}>• {item.label}</li>
            ))}
          </ul>
        </div>
      )}

      {gate.incompleteOptional.length > 0 ? (
        <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Recommended improvements</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {gate.incompleteOptional.map((item) => (
              <li key={item.id}>• {item.label}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {trimmedSlug ? (
        <div className="space-y-2 rounded-xl border p-4">
          <p className="text-sm font-semibold">Preview links</p>
          <div className="flex flex-col gap-2 text-sm">
            {landingUrl ? (
              <PreviewLink href={landingUrl} label="Landing" offline={!isLandingLive} />
            ) : null}
            {appUrl ? (
              <PreviewLink href={appUrl} label="Guest app" offline={!isAppLive} />
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">Links open English preview in a new tab.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Set a slug in step 1 to generate preview links.</p>
      )}
    </div>
  );
}

function PreviewLink({
  href,
  label,
  offline,
}: {
  href: string;
  label: string;
  offline: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 hover:underline',
        offline ? 'text-amber-800' : 'text-foreground'
      )}
    >
      <span className="font-medium">{label}</span>
      <Icon icon={ExternalLink} className="size-3.5" />
      {offline ? <span className="text-[10px] uppercase tracking-wide">offline</span> : null}
    </a>
  );
}
