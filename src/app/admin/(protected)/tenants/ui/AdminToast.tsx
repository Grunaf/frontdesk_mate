'use client';

import { Toast, type ToastProps } from '@/shared/ui';

export type AdminToastVariant = 'success' | 'warning';

export type AdminToastProps = Omit<ToastProps, 'variant'> & {
  variant: AdminToastVariant;
};

/** @deprecated Prefer `Toast` from `@/shared/ui`. Thin compat wrapper. */
export function AdminToast(props: AdminToastProps) {
  return <Toast {...props} />;
}
