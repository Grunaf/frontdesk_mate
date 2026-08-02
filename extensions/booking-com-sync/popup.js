const LIST_PATH =
  'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/search_reservations.html';
const DETAIL_PATH =
  'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html';

const RANGE_STORAGE_KEY = 'arrivalRange';

/** @typedef {'today' | 'week' | 'month'} ArrivalRange */
/** @typedef {'away' | 'list' | 'detail' | 'extranet'} PageKind */

function relativeTime(iso) {
  if (!iso) return 'No sync yet';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'No sync yet';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `Last update: ${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Last update: ${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  return `Last update: ${diffHr}h ago`;
}

function originPattern(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/*`;
  } catch {
    return null;
  }
}

async function ensureHostPermission(webhookUrl) {
  const pattern = originPattern(webhookUrl);
  if (!pattern) return false;
  const already = await chrome.permissions.contains({ origins: [pattern] });
  if (already) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

function paintStatus(status) {
  const el = document.getElementById('status');
  el.className = 'status';
  if (status === 'ok') {
    el.classList.add('status-ok');
    el.textContent = 'Active';
  } else if (status === 'error') {
    el.classList.add('status-error');
    el.textContent = 'Error';
  } else {
    el.classList.add('status-idle');
    el.textContent = 'Idle';
  }
}

function showView(view) {
  const statusView = document.getElementById('view-status');
  const settingsView = document.getElementById('view-settings');
  const isSettings = view === 'settings';
  statusView.hidden = isSettings;
  settingsView.hidden = !isSettings;
}

function isConfigured(stored) {
  if (stored?.settingsConfigured === true) return true;
  return Boolean(String(stored?.syncSecret || '').trim());
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** @param {ArrivalRange} range */
function arrivalDateBounds(range) {
  const today = new Date();
  const from = formatIsoDate(today);
  if (range === 'week') return { from, to: formatIsoDate(addDays(today, 6)) };
  if (range === 'month') return { from, to: formatIsoDate(addDays(today, 29)) };
  return { from, to: from };
}

/** @param {ArrivalRange} range */
function rangeLabel(range) {
  const { from, to } = arrivalDateBounds(range);
  if (range === 'today') return `Arrivals: today (${from})`;
  if (range === 'week') return `Arrivals: week (${from} → ${to})`;
  return `Arrivals: month (${from} → ${to})`;
}

/**
 * @param {{ hotelId: string, range: ArrivalRange }} input
 */
function buildSearchReservationsUrl(input) {
  const hotelId = String(input.hotelId || '').trim();
  if (!hotelId) return null;
  const { from, to } = arrivalDateBounds(input.range);
  const url = new URL(LIST_PATH);
  url.searchParams.set('source', 'nav');
  url.searchParams.set('upcoming_reservations', '1');
  url.searchParams.set('hotel_id', hotelId);
  url.searchParams.set('lang', 'xu');
  url.searchParams.append('reservation_status', 'ok');
  url.searchParams.append('reservation_status', 'cancelled');
  url.searchParams.set('date_from', from);
  url.searchParams.set('date_to', to);
  url.searchParams.set('date_type', 'arrival');
  return url.toString();
}

/**
 * @param {{ bookingId: string, hotelId: string }} input
 */
function buildReservationDetailUrl(input) {
  const bookingId = String(input.bookingId || '').trim();
  const hotelId = String(input.hotelId || '').trim();
  if (!bookingId || !hotelId) return null;
  const url = new URL(DETAIL_PATH);
  url.searchParams.set('res_id', bookingId);
  url.searchParams.set('hotel_id', hotelId);
  return url.toString();
}

/**
 * @param {string | undefined} tabUrl
 * @returns {{ kind: PageKind, hotelId: string, bookingId: string }}
 */
function detectPageFromUrl(tabUrl) {
  if (!tabUrl || !tabUrl.includes('admin.booking.com')) {
    return { kind: 'away', hotelId: '', bookingId: '' };
  }
  try {
    const url = new URL(tabUrl);
    const hotelId = url.searchParams.get('hotel_id') || url.searchParams.get('hotelId') || '';
    const bookingId = url.searchParams.get('res_id') || url.searchParams.get('reservation_id') || '';
    if (url.pathname.includes('search_reservations')) {
      return { kind: 'list', hotelId, bookingId };
    }
    if (url.pathname.includes('booking.html') && bookingId) {
      return { kind: 'detail', hotelId, bookingId };
    }
    return { kind: 'extranet', hotelId, bookingId };
  } catch {
    return { kind: 'away', hotelId: '', bookingId: '' };
  }
}

function pageContextCopy(kind, bookingId) {
  if (kind === 'list') return 'On reservations list — sync statuses';
  if (kind === 'detail') {
    return bookingId
      ? `On booking #${bookingId} — sync details`
      : 'On reservation page — sync details';
  }
  if (kind === 'extranet') return 'On Extranet — open arrivals list to scan';
  return 'Not on Booking.com Extranet';
}

async function loadSettingsFields() {
  const stored = await chrome.storage.local.get([
    'webhookUrl',
    'syncSecret',
    'saasOpenUrl',
    'settingsConfigured',
    RANGE_STORAGE_KEY,
  ]);
  document.getElementById('webhook-url').value = stored.webhookUrl || '';
  document.getElementById('sync-secret').value = stored.syncSecret || '';
  document.getElementById('saas-url').value = stored.saasOpenUrl || '';
  return stored;
}

/** @returns {ArrivalRange} */
function readActiveRange() {
  const active = document.querySelector('.chip.is-active');
  const range = active?.getAttribute('data-range');
  if (range === 'week' || range === 'month' || range === 'today') return range;
  return 'today';
}

/** @param {ArrivalRange} range */
function setActiveRange(range) {
  for (const chip of document.querySelectorAll('.chip')) {
    chip.classList.toggle('is-active', chip.getAttribute('data-range') === range);
  }
  document.getElementById('range-hint').textContent = rangeLabel(range);
}

/**
 * @param {object} status
 * @param {{ kind: PageKind, hotelId: string, bookingId: string }} page
 */
function paintProgress(status, page) {
  const progressEl = document.getElementById('progress');
  const needing = Number(status?.needingDetailsCount || 0);
  const captured = Number(status?.capturedCount || 0);
  const listCount = Number(status?.lastListCount || 0);

  if (!captured && !listCount) {
    progressEl.className = 'progress';
    progressEl.textContent = 'No list scan yet — open arrivals and sync';
    return;
  }

  progressEl.className = needing > 0 ? 'progress is-warn' : 'progress';
  const base =
    listCount > 0
      ? `${listCount} on last list scan`
      : `${captured} captured`;
  progressEl.textContent =
    needing > 0
      ? `${base} · ${needing} need details`
      : `${base} · details complete`;
}

/**
 * @param {string | undefined} tabUrl
 * @param {string} hotelId
 * @param {ArrivalRange} range
 */
function listMatchesSelectedRange(tabUrl, hotelId, range) {
  if (!tabUrl || !hotelId) return false;
  try {
    const current = new URL(tabUrl);
    const { from, to } = arrivalDateBounds(range);
    return (
      current.pathname.includes('search_reservations') &&
      (current.searchParams.get('hotel_id') || '') === hotelId &&
      current.searchParams.get('date_from') === from &&
      current.searchParams.get('date_to') === to &&
      current.searchParams.get('date_type') === 'arrival'
    );
  } catch {
    return false;
  }
}

/**
 * @param {object} status
 * @param {{ kind: PageKind, hotelId: string, bookingId: string }} page
 * @param {string | undefined} tabUrl
 */
function paintActions(status, page, tabUrl) {
  const primary = document.getElementById('primary-action');
  const secondary = document.getElementById('secondary-action');
  const hotelId = page.hotelId || status.hotelId || '';
  const needing = Number(status?.needingDetailsCount || 0);
  const next = status?.nextNeedingDetails || null;
  const range = readActiveRange();

  primary.disabled = false;
  secondary.hidden = true;

  if (page.kind === 'list') {
    const matches = listMatchesSelectedRange(tabUrl, hotelId, range);
    if (matches) {
      primary.textContent = 'Sync reservations list';
      primary.dataset.action = 'sync';
    } else {
      primary.textContent = 'Open list for selected dates';
      primary.dataset.action = 'open-list';
      secondary.hidden = false;
      secondary.textContent = 'Sync this list anyway';
      secondary.dataset.action = 'sync';
    }
    if (needing > 0 && next?.booking_id && matches) {
      secondary.hidden = false;
      secondary.textContent = `Open next booking (${needing} left)`;
      secondary.dataset.action = 'open-next';
    }
    return;
  }

  if (page.kind === 'detail') {
    primary.textContent = 'Sync this booking';
    primary.dataset.action = 'sync';
    if (needing > 1 || (needing === 1 && next?.booking_id && next.booking_id !== page.bookingId)) {
      secondary.hidden = false;
      secondary.textContent = `Open next needing details (${needing})`;
      secondary.dataset.action = 'open-next';
    }
    return;
  }

  if (!hotelId) {
    primary.textContent = 'Open Extranet (need hotel ID)';
    primary.dataset.action = 'open-extranet-home';
    primary.disabled = false;
    return;
  }

  primary.textContent = 'Open reservations list';
  primary.dataset.action = 'open-list';
  if (needing > 0 && next?.booking_id) {
    secondary.hidden = false;
    secondary.textContent = `Open next booking (${needing} left)`;
    secondary.dataset.action = 'open-next';
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function resolvePageContext(tab, status) {
  const fromUrl = detectPageFromUrl(tab?.url);
  let hotelId = fromUrl.hotelId || status.hotelId || '';
  let bookingId = fromUrl.bookingId;
  let kind = fromUrl.kind;

  if (tab?.id && fromUrl.kind !== 'away') {
    try {
      const ctx = await chrome.tabs.sendMessage(tab.id, { type: 'get_page_context' });
      if (ctx?.ok) {
        kind = ctx.kind || kind;
        hotelId = ctx.hotelId || hotelId;
        bookingId = ctx.bookingId || bookingId;
      }
    } catch {
      /* content script may not be injected yet */
    }
  }

  if (hotelId && hotelId !== status.hotelId) {
    await chrome.runtime.sendMessage({ type: 'remember_hotel_id', hotelId });
  }

  return { kind, hotelId, bookingId };
}

async function refreshStatus() {
  const status = await chrome.runtime.sendMessage({ type: 'get_status' });
  paintStatus(status?.lastStatus || 'idle');
  document.getElementById('last-sync').textContent = relativeTime(status?.lastSyncAt);

  const errorEl = document.getElementById('error');
  if (status?.lastError) {
    errorEl.hidden = false;
    errorEl.textContent = status.lastError;
  } else {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  const tab = await getActiveTab();
  const page = await resolvePageContext(tab, status || {});
  document.getElementById('page-context').textContent = pageContextCopy(
    page.kind,
    page.bookingId
  );
  paintProgress(status || {}, page);
  paintActions(status || {}, page, tab?.url);

  return { status, page, tab };
}

async function openListInTab(hotelId, range) {
  const url = buildSearchReservationsUrl({ hotelId, range });
  if (!url) {
    const errorEl = document.getElementById('error');
    errorEl.hidden = false;
    errorEl.textContent =
      'Hotel ID unknown — open any Extranet page for this property once, then retry.';
    paintStatus('error');
    return;
  }
  await chrome.tabs.create({ url });
}

async function openNextNeedingDetails(status) {
  const next = status?.nextNeedingDetails;
  const hotelId = next?.hotel_id || status?.hotelId || '';
  const url = buildReservationDetailUrl({
    bookingId: next?.booking_id || '',
    hotelId,
  });
  if (!url) {
    const errorEl = document.getElementById('error');
    errorEl.hidden = false;
    errorEl.textContent = 'No booking waiting for details.';
    return;
  }
  await chrome.tabs.create({ url });
}

async function syncCurrentPage(tab) {
  if (!tab?.id || !tab.url?.includes('admin.booking.com')) {
    paintStatus('error');
    const errorEl = document.getElementById('error');
    errorEl.hidden = false;
    errorEl.textContent = 'Open a Booking.com Extranet tab first';
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'sync_current_page' });
    await chrome.runtime.sendMessage({ type: 'flush_outbox' });
  } catch (error) {
    paintStatus('error');
    const errorEl = document.getElementById('error');
    errorEl.hidden = false;
    errorEl.textContent = error instanceof Error ? error.message : 'Could not sync tab';
    return;
  }
  await refreshStatus();
}

document.getElementById('open-settings').addEventListener('click', async () => {
  document.getElementById('settings-error').hidden = true;
  await loadSettingsFields();
  showView('settings');
});

document.getElementById('back-status').addEventListener('click', async () => {
  showView('status');
  await refreshStatus();
});

document.getElementById('save').addEventListener('click', async () => {
  const webhookUrl = document.getElementById('webhook-url').value.trim();
  const syncSecret = document.getElementById('sync-secret').value.trim();
  const saasOpenUrl = document.getElementById('saas-url').value.trim();
  const settingsError = document.getElementById('settings-error');

  if (!webhookUrl || !syncSecret) {
    settingsError.hidden = false;
    settingsError.textContent = 'Webhook URL and sync secret are required';
    return;
  }

  const allowed = await ensureHostPermission(webhookUrl);
  if (!allowed) {
    settingsError.hidden = false;
    settingsError.textContent = 'Host permission denied for webhook URL';
    return;
  }

  await chrome.storage.local.set({
    webhookUrl,
    syncSecret,
    saasOpenUrl,
    settingsConfigured: true,
  });
  await chrome.runtime.sendMessage({ type: 'flush_outbox' });
  settingsError.hidden = true;
  showView('status');
  await refreshStatus();
});

for (const chip of document.querySelectorAll('.chip')) {
  chip.addEventListener('click', async () => {
    const range = chip.getAttribute('data-range');
    if (range !== 'today' && range !== 'week' && range !== 'month') return;
    setActiveRange(range);
    await chrome.storage.local.set({ [RANGE_STORAGE_KEY]: range });
    await refreshStatus();
  });
}

document.getElementById('primary-action').addEventListener('click', async () => {
  const action = document.getElementById('primary-action').dataset.action;
  const { status, page, tab } = await refreshStatus();
  const hotelId = page.hotelId || status?.hotelId || '';
  const range = readActiveRange();

  if (action === 'sync') {
    await syncCurrentPage(tab);
    return;
  }
  if (action === 'open-list') {
    await openListInTab(hotelId, range);
    return;
  }
  if (action === 'open-extranet-home') {
    await chrome.tabs.create({ url: 'https://admin.booking.com/' });
    return;
  }
});

document.getElementById('secondary-action').addEventListener('click', async () => {
  const action = document.getElementById('secondary-action').dataset.action;
  const { status, tab } = await refreshStatus();
  if (action === 'open-next') {
    await openNextNeedingDetails(status);
    return;
  }
  if (action === 'sync') {
    await syncCurrentPage(tab);
  }
});

document.getElementById('open-saas').addEventListener('click', async () => {
  const { saasOpenUrl } = await chrome.storage.local.get('saasOpenUrl');
  const url = saasOpenUrl || 'http://localhost:3000';
  await chrome.tabs.create({ url });
});

async function boot() {
  const stored = await loadSettingsFields();
  const range =
    stored[RANGE_STORAGE_KEY] === 'week' ||
    stored[RANGE_STORAGE_KEY] === 'month' ||
    stored[RANGE_STORAGE_KEY] === 'today'
      ? stored[RANGE_STORAGE_KEY]
      : 'today';
  setActiveRange(range);

  if (!isConfigured(stored)) {
    showView('settings');
    return;
  }
  showView('status');
  await refreshStatus();
}

boot();
