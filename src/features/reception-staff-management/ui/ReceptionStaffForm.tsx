'use client';

import { useState, useTransition } from 'react';

import { AdminField, adminFieldWidthClass } from '@/app/admin/(protected)/tenants/ui/AdminField';
import { RECEPTION_USER_PIN_MIN_LENGTH } from '@/entities/reception-user';
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
import {
  DESK_CHECK_IN_PERMISSION,
  DESK_CLEANING_PERMISSION,
  RECEPTION_STAFF_PERMISSIONS,
  type ReceptionStaffPermission,
} from '@/entities/reception-user';

type PermissionLabelMeta = { platform: string; ownerKey: string };

const PERMISSION_LABELS: Record<ReceptionStaffPermission, PermissionLabelMeta> = {
  [DESK_CHECK_IN_PERMISSION]: {
    platform: 'Check-in (Plan, Access, Cash, Issues, Transfers, Archive)',
    ownerKey: 'permissions.checkIn',
  },
  [DESK_CLEANING_PERMISSION]: {
    platform: 'Cleaning (housekeeping statuses)',
    ownerKey: 'permissions.cleaning',
  },
};

interface ReceptionStaffFormProps {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale: string;
  users: ReceptionStaffUser[];
  disabled?: boolean;
  onUserCreated: (user: ReceptionStaffUser) => void;
  onCancel: () => void;
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
      return `PIN must be at least ${RECEPTION_USER_PIN_MIN_LENGTH} characters.`;
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
  onCancel,
  onError,
}: ReceptionStaffFormProps) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [login, setLogin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<ReceptionStaffPermission[]>([
    DESK_CHECK_IN_PERMISSION,
  ]);
  const [fieldErrors, setFieldErrors] = useState<{
    login?: string;
    displayName?: string;
    pin?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  const limitReached = isActiveReceptionStaffLimitReached(users);
  const formDisabled = disabled || limitReached || isPending;

  const clearDraft = () => {
    setLogin('');
    setDisplayName('');
    setPin('');
    setPermissions([DESK_CHECK_IN_PERMISSION]);
    setFieldErrors({});
  };

  const togglePermission = (permission: ReceptionStaffPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission]
    );
  };

  const ownerFieldError = (key: 'login' | 'displayName' | 'pin', code: string) => {
    if (key === 'login') {
      if (code === 'required') return t('errors.loginRequired');
      if (code === 'invalid') return t('errors.loginInvalid');
    }
    if (key === 'displayName' && code === 'required') return t('errors.displayNameRequired');
    if (key === 'pin') {
      if (code === 'required') return t('errors.pinRequired');
      if (code === 'too_short') return t('errors.pinTooShort', { min: RECEPTION_USER_PIN_MIN_LENGTH });
    }
    return t('errors.validation');
  };

  const handleSubmit = () => {
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
                  ? `At least ${RECEPTION_USER_PIN_MIN_LENGTH} characters`
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
    for (const permission of permissions) {
      formData.append('permissions', permission);
    }

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

      clearDraft();
      onUserCreated(result.user);
    });
  };

  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  const loginLabel = surface === 'owner' ? t('loginLabel') : 'Login';
  const displayNameLabel = surface === 'owner' ? t('displayNameLabel') : 'Display name';
  const pinLabel = surface === 'owner' ? t('pinLabel') : 'PIN';
  const pinHint =
    surface === 'owner'
      ? t('pinHint', { min: RECEPTION_USER_PIN_MIN_LENGTH })
      : `At least ${RECEPTION_USER_PIN_MIN_LENGTH} characters. Staff sign in with login + PIN at reception.`;
  const submitLabel = surface === 'owner' ? t('addUser') : 'Add staff account';
  const cancelLabel = surface === 'owner' ? t('cancel') : 'Cancel';

  return (
    <div className="space-y-3">
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

      <fieldset className="space-y-2 rounded-md border px-3 py-3">
        <legend className="px-1 text-sm font-medium">
          {surface === 'owner' ? t('permissions.title') : 'Desk functions'}
        </legend>
        <p className="text-xs text-muted-foreground">
          {surface === 'owner'
            ? t('permissions.helper')
            : 'Assign one or both desk functions. Empty selection behaves as Check-in.'}
        </p>
        <div className="space-y-2">
          {RECEPTION_STAFF_PERMISSIONS.map((permission) => {
            const meta = PERMISSION_LABELS[permission];
            const label =
              surface === 'owner'
                ? t(meta.ownerKey as 'permissions.checkIn')
                : meta.platform;
            return (
              <label key={permission} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={formDisabled}
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={formDisabled}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? (surface === 'owner' ? t('adding') : 'Adding…') : submitLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
