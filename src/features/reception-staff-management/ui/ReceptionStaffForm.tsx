'use client';

import { useState, useTransition } from 'react';

import { AdminField, adminFieldWidthClass } from '@/app/admin/(protected)/tenants/ui/AdminField';
import { DESK_PIN_MIN_LENGTH } from '@/entities/reception-user';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';

import { createReceptionUserAction } from '../actions/receptionStaffActions';
import {
  isActiveReceptionStaffLimitReached,
  MAX_ACTIVE_RECEPTION_STAFF,
  validateReceptionStaffCreateDraft,
} from '../lib/validateReceptionStaffForm';
import type {
  ReceptionStaffMutateError,
  ReceptionStaffSurface,
  ReceptionStaffUser,
} from '../model/types';

interface ReceptionStaffFormProps {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale: string;
  users: ReceptionStaffUser[];
  disabled?: boolean;
  onUserCreated: (user: ReceptionStaffUser) => void;
  onError: (message: string) => void;
}

function platformCreateErrorMessage(error: ReceptionStaffMutateError): string {
  switch (error) {
    case 'active_limit':
      return `This hostel already has the maximum of ${MAX_ACTIVE_RECEPTION_STAFF} active staff accounts.`;
    case 'login_taken':
      return 'That login is already in use for this hostel.';
    case 'invalid_login':
      return 'Login must use letters, numbers, dots, underscores, or hyphens.';
    case 'invalid_display_name':
      return 'Display name is required.';
    case 'invalid_pin':
      return `PIN must be at least ${DESK_PIN_MIN_LENGTH} characters.`;
    case 'validation':
      return 'Check the fields and try again.';
    case 'unauthorized':
    case 'forbidden':
      return 'You do not have permission to add staff.';
    case 'db_unavailable':
    case 'tenant_not_found':
      return 'Could not save. Try again later.';
    default:
      return 'Could not add staff. Try again.';
  }
}

export function ReceptionStaffForm({
  surface,
  tenantSlug,
  locale,
  users,
  disabled = false,
  onUserCreated,
  onError,
}: ReceptionStaffFormProps) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [login, setLogin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    login?: string;
    displayName?: string;
    pin?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  const limitReached = isActiveReceptionStaffLimitReached(users);
  const formDisabled = disabled || limitReached || isPending;

  const ownerFieldError = (key: 'login' | 'displayName' | 'pin', code: string) => {
    if (key === 'login') {
      if (code === 'required') return t('errors.loginRequired');
      if (code === 'invalid') return t('errors.loginInvalid');
    }
    if (key === 'displayName' && code === 'required') return t('errors.displayNameRequired');
    if (key === 'pin') {
      if (code === 'required') return t('errors.pinRequired');
      if (code === 'too_short') return t('errors.pinTooShort', { min: DESK_PIN_MIN_LENGTH });
    }
    return t('errors.validation');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    const validation = validateReceptionStaffCreateDraft({ login, displayName, pin });
    if (!validation.ok) {
      const next: typeof fieldErrors = {};
      for (const [field, code] of Object.entries(validation.fieldErrors)) {
        const key = field as keyof typeof fieldErrors;
        next[key] =
          surface === 'owner'
            ? ownerFieldError(key, code as string)
            : code === 'required'
              ? 'Required'
              : key === 'login' && code === 'invalid'
                ? 'Invalid login'
                : key === 'pin' && code === 'too_short'
                  ? `At least ${DESK_PIN_MIN_LENGTH} characters`
                  : 'Invalid';
      }
      setFieldErrors(next);
      return;
    }

    const formData = new FormData();
    formData.set('surface', surface);
    formData.set('tenantSlug', tenantSlug);
    formData.set('locale', locale);
    formData.set('login', login.trim());
    formData.set('displayName', displayName.trim());
    formData.set('pin', pin.trim());

    startTransition(async () => {
      const result = await createReceptionUserAction(formData);
      if (!result.ok) {
        onError(
          surface === 'owner'
            ? t(`errors.${result.error}` as 'errors.validation')
            : platformCreateErrorMessage(result.error)
        );
        return;
      }

      setLogin('');
      setDisplayName('');
      setPin('');
      onUserCreated(result.user);
    });
  };

  const loginLabel = surface === 'owner' ? t('loginLabel') : 'Login';
  const displayNameLabel = surface === 'owner' ? t('displayNameLabel') : 'Display name';
  const pinLabel = surface === 'owner' ? t('pinLabel') : 'PIN';
  const pinHint =
    surface === 'owner'
      ? t('pinHint', { min: DESK_PIN_MIN_LENGTH })
      : `At least ${DESK_PIN_MIN_LENGTH} characters. Staff sign in with login + PIN at reception.`;
  const submitLabel = surface === 'owner' ? t('addUser') : 'Add staff account';

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {limitReached ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          {surface === 'owner'
            ? t('activeLimitReached', { max: MAX_ACTIVE_RECEPTION_STAFF })
            : `Maximum of ${MAX_ACTIVE_RECEPTION_STAFF} active staff accounts reached.`}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        {surface === 'platform' ? (
          <>
            <AdminField
              label={loginLabel}
              value={login}
              onChange={setLogin}
              placeholder="maria.desk"
              hint="Lowercase; letters, numbers, . _ -"
              width="sm"
              className={fieldErrors.login ? 'border-destructive' : undefined}
            />
            <AdminField
              label={displayNameLabel}
              value={displayName}
              onChange={setDisplayName}
              placeholder="Maria"
              width="sm"
            />
          </>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{loginLabel}</span>
              <input
                type="text"
                autoComplete="off"
                disabled={formDisabled}
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="maria.desk"
                className={cn(
                  'rounded-md border bg-background px-3 py-2 text-sm',
                  adminFieldWidthClass('sm'),
                  fieldErrors.login && 'border-destructive'
                )}
              />
              {fieldErrors.login ? (
                <span className="text-xs text-destructive">{fieldErrors.login}</span>
              ) : (
                <span className="block text-xs text-muted-foreground">{t('loginHint')}</span>
              )}
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{displayNameLabel}</span>
              <input
                type="text"
                autoComplete="name"
                disabled={formDisabled}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={cn(
                  'rounded-md border bg-background px-3 py-2 text-sm',
                  adminFieldWidthClass('sm'),
                  fieldErrors.displayName && 'border-destructive'
                )}
              />
              {fieldErrors.displayName ? (
                <span className="text-xs text-destructive">{fieldErrors.displayName}</span>
              ) : null}
            </label>
          </>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{pinLabel}</span>
        <span className="block text-xs text-muted-foreground">{pinHint}</span>
        <input
          type="password"
          autoComplete="new-password"
          disabled={formDisabled}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={surface === 'owner' ? t('pinPlaceholder') : 'Set PIN'}
          className={cn(
            'rounded-md border bg-background px-3 py-2 text-sm',
            adminFieldWidthClass('sm'),
            fieldErrors.pin && 'border-destructive'
          )}
        />
        {fieldErrors.pin ? <span className="text-xs text-destructive">{fieldErrors.pin}</span> : null}
      </label>

      <button
        type="submit"
        disabled={formDisabled}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isPending ? (surface === 'owner' ? t('adding') : 'Adding…') : submitLabel}
      </button>
    </form>
  );
}
