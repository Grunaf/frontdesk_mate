'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { submitTourismGuestAction } from '../actions/submitTourismGuestAction';
import {
  compressImageForUpload,
  CompressImageForUploadError,
} from '../lib/compressImageForUpload';
import {
  DOCUMENT_KIND_FORM_KEY,
  type TourismDocumentKind,
} from '../model/tourismRegistrationProfiles';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, Button, Input, Label } from '@/shared/ui';

const MAX_NAME_LENGTH = 120;

const DOCUMENT_KIND_LABEL_KEY: Record<TourismDocumentKind, string> = {
  passport: 'addGuest.passport',
  entry_stamp: 'addGuest.entryStamp',
};

const DOCUMENT_KIND_ERROR_KEY: Record<TourismDocumentKind, string> = {
  passport: 'fieldErrors.passport',
  entry_stamp: 'fieldErrors.entryStamp',
};

type AddTourismGuestFormProps = {
  tenantSlug: string;
  requiredDocumentKinds: TourismDocumentKind[];
  disabled?: boolean;
  onGuestAdded: () => void;
  onUploadPendingChange?: (pending: boolean) => void;
};

type FieldErrors = Record<string, string | undefined> & {
  firstName?: string;
  lastName?: string;
};

export function AddTourismGuestForm({
  tenantSlug,
  requiredDocumentKinds,
  disabled = false,
  onGuestAdded,
  onUploadPendingChange,
}: AddTourismGuestFormProps) {
  const t = useTranslations('pages.staySetup.register');
  const tField = useTranslations('pages.staySetup.register.fieldErrors');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

    for (const kind of requiredDocumentKinds) {
      const formKey = DOCUMENT_KIND_FORM_KEY[kind];
      const file = fileRefs.current[formKey]?.files?.[0];
      if (!file?.size) {
        errors[formKey] = tField(DOCUMENT_KIND_ERROR_KEY[kind].replace('fieldErrors.', '') as 'passport' | 'entryStamp');
      }
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

    const filesToCompress = requiredDocumentKinds.map((kind) => {
      const formKey = DOCUMENT_KIND_FORM_KEY[kind];
      return { kind, formKey, file: fileRefs.current[formKey]!.files![0] };
    });

    startTransition(async () => {
      onUploadPendingChange?.(true);
      try {
        const compressed = await Promise.all(
          filesToCompress.map(({ file }) => compressImageForUpload(file))
        );

        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('lastName', lastName.trim());
        filesToCompress.forEach(({ formKey }, i) => {
          formData.append(formKey, compressed[i]);
        });

        const result = await submitTourismGuestAction(tenantSlug, formData);
        if (!result.ok) {
          setFormError(resolveActionError(result.error));
          return;
        }

        setFirstName('');
        setLastName('');
        setFieldErrors({});
        for (const { formKey } of filesToCompress) {
          const ref = fileRefs.current[formKey];
          if (ref) ref.value = '';
        }
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

      {requiredDocumentKinds.map((kind) => {
        const formKey = DOCUMENT_KIND_FORM_KEY[kind];
        const htmlId = `tourism-${formKey}`;
        return (
          <div key={kind} className="space-y-2">
            <Label htmlFor={htmlId}>{t(DOCUMENT_KIND_LABEL_KEY[kind])}</Label>
            <Input
              id={htmlId}
              ref={(el) => { fileRefs.current[formKey] = el; }}
              type="file"
              accept="image/*"
              disabled={disabled || isPending}
              aria-invalid={Boolean(fieldErrors[formKey])}
            />
            {fieldErrors[formKey] ? (
              <p className="text-xs text-destructive">{fieldErrors[formKey]}</p>
            ) : null}
          </div>
        );
      })}

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
