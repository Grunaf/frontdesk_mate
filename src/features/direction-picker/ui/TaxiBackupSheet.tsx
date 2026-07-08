'use client';

import { useTranslations } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import { createWhatsappLink } from '@/shared/lib';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  ExternalServiceButton,
  Icon,
} from '@/shared/ui';
import { Car, Phone } from 'lucide-react';
import type { RouteConfig } from '@/entities/hostel';
import { resolveReceptionTaxiBackup } from '../lib/resolveReceptionTaxiBackup';
import { resolveRecommendedTaxi } from '../lib/resolveRecommendedTaxi';
import { resolveRouteCopyField } from '../lib/resolveRouteCopy';
import { ReceptionContactActions, ReceptionContactHint, useReceptionContactLabels } from '@/features/reception-contact';
import { MAX_TAXI_TIPS } from '@/entities/city-pack';
import { inferCityPackTransportCurrencyMode } from '@/entities/city-pack/lib/inferCityPackTransportCurrency';
import { TaxiRouteSummary } from './TaxiBackupCard';

export function TaxiBackupSheet({
  open,
  onOpenChange,
  route,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteConfig;
}) {
  const { name, hostel, cityPack, contentKeys, slug, cityPackId, cityPackContent } = useTenant();
  const routes = useTranslations();
  const taxiActions = useTranslations('components.taxi');
  const directions = useTranslations('pages.arrivalJourney.directions');
  const receptionLabels = useReceptionContactLabels();

  const pickupPoint = resolveRouteCopyField(route, 'taxiPickupPoint', routes);
  const destination = hostel.contacts.address.display ?? '';

  const recommendedTaxi = resolveRecommendedTaxi(cityPack.recommendedTaxi, hostel.contacts.taxiPhone);
  const taxiStandWarning =
    cityPack.guestWarnings?.taxiStandWarning ??
    (contentKeys.taxiStandWarning ? routes(contentKeys.taxiStandWarning) : '');
  const taxiMeterWarning =
    cityPack.guestWarnings?.taxiMeterWarning ??
    (contentKeys.taxiMeterWarning ? routes(contentKeys.taxiMeterWarning) : '');

  const taxiWhatsappLink =
    recommendedTaxi?.whatsappEnabled
      ? createWhatsappLink(
          recommendedTaxi.phoneRaw,
          taxiActions('whatsappTaxiMessage', {
            pickupPoint,
            address: destination,
          })
        )
      : null;

  const receptionBackup = resolveReceptionTaxiBackup(
    hostel,
    taxiActions('receptionTaxiMessage', {
      pickupPoint,
      address: destination,
      hostelName: name,
    }),
    receptionLabels.translateHint
  );

  const hasTaxi = Boolean(recommendedTaxi);
  const hasReception = Boolean(receptionBackup);
  const currencyMode = inferCityPackTransportCurrencyMode(cityPackId, cityPackContent);
  const operationalTaxiTips = (route.guestCopy?.taxiTips ?? []).slice(0, MAX_TAXI_TIPS);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size="large" className="px-0 pb-0">
        <BottomSheetHeader className="space-y-3 px-6 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {directions('backupTitle')}
          </p>
          <div className="flex items-start gap-4 pr-8">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={Car} className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <BottomSheetTitle className="text-base">{directions('taxiTitle')}</BottomSheetTitle>
              <TaxiRouteSummary route={route} directions={directions} currencyMode={currencyMode} />
            </div>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-4">
          <div className="space-y-4">
            {operationalTaxiTips.length > 0 ? (
              <ul className="space-y-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                {operationalTaxiTips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="text-muted-foreground/80" aria-hidden>
                      •
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Accordion type="single" collapsible className="rounded-xl border bg-muted/30">
              <AccordionItem value="safety" className="border-0">
                <AccordionTrigger className="px-4 py-3 text-xs font-medium hover:no-underline">
                  {taxiActions('safetyTipsTitle')}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                  <p>{taxiStandWarning}</p>
                  <p>{taxiMeterWarning}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {hasReception && receptionBackup ? (
              <section className="space-y-1.5">
                <p className="flex flex-wrap items-center justify-center gap-x-1 text-center text-sm leading-relaxed text-muted-foreground">
                  {taxiActions('needHelpTitle')}{' '}
                  <ReceptionContactActions
                    contact={receptionBackup}
                    labels={{ message: receptionLabels.message, call: receptionLabels.call }}
                    layout="inline"
                    analyticsContext="taxi"
                    tenantSlug={slug}
                  />
                </p>
                <ReceptionContactHint contact={receptionBackup} />
              </section>
            ) : null}

            {!hasTaxi && !hasReception && (
              <p className="text-sm text-muted-foreground">{taxiActions('noContactFallback')}</p>
            )}

            {hasReception && !hasTaxi && (
              <p className="text-center text-sm text-muted-foreground">{taxiActions('noTaxiNumber')}</p>
            )}
          </div>
        </BottomSheetBody>

        {hasTaxi ? (
          <BottomSheetFooter className="border-t border-border/60">
            <p className="text-xs font-medium text-muted-foreground">{taxiActions('bookTaxiTitle')}</p>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="default" className="h-11 w-full">
                <a href={recommendedTaxi!.href} className="flex items-center justify-center gap-1.5">
                  <Icon icon={Phone} className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    {taxiActions('callTaxi', { taxiName: recommendedTaxi!.name })}
                  </span>
                </a>
              </Button>

              {taxiWhatsappLink && (
                <ExternalServiceButton service="whatsapp" href={taxiWhatsappLink}>
                  {taxiActions('whatsappTaxi', { taxiName: recommendedTaxi!.name })}
                </ExternalServiceButton>
              )}
            </div>
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
