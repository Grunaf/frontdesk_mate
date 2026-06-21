import { notFound } from 'next/navigation';
import { getCityPackForAdmin } from '@/entities/city-pack/server';
import { CityPackWizard } from '../ui/CityPackWizard';

interface CityPackDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function CityPackDetailPage({ params, searchParams }: CityPackDetailPageProps) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const { pack, error: loadError } = await getCityPackForAdmin(id);

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Database error: {loadError}
      </p>
    );
  }

  if (!pack) {
    notFound();
  }

  return (
    <CityPackWizard
      pack={pack}
      saved={saved === '1'}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
