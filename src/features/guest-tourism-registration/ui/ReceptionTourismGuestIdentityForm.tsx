'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { buildCitizenshipOptions } from '../lib/citizenshipOptions';
import {
  isUnderageOnCheckIn,
  isValidPassportNumber,
  normalizePassportNumber,
  normalizePlaceOfBirth,
  type TourismGuestDocumentType,
  type TourismGuestGender,
} from '../lib/validateTourismGuestIdentity';
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

export type ReceptionTourismGuestIdentityValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender: TourismGuestGender;
  citizenship: string;
  documentType: TourismGuestDocumentType;
  passportNumber: string;
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

type ReceptionTourismGuestIdentityFormProps = {
  checkInDate: string;
  initialValues?: Partial<ReceptionTourismGuestIdentityValues>;
  submitLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  isPending?: boolean;
  onCancel?: () => void;
  onSubmit: (values: ReceptionTourismGuestIdentityValues) => void;
};

function toCalendarDate(isoDay: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return undefined;
  const date = new Date(`${isoDay}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function ReceptionTourismGuestIdentityForm({
  checkInDate,
  initialValues,
  submitLabel,
  pendingLabel,
  disabled = false,
  isPending = false,
  onCancel,
  onSubmit,
}: ReceptionTourismGuestIdentityFormProps) {
  const citizenshipOptions = useMemo(() => buildCitizenshipOptions('en'), []);
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? '');
  const [countryOfBirth, setCountryOfBirth] = useState(
    initialValues?.countryOfBirth ?? initialValues?.citizenship ?? 'ME'
  );
  const [placeOfBirth, setPlaceOfBirth] = useState(initialValues?.placeOfBirth ?? '');
  const [gender, setGender] = useState<TourismGuestGender | ''>(initialValues?.gender ?? '');
  const [citizenship, setCitizenship] = useState(initialValues?.citizenship ?? 'ME');
  const [documentType, setDocumentType] = useState<TourismGuestDocumentType>(
    initialValues?.documentType ?? 'passport'
  );
  const [passportNumber, setPassportNumber] = useState(initialValues?.passportNumber ?? '');
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const showUnderageWarning =
    Boolean(dateOfBirth) &&
    Boolean(checkInDate) &&
    isUnderageOnCheckIn(dateOfBirth, checkInDate);

  const documentNumberLabel =
    documentType === 'id_card' ? 'ID card number' : 'Passport number';

  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPlace = placeOfBirth.trim();

    if (!trimmedFirst || trimmedFirst.length > MAX_NAME_LENGTH) {
      errors.firstName = 'Enter a first name (max 120 characters).';
    }
    if (!trimmedLast || trimmedLast.length > MAX_NAME_LENGTH) {
      errors.lastName = 'Enter a last name (max 120 characters).';
    }
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Select a date of birth.';
    }
    if (!countryOfBirth) {
      errors.countryOfBirth = 'Select country of birth.';
    }
    if (!trimmedPlace || trimmedPlace.length > MAX_PLACE_OF_BIRTH_LENGTH) {
      errors.placeOfBirth = 'Enter place of birth (max 120 characters).';
    }
    if (!gender) {
      errors.gender = 'Select gender.';
    }
    if (!citizenship) {
      errors.citizenship = 'Select citizenship.';
    }
    if (!documentType) {
      errors.documentType = 'Select document type.';
    }
    if (!isValidPassportNumber(passportNumber)) {
      errors.passportNumber =
        'Enter a document number using only letters and digits (no spaces or symbols).';
    }

    return errors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !gender) {
      return;
    }

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      countryOfBirth,
      placeOfBirth: normalizePlaceOfBirth(placeOfBirth),
      gender,
      citizenship,
      documentType,
      passportNumber: normalizePassportNumber(passportNumber),
    });
  };

  const selectedDob = toCalendarDate(dateOfBirth);
  const fieldsDisabled = disabled || isPending;
  const canSubmit =
    Boolean(firstName.trim()) &&
    firstName.trim().length <= MAX_NAME_LENGTH &&
    Boolean(lastName.trim()) &&
    lastName.trim().length <= MAX_NAME_LENGTH &&
    Boolean(dateOfBirth) &&
    Boolean(countryOfBirth) &&
    Boolean(placeOfBirth.trim()) &&
    placeOfBirth.trim().length <= MAX_PLACE_OF_BIRTH_LENGTH &&
    Boolean(gender) &&
    Boolean(citizenship) &&
    Boolean(documentType) &&
    isValidPassportNumber(passportNumber);

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border border-border/60 bg-background/80 p-2.5">
      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-date-of-birth" className="text-xs">
          Date of birth
        </Label>
        <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="reception-tourism-date-of-birth"
              type="button"
              variant="outline"
              disabled={fieldsDisabled}
              aria-invalid={Boolean(fieldErrors.dateOfBirth)}
              className={cn(
                'h-8 w-full justify-start text-xs font-normal',
                !selectedDob && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="size-3.5" aria-hidden />
              {selectedDob ? format(selectedDob, 'dd.MM.yyyy') : 'Select date'}
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
          <p className="text-[11px] text-destructive">{fieldErrors.dateOfBirth}</p>
        ) : null}
        {showUnderageWarning ? (
          <Alert className="py-2">
            <AlertDescription className="text-[11px]">
              This guest will be under 18 on check-in and cannot register alone. Start with an adult
              guest (18+), then add younger guests.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-first-name" className="text-xs">
          First name
        </Label>
        <Input
          id="reception-tourism-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={fieldsDisabled}
          autoComplete="given-name"
          className="h-8 text-xs"
          aria-invalid={Boolean(fieldErrors.firstName)}
        />
        {fieldErrors.firstName ? (
          <p className="text-[11px] text-destructive">{fieldErrors.firstName}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-last-name" className="text-xs">
          Last name
        </Label>
        <Input
          id="reception-tourism-last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={fieldsDisabled}
          autoComplete="family-name"
          className="h-8 text-xs"
          aria-invalid={Boolean(fieldErrors.lastName)}
        />
        {fieldErrors.lastName ? (
          <p className="text-[11px] text-destructive">{fieldErrors.lastName}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-country-of-birth" className="text-xs">
          Country of birth
        </Label>
        <Select
          value={countryOfBirth || undefined}
          onValueChange={setCountryOfBirth}
          disabled={fieldsDisabled}
        >
          <SelectTrigger
            id="reception-tourism-country-of-birth"
            className="h-8 w-full text-xs"
            aria-invalid={Boolean(fieldErrors.countryOfBirth)}
          >
            <SelectValue placeholder="Select country" />
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
          <p className="text-[11px] text-destructive">{fieldErrors.countryOfBirth}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-place-of-birth" className="text-xs">
          Place of birth
        </Label>
        <Input
          id="reception-tourism-place-of-birth"
          value={placeOfBirth}
          onChange={(e) => setPlaceOfBirth(e.target.value)}
          disabled={fieldsDisabled}
          autoComplete="off"
          className="h-8 text-xs"
          aria-invalid={Boolean(fieldErrors.placeOfBirth)}
        />
        {fieldErrors.placeOfBirth ? (
          <p className="text-[11px] text-destructive">{fieldErrors.placeOfBirth}</p>
        ) : null}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium leading-none">Gender</legend>
        <div className="flex flex-wrap gap-3">
          {(['male', 'female'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 text-xs text-foreground',
                fieldsDisabled && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="radio"
                name="reception-tourism-gender"
                value={value}
                checked={gender === value}
                onChange={() => setGender(value)}
                disabled={fieldsDisabled}
                className="size-3.5 accent-primary"
              />
              <span>{value === 'male' ? 'Male' : 'Female'}</span>
            </label>
          ))}
        </div>
        {fieldErrors.gender ? (
          <p className="text-[11px] text-destructive">{fieldErrors.gender}</p>
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-citizenship" className="text-xs">
          Citizenship
        </Label>
        <Select
          value={citizenship || undefined}
          onValueChange={setCitizenship}
          disabled={fieldsDisabled}
        >
          <SelectTrigger
            id="reception-tourism-citizenship"
            className="h-8 w-full text-xs"
            aria-invalid={Boolean(fieldErrors.citizenship)}
          >
            <SelectValue placeholder="Select country" />
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
          <p className="text-[11px] text-destructive">{fieldErrors.citizenship}</p>
        ) : null}
      </div>

      <fieldset className="space-y-1.5">
        <div className="flex items-center gap-1">
          <legend className="text-xs font-medium leading-none">Document type</legend>
          <FieldLabelHelp fieldLabel="Document type">
            <p>
              Other document types are not offered because they are not suitable for guest
              identification for tourism registration.
            </p>
          </FieldLabelHelp>
        </div>
        <div className="flex flex-wrap gap-3">
          {(
            [
              { value: 'passport', label: 'Passport' },
              { value: 'id_card', label: 'ID card' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 text-xs text-foreground',
                fieldsDisabled && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="radio"
                name="reception-tourism-document-type"
                value={option.value}
                checked={documentType === option.value}
                onChange={() => setDocumentType(option.value)}
                disabled={fieldsDisabled}
                className="size-3.5 accent-primary"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.documentType ? (
          <p className="text-[11px] text-destructive">{fieldErrors.documentType}</p>
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-passport-number" className="text-xs">
          {documentNumberLabel}
        </Label>
        <Input
          id="reception-tourism-passport-number"
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          disabled={fieldsDisabled}
          autoComplete="off"
          inputMode="text"
          spellCheck={false}
          className="h-8 text-xs"
          aria-invalid={Boolean(fieldErrors.passportNumber)}
        />
        {fieldErrors.passportNumber ? (
          <p className="text-[11px] text-destructive">{fieldErrors.passportNumber}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button type="submit" size="sm" className="h-7 text-[11px]" disabled={fieldsDisabled || !canSubmit}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={fieldsDisabled}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
