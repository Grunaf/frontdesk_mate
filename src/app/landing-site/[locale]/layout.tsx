import { BaseHeader } from '@/shared/ui';
import { getRouteTranslations } from '@/shared/lib/getRouteTranslations';

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const translatedTitles = await getRouteTranslations('landing');

  return (
    <div className="mx-auto flex w-full flex-col bg-transparent">
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
