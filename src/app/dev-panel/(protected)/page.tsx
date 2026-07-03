import Link from 'next/link';
import { logoutDevPanelAction } from '../actions';
import { type DevPanelEnvRow } from '../lib/buildDevPanelEnvRows';
import { collectDevPanelSnapshot } from '../lib/collectDevPanelSnapshot';
import { DevPanelProductMap } from '../ui/DevPanelProductMap';

function envStatusLabel(row: DevPanelEnvRow): string {
  if (row.effective === 'set') return 'set';
  if (row.effective === 'fallback') return 'fallback';
  return 'missing';
}

function envStatusClass(row: DevPanelEnvRow): string {
  if (row.effective === 'set') return 'text-emerald-700';
  if (row.effective === 'fallback') return 'text-amber-700';
  return 'text-red-700';
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      aria-hidden
    />
  );
}

function moduleStatusClass(status: string): string {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-900';
  if (status === 'preview') return 'bg-amber-100 text-amber-900';
  return 'bg-muted text-muted-foreground';
}

export default async function DevPanelPage() {
  const snapshot = await collectDevPanelSnapshot();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dev panel
          </p>
          <h1 className="text-2xl font-semibold">Runtime diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Tenant <code className="text-xs">{snapshot.devTenantSlug}</code> ·{' '}
            {snapshot.routingMode} · updated {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </div>
        <form action={logoutDevPanelAction}>
          <button
            type="submit"
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <h2 className="text-sm font-semibold">Environment</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {snapshot.envRows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <code className="text-xs">{row.key}</code>
                {row.note ? (
                  <p className="text-xs text-muted-foreground">{row.note}</p>
                ) : null}
              </div>
              <span className={`shrink-0 ${envStatusClass(row)}`}>{envStatusLabel(row)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Edit tenant settings in{' '}
          <Link href={snapshot.adminEditUrl} className="font-medium text-primary hover:underline">
            admin → {snapshot.devTenantSlug}
          </Link>{' '}
          (not here).
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <h2 className="text-sm font-semibold">Live checks</h2>
        <ul className="space-y-2">
          {snapshot.checks.map((check) => (
            <li
              key={check.id}
              className="flex flex-wrap items-start gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <StatusDot ok={check.ok} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <h2 className="text-sm font-semibold">Guest app modules</h2>
        <ul className="space-y-2">
          {snapshot.modules.map((module) => (
            <li
              key={module.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{module.label}</p>
                {module.detail ? (
                  <p className="text-xs text-muted-foreground">{module.detail}</p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${moduleStatusClass(module.status)}`}
              >
                {module.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <DevPanelProductMap />

      <section className="space-y-3 rounded-xl border bg-background p-4">
        <h2 className="text-sm font-semibold">Quick links</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href={snapshot.adminEditUrl} className="text-primary hover:underline">
              Admin tenant editor
            </Link>
          </li>
          <li>
            <Link href="/admin/tenants" className="text-primary hover:underline">
              All tenants
            </Link>
          </li>
          <li>
            <Link href="/admin/city-packs" className="text-primary hover:underline">
              City packs
            </Link>
          </li>
          <li>
            <Link href="/reception-site/login" className="text-primary hover:underline">
              Reception desk login
            </Link>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run snapshot</code>
            <span className="text-muted-foreground"> → CONTEXT_SNAPSHOT.md for AI</span>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run smoke</code>
            <span className="text-muted-foreground"> — Playwright P0 (see SMOKE.md)</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
