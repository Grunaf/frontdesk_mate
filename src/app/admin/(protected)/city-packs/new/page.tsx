import Link from 'next/link';
import { createCityPackAction } from '../actions';

interface NewCityPackPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewCityPackPage({ searchParams }: NewCityPackPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin/city-packs" className="text-sm text-muted-foreground hover:text-foreground">
          ← City packs
        </Link>
        <h2 className="mt-2 text-xl font-semibold">New city pack</h2>
        <p className="text-sm text-muted-foreground">Create a draft pack, then fill places in the setup wizard.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error === 'exists' ? 'A pack with this id already exists.' : 'Could not create pack.'}
        </p>
      ) : null}

      <form action={createCityPackAction} className="space-y-4 rounded-xl border bg-background p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Pack id (slug)</span>
          <input
            name="id"
            required
            placeholder="kotor"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Label</span>
          <input
            name="label"
            required
            placeholder="Kotor Bay (Montenegro)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Create draft
        </button>
      </form>
    </div>
  );
}
