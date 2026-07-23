'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { submitTourismGuestAction } from '../actions/submitTourismGuestAction';
import {
  buildCitizenshipOptions,
  localeToDefaultCitizenship,
} from '../lib/citizenshipOptions';
import {
  isUnderageOnCheckIn,
  isValidPassportNumber,
  normalizePassportNumber,
  normalizePlaceOfBirth,
  type TourismGuestDocumentType,
  type TourismGuestGender,
} from '../lib/validateTourismGuestIdentity';
import type { TourismGuestFormValues } from '../lib/tourismGuestDraftStorage';
import { useLocale, useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  Alert,
  AlertDescription,
  Button,
  Calendar,
  FieldLabelHelp,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

const MAX_NAME_LENGTH = 120;
const MAX_PLACE_OF_BIRTH_LENGTH = 120;

export const ADD_TOURISM_GUEST_FORM_ID = 'add-tourism-guest-form';

type AddTourismGuestFormProps = {
  tenantSlug: string;
  /** Stay check-in calendar day (YYYY-MM-DD) for under-18 warning. */
  checkInDate: string;
  /** When true, underage copy is shown (no saved adult on the stay yet). */
  showUnderageAloneWarning?: boolean;
  initialValues?: Partial<TourismGuestFormValues>;
  disabled?: boolean;
  onGuestAdded: () => void;
  onUploadPendingChange?: (pending: boolean) => void;
  onCanSubmitChange?: (canSubmit: boolean) => void;
  onFormErrorChange?: (error: string | null) => void;
  onValuesChange?: (values: TourismGuestFormValues) => void;
  /** When false, omit the submit button (use an external `form={formId}` button). */
  showSubmitButton?: boolean;
  /** When false, form errors are reported only via `onFormErrorChange` (footer). */
  showInlineFormError?: boolean;
  formId?: string;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  placeOfBirth?: string;
  gender?: string;
  citizenship?: string;
  documentType?: string;
  passportNumber?: string;
};

function toCalendarDate(isoDay: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return undefined;
  const date = new Date(`${isoDay}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isFormComplete(values: TourismGuestFormValues): boolean {
  const first = values.firstName.trim();
  const last = values.lastName.trim();
  const place = values.placeOfBirth.trim();
  return (
    Boolean(first) &&
    first.length <= MAX_NAME_LENGTH &&
    Boolean(last) &&
    last.length <= MAX_NAME_LENGTH &&
    Boolean(values.dateOfBirth) &&
    Boolean(values.countryOfBirth) &&
    Boolean(place) &&
    place.length <= MAX_PLACE_OF_BIRTH_LENGTH &&
    Boolean(values.gender) &&
    Boolean(values.citizenship) &&
    Boolean(values.documentType) &&
    isValidPassportNumber(values.passportNumber)
  );
}

export function AddTourismGuestForm({
  tenantSlug,
  checkInDate,
  showUnderageAloneWarning = false,
  initialValues,
  disabled = false,
  onGuestAdded,
  onUploadPendingChange,
  onCanSubmitChange,
  onFormErrorChange,
  onValuesChange,
  showSubmitButton = true,
  showInlineFormError = true,
  formId = ADD_TOURISM_GUEST_FORM_ID,
}: AddTourismGuestFormProps) {
  const t = useTranslations('pages.staySetup.register');
  const tField = useTranslations('pages.staySetup.register.fieldErrors');
  const locale = useLocale();

  const citizenshipOptions = useMemo(() => buildCitizenshipOptions(locale), [locale]);
  const defaultCountry = useMemo(() => localeToDefaultCitizenship(locale), [locale]);

  const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? '');
  const [countryOfBirth, setCountryOfBirth] = useState(
    initialValues?.countryOfBirth ?? defaultCountry
  );
  const [placeOfBirth, setPlaceOfBirth] = useState(initialValues?.placeOfBirth ?? '');
  const [gender, setGender] = useState<TourismGuestGender | ''>(initialValues?.gender ?? '');
  const [citizenship, setCitizenship] = useState(initialValues?.citizenship ?? defaultCountry);
  const [documentType, setDocumentType] = useState<TourismGuestDocumentType>(
    initialValues?.documentType ?? 'passport'
  );
  const [passportNumber, setPassportNumber] = useState(initialValues?.passportNumber ?? '');
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const values: TourismGuestFormValues = useMemo(
    () => ({
      firstName,
      lastName,
      dateOfBirth,
      countryOfBirth,
      placeOfBirth,
      gender,
      citizenship,
      documentType,
      passportNumber,
    }),
    [
      firstName,
      lastName,
      dateOfBirth,
      countryOfBirth,
      placeOfBirth,
      gender,
      citizenship,
      documentType,
      passportNumber,
    ]
  );

  const canSubmit = isFormComplete(values);

  const showUnderageWarning =
    showUnderageAloneWarning &&
    Boolean(dateOfBirth) &&
    Boolean(checkInDate) &&
    isUnderageOnCheckIn(dateOfBirth, checkInDate);

  const documentNumberLabel =
    documentType === 'id_card' ? t('addGuest.idCardNumber') : t('addGuest.passportNumber');

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  useEffect(() => {
    onFormErrorChange?.(formError);
  }, [formError, onFormErrorChange]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  const resolveActionError = (code: string): string => {
    switch (code) {
      case 'registration_closed':
        return t('errors.registrationClosed');
      case 'invalid_input':
        return t('errors.invalidInput');
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

  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPlace = placeOfBirth.trim();

    if (!trimmedFirst || trimmedFirst.length > MAX_NAME_LENGTH) {
      errors.firstName = tField('firstName');
    }
    if (!trimmedLast || trimmedLast.length > MAX_NAME_LENGTH) {
      errors.lastName = tField('lastName');
    }
    if (!dateOfBirth) {
      errors.dateOfBirth = tField('dateOfBirth');
    }
    if (!countryOfBirth) {
      errors.countryOfBirth = tField('countryOfBirth');
    }
    if (!trimmedPlace || trimmedPlace.length > MAX_PLACE_OF_BIRTH_LENGTH) {
      errors.placeOfBirth = tField('placeOfBirth');
    }
    if (!gender) {
      errors.gender = tField('gender');
    }
    if (!citizenship) {
      errors.citizenship = tField('citizenship');
    }
    if (!documentType) {
      errors.documentType = tField('documentType');
    }
    if (!isValidPassportNumber(passportNumber)) {
      errors.passportNumber = tField('passportNumber');
    }

    return errors;
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setCountryOfBirth(defaultCountry);
    setPlaceOfBirth('');
    setGender('');
    setCitizenship(defaultCountry);
    setDocumentType('passport');
    setPassportNumber('');
    setFieldErrors({});
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    startTransition(async () => {
      onUploadPendingChange?.(true);
      try {
        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('dateOfBirth', dateOfBirth);
        formData.append('countryOfBirth', countryOfBirth);
        formData.append('placeOfBirth', normalizePlaceOfBirth(placeOfBirth));
        formData.append('gender', gender);
        formData.append('citizenship', citizenship);
        formData.append('documentType', documentType);
        formData.append('passportNumber', normalizePassportNumber(passportNumber));

        const result = await submitTourismGuestAction(tenantSlug, formData);
        if (!result.ok) {
          setFormError(resolveActionError(result.error));
          return;
        }

        resetForm();
        onGuestAdded();
      } catch {
        setFormError(t('errors.generic'));
      } finally {
        onUploadPendingChange?.(false);
      }
    });
  };

  const selectedDob = toCalendarDate(dateOfBirth);
  const fieldsDisabled = disabled || isPending;

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {showInlineFormError && formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tourism-date-of-birth">{t('addGuest.dateOfBirth')}</Label>
          <FieldLabelHelp fieldLabel={t('addGuest.dateOfBirth')}>
            <p>{t('addGuest.dateOfBirthHelp')}</p>
          </FieldLabelHelp>
        </div>
        <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="tourism-date-of-birth"
              type="button"
              variant="outline"
              disabled={fieldsDisabled}
              aria-invalid={Boolean(fieldErrors.dateOfBirth)}
              className={cn(
                'w-full justify-start font-normal',
                !selectedDob && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="size-4" aria-hidden />
              {selectedDob
                ? format(selectedDob, 'dd.MM.yyyy')
                : t('addGuest.dateOfBirthPlaceholder')}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={selectedDob}
              defaultMonth={selectedDob}
              startMonth={new Date(1920, 0)}
              endMonth={new Date()}
              onSelect={(date) => {
                if (!date) return;
                setDateOfBirth(format(date, 'yyyy-MM-dd'));
                setDobPopoverOpen(false);
              }}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
        {fieldErrors.dateOfBirth ? (
          <p className="text-xs text-destructive">{fieldErrors.dateOfBirth}</p>
        ) : null}
        {showUnderageWarning ? (
          <Alert>
            <AlertDescription>{t('addGuest.underageWarning')}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-first-name">{t('addGuest.firstName')}</Label>
        <Input
          id="tourism-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={fieldsDisabled}
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
          disabled={fieldsDisabled}
          autoComplete="family-name"
          aria-invalid={Boolean(fieldErrors.lastName)}
        />
        {fieldErrors.lastName ? (
          <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-country-of-birth">{t('addGuest.countryOfBirth')}</Label>
        <Select
          value={countryOfBirth || undefined}
          onValueChange={setCountryOfBirth}
          disabled={fieldsDisabled}
        >
          <SelectTrigger
            id="tourism-country-of-birth"
            className="w-full"
            aria-invalid={Boolean(fieldErrors.countryOfBirth)}
          >
            <SelectValue placeholder={t('addGuest.countryOfBirthPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {citizenshipOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.countryOfBirth ? (
          <p className="text-xs text-destructive">{fieldErrors.countryOfBirth}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourism-place-of-birth">{t('addGuest.placeOfBirth')}</Label>
        <Input
          id="tourism-place-of-birth"
          value={placeOfBirth}
          onChange={(e) => setPlaceOfBirth(e.target.value)}
          disabled={fieldsDisabled}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors.placeOfBirth)}
        />
        {fieldErrors.placeOfBirth ? (
          <p className="text-xs text-destructive">{fieldErrors.placeOfBirth}</p>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <div className="flex items-center gap-1.5">
          <legend className="text-sm font-medium leading-none">{t('addGuest.gender')}</legend>
          <FieldLabelHelp fieldLabel={t('addGuest.gender')}>
            <p>{t('addGuest.genderHelp')}</p>
          </FieldLabelHelp>
        </div>
        <div className="flex flex-wrap gap-4">
          {(['male', 'female'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-sm text-foreground',
                fieldsDisabled && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="radio"
                name="tourism-gender"
                value={value}
                checked={gender === value}
                onChange={() => setGender(value)}
                disabled={fieldsDisabled}
                className="size-4 accent-primary"
              />
              <span>{t(`addGuest.genderOptions.${value}`)}</span>
            </label>
          ))}
        </div>
        {fieldErrors.gender ? (
          <p className="text-xs text-destructive">{fieldErrors.gender}</p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="tourism-citizenship">{t('addGuest.citizenship')}</Label>
        <Select
          value={citizenship || undefined}
          onValueChange={setCitizenship}
          disabled={fieldsDisabled}
        >
          <SelectTrigger
            id="tourism-citizenship"
            className="w-full"
            aria-invalid={Boolean(fieldErrors.citizenship)}
          >
            <SelectValue placeholder={t('addGuest.citizenshipPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {citizenshipOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.citizenship ? (
          <p className="text-xs text-destructive">{fieldErrors.citizenship}</p>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <div className="flex items-center gap-1.5">
          <legend className="text-sm font-medium leading-none">{t('addGuest.documentType')}</legend>
          <FieldLabelHelp fieldLabel={t('addGuest.documentType')}>
            <p>{t('addGuest.documentTypeHelp')}</p>
          </FieldLabelHelp>
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { value: 'passport', label: t('addGuest.documentTypeOptions.passport') },
              { value: 'id_card', label: t('addGuest.documentTypeOptions.idCard') },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-sm text-foreground',
                fieldsDisabled && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="radio"
                name="tourism-document-type"
                value={option.value}
                checked={documentType === option.value}
                onChange={() => setDocumentType(option.value)}
                disabled={fieldsDisabled}
                className="size-4 accent-primary"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.documentType ? (
          <p className="text-xs text-destructive">{fieldErrors.documentType}</p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="tourism-passport-number">{documentNumberLabel}</Label>
        <Input
          id="tourism-passport-number"
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          disabled={fieldsDisabled}
          autoComplete="off"
          inputMode="text"
          spellCheck={false}
          aria-invalid={Boolean(fieldErrors.passportNumber)}
        />
        {fieldErrors.passportNumber ? (
          <p className="text-xs text-destructive">{fieldErrors.passportNumber}</p>
        ) : null}
      </div>

      {showSubmitButton ? (
        <Button type="submit" className="w-full" disabled={fieldsDisabled || !canSubmit}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('addGuest.adding')}
            </>
          ) : (
            t('addGuest.submit')
          )}
        </Button>
      ) : null}
    </form>
  );
}

export type { TourismGuestFormValues };
