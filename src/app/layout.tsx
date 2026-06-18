import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import '@/shared/styles/globals.css';
import { cn } from '@/shared/lib/utils';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { BRAND_CONFIG } from '@/shared/config';
import { getBrandCssVars } from '@/shared/lib';
import { ThemeProvider } from '@/shared/ui';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sarajevo Oasis Hostel',
  description: 'Welcome to Sarajevo',
};

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
