// Импортируем главный компонент из слоя features
import { ArrivalJourneyCoordinator } from '@/views/arrival-journey';
import { setRequestLocale } from "next-intl/server";

interface ArrivalJourneyPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function ArrivalJourneyPage({ params, searchParams }: ArrivalJourneyPageProps) {
  const { locale } = await params;
  const { mode } = await searchParams;

  setRequestLocale(locale);

  const isOnsite = mode === 'onsite';

  return <ArrivalJourneyCoordinator isOnsite={isOnsite} />;
}