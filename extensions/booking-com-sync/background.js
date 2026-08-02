const DEFAULTS = {
  webhookUrl: 'http://localhost:3000/api/integrations/booking-com/webhook',
  syncSecret: '',
  saasOpenUrl: 'http://localhost:3000',
  settingsConfigured: false,
  lastSyncAt: null,
  lastStatus: 'idle',
  lastError: null,
  hotelId: '',
  lastListSyncAt: null,
  lastListCount: 0,
};

const OUTBOX_KEY = 'outbox';
const CAPTURE_INDEX_KEY = 'bookingCaptureIndex';
const MAX_OUTBOX = 50;
const MAX_CAPTURE_INDEX = 200;

async function getSettings() {
  const stored = await chrome.storage.local.get(null);
  return { ...DEFAULTS, ...stored };
}

async function setStatus(patch) {
  await chrome.storage.local.set(patch);
}

function asTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Mirrors needsBookingComInboxReservationSync — contact OR total due missing. */
function needsDetailSync(booking) {
  const phone = asTrimmed(booking?.phone_number);
  const email = asTrimmed(booking?.guest_email);
  const hasContact = Boolean(phone || email);
  const list =
    asAmount(booking?.list_amount) ?? asAmount(booking?.amount) ?? null;
  const total = asAmount(booking?.total_amount);
  const amountDue = total ?? list;
  if (!hasContact) return true;
  if (amountDue == null) return true;
  if (list != null && total == null) return true;
  return false;
}

function normalizeCapturedBooking(raw) {
  const bookingId = asTrimmed(raw?.booking_id);
  if (!bookingId) return null;
  return {
    booking_id: bookingId,
    hotel_id: asTrimmed(raw?.hotel_id),
    guest_name: asTrimmed(raw?.guest_name) || null,
    phone_number: asTrimmed(raw?.phone_number) || null,
    guest_email: asTrimmed(raw?.guest_email) || null,
    list_amount: asAmount(raw?.list_amount),
    total_amount: asAmount(raw?.total_amount),
    amount: asAmount(raw?.amount),
    booking_status: asTrimmed(raw?.booking_status) || 'unknown',
    check_in: asTrimmed(raw?.check_in) || null,
    updatedAt: Date.now(),
  };
}

function mergeCaptured(existing, incoming) {
  if (!existing) return incoming;
  return {
    booking_id: incoming.booking_id,
    hotel_id: incoming.hotel_id || existing.hotel_id,
    guest_name: incoming.guest_name || existing.guest_name,
    phone_number: incoming.phone_number || existing.phone_number,
    guest_email: incoming.guest_email || existing.guest_email,
    list_amount: incoming.list_amount ?? existing.list_amount,
    total_amount: incoming.total_amount ?? existing.total_amount,
    amount: incoming.amount ?? existing.amount,
    booking_status: incoming.booking_status || existing.booking_status,
    check_in: incoming.check_in || existing.check_in,
    updatedAt: Date.now(),
  };
}

async function readCaptureIndex() {
  const { [CAPTURE_INDEX_KEY]: index = {} } = await chrome.storage.local.get(CAPTURE_INDEX_KEY);
  return index && typeof index === 'object' ? index : {};
}

async function writeCaptureIndex(index) {
  const entries = Object.entries(index).sort(
    (a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)
  );
  const trimmed = Object.fromEntries(entries.slice(0, MAX_CAPTURE_INDEX));
  await chrome.storage.local.set({ [CAPTURE_INDEX_KEY]: trimmed });
  return trimmed;
}

async function upsertCapturedBookings(bookings, { fromList = false } = {}) {
  const index = await readCaptureIndex();
  let hotelId = '';
  let listCount = 0;

  for (const raw of bookings) {
    const next = normalizeCapturedBooking(raw);
    if (!next) continue;
    index[next.booking_id] = mergeCaptured(index[next.booking_id], next);
    if (next.hotel_id) hotelId = next.hotel_id;
    listCount += 1;
  }

  await writeCaptureIndex(index);

  const patch = {};
  if (hotelId) patch.hotelId = hotelId;
  if (fromList) {
    patch.lastListSyncAt = new Date().toISOString();
    patch.lastListCount = listCount;
  }
  if (Object.keys(patch).length) await setStatus(patch);

  return summarizeCaptureIndex(index);
}

function summarizeCaptureIndex(index) {
  const rows = Object.values(index || {});
  const active = rows.filter((row) => row.booking_status !== 'cancelled');
  const needingDetails = active.filter((row) => needsDetailSync(row));
  const next = needingDetails
    .slice()
    .sort((a, b) => String(a.check_in || '').localeCompare(String(b.check_in || '')))[0];

  return {
    capturedCount: rows.length,
    activeCount: active.length,
    needingDetailsCount: needingDetails.length,
    nextNeedingDetails: next
      ? {
          booking_id: next.booking_id,
          hotel_id: next.hotel_id,
          guest_name: next.guest_name,
          check_in: next.check_in,
        }
      : null,
  };
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
    await upsertCapturedBookings(message.bookings, { fromList: true });
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
    await upsertCapturedBookings([message.booking], { fromList: false });
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

async function buildStatusPayload() {
  const settings = await getSettings();
  const index = await readCaptureIndex();
  const summary = summarizeCaptureIndex(index);
  return {
    lastStatus: settings.lastStatus,
    lastSyncAt: settings.lastSyncAt,
    lastError: settings.lastError,
    webhookUrl: settings.webhookUrl,
    hasSecret: Boolean(settings.syncSecret),
    saasOpenUrl: settings.saasOpenUrl,
    hotelId: settings.hotelId || '',
    lastListSyncAt: settings.lastListSyncAt,
    lastListCount: settings.lastListCount || 0,
    ...summary,
  };
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
    buildStatusPayload().then((payload) => sendResponse(payload));
    return true;
  }

  if (message.type === 'remember_hotel_id') {
    const hotelId = asTrimmed(message.hotelId);
    if (hotelId) {
      setStatus({ hotelId }).then(() => sendResponse({ ok: true, hotelId }));
      return true;
    }
    sendResponse({ ok: false });
    return false;
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
