import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { listInitiativesForAdmin } from '@/entities/initiative/server';
import { recalculateInitiativesAction } from './actions';
import {
  formatDateTime,
  PRIORITY_ORDER,
  PRIORITY_OPTIONS,
  resolveFreshnessBadge,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './ui/initiative-ui';

interface AdminInitiativesPageProps {
  searchParams: Promise<{
    stale?: string;
    priority?: string;
    status?: string;
    search?: string;
    tag?: string;
  }>;
}

export default async function AdminInitiativesPage({ searchParams }: AdminInitiativesPageProps) {
  const { stale, priority, status, search, tag } = await searchParams;
  const onlyStale = stale === '1';
  const priorityValue = PRIORITY_OPTIONS.includes((priority ?? '') as (typeof PRIORITY_OPTIONS)[number])
    ? priority
    : '';
  const statusValue = STATUS_OPTIONS.includes((status ?? '') as (typeof STATUS_OPTIONS)[number])
    ? status
    : '';
  const searchValue = (search ?? '').trim().toLowerCase();
  const tagValue = (tag ?? '').trim().toLowerCase();

  const { rows, error } = await listInitiativesForAdmin(onlyStale);
  const filtered = rows.filter((item) => {
    if (priorityValue && item.priority !== priorityValue) return false;
    if (statusValue && item.status !== statusValue) return false;
    if (tagValue && !item.tags.some((itemTag) => itemTag.toLowerCase() === tagValue)) return false;
    if (searchValue) {
      const haystack = `${item.title}\n${item.summary}`.toLowerCase();
      if (!haystack.includes(searchValue)) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (a.isStale !== b.isStale) return a.isStale ? -1 : 1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const allLinkSearchParams = new URLSearchParams();
  if (priorityValue) allLinkSearchParams.set('priority', priorityValue);
  if (statusValue) allLinkSearchParams.set('status', statusValue);
  if (searchValue) allLinkSearchParams.set('search', searchValue);
  if (tagValue) allLinkSearchParams.set('tag', tagValue);
  const allLinkHref = `/admin/initiatives${allLinkSearchParams.size ? `?${allLinkSearchParams.toString()}` : ''}`;

  const staleLinkSearchParams = new URLSearchParams();
  staleLinkSearchParams.set('stale', '1');
  if (priorityValue) staleLinkSearchParams.set('priority', priorityValue);
  if (statusValue) staleLinkSearchParams.set('status', statusValue);
  if (searchValue) staleLinkSearchParams.set('search', searchValue);
  if (tagValue) staleLinkSearchParams.set('tag', tagValue);
  const staleLinkHref = `/admin/initiatives?${staleLinkSearchParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Initiatives</h2>
          <p className="text-sm text-muted-foreground">
            Track drafts and detect when implementation drift makes specs stale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/admin/initiatives/new">New initiative</Link>
          </Button>
          <form action={recalculateInitiativesAction}>
            <Button type="submit" variant="outline">
              Recalculate
            </Button>
          </form>
        </div>
      </div>

      <form className="grid gap-3 rounded-xl border bg-background p-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input
            name="search"
            defaultValue={search ?? ''}
            placeholder="Search title or summary"
            aria-label="Search initiatives"
          />
        </div>
        <select
          name="priority"
          defaultValue={priorityValue}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusValue}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <Input name="tag" defaultValue={tag ?? ''} placeholder="Tag (optional)" aria-label="Filter by tag" />
        <input type="hidden" name="stale" value={onlyStale ? '1' : '0'} />
        <div className="lg:col-span-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={allLinkHref}
              className={`rounded-md px-3 py-1.5 text-sm ${onlyStale ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
            >
              All
            </Link>
            <Link
              href={staleLinkHref}
              className={`rounded-md px-3 py-1.5 text-sm ${onlyStale ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Only stale
            </Link>
          </div>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Data error: {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Freshness</th>
              <th className="px-4 py-3 font-medium">Last reviewed</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!error && sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No initiatives in this view.
                </td>
              </tr>
            ) : null}
            {sorted.map((initiative) => {
              const freshness = resolveFreshnessBadge(initiative.freshness);
              return (
                <tr key={initiative.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/initiatives/${initiative.id}`} className="font-medium hover:underline">
                      {initiative.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{initiative.summary}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{initiative.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{STATUS_LABELS[initiative.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={freshness.className}>{freshness.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(initiative.lastReviewedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(initiative.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
