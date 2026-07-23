'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from '@/shared/i18n';
import {
  Alert,
  AlertDescription,
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';
import { localeToDefaultCitizenship } from '../lib/citizenshipOptions';
import {
  isTourismGuestFormDirty,
  type TourismGuestFormValues,
} from '../lib/tourismGuestDraftStorage';
import {
  ADD_TOURISM_GUEST_FORM_ID,
  AddTourismGuestForm,
} from './AddTourismGuestForm';

type AddTourismGuestSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  checkInDate: string;
  showUnderageAloneWarning?: boolean;
  initialValues?: Partial<TourismGuestFormValues>;
  /** Remount form when switching create ↔ draft. */
  formInstanceKey?: string;
  disabled?: boolean;
  onGuestAdded: () => void;
  onUploadPendingChange?: (pending: boolean) => void;
  /** Called when sheet closes with a dirty form (create or update draft). */
  onDraftSave?: (values: TourismGuestFormValues) => void;
  /** Called after successful submit (clear draft). */
  onDraftClear?: () => void;
};

export function AddTourismGuestSheet({
  open,
  onOpenChange,
  tenantSlug,
  checkInDate,
  showUnderageAloneWarning = false,
  initialValues,
  formInstanceKey = 'create',
  disabled = false,
  onGuestAdded,
  onUploadPendingChange,
  onDraftSave,
  onDraftClear,
}: AddTourismGuestSheetProps) {
  const t = useTranslations('pages.staySetup.register');
  const locale = useLocale();
  const defaultCountry = localeToDefaultCitizenship(locale);

  const [isPending, setIsPending] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const latestValuesRef = useRef<TourismGuestFormValues | null>(null);
  const submittedRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return;
    }

    if (!nextOpen) {
      const values = latestValuesRef.current;
      const defaults = {
        countryOfBirth: defaultCountry,
        citizenship: defaultCountry,
        documentType: 'passport' as const,
      };
      if (!submittedRef.current && values && isTourismGuestFormDirty(values, defaults)) {
        onDraftSave?.(values);
      }
      setIsPending(false);
      setCanSubmit(false);
      setFormError(null);
      latestValuesRef.current = null;
      submittedRef.current = false;
    }

    onOpenChange(nextOpen);
  };

  const handleUploadPendingChange = (pending: boolean) => {
    setIsPending(pending);
    onUploadPendingChange?.(pending);
  };

  const handleGuestAdded = () => {
    submittedRef.current = true;
    setIsPending(false);
    setFormError(null);
    onDraftClear?.();
    onGuestAdded();
    onOpenChange(false);
  };

  const handleValuesChange = useCallback((values: TourismGuestFormValues) => {
    latestValuesRef.current = values;
  }, []);

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange} dismissible={!isPending}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>{t('addGuest.heading')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-4">
          {open ? (
            <AddTourismGuestForm
              key={formInstanceKey}
              tenantSlug={tenantSlug}
              checkInDate={checkInDate}
              showUnderageAloneWarning={showUnderageAloneWarning}
              initialValues={initialValues}
              disabled={disabled || isPending}
              showSubmitButton={false}
              showInlineFormError={false}
              formId={ADD_TOURISM_GUEST_FORM_ID}
              onUploadPendingChange={handleUploadPendingChange}
              onCanSubmitChange={setCanSubmit}
              onFormErrorChange={setFormError}
              onValuesChange={handleValuesChange}
              onGuestAdded={handleGuestAdded}
            />
          ) : null}
        </BottomSheetBody>

        <BottomSheetFooter className="gap-3 border-t border-border/60">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            form={ADD_TOURISM_GUEST_FORM_ID}
            className="w-full"
            disabled={disabled || isPending || !canSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('addGuest.adding')}
              </>
            ) : (
              t('addGuest.submit')
            )}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
