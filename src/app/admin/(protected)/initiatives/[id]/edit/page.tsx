import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInitiativeForAdmin } from '@/entities/initiative/server';
import { InitiativeForm } from '../../ui/InitiativeForm';
import { updateInitiativeFromFormAction } from '../../actions';

interface EditInitiativePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditInitiativePage({ params, searchParams }: EditInitiativePageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const { initiative, error: loadError } = await getInitiativeForAdmin(id);

  if (!initiative && !loadError) {
    notFound();
  }

  if (!initiative) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Data error: {loadError?.message ?? 'Unknown error'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/admin/initiatives/${initiative.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {initiative.title}
      </Link>
      <div>
        <h2 className="text-xl font-semibold">Edit initiative</h2>
        <p className="text-sm text-muted-foreground">Update scope, tracked paths, and current delivery status.</p>
      </div>
      <InitiativeForm
        initiative={initiative}
        action={updateInitiativeFromFormAction}
        submitLabel="Save changes"
        cancelHref={`/admin/initiatives/${initiative.id}`}
        error={error ? decodeURIComponent(error) : undefined}
      />
    </div>
  );
}
