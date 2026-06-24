'use client';

import { useTranslations } from '@/shared/i18n';
import { buildBookingRoomUrl, resolveLandingRooms, useHostelConfig, useTenant } from '@/entities/tenant';
import { trackBookingWhatsappClick } from '@/shared/lib/analytics';
import { resolveGuestBookingPhone } from '@/entities/tenant/lib/resolveGuestBookingPhone';
import { getMessengerUpgradeLink } from '../getMessengerUpgradeLink';
import { getReceptionBookingLink } from '../lib/getReceptionBookingLink';
import { markLandingWhatsappFollowup } from '@/features/booking/lib/getHeroWhatsappBookingLink';
import { LandingRoomCard } from './LandingRoomCard';

interface RoomsGalleryProps {
  checkin?: string;
  checkout?: string;
}

export function RoomsGallery({ checkin, checkout }: RoomsGalleryProps) {
  const t = useTranslations('domains.hostel.rooms');
  const hostel = useHostelConfig();
  const { capabilities, settings, slug } = useTenant();
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

            return (
              <LandingRoomCard
                key={room.id}
                room={room}
                settings={settings}
                bookingEnabled={bookingEnabled}
                bookingLink={bookingLink}
                fallbackLink={fallbackLink}
                ctaLabel={ctaLabel}
                fallbackLabel={fallbackLabel}
                showUpgradeHint={room.requiresChatUpgrade === true && Boolean(isDatesSelected)}
                onFallbackClick={() => {
                  markLandingWhatsappFollowup();
                  trackBookingWhatsappClick(slug, 'room_card');
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
