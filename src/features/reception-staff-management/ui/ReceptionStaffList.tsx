'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import { adminFieldWidthClass } from '@/app/admin/(protected)/tenants/ui/AdminField';
import { AdminToast } from '@/app/admin/(protected)/tenants/ui/AdminToast';
import { RECEPTION_USER_PIN_MIN_LENGTH } from '@/entities/reception-user';
import { getTenantPublicUrl } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';

import {
  disableReceptionUserAction,
  listReceptionStaffUsersAction,
  updateReceptionStaffPermissionsAction,
  updateReceptionUserPinAction,
} from '../actions/receptionStaffActions';
import {
  countActiveReceptionStaff,
  isActiveReceptionStaffLimitReached,
  MAX_ACTIVE_RECEPTION_STAFF,
  validateReceptionStaffPinDraft,
} from '../lib/validateReceptionStaffForm';
import { ReceptionStaffForm } from './ReceptionStaffForm';
import type {
  ReceptionStaffMutateError,
  ReceptionStaffSurface,
  ReceptionStaffUser,
} from '../model/types';
import {
  RECEPTION_STAFF_PERMISSIONS,
  type ReceptionStaffPermission,
} from '@/entities/reception-user';

type PermissionLabelMeta = { platform: string; ownerKey: string };

/** Filled when RECEPTION_STAFF_PERMISSIONS gains keys again. */
const PERMISSION_BADGE_LABELS: Record<string, PermissionLabelMeta> = {};
const PERMISSION_EDIT_LABELS: Record<string, PermissionLabelMeta> = {};
export interface ReceptionStaffManagementProps {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale?: string;
  disabled?: boolean;
}

function platformMutateErrorMessage(error: ReceptionStaffMutateError): string {
  switch (error) {
    case 'active_limit':
      return `Maximum of ${MAX_ACTIVE_RECEPTION_STAFF} active staff accounts.`;
    case 'user_disabled':
      return 'This account is disabled.';
    case 'already_disabled':
      return 'This account is already disabled.';
    case 'user_not_found':
      return 'Staff account not found.';
    case 'invalid_pin':
      return `PIN must be at least ${RECEPTION_USER_PIN_MIN_LENGTH} characters.`;
    case 'validation':
      return 'Check the fields and try again.';
    case 'unauthorized':
    case 'forbidden':
      return 'You do not have permission to change staff.';
    case 'db_unavailable':
    case 'tenant_not_found':
      return 'Could not save. Try again later.';
    default:
      return 'Something went wrong. Try again.';
  }
}

function sortUsers(users: ReceptionStaffUser[]): ReceptionStaffUser[] {
  return [...users].sort((a, b) => a.login.localeCompare(b.login));
}

