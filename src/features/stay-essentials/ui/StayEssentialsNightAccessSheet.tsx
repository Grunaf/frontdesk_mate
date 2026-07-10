'use client';

import { resolveArrivalAccessPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { useNightMode } from '@/shared/lib';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useLocale, useTranslations } from '@/shared/i18n';
import {
  Badge,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  useActionFeedback,
  useAppNavigation,
} from '@/shared/ui';

interface StayEssentialsNightAccessSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

export function StayEssentialsNightAccessSheet({
  open,
  onOpenChange,
  onDismiss,
}: StayEssentialsNightAccessSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const nightT = useTranslations('components.nightAccess');
  const hostel = useHostelConfig();
  const { settings, guestBedId } = useTenant();
  const isNightMode = useNightMode();
  const locale = useLocale();
  const { push } = useAppNavigation();
  const { pending: isOpeningGuide, run: runOpenGuide } = useActionFeedback();
  const plan = resolveArrivalAccessPlan(settings, hostel, isNightMode, guestBedId);
  const codedSteps = plan.steps.filter((step) => step.code);

  if (codedSteps.length === 0) {
    return null;
  }

  const handleOpenFullGuide = () => {
    runOpenGuide(() => {
      setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
      push(`/${locale}${SITE_CONFIG.routes.app.welcome.path}?step=arrival`);
      onOpenChange(false);
    });
  };

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle>{t('bridges.nightAccess')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-4 pb-2">
          <div className={`grid gap-3 ${codedSteps.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {codedSteps.map((step) => (
              <div key={step.id} className="rounded-lg border bg-muted/40 p-3">
                <Badge variant="outline" className="mb-2 text-xs uppercase">
                  {step.label}
                </Badge>
                <p className="font-mono text-sm font-bold text-foreground">{step.code}</p>
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground italic">
            {plan.layoutKind === 'direct_to_floor' ? nightT('descriptionHostelOnly') : nightT('description')}
          </p>

          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            pending={isOpeningGuide}
            onClick={handleOpenFullGuide}
          >
            {t('nightAccessSheet.fullAccessGuide')}
          </Button>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button type="button" variant="outline" className="w-full" onClick={handleDismiss}>
            {t('nightAccessSheet.dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
