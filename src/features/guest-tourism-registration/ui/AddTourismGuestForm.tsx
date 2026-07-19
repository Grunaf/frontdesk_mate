'use client';

import { useMemo, useState, useTransition } from 'react';
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
  type TourismGuestGender,
} from '../lib/validateTourismGuestIdentity';
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

type AddTourismGuestFormProps = {
  tenantSlug: string;
  /** Stay check-in calendar day (YYYY-MM-DD) for under-18 warning. */
  checkInDate: string;
  disabled?: boolean;
  onGuestAdded: () => void;
  onUploadPendingChange?: (pending: boolean) => void;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  citizenship?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  gender?: string;
};

function toCalendarDate(isoDay: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return undefined;
  const date = new Date(`${isoDay}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function AddTourismGuestForm({
  tenantSlug,
  checkInDate,
  disabled = false,
  onGuestAdded,
  onUploadPendingChange,
}: AddTourismGuestFormProps) {
  const t = useTranslations('pages.staySetup.register');
  const tField = useTranslations('pages.staySetup.register.fieldErrors');
  const locale = useLocale();

  const citizenshipOptions = useMemo(() => buildCitizenshipOptions(locale), [locale]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [citizenship, setCitizenship] = useState(() => localeToDefaultCitizenship(locale));
  const [passportNumber, setPassportNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<TourismGuestGender | ''>('');
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showUnderageWarning =
    Boolean(dateOfBirth) &&
    Boolean(checkInDate) &&
    isUnderageOnCheckIn(dateOfBirth, checkInDate);

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

    if (!trimmedFirst || trimmedFirst.length > MAX_NAME_LENGTH) {
      errors.firstName = tField('firstName');
    }
    if (!trimmedLast || trimmedLast.length > MAX_NAME_LENGTH) {
      errors.lastName = tField('lastName');
    }
    if (!citizenship) {
      errors.citizenship = tField('citizenship');
    }
    if (!isValidPassportNumber(passportNumber)) {
      errors.passportNumber = tField('passportNumber');
    }
    if (!dateOfBirth) {
      errors.dateOfBirth = tField('dateOfBirth');
    }
    if (!gender) {
      errors.gender = tField('gender');
    }

    return errors;
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setCitizenship(localeToDefaultCitizenship(locale));
    setPassportNumber('');
    setDateOfBirth('');
    setGender('');
    setFieldErrors({});
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

    startTransition(async () => {
      onUploadPendingChange?.(true);
      try {
        const formData = new FormData();
        formData.append('firstName', firstName.trim());
        formData.append('lastName', lastName.trim());
        formData.append('citizenship', citizenship);
        formData.append('passportNumber', normalizePassportNumber(passportNumber));
        formData.append('dateOfBirth', dateOfBirth);
        formData.append('gender', gender);

        const result = await submitTourismGuestAction(tenantSlug, formData);
        if (!result.ok) {
          setFormError(resolveActionError(result.error));
          return;
        }

        resetForm();
        setSuccessMessage(t('addGuest.success'));
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

      <div className="space-y-2">
        <Label htmlFor="tourism-passport-number">{t('addGuest.passportNumber')}</Label>
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

      <fieldset className="space-y-2">
        <div className="flex items-center gap-1.5">
          <legend className="text-sm font-medium leading-none">
            {t('addGuest.gender')}
          </legend>
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

      <Button type="submit" className="w-full" disabled={fieldsDisabled}>
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
