'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { submitTourismGuestAction } from '../actions/submitTourismGuestAction';
import {
  compressImageForUpload,
  CompressImageForUploadError,
} from '../lib/compressImageForUpload';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, Button, Input, Label } from '@/shared/ui';

const MAX_NAME_LENGTH = 120;

type AddTourismGuestFormProps = {
  tenantSlug: string;
  disabled?: boolean;
  onGuestAdded: () => void;
  onUploadPendingChange?: (pending: boolean) => void;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  passport?: string;
  entryStamp?: string;
};

export function AddTourismGuestForm({
  tenantSlug,
  disabled = false,
  onGuestAdded,
  onUploadPendingChange,
}: AddTourismGuestFormProps) {
  const t = useTranslations('pages.arrivalJourney.register');
  const tField = useTranslations('pages.arrivalJourney.register.fieldErrors');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const passportRef = useRef<HTMLInputElement>(null);
  const entryStampRef = useRef<HTMLInputElement>(null);

  const resolveActionError = (code: string): string => {
    switch (code) {
      case 'registration_closed':
        return t('errors.registrationClosed');
      case 'invalid_input':
        return t('errors.invalidInput');
      case 'invalid_file':
        return t('errors.invalidFile');
      case 'upload_failed':
        return t('errors.uploadFailed');
      case 'unauthorized':
        return t('errors.unauthorized');
      case 'feature_disabled':
        return t('errors.featureDisabled');
      case 'db_unavailable':
        return t('errors.dbUnavailable');
      default:
        return t('errors.generic');
    }
  };

  const resolveCompressError = (code: CompressImageForUploadError['code']): string => {
    switch (code) {
      case 'file_too_large':
        return tField('fileTooLarge');
      case 'not_an_image':
        return tField('notAnImage');
      default:
        return tField('processingFailed');
    }
  };

  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || trimmedFirst.length > MAX_NAME_LENGTH) {
      errors.firstName = tField('firstName');
    }
    if (!trimmedLast || trimmedLast.length > MAX_NAME_LENGTH) {
      errors.lastName = tField('lastName');
    }

    const passportFile = passportRef.current?.files?.[0];
    const stampFile = entryStampRef.current?.files?.[0];
    if (!passportFile?.size) {
      errors.passport = tField('passport');
    }
    if (!stampFile?.size) {
      errors.entryStamp = tField('entryStamp');
    }

    return errors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const passportFile = passportRef.current!.files![0];
    const stampFile = entryStampRef.current!.files![0];

    startTransition(async () => {
      onUploadPendingChange?.(true);
      try {
        const [compressedPassport, compressedStamp] = await Promise.all([
          compressImageForUpload(passportFile),
          compressImageForUpload(stampFile),
        ]);

        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('passport', compressedPassport);
        formData.append('entryStamp', compressedStamp);

        const result = await submitTourismGuestAction(tenantSlug, formData);
        if (!result.ok) {
          setFormError(resolveActionError(result.error));
          return;
        }

        setFirstName('');
        setLastName('');
        setFieldErrors({});
        if (passportRef.current) passportRef.current.value = '';
        if (entryStampRef.current) entryStampRef.current.value = '';
        setSuccessMessage(t('addGuest.success'));
        onGuestAdded();
      } catch (error) {
        if (error instanceof CompressImageForUploadError) {
          setFormError(resolveCompressError(error.code));
          return;
        }
        setFormError(t('errors.generic'));
      } finally {
        onUploadPendingChange?.(false);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold text-foreground">{t('addGuest.heading')}</h3>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="tourism-first-name">{t('addGuest.firstName')}</Label>
        <Input
          id="tourism-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={disabled || isPending}
          autoComplete="given-name"
          aria-invalid={Boolean(fieldErrors.firstName)}
        />
        {fieldErrors.firstName ? (
          <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-last-name">{t('addGuest.lastName')}</Label>
        <Input
          id="tourism-last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={disabled || isPending}
          autoComplete="family-name"
          aria-invalid={Boolean(fieldErrors.lastName)}
        />
        {fieldErrors.lastName ? (
          <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-passport">{t('addGuest.passport')}</Label>
        <Input
          id="tourism-passport"
          ref={passportRef}
          type="file"
          accept="image/*"
          disabled={disabled || isPending}
          aria-invalid={Boolean(fieldErrors.passport)}
        />
        {fieldErrors.passport ? (
          <p className="text-xs text-destructive">{fieldErrors.passport}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-entry-stamp">{t('addGuest.entryStamp')}</Label>
        <Input
          id="tourism-entry-stamp"
          ref={entryStampRef}
          type="file"
          accept="image/*"
          disabled={disabled || isPending}
          aria-invalid={Boolean(fieldErrors.entryStamp)}
        />
        {fieldErrors.entryStamp ? (
          <p className="text-xs text-destructive">{fieldErrors.entryStamp}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('addGuest.adding')}
          </>
        ) : (
          t('addGuest.submit')
        )}
      </Button>
    </form>
  );
}
