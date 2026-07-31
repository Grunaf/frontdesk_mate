const DEFAULTS = {
  webhookUrl: 'http://localhost:3000/api/integrations/booking-com/webhook',
  syncSecret: '',
  saasOpenUrl: 'http://localhost:3000',
  lastSyncAt: null,
  lastStatus: 'idle',
  lastError: null,
};

const OUTBOX_KEY = 'outbox';
const MAX_OUTBOX = 50;

async function getSettings() {
  const stored = await chrome.storage.local.get(null);
  return { ...DEFAULTS, ...stored };
}

async function setStatus(patch) {
  await chrome.storage.local.set(patch);
}

async function enqueue(item) {
  const { outbox = [] } = await chrome.storage.local.get(OUTBOX_KEY);
  const next = [...outbox, { ...item, queuedAt: Date.now() }].slice(-MAX_OUTBOX);
  await chrome.storage.local.set({ [OUTBOX_KEY]: next });
}

async function flushOutbox() {
  const settings = await getSettings();
  if (!settings.syncSecret || !settings.webhookUrl) {
    await setStatus({ lastStatus: 'error', lastError: 'Configure webhook URL and sync secret' });
    return { ok: false, error: 'not_configured' };
  }

  const { outbox = [] } = await chrome.storage.local.get(OUTBOX_KEY);
  if (outbox.length === 0) {
    return { ok: true, sent: 0 };
  }

  const remaining = [];
  let sent = 0;

  for (const item of outbox) {
    const result = await postWebhook(settings, item.body);
    if (result.ok) {
      sent += 1;
    } else {
      remaining.push(item);
      await setStatus({
        lastStatus: 'error',
        lastError: result.error || 'send_failed',
      });
    }
  }

  await chrome.storage.local.set({ [OUTBOX_KEY]: remaining });
  if (sent > 0 && remaining.length === 0) {
    await setStatus({
      lastStatus: 'ok',
      lastSyncAt: new Date().toISOString(),
      lastError: null,
    });
  }

  return { ok: remaining.length === 0, sent, remaining: remaining.length };
}

async function postWebhook(settings, body) {
  try {
    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.syncSecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let error = `http_${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.error) error = String(payload.error);
      } catch {
        /* ignore */
      }
      return { ok: false, error };
    }

    await setStatus({
      lastStatus: 'ok',
      lastSyncAt: new Date().toISOString(),
      lastError: null,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
}

async function handlePayload(message) {
  if (message.type === 'bookings.upsert_batch' && Array.isArray(message.bookings)) {
    const body = {
      schemaVersion: 1,
      event: 'bookings.upsert_batch',
      bookings: message.bookings,
    };
    const settings = await getSettings();
    const result = await postWebhook(settings, body);
    if (!result.ok) {
      await enqueue({ body });
    }
    return;
  }

  if (message.type === 'bookings.patch' && message.booking) {
    const body = {
      schemaVersion: 1,
      event: 'bookings.patch',
      booking: message.booking,
    };
    const settings = await getSettings();
    const result = await postWebhook(settings, body);
    if (!result.ok) {
      await enqueue({ body });
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'bookings.upsert_batch' || message.type === 'bookings.patch') {
    handlePayload(message).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'flush_outbox') {
    flushOutbox().then((result) => sendResponse(result));
    return true;
  }

  if (message.type === 'get_status') {
    getSettings().then((settings) =>
      sendResponse({
        lastStatus: settings.lastStatus,
        lastSyncAt: settings.lastSyncAt,
        lastError: settings.lastError,
        webhookUrl: settings.webhookUrl,
        hasSecret: Boolean(settings.syncSecret),
        saasOpenUrl: settings.saasOpenUrl,
      })
    );
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null).then((stored) => {
    const patch = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (stored[key] === undefined) patch[key] = value;
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
  });
});
