const LIST_PATH =
  'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/search_reservations.html';

const RANGE_STORAGE_KEY = 'arrivalRange';
const DATE_FROM_STORAGE_KEY = 'arrivalDateFrom';
const DATE_TO_STORAGE_KEY = 'arrivalDateTo';
/** Hours after which a day's list scan is stale. */
const STALE_HOURS = 18;

/** @typedef {'today' | 'week' | 'month' | 'custom'} ArrivalRange */
/** @typedef {'away' | 'list' | 'detail' | 'extranet'} PageKind */

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

/** Show status chip only on error. */
function paintStatus(status) {
  const el = document.getElementById('status');
  if (status === 'error') {
    el.hidden = false;
    el.className = 'status status-error';
    el.textContent = 'Error';
    return;
  }
  el.hidden = true;
  el.textContent = '';
  el.className = 'status';
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

function parseIsoDay(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function eachIsoDay(fromIso, toIso) {
  const start = parseIsoDay(fromIso);
  const end = parseIsoDay(toIso);
  if (!start || !end || end < start) return [];
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(formatIsoDate(d));
  }
  return days;
}

function shortDayLabel(iso) {
  const d = parseIsoDay(iso);
  if (!d) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function relativeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** @param {ArrivalRange} range */
function arrivalDateBounds(range) {
  if (range === 'custom') {
    return readDateInputs();
  }
  const today = new Date();
  const from = formatIsoDate(today);
  if (range === 'week') return { from, to: formatIsoDate(addDays(today, 6)) };
  if (range === 'month') return { from, to: formatIsoDate(addDays(today, 29)) };
  return { from, to: from };
}

function isIsoDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function readDateInputs() {
  const fromEl = document.getElementById('date-from');
  const toEl = document.getElementById('date-to');
  let from = fromEl?.value || '';
  let to = toEl?.value || '';
  if (!isIsoDay(from)) from = formatIsoDate(new Date());
  if (!isIsoDay(to)) to = from;
  if (to < from) to = from;
  return { from, to };
}

function writeDateInputs(from, to) {
  const fromEl = document.getElementById('date-from');
  const toEl = document.getElementById('date-to');
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
}

function matchPresetForDates(from, to) {
  for (const range of /** @type {const} */ (['today', 'week', 'month'])) {
    const bounds = (() => {
      const today = new Date();
      const start = formatIsoDate(today);
      if (range === 'week') return { from: start, to: formatIsoDate(addDays(today, 6)) };
      if (range === 'month') return { from: start, to: formatIsoDate(addDays(today, 29)) };
      return { from: start, to: start };
    })();
    if (bounds.from === from && bounds.to === to) return range;
  }
  return 'custom';
}

/**
 * @param {{ hotelId: string, from: string, to: string, ses?: string }} input
 */
function buildSearchReservationsUrl(input) {
  const hotelId = String(input.hotelId || '').trim();
  if (!hotelId) return null;
  const from = isIsoDay(input.from) ? input.from : formatIsoDate(new Date());
  const to = isIsoDay(input.to) ? input.to : from;
  const url = new URL(LIST_PATH);
  url.searchParams.set('source', 'nav');
  url.searchParams.set('upcoming_reservations', '1');
  url.searchParams.set('hotel_id', hotelId);
  url.searchParams.set('lang', 'xu');
  url.searchParams.append('reservation_status', 'ok');
  url.searchParams.append('reservation_status', 'cancelled');
  url.searchParams.set('date_from', from);
  url.searchParams.set('date_to', to < from ? from : to);
  url.searchParams.set('date_type', 'arrival');
  const ses = String(input.ses || '').trim();
  if (ses) url.searchParams.set('ses', ses);
  return url.toString();
}

/** @param {string | undefined} tabUrl */
function sesFromUrl(tabUrl) {
  if (!tabUrl || !tabUrl.includes('admin.booking.com')) return '';
  try {
    return new URL(tabUrl).searchParams.get('ses')?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Prefer ses from the active Extranet tab; else any open admin.booking.com tab.
 * @param {chrome.tabs.Tab | null | undefined} activeTab
 */
async function resolveExtranetSes(activeTab) {
  const fromActive = sesFromUrl(activeTab?.url);
  if (fromActive) return fromActive;

  try {
    const tabs = await chrome.tabs.query({ url: 'https://admin.booking.com/*' });
    for (const tab of tabs) {
      const ses = sesFromUrl(tab.url);
      if (ses) return ses;
    }
  } catch {
    /* host/tabs access may be limited */
  }
  return '';
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
    DATE_FROM_STORAGE_KEY,
    DATE_TO_STORAGE_KEY,
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
  return 'custom';
}

/** @param {ArrivalRange} range */
function setActiveRange(range, { syncInputs = true } = {}) {
  for (const chip of document.querySelectorAll('.chip')) {
    chip.classList.toggle(
      'is-active',
      range !== 'custom' && chip.getAttribute('data-range') === range
    );
  }
  if (syncInputs && range !== 'custom') {
    const bounds = arrivalDateBounds(range);
    writeDateInputs(bounds.from, bounds.to);
  }
}

function clearChipSelection() {
  for (const chip of document.querySelectorAll('.chip')) {
    chip.classList.remove('is-active');
  }
}

async function persistDateWindow(range, from, to) {
  await chrome.storage.local.set({
    [RANGE_STORAGE_KEY]: range,
    [DATE_FROM_STORAGE_KEY]: from,
    [DATE_TO_STORAGE_KEY]: to,
  });
}

function isDayFresh(scannedAt, nowMs = Date.now()) {
  if (!scannedAt) return false;
  const then = new Date(scannedAt).getTime();
  if (!Number.isFinite(then)) return false;
  return nowMs - then <= STALE_HOURS * 60 * 60 * 1000;
}

/**
 * @param {object} status
 * @param {ArrivalRange} range
 */
function resolveFreshness(status, range) {
  const { from, to } = arrivalDateBounds(range);
  const days = eachIsoDay(from, to);
  const coverage =
    status?.arrivalCoverage && typeof status.arrivalCoverage === 'object'
      ? status.arrivalCoverage
      : {};
  const stale = [];
  const fresh = [];
  for (const day of days) {
    const scannedAt = coverage[day]?.scannedAt || null;
    if (isDayFresh(scannedAt)) fresh.push(day);
    else stale.push(day);
  }

  const today = formatIsoDate(new Date());
  const tomorrow = formatIsoDate(addDays(new Date(), 1));
  const priorityDays = [today, tomorrow].filter((d) => days.includes(d));
  const nudgeDay = priorityDays.find((d) => stale.includes(d)) || null;
  const nudgeIsWeekday = nudgeDay ? isWeekday(parseIsoDay(nudgeDay) || new Date()) : false;

  return { from, to, days, stale, fresh, nudgeDay, nudgeIsWeekday };
}

/**
 * @param {object} status
 * @param {ArrivalRange} range
 */
function paintFreshness(status, range) {
  const freshnessEl = document.getElementById('freshness');
  const nudgeEl = document.getElementById('freshness-nudge');
  const lastEl = document.getElementById('last-sync');
  const { stale, fresh, days, nudgeDay, nudgeIsWeekday, from, to } = resolveFreshness(
    status,
    range
  );

  // Hide success "fresh for …" copy — dates already shown above. Show only gaps / empty.
  if (!status?.lastListSyncAt && fresh.length === 0 && stale.length === days.length) {
    freshnessEl.hidden = false;
    freshnessEl.className = 'freshness is-warn';
    freshnessEl.textContent = 'No list scan yet for this window';
  } else if (stale.length === 0) {
    freshnessEl.hidden = true;
    freshnessEl.textContent = '';
  } else if (stale.length === days.length) {
    freshnessEl.hidden = false;
    freshnessEl.className = 'freshness is-warn';
    freshnessEl.textContent =
      days.length === 1
        ? `${shortDayLabel(days[0])} not scanned`
        : `Stale: whole window (${from} → ${to})`;
  } else {
    freshnessEl.hidden = false;
    freshnessEl.className = 'freshness is-warn';
    const shown = stale.slice(0, 4).map(shortDayLabel).join(', ');
    const more = stale.length > 4 ? ` +${stale.length - 4}` : '';
    freshnessEl.textContent = `Stale: ${shown}${more}`;
  }

  if (nudgeDay) {
    nudgeEl.hidden = false;
    const when =
      nudgeDay === formatIsoDate(new Date())
        ? 'today'
        : nudgeDay === formatIsoDate(addDays(new Date(), 1))
          ? 'tomorrow'
          : shortDayLabel(nudgeDay);
    nudgeEl.textContent = nudgeIsWeekday
      ? `Suggested: sync arrivals for ${when} (next working day coverage).`
      : `Suggested: sync arrivals for ${when}.`;
  } else {
    nudgeEl.hidden = true;
    nudgeEl.textContent = '';
  }

  const listAgo = relativeAgo(status?.lastListSyncAt);
  if (listAgo && status?.lastListDateFrom) {
    const span =
      status.lastListDateFrom === status.lastListDateTo
        ? shortDayLabel(status.lastListDateFrom)
        : `${shortDayLabel(status.lastListDateFrom)} → ${shortDayLabel(status.lastListDateTo)}`;
    lastEl.textContent = `List scanned ${listAgo} (${span})`;
  } else if (listAgo) {
    lastEl.textContent = `List scanned ${listAgo}`;
  } else {
    lastEl.textContent = 'No list scan yet';
  }
}

/**
 * @param {object} status
 */
function paintNeedsBadge(status) {
  const badge = document.getElementById('needs-details-badge');
  const countEl = document.getElementById('needs-details-count');
  const needing = Number(status?.needingDetailsCount || 0);
  if (needing > 0) {
    badge.hidden = false;
    countEl.textContent = String(needing);
    badge.setAttribute(
      'aria-label',
      `${needing} booking${needing === 1 ? '' : 's'} need details — open inbox`
    );
    badge.title = `${needing} need details — open Booking.com inbox`;
  } else {
    badge.hidden = true;
    countEl.textContent = '0';
  }
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
    const statuses = current.searchParams.getAll('reservation_status');
    const hasOk = statuses.includes('ok');
    const hasCancelled = statuses.includes('cancelled');
    return (
      current.pathname.includes('search_reservations') &&
      (current.searchParams.get('hotel_id') || '') === hotelId &&
      current.searchParams.get('date_from') === from &&
      current.searchParams.get('date_to') === to &&
      current.searchParams.get('date_type') === 'arrival' &&
      hasOk &&
      hasCancelled
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
  const range = readActiveRange();
  const freshness = resolveFreshness(status, range);

  primary.disabled = false;
  secondary.hidden = true;

  if (page.kind === 'list') {
    const matches = listMatchesSelectedRange(tabUrl, hotelId, range);
    if (matches) {
      primary.textContent = freshness.nudgeDay
        ? `Sync list (covers ${shortDayLabel(freshness.nudgeDay)})`
        : 'Sync reservations list';
      primary.dataset.action = 'sync';
    } else {
      primary.textContent = 'Open list for selected dates';
      primary.dataset.action = 'open-list';
      secondary.hidden = false;
      secondary.textContent = 'Sync this list anyway';
      secondary.dataset.action = 'sync';
    }
    return;
  }

  if (page.kind === 'detail') {
    primary.textContent = 'Sync this booking';
    primary.dataset.action = 'sync';
    return;
  }

  if (!hotelId) {
    primary.textContent = 'Open Extranet (need hotel ID)';
    primary.dataset.action = 'open-extranet-home';
    primary.disabled = false;
    return;
  }

  if (freshness.nudgeDay) {
    primary.textContent = `Open list · sync ${shortDayLabel(freshness.nudgeDay)}`;
  } else {
    primary.textContent = 'Open reservations list';
  }
  primary.dataset.action = 'open-list';
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
  let ses = sesFromUrl(tab?.url);

  if (tab?.id && fromUrl.kind !== 'away') {
    try {
      const ctx = await chrome.tabs.sendMessage(tab.id, { type: 'get_page_context' });
      if (ctx?.ok) {
        kind = ctx.kind || kind;
        hotelId = ctx.hotelId || hotelId;
        bookingId = ctx.bookingId || bookingId;
        if (ctx.ses) ses = String(ctx.ses).trim() || ses;
      }
    } catch {
      /* content script may not be injected yet */
    }
  }

  if (!ses) {
    ses = await resolveExtranetSes(tab);
  }

  if (hotelId && hotelId !== status.hotelId) {
    await chrome.runtime.sendMessage({ type: 'remember_hotel_id', hotelId });
  }

  return { kind, hotelId, bookingId, ses };
}

async function refreshStatus() {
  const status = await chrome.runtime.sendMessage({ type: 'get_status' });
  paintStatus(status?.lastStatus || 'idle');

  const errorEl = document.getElementById('error');
  if (status?.lastError) {
    errorEl.hidden = false;
    errorEl.textContent = status.lastError;
    paintStatus('error');
  } else {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  const tab = await getActiveTab();
  const page = await resolvePageContext(tab, status || {});
  const range = readActiveRange();
  document.getElementById('page-context').textContent = pageContextCopy(
    page.kind,
    page.bookingId
  );
  paintFreshness(status || {}, range);
  paintNeedsBadge(status || {});
  paintActions(status || {}, page, tab?.url);

  return { status, page, tab };
}

async function openListInTab(hotelId, range, ses) {
  const { from, to } = arrivalDateBounds(range);
  const url = buildSearchReservationsUrl({ hotelId, from, to, ses });
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

async function maybeMarkCoverageFromTab(tab) {
  if (!tab?.url?.includes('search_reservations')) return;
  try {
    const url = new URL(tab.url);
    const dateFrom = url.searchParams.get('date_from') || '';
    const dateTo = url.searchParams.get('date_to') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return;
    await chrome.runtime.sendMessage({
      type: 'mark_arrival_coverage',
      dateFrom,
      dateTo,
      scannedAt: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
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
    await maybeMarkCoverageFromTab(tab);
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
    const { from, to } = readDateInputs();
    await persistDateWindow(range, from, to);
    await refreshStatus();
  });
}

async function onDateInputsChanged() {
  let { from, to } = readDateInputs();
  if (to < from) {
    to = from;
    writeDateInputs(from, to);
  }
  const matched = matchPresetForDates(from, to);
  if (matched === 'custom') {
    clearChipSelection();
  } else {
    setActiveRange(matched, { syncInputs: false });
  }
  await persistDateWindow(matched, from, to);
  await refreshStatus();
}

document.getElementById('date-from').addEventListener('change', () => {
  void onDateInputsChanged();
});
document.getElementById('date-to').addEventListener('change', () => {
  void onDateInputsChanged();
});

function buildReceptionInboxUrl(baseUrl, day) {
  try {
    const url = new URL(baseUrl || 'http://localhost:3000');
    url.searchParams.set('tab', 'booking-inbox');
    url.searchParams.set('inbox', 'needs-sync');
    if (isIsoDay(day)) url.searchParams.set('day', day);
    return url.toString();
  } catch {
    return 'http://localhost:3000/?tab=booking-inbox&inbox=needs-sync';
  }
}

document.getElementById('needs-details-badge').addEventListener('click', async () => {
  const { saasOpenUrl } = await chrome.storage.local.get('saasOpenUrl');
  const { from, to } = readDateInputs();
  const day = from === to ? from : from;
  const url = buildReceptionInboxUrl(saasOpenUrl || 'http://localhost:3000', day);
  await chrome.tabs.create({ url });
});

document.getElementById('primary-action').addEventListener('click', async () => {
  const action = document.getElementById('primary-action').dataset.action;
  const { status, page, tab } = await refreshStatus();
  const hotelId = page.hotelId || status?.hotelId || '';
  const range = readActiveRange();
  const ses = page.ses || (await resolveExtranetSes(tab));

  if (action === 'sync') {
    await syncCurrentPage(tab);
    return;
  }
  if (action === 'open-list') {
    await openListInTab(hotelId, range, ses);
    return;
  }
  if (action === 'open-extranet-home') {
    await chrome.tabs.create({ url: 'https://admin.booking.com/' });
    return;
  }
});

document.getElementById('secondary-action').addEventListener('click', async () => {
  const action = document.getElementById('secondary-action').dataset.action;
  const { tab } = await refreshStatus();
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
  const storedFrom = isIsoDay(stored[DATE_FROM_STORAGE_KEY])
    ? stored[DATE_FROM_STORAGE_KEY]
    : '';
  const storedTo = isIsoDay(stored[DATE_TO_STORAGE_KEY]) ? stored[DATE_TO_STORAGE_KEY] : '';
  const storedRange = stored[RANGE_STORAGE_KEY];

  if (
    storedRange === 'today' ||
    storedRange === 'week' ||
    storedRange === 'month'
  ) {
    setActiveRange(storedRange);
  } else if (storedFrom && storedTo) {
    writeDateInputs(storedFrom, storedTo);
    const matched = matchPresetForDates(storedFrom, storedTo);
    if (matched === 'custom') clearChipSelection();
    else setActiveRange(matched, { syncInputs: false });
  } else {
    setActiveRange('today');
  }

  if (!isConfigured(stored)) {
    showView('settings');
    return;
  }
  showView('status');
  await refreshStatus();
}

boot();
