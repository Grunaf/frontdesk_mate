import { getTranslations } from 'next-intl/server';

export async function OwnerDesktopRequiredBlocker() {
  const t = await getTranslations('pages.owner.desktopRequired');

  return (
    <div
      className="mx-auto flex max-w-md flex-col items-start gap-3 px-4 py-10"
      role="status"
      aria-live="polite"
    >
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
