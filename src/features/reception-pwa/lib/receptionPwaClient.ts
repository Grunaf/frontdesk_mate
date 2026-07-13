export const RECEPTION_SW_PATH = '/reception-sw.js';

export function isReceptionServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext;
}

export async function registerReceptionServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isReceptionServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(RECEPTION_SW_PATH, { scope: '/' });
    return registration;
  } catch (error) {
    console.error('registerReceptionServiceWorker:', error);
    return null;
  }
}

export function readVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeReceptionPush(
  registration: ServiceWorkerRegistration
): Promise<{ ok: true } | { ok: false; error: string }> {
  const vapidPublicKey = readVapidPublicKey();
  if (!vapidPublicKey) {
    return { ok: false, error: 'vapid_not_configured' };
  }

  if (!('PushManager' in window)) {
    return { ok: false, error: 'push_not_supported' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { ok: false, error: 'permission_denied' };
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const response = await fetch('/api/reception/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    return { ok: false, error: 'subscribe_failed' };
  }

  return { ok: true };
}
