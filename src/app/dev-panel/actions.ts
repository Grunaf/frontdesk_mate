'use server';

import { redirect } from 'next/navigation';
import {
  clearDevPanelSession,
  setDevPanelSession,
} from './lib/devPanelSession';

function readDevPanelSecret(): string | undefined {
  return (
    process.env.DEV_PANEL_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

export async function loginDevPanelAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/dev-panel');
  const expected = readDevPanelSecret();

  if (!expected || password !== expected) {
    redirect('/dev-panel/login?error=1');
  }

  await setDevPanelSession();
  redirect(next.startsWith('/dev-panel') ? next : '/dev-panel');
}

export async function logoutDevPanelAction(): Promise<void> {
  await clearDevPanelSession();
  redirect('/dev-panel/login');
}
