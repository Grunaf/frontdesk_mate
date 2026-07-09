import Link from 'next/link';
import { InitiativeForm } from '../ui/InitiativeForm';
import { createInitiativeFromFormAction } from '../actions';

interface NewInitiativePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewInitiativePage({ searchParams }: NewInitiativePageProps) {
  const { error } = await searchParams;

  return (
    <div className="space-y-4">
      <Link href="/admin/initiatives" className="text-sm text-muted-foreground hover:text-foreground">
        ← Initiatives
      </Link>
      <div>
        <h2 className="text-xl font-semibold">New initiative</h2>
        <p className="text-sm text-muted-foreground">Create a draft and start tracking freshness signals.</p>
      </div>
      <InitiativeForm
        action={createInitiativeFromFormAction}
        submitLabel="Create initiative"
        cancelHref="/admin/initiatives"
        error={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  );
}
