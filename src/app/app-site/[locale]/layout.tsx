import { BaseHeader } from '@/shared/ui';
import { getRouteTranslations } from '@/shared/lib/getRouteTranslations';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const translatedTitles = await getRouteTranslations('app');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <BaseHeader translatedTitles={translatedTitles} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
