'use client';

import Image from 'next/image';
import { useTranslations } from '@/shared/i18n';
import { ArrowUpRight } from 'lucide-react';
import { Button, Card, CardContent, CardTitle, Icon, Badge } from '@/shared/ui';
import { buildBookingRoomUrl, resolveLandingRooms, useHostelConfig, useTenant } from '@/entities/tenant';
import { resolveGuestBookingPhone } from '@/entities/tenant/lib/resolveGuestBookingPhone';
import { getMessengerUpgradeLink } from '../getMessengerUpgradeLink';
import { getReceptionBookingLink } from '../lib/getReceptionBookingLink';
import { markLandingWhatsappFollowup } from '@/features/booking/lib/getHeroWhatsappBookingLink';

interface RoomsGalleryProps {
  checkin?: string;
  checkout?: string;
}

export function RoomsGallery({ checkin, checkout }: RoomsGalleryProps) {
  const t = useTranslations('domains.hostel.rooms');
  const hostel = useHostelConfig();
  const { capabilities, settings } = useTenant();
  const bookingEnabled = capabilities.booking === 'ready';
  const landing = resolveLandingRooms(settings);
  const receptionPhone = resolveGuestBookingPhone(settings);

  if (landing.roomTypes.length === 0) {
    return null;
  }

  const sectionTitle = landing.sectionTitle ?? t('title');
  const sectionSubtitle = landing.sectionSubtitle ?? t('subtitle');

  const getBookingLink = (roomTypeId: string) =>
    buildBookingRoomUrl(hostel.booking, roomTypeId, { checkIn: checkin, checkOut: checkout });

  const getFallbackLink = (roomTitle: string, requiresChatUpgrade: boolean) => {
    if (!receptionPhone?.trim()) {
      return null;
    }

    if (requiresChatUpgrade) {
      return getMessengerUpgradeLink({
        phoneRaw: receptionPhone,
        checkin,
        checkout,
      });
    }

    return getReceptionBookingLink({
      phoneRaw: receptionPhone,
      roomTitle,
      checkin,
      checkout,
    });
  };

  return (
    <section id="rooms" className="bg-muted py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {sectionTitle}
          </h2>
          <p className="mt-4 text-lg font-light text-muted-foreground">{sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {landing.roomTypes.map((room) => {
            const isDatesSelected = checkin && checkout;
            const ctaLabel = room.requiresChatUpgrade
              ? isDatesSelected
                ? t('bookAndUpgradeButton')
                : t('selectDatesButton')
              : bookingEnabled && isDatesSelected
                ? t('bookButton')
                : !bookingEnabled && isDatesSelected
                  ? t('contactReceptionButton')
                  : t('selectDatesButton');
            const bookingLink = bookingEnabled ? getBookingLink(room.engineRoomTypeId) : null;
            const fallbackLink = !bookingEnabled
              ? getFallbackLink(room.title, room.requiresChatUpgrade === true)
              : null;
            const fallbackLabel = room.requiresChatUpgrade === true
              ? isDatesSelected
                ? t('bookAndUpgradeButton')
                : t('contactReceptionButton')
              : t('contactReceptionButton');
            const showBookingCta = bookingEnabled && bookingLink;
            const showFallbackCta = !bookingEnabled && fallbackLink;
            const showUnavailableHint = !bookingEnabled && !fallbackLink;

            return (
              <Card
                key={room.id}
                className="group flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-64 w-full overflow-hidden sm:h-72">
                  <Image
                    src={room.imageUrl}
                    alt={room.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  {typeof room.priceFromEur === 'number' && (
                    <Badge className="absolute top-4 left-4 rounded-lg bg-foreground/80 px-3 py-1.5 text-sm font-bold text-background backdrop-blur-sm">
                      {t('priceFrom')}
                      <span className="text-primary">€{room.priceFromEur}</span> / {t('night')}
                    </Badge>
                  )}
                </div>

                <CardContent className="flex flex-grow flex-col p-6 sm:p-8">
                  <CardTitle className="text-xl transition-colors group-hover:text-primary sm:text-2xl">
                    {room.title}
                  </CardTitle>

                  <p className="mt-3 line-clamp-3 flex-grow text-sm leading-relaxed font-light text-muted-foreground sm:text-base">
                    {room.description}
                  </p>

                  {showBookingCta ? (
                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-6">
                      {room.requiresChatUpgrade && isDatesSelected && (
                        <p className="animate-fadeIn text-[11px] text-muted-foreground">
                          {t('upgradeNoticeHint')}
                        </p>
                      )}
                      <Button asChild variant="outline" className="group/btn ml-auto">
                        <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                          <span>{ctaLabel}</span>
                          <Icon
                            icon={ArrowUpRight}
                            size={16}
                            className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
                          />
                        </a>
                      </Button>
                    </div>
                  ) : null}

                  {showFallbackCta ? (
                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-6">
                      <Button asChild variant="outline" className="group/btn ml-auto">
                        <a
                          href={fallbackLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markLandingWhatsappFollowup()}
                        >
                          <span>{fallbackLabel}</span>
                          <Icon
                            icon={ArrowUpRight}
                            size={16}
                            className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
                          />
                        </a>
                      </Button>
                    </div>
                  ) : null}

                  {showUnavailableHint ? (
                    <p className="mt-6 border-t border-border pt-6 text-xs text-muted-foreground">
                      {t('bookingUnavailableHint')}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
