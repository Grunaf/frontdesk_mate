'use client';

import {
  resolveTourismRegistrationConfig,
  useTenant,
} from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

const SAAS_NAME = 'Frontdesk Mate';

const POLICY_SECTIONS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
] as const;

type TourismRegistrationPrivacyPolicySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PolicyParagraphs({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <p key={index} className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {block}
        </p>
      ))}
    </div>
  );
}

export function TourismRegistrationPrivacyPolicySheet({
  open,
  onOpenChange,
}: TourismRegistrationPrivacyPolicySheetProps) {
  const t = useTranslations('pages.staySetup.register.privacyPolicy');
  const { name: hostelName, settings } = useTenant();
  const controller = resolveTourismRegistrationConfig(settings)?.dataController;

  const vars = {
    hostelName: hostelName.trim() || t('controllerFallback'),
    saasName: SAAS_NAME,
    controllerName: controller?.legalName?.trim() || t('controllerFallback'),
    controllerAddress: controller?.address?.trim() || t('contactReception'),
    controllerEmail: controller?.email?.trim() || t('contactReception'),
    controllerPhone: controller?.phone?.trim() || t('contactReception'),
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
          <p className="text-xs text-muted-foreground">{t('updatedAt')}</p>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-6 pb-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('intro', vars)}</p>

          {POLICY_SECTIONS.map((id) => (
            <section key={id} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t(`${id}Title`)}</h3>
              <PolicyParagraphs text={t(`${id}Body`, vars)} />
            </section>
          ))}
        </BottomSheetBody>

        <BottomSheetFooter className="border-t border-border/60">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
