import { setRequestLocale } from 'next-intl/server';

interface OwnerSiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerSiteLayout({ children, params }: OwnerSiteLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-4 py-3">
        <p className="text-sm font-medium text-foreground">Frontdesk Mate</p>
        <p className="text-xs text-muted-foreground">Owner portal</p>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}

export function generateStaticParams() {
  return [{ locale: 'en' }];
}