function PinChangeRow({
  surface,
  tenantSlug,
  locale,
  user,
  disabled,
  onUpdated,
  onError,
}: {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale: string;
  user: ReceptionStaffUser;
  disabled: boolean;
  onUpdated: (user: ReceptionStaffUser) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const savePin = () => {
    setPinError(null);
    const validation = validateReceptionStaffPinDraft(pin);
    if (!validation.ok) {
      const code = validation.fieldErrors.pin;
      setPinError(
        surface === 'owner'
          ? code === 'required'
            ? t('errors.pinRequired')
            : t('errors.pinTooShort', { min: RECEPTION_USER_PIN_MIN_LENGTH })
          : code === 'required'
            ? 'PIN is required'
            : `At least ${RECEPTION_USER_PIN_MIN_LENGTH} characters`
      );
      return;
    }

    const formData = new FormData();
    formData.set('surface', surface);
    formData.set('tenantSlug', tenantSlug);
    formData.set('locale', locale);
    formData.set('userId', user.id);
    formData.set('pin', pin.trim());

    startTransition(async () => {
      const result = await updateReceptionUserPinAction(formData);
      if (!result.ok) {
        onError(
          surface === 'owner'
            ? t(`errors.${result.error}` as 'errors.validation')
            : platformMutateErrorMessage(result.error)
        );
        return;
      }
      setPin('');
      setOpen(false);
      onUpdated(result.user);
    });
  };

  if (user.disabledAt) {
    return null;
  }

  const changeLabel = surface === 'owner' ? t('changePin') : 'Change PIN';
  const saveLabel = surface === 'owner' ? t('savePin') : 'Save PIN';

  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      {!open ? (
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {changeLabel}
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              {surface === 'owner' ? t('newPinLabel') : 'New PIN'}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              disabled={disabled || isPending}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className={cn(
                'rounded-md border bg-background px-3 py-2 text-sm',
                adminFieldWidthClass('sm'),
                pinError && 'border-destructive'
              )}
            />
            {pinError ? <span className="text-xs text-destructive">{pinError}</span> : null}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={savePin}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? '…' : saveLabel}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                setPin('');
                setPinError(null);
              }}
              className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {surface === 'owner' ? t('cancel') : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionsEditRow({
  surface,
  tenantSlug,
  locale,
  user,
  disabled,
  onUpdated,
  onError,
}: {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale: string;
  user: ReceptionStaffUser;
  disabled: boolean;
  onUpdated: (user: ReceptionStaffUser) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<ReceptionStaffPermission[]>(user.permissions);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPermissions(user.permissions);
  }, [user.permissions]);

  if (user.disabledAt) {
    return null;
  }

  if (RECEPTION_STAFF_PERMISSIONS.length === 0) {
    return null;
  }

  const togglePermission = (permission: ReceptionStaffPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission]
    );
  };

  const savePermissions = () => {
    const formData = new FormData();
    formData.set('surface', surface);
    formData.set('tenantSlug', tenantSlug);
    formData.set('locale', locale);
    formData.set('userId', user.id);
    for (const permission of permissions) {
      formData.append('permissions', permission);
    }

    startTransition(async () => {
      const result = await updateReceptionStaffPermissionsAction(formData);
      if (!result.ok) {
        onError(
          surface === 'owner'
            ? t(`errors.${result.error}` as 'errors.validation')
            : platformMutateErrorMessage(result.error)
        );
        return;
      }
      setOpen(false);
      onUpdated(result.user);
    });
  };

  const editLabel = surface === 'owner' ? t('permissions.edit') : 'Edit permissions';
  const saveLabel = surface === 'owner' ? t('permissions.save') : 'Save permissions';

  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      {!open ? (
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {editLabel}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {surface === 'owner' ? t('permissions.title') : 'Permissions'}
          </p>
            {RECEPTION_STAFF_PERMISSIONS.map((permission) => {
              const meta = PERMISSION_EDIT_LABELS[permission];
              const label =
                surface === 'owner' && meta
                  ? t(meta.ownerKey as 'permissions.lineStaff')
                  : (meta?.platform ?? permission);
              return (
                <label key={permission} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={disabled || isPending}
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={savePermissions}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? '…' : saveLabel}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                setPermissions(user.permissions);
              }}
              className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {surface === 'owner' ? t('cancel') : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffRow({
  surface,
  tenantSlug,
  locale,
  user,
  disabled,
  onUpdated,
  onError,
}: {
  surface: ReceptionStaffSurface;
  tenantSlug: string;
  locale: string;
  user: ReceptionStaffUser;
  disabled: boolean;
  onUpdated: (user: ReceptionStaffUser) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [isPending, startTransition] = useTransition();
  const isDisabled = Boolean(user.disabledAt);

  const statusLabel = isDisabled
    ? surface === 'owner'
      ? t('statusDisabled')
      : 'Disabled'
    : surface === 'owner'
      ? t('statusActive')
      : 'Active';

  const handleDisable = () => {
    const confirmMessage =
      surface === 'owner'
        ? t('disableConfirm', { login: user.login })
        : `Disable staff login “${user.login}”? They will not be able to sign in.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const formData = new FormData();
    formData.set('surface', surface);
    formData.set('tenantSlug', tenantSlug);
    formData.set('locale', locale);
    formData.set('userId', user.id);

    startTransition(async () => {
      const result = await disableReceptionUserAction(formData);
      if (!result.ok) {
        onError(
          surface === 'owner'
            ? t(`errors.${result.error}` as 'errors.validation')
            : platformMutateErrorMessage(result.error)
        );
        return;
      }
      onUpdated(result.user);
    });
  };

  const disableLabel = surface === 'owner' ? t('disable') : 'Disable';

  return (
    <li
      className={cn(
        'rounded-lg border px-4 py-3',
        isDisabled ? 'bg-muted/30 opacity-80' : 'bg-background'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {user.displayName}{' '}
            <span className="font-normal text-muted-foreground">({user.login})</span>
          </p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
          {user.permissions.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {user.permissions.map((permission) => {
                const badge = PERMISSION_BADGE_LABELS[permission];
                return (
                  <span
                    key={permission}
                    className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {surface === 'owner' && badge
                      ? t(badge.ownerKey as 'permissions.lineStaff')
                      : (badge?.platform ?? permission)}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {surface === 'owner' ? t('permissions.lineStaff') : 'Line staff'}
            </p>
          )}
        </div>
        {!isDisabled ? (
          <button
            type="button"
            disabled={disabled || isPending}
            onClick={handleDisable}
            className="text-xs font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
          >
            {isPending ? '…' : disableLabel}
          </button>
        ) : null}
      </div>
      <PermissionsEditRow
        surface={surface}
        tenantSlug={tenantSlug}
        locale={locale}
        user={user}
        disabled={disabled}
        onUpdated={onUpdated}
        onError={onError}
      />
      <PinChangeRow
        surface={surface}
        tenantSlug={tenantSlug}
        locale={locale}
        user={user}
        disabled={disabled}
        onUpdated={onUpdated}
        onError={onError}
      />
    </li>
  );
}

export function ReceptionStaffManagement({
  surface,
  tenantSlug,
  locale = 'en',
  disabled = false,
}: ReceptionStaffManagementProps) {
  const t = useTranslations('pages.owner.receptionStaff');
  const [users, setUsers] = useState<ReceptionStaffUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'warning' } | null>(
    null
  );

  const showToast = useCallback((message: string, variant: 'success' | 'warning' = 'warning') => {
    setToast({ message, variant });
  }, []);

  const reload = useCallback(async () => {
    if (!tenantSlug.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const result = await listReceptionStaffUsersAction(tenantSlug, surface);
    setLoading(false);

    if (!result.ok) {
      setLoadError(
        surface === 'owner'
          ? t('errors.loadFailed')
          : 'Could not load reception staff.'
      );
      return;
    }

    setUsers(sortUsers(result.users));
    if (result.users.length === 0) {
      setAddOpen(true);
    }
  }, [surface, tenantSlug, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const replaceUser = (next: ReceptionStaffUser) => {
    setUsers((current) => sortUsers(current.map((u) => (u.id === next.id ? next : u))));
  };

  const appendUser = (user: ReceptionStaffUser) => {
    setUsers((current) => sortUsers([...current, user]));
    setAddOpen(false);
    showToast(surface === 'owner' ? t('created') : 'Staff account added.', 'success');
  };

  if (!tenantSlug.trim()) {
    return null;
  }

  const activeCount = countActiveReceptionStaff(users);
  const limitReached = isActiveReceptionStaffLimitReached(users);
  const showAddForm = addOpen && !limitReached;
  const receptionLoginUrl = getTenantPublicUrl(tenantSlug, 'reception', locale, '/login');

  const title = surface === 'owner' ? t('title') : 'Reception staff accounts';
  const description =
    surface === 'owner'
      ? t('description')
      : 'Individual logins for the reception desk app.';
  const activeSummary =
    surface === 'owner'
      ? t('activeSummary', { count: activeCount, max: MAX_ACTIVE_RECEPTION_STAFF })
      : `${activeCount} active · max ${MAX_ACTIVE_RECEPTION_STAFF}`;
  const loginUrlLabel = surface === 'owner' ? t('loginUrlLabel') : 'Reception login URL';
  const emptyLabel =
    surface === 'owner' ? t('empty') : 'No staff accounts yet. Create the first account.';
  const addLabel = surface === 'owner' ? t('addUser') : 'Add staff account';
  const limitLabel =
    surface === 'owner'
      ? t('activeLimitReached', { max: MAX_ACTIVE_RECEPTION_STAFF })
      : `Maximum of ${MAX_ACTIVE_RECEPTION_STAFF} active staff accounts reached.`;

  const shellClass = 'space-y-4 rounded-lg border bg-muted/10 px-4 py-3';

  return (
    <div className={shellClass}>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">{activeSummary}</p>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{loginUrlLabel}</span>
        <p className="text-sm">
          <a
            href={receptionLoginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {receptionLoginUrl}
          </a>
        </p>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {surface === 'owner' ? t('loading') : 'Loading staff…'}
        </p>
      ) : (
        <>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <StaffRow
                  key={user.id}
                  surface={surface}
                  tenantSlug={tenantSlug}
                  locale={locale}
                  user={user}
                  disabled={disabled}
                  onUpdated={replaceUser}
                  onError={showToast}
                />
              ))}
            </ul>
          )}

          {limitReached ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">{limitLabel}</p>
          ) : null}

          {showAddForm ? (
            <ReceptionStaffForm
              surface={surface}
              tenantSlug={tenantSlug}
              locale={locale}
              users={users}
              disabled={disabled}
              onUserCreated={appendUser}
              onCancel={() => setAddOpen(false)}
              onError={showToast}
            />
          ) : (
            <button
              type="button"
              disabled={disabled || limitReached}
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {addLabel}
            </button>
          )}
        </>
      )}

      {toast ? (
        <AdminToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

export { ReceptionStaffManagement as ReceptionStaffList };
