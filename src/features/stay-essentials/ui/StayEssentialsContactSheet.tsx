'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { trackReceptionContactClick } from '@/shared/lib/analytics';
import type { ExternalServiceId } from '@/shared/config/external-services';
import {
  AppLink,
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  ExternalServiceButton,
  ExternalServiceIcon,
  Icon,
  PressableAnchor,
  Separator,
} from '@/shared/ui';
import { Mail } from 'lucide-react';
import { isWhatsappHref } from '../lib/resolveSocialHref';
import {
  resolveStayEssentialContactContent,
  hasStayEssentialContactBridgeContent,
} from '../model/resolveStayEssentialContactContent';

interface StayEssentialsContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function resolveExternalServiceForHref(href: string): ExternalServiceId | null {
  if (isWhatsappHref(href)) {
    return 'whatsapp';
  }

  return null;
}

export function StayEssentialsContactSheet({ open, onOpenChange }: StayEssentialsContactSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const contactT = useTranslations('components.stayEssentials.contact');
  const { name, slug } = useTenant();
  const hostel = useHostelConfig();
  const isRegistered = useIsGuestRegistered();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';

  const content = useMemo(() => resolveStayEssentialContactContent(hostel), [hostel]);

  const receptionWhatsapp = useMemo(
    () =>
      resolveReceptionContact(hostel, {
        message: contactT('guestChatMessage', { hostelName: name }),
        urgency: 'low',
      }),
    [contactT, hostel, name]
  );

  const guestChatHref =
    content.guestChatUrl ?? receptionWhatsapp?.whatsappHref ?? null;

  const guestChatButtonLabel = content.guestChatUrl
    ? contactT('guestChatButton')
    : contactT('guestChatButtonReception');

  if (!hasStayEssentialContactBridgeContent(hostel)) {
    return null;
  }

  const checkInPath = `/${locale}/check-in`;
  const guestChatService = guestChatHref ? resolveExternalServiceForHref(guestChatHref) : null;

  const trackGuestChatClick = () => {
    if (!slug) {
      return;
    }

    trackReceptionContactClick(slug, 'stay_essentials_contact', 'whatsapp');
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle>{t('bridges.contact')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="flex flex-1 flex-col gap-4 pb-2">
          {content.public.emailHref ||
          content.public.instagramHref ||
          content.public.facebookHref ? (
            <div className="flex flex-wrap items-center justify-start gap-3">
              {content.public.emailHref ? (
                <Button asChild variant="outline" size="icon" className="size-12 shrink-0">
                  <PressableAnchor href={content.public.emailHref} aria-label={contactT('emailButton')}>
                    <Icon icon={Mail} className="size-6" aria-hidden />
                  </PressableAnchor>
                </Button>
              ) : null}
              {content.public.instagramHref ? (
                <Button asChild variant="outline" size="icon" className="size-12 shrink-0">
                  <PressableAnchor
                    href={content.public.instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={contactT('instagramButton')}
                  >
                    <ExternalServiceIcon service="instagram" className="size-6" />
                  </PressableAnchor>
                </Button>
              ) : null}
              {content.public.facebookHref ? (
                <Button asChild variant="outline" size="icon" className="size-12 shrink-0">
                  <PressableAnchor
                    href={content.public.facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={contactT('facebookButton')}
                  >
                    <ExternalServiceIcon service="facebook" className="size-6" />
                  </PressableAnchor>
                </Button>
              ) : null}
            </div>
          ) : null}

          {content.guestChatConfigured ? (
            <>
              <Separator />
              <div className="space-y-3">
                {isRegistered ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ExternalServiceIcon service="whatsapp" className="size-5 shrink-0" />
                      <p className="text-sm font-medium text-foreground">{contactT('guestChatHeading')}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {content.guestChatUrl
                        ? contactT('guestChatDescriptionGroup')
                        : contactT('guestChatDescriptionReception')}
                    </p>
                  </div>
                ) : null}
                {isRegistered && guestChatHref ? (
                  guestChatService ? (
                    <ExternalServiceButton
                      service={guestChatService}
                      href={guestChatHref}
                      onClick={trackGuestChatClick}
                    >
                      {guestChatButtonLabel}
                    </ExternalServiceButton>
                  ) : (
                    <Button asChild className="w-full">
                      <PressableAnchor
                        href={guestChatHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={trackGuestChatClick}
                      >
                        {guestChatButtonLabel}
                      </PressableAnchor>
                    </Button>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3">
                    <div className="flex gap-3">
                      <ExternalServiceIcon
                        service="whatsapp"
                        className="mt-0.5 size-5 shrink-0 opacity-60"
                      />
                      <div className="min-w-0 space-y-2">
                        <p className="text-sm leading-snug text-foreground">{contactT('guestChatTeaser')}</p>
                        <Button asChild size="sm" variant="secondary">
                          <AppLink href={checkInPath}>{contactT('guestChatTeaserAction')}</AppLink>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {isRegistered && receptionWhatsapp?.availabilityHint ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {receptionWhatsapp.availabilityHint}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
