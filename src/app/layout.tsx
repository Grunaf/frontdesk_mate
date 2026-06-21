import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import '@/shared/styles/globals.css';
import { cn } from '@/shared/lib/utils';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { BRAND_CONFIG } from '@/shared/config';
import { getBrandCssVars } from '@/shared/lib';
import { ThemeProvider } from '@/shared/ui';
import { resolveTenantAccess } from '@/entities/tenant/server';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const landingAccess = await resolveTenantAccess('landing');

  if (landingAccess.kind === 'active') {
    const tenant = landingAccess.config;
    return {
      title: tenant.name,
      description: tenant.hostel.contacts.address.display ?? tenant.name,
    };
  }

  const appAccess = await resolveTenantAccess('app');

  if (appAccess.kind === 'offline') {
    const t = await getTranslations({ locale: 'en', namespace: 'pages.platform.offline' });
    return {
      title: appAccess.shell.name,
      description: t('metaDescription'),
    };
  }

  return {
    title: 'Frontdesk Mate',
    description: 'Guest app for hostels',
  };
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale = 'en' } = await params;

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        inter.variable
      )}
      style={getBrandCssVars(BRAND_CONFIG)}
    >
      <body className="flex flex-col bg-background text-foreground">
        <ThemeProvider brand={BRAND_CONFIG}>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
