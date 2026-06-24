'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations, useLocale } from '@/shared/i18n';
import { ArrowUpRight } from 'lucide-react';
import { Button, Card, CardContent, CardTitle, Icon, Badge } from '@/shared/ui';
import type { LandingRoomType, TenantSettings } from '@/entities/tenant';
import { shouldShowRoomDescription } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { formatLandingRoomPrice } from '@/entities/tenant/lib/resolveHostelMoney';
import { cn } from '@/shared/lib/utils';

type LandingRoomCardLiveProps = {
  variant?: 'live';
  room: LandingRoomType;
  settings: TenantSettings;
  bookingEnabled: boolean;
  bookingLink: string | null;
  fallbackLink: string | null;
  ctaLabel: string;
  fallbackLabel: string;
  showUpgradeHint?: boolean;
  onFallbackClick?: () => void;
};

type LandingRoomCardPreviewProps = {
  variant: 'preview';
  room: LandingRoomType;
  settings: TenantSettings;
};

export type LandingRoomCardProps = LandingRoomCardLiveProps | LandingRoomCardPreviewProps;

/** Matches landing room image crop in the 2-col grid (~576×288 at lg). */
const ROOM_CARD_IMAGE_FRAME = 'relative aspect-[2/1] w-full overflow-hidden';

function roomCardLayout(hasDescription: boolean, variant: 'preview' | 'live') {
  const isPreview = variant === 'preview';

  return {
    content: cn(
      'flex flex-col',
      hasDescription
        ? cn(isPreview ? 'p-4' : 'p-6 sm:p-8', 'flex-grow')
        : isPreview
          ? 'p-3'
          : 'p-4 sm:p-5'
    ),
    footer: hasDescription
      ? cn(
          'border-t border-border',
          isPreview ? 'mt-auto mt-3 pt-3' : 'mt-auto mt-6 pt-6'
        )
      : isPreview
        ? 'mt-2'
        : 'mt-3',
  };
}

function RoomCardImage({
  imageUrl,
  alt,
  preview,
  className,
}: {
  imageUrl: string;
  alt: string;
  preview: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const trimmed = imageUrl.trim();

  if (!trimmed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-xs text-muted-foreground',
          className
        )}
      >
        Add image URL
      </div>
    );
  }

  if (broken) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted px-3 text-center text-xs text-amber-800',
          className
        )}
      >
        Image failed to load — check the URL path.
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={trimmed}
        alt={alt}
        fill
        sizes={preview ? '320px' : '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'}
        className={cn('object-cover', !preview && 'transition-transform duration-500 group-hover:scale-105')}
        unoptimized
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export function LandingRoomCard(props: LandingRoomCardProps) {
  if (props.variant === 'preview') {
    return <LandingRoomCardPreviewBody room={props.room} settings={props.settings} />;
  }

  return <LandingRoomCardLiveBody {...props} />;
}

function LandingRoomCardPreviewBody({
  room,
  settings,
}: {
  room: LandingRoomType;
  settings: TenantSettings;
}) {
  const t = useTranslations('domains.hostel.rooms');
  const locale = useLocale();
  const hasDescription = shouldShowRoomDescription(room.description);
  const priceLabel = formatLandingRoomPrice(settings, room.priceFromEur, locale);
  const title = room.title?.trim() || 'Room title';
  const layout = roomCardLayout(hasDescription, 'preview');

  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0 shadow-sm">
      <div className={ROOM_CARD_IMAGE_FRAME}>
        <RoomCardImage imageUrl={room.imageUrl} alt={title} preview className="h-full w-full" />
        {priceLabel ? (
          <Badge className="absolute top-2 left-2 rounded-md bg-foreground/80 px-2 py-1 text-[10px] font-bold text-background backdrop-blur-sm">
            {t('priceFrom')}
            <span className="text-primary">{priceLabel}</span> / {t('night')}
          </Badge>
        ) : null}
      </div>
      <CardContent className={layout.content}>
        <CardTitle className="text-base">{title}</CardTitle>
        {hasDescription ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {room.description}
          </p>
        ) : null}
        <div className={layout.footer}>
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="pointer-events-none text-xs">
              {t('bookButton')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LandingRoomCardLiveBody({
  room,
  settings,
  bookingEnabled,
  bookingLink,
  fallbackLink,
  ctaLabel,
  fallbackLabel,
  showUpgradeHint = false,
  onFallbackClick,
}: LandingRoomCardLiveProps) {
  const t = useTranslations('domains.hostel.rooms');
  const locale = useLocale();
  const hasDescription = shouldShowRoomDescription(room.description);
  const priceLabel = formatLandingRoomPrice(settings, room.priceFromEur, locale);
  const showBookingCta = bookingEnabled && bookingLink;
  const showFallbackCta = !bookingEnabled && fallbackLink;
  const showUnavailableHint = !bookingEnabled && !fallbackLink;
  const layout = roomCardLayout(hasDescription, 'live');

  return (
    <Card
      className={cn(
        'group flex flex-col gap-0 overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-xl',
        !hasDescription && 'self-start'
      )}
    >
      <div className="relative h-64 w-full overflow-hidden sm:h-72">
        <RoomCardImage imageUrl={room.imageUrl} alt={room.title} preview={false} className="h-full w-full" />
        {priceLabel ? (
          <Badge className="absolute top-4 left-4 rounded-lg bg-foreground/80 px-3 py-1.5 text-sm font-bold text-background backdrop-blur-sm">
            {t('priceFrom')}
            <span className="text-primary">{priceLabel}</span> / {t('night')}
          </Badge>
        ) : null}
      </div>

      <CardContent className={layout.content}>
        <CardTitle className="text-xl transition-colors group-hover:text-primary sm:text-2xl">
          {room.title}
        </CardTitle>

        {hasDescription ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed font-light text-muted-foreground sm:text-base">
            {room.description}
          </p>
        ) : null}

        {(showBookingCta || showFallbackCta || showUnavailableHint) && (
          <div className={layout.footer}>
            {showBookingCta ? (
              <div className="flex items-center justify-between gap-3">
                {showUpgradeHint ? (
                  <p className="animate-fadeIn text-[11px] text-muted-foreground">
                    {t('upgradeNoticeHint')}
                  </p>
                ) : (
                  <span />
                )}
                <Button asChild variant="outline" className="group/btn ml-auto">
                  <a href={bookingLink!} target="_blank" rel="noopener noreferrer">
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
              <div className="flex justify-end">
                <Button asChild variant="outline" className="group/btn">
                  <a
                    href={fallbackLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onFallbackClick}
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
              <p className="text-xs text-muted-foreground">{t('bookingUnavailableHint')}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
