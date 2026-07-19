'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { buildCitizenshipOptions } from '../lib/citizenshipOptions';
import {
  isUnderageOnCheckIn,
  isValidPassportNumber,
  normalizePassportNumber,
  type TourismGuestGender,
} from '../lib/validateTourismGuestIdentity';
import { cn } from '@/shared/lib/utils';
import {
  Alert,
  AlertDescription,
  Button,
  Calendar,
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

export type ReceptionTourismGuestIdentityValues = {
  firstName: string;
  lastName: string;
  citizenship: string;
  passportNumber: string;
  dateOfBirth: string;
  gender: TourismGuestGender;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  citizenship?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  gender?: string;
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
  const [citizenship, setCitizenship] = useState(initialValues?.citizenship ?? 'ME');
  const [passportNumber, setPassportNumber] = useState(initialValues?.passportNumber ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? '');
  const [gender, setGender] = useState<TourismGuestGender | ''>(initialValues?.gender ?? '');
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const showUnderageWarning =
    Boolean(dateOfBirth) &&
    Boolean(checkInDate) &&
    isUnderageOnCheckIn(dateOfBirth, checkInDate);

  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || trimmedFirst.length > MAX_NAME_LENGTH) {
      errors.firstName = 'Enter a first name (max 120 characters).';
    }
    if (!trimmedLast || trimmedLast.length > MAX_NAME_LENGTH) {
      errors.lastName = 'Enter a last name (max 120 characters).';
    }
    if (!citizenship) {
      errors.citizenship = 'Select citizenship.';
    }
    if (!isValidPassportNumber(passportNumber)) {
      errors.passportNumber =
        'Enter a passport number using only letters and digits (no spaces or symbols).';
    }
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Select a date of birth.';
    }
    if (!gender) {
      errors.gender = 'Select gender.';
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
      citizenship,
      passportNumber: normalizePassportNumber(passportNumber),
      dateOfBirth,
      gender,
    });
  };

  const selectedDob = toCalendarDate(dateOfBirth);
  const fieldsDisabled = disabled || isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border border-border/60 bg-background/80 p-2.5">
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

      <div className="space-y-1.5">
        <Label htmlFor="reception-tourism-passport-number" className="text-xs">
          Passport number
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
              This guest will be under 18 on the check-in date. You can still submit — review bed
              allocation if needed.
            </AlertDescription>
          </Alert>
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

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button type="submit" size="sm" className="h-7 text-[11px]" disabled={fieldsDisabled}>
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
