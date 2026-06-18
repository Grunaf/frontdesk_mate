// src/widgets/RoomsGallery/ui/RoomsGallery.tsx
import Image from 'next/image';
import { useTranslations } from '@/shared/i18n';
import { ArrowUpRight } from 'lucide-react';
import { Button, Card, CardContent, CardTitle, Icon, Badge } from '@/shared/ui';
import { HOSTEL_CONFIG } from '@/shared/config';
import { ROOMS_DATA } from '@/entities/room';

interface RoomsGalleryProps {
  checkin?: string;
  checkout?: string;
}

export function RoomsGallery({ checkin, checkout }: RoomsGalleryProps) {
  const t = useTranslations('domains.hostel.rooms');

  const getBookingLink = (cloudbedsId: string) => {
    const url = new URL(HOSTEL_CONFIG.bookingUrl);

    url.searchParams.set('room_type', cloudbedsId);

    if (checkin) url.searchParams.set('checkin', checkin);
    if (checkout) url.searchParams.set('checkout', checkout);

    return url.toString();
  };

  return (
    <section id="rooms" className="bg-muted py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg font-light text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {ROOMS_DATA.map((room) => {
            const isDatesSelected = checkin && checkout;
            const ctaLabel = room.requiresChatUpgrade
              ? isDatesSelected
                ? t('bookAndUpgradeButton')
                : t('selectDatesButton')
              : isDatesSelected
                ? t('bookButton')
                : t('selectDatesButton');

            return (
              <Card
                key={room.id}
                className="group flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-64 w-full overflow-hidden sm:h-72">
                  <Image
                    src={room.imageSrc}
                    alt={t(`${room.translationKey}.title`)}
                    fill
                    sizes="(max-w-7xl) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <Badge className="absolute top-4 left-4 rounded-lg bg-foreground/80 px-3 py-1.5 text-sm font-bold text-background backdrop-blur-sm">
                    {t('priceFrom')}
                    <span className="text-primary">€{room.basePriceEur}</span> / {t('night')}
                  </Badge>
                </div>

                <CardContent className="flex flex-grow flex-col p-6 sm:p-8">
                  <CardTitle className="text-xl transition-colors group-hover:text-primary sm:text-2xl">
                    {t(`${room.translationKey}.title`)}
                  </CardTitle>

                  <p className="mt-3 line-clamp-3 flex-grow text-sm leading-relaxed font-light text-muted-foreground sm:text-base">
                    {t(`${room.translationKey}.description`)}
                  </p>

                  {/* Нижняя плашка с кнопкой */}
                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-6">
                    {room.requiresChatUpgrade && isDatesSelected && (
                      <p className="animate-fadeIn text-[11px] text-muted-foreground">
                        {t('upgradeNoticeHint')}
                      </p>
                    )}
                    <Button asChild variant="outline" className="group/btn ml-auto">
                      <a href={getBookingLink(room.cloudbedsId)} target="_blank" rel="noopener noreferrer">
                        <span>{ctaLabel}</span>
                        <Icon
                          icon={ArrowUpRight}
                          size={16}
                          className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
                        />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
