'use client';

import Image from 'next/image';
import { useTranslations } from '@/shared/i18n';
import { HOSTEL_CONFIG } from '@/shared/config';
import { BookingForm } from '@/features/booking';

export function HostelHero() {
  const t = useTranslations('components.hero');
  const heroBgUrl = HOSTEL_CONFIG.heroBgUrl || '/logo.svg';

  return (
    <section className="relative flex h-[85vh] min-h-[650px] w-full items-center justify-center overflow-hidden bg-foreground">
      <div className="absolute inset-0 z-0">
        <Image
          src={heroBgUrl}
          alt={t('bgImageAlt')}
          fill
          priority
          className="object-cover object-center brightness-[0.4]"
          unoptimized
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <span className="text-primary animate-fade-in mb-5 rounded-full bg-background/10 px-4 py-1.5 text-xs font-bold tracking-widest uppercase backdrop-blur-sm">
          {t('searchPlaceholder')}
        </span>

        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-background drop-shadow-sm sm:text-5xl md:text-6xl md:leading-[1.15]">
          {t('title')}
        </h1>

        <p className="mt-4 max-w-2xl text-base font-light text-background/80 sm:text-xl">
          {t('subtitle')}
        </p>

        <BookingForm />
      </div>
    </section>
  );
}
