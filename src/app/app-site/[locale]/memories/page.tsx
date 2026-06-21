import { UploadMemoriesForm } from '@/features/upload-memories';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MemoriesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.memories');

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-4 text-4xl font-semibold">{t('title')}</h1>
        <p className="mb-10 text-muted-foreground">{t('subtitle')}</p>
        <UploadMemoriesForm />
      </div>
    </main>
  );
}
