const SOURCE = 'fdm-booking-ext';

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

let phoneHintShownFor = null;
let phoneObserver = null;

function asString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== '') return obj[key];
  }
  return undefined;
}

function hotelIdFromPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('hotel_id') || params.get('hotelId') || '';
  } catch {
    return '';
  }
}

function bookingIdFromPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('res_id') || params.get('reservation_id') || '';
  } catch {
    return '';
  }
}

function normalizeStatus(raw) {
  const s = asString(raw).toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('no_show') || s.includes('noshow') || s.includes('no-show')) return 'no_show';
  if (s.includes('ok') || s.includes('book') || s.includes('confirm') || s.includes('guest')) {
    return 'ok';
  }
  return 'unknown';
}

function toIsoDate(year, monthIndex, day) {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Parses "Sat, Aug 1, 2026" / "Aug 1, 2026" / "2026-08-01". */
function parseExtranetDate(raw) {
  const text = asString(raw);
  if (!text) return null;
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const m = text.match(
    /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (!m) return null;
  const monthIndex = MONTHS[m[1].toLowerCase()];
  if (monthIndex == null) return null;
  return toIsoDate(Number(m[3]), monthIndex, Number(m[2]));
}

function parseGuestCounts(text) {
  const t = asString(text).toLowerCase();
  if (!t) return { adults: null, children: null };
  const adultsMatch = t.match(/(\d+)\s*adult/);
  const childrenMatch = t.match(/(\d+)\s*child/);
  const guestsOnly = t.match(/(\d+)\s*guest/);
  const adults = adultsMatch ? Number(adultsMatch[1]) : guestsOnly ? Number(guestsOnly[1]) : null;
  const children = childrenMatch ? Number(childrenMatch[1]) : null;
  return {
    adults: Number.isFinite(adults) ? adults : null,
    children: Number.isFinite(children) ? children : null,
  };
}

function parseAmountCurrency(text) {
  const t = asString(text);
  if (!t) return { amount: null, currency: null };
  const currencyMatch = t.match(/\b([A-Z]{3})\b/);
  const amount = asNumber(t);
  return {
    amount,
    currency: currencyMatch ? currencyMatch[1] : null,
  };
}

function parsePhoneFromText(text) {
  const match = asString(text).match(/(\+\d[\d\s().-]{6,}\d)/);
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

function parseEmailFromRoot(root) {
  const mail = root.querySelector('a[href^="mailto:"]');
  if (!mail) return null;
  const href = asString(mail.getAttribute('href')).replace(/^mailto:/i, '').split('?')[0];
  if (href.includes('@')) return href.toLowerCase();
  const label = asString(mail.textContent);
  return label.includes('@') ? label.toLowerCase() : null;
}

function emptyBooking(bookingId, hotelId, source) {
  return {
    booking_id: bookingId,
    hotel_id: hotelId,
    guest_name: null,
    phone_number: null,
    guest_email: null,
    adults: null,
    children: null,
    check_in: null,
    check_out: null,
    list_amount: null,
    total_amount: null,
    currency: null,
    status: 'unknown',
    room_name: null,
    source,
    captured_at: new Date().toISOString(),
  };
}

function normalizeOne(raw, fallbackHotelId, source) {
  if (!raw || typeof raw !== 'object') return null;

  const bookingId = asString(
    pick(raw, [
      'booking_id',
      'reservation_id',
      'reservationId',
      'res_id',
      'resId',
      'id',
      'confirmation_number',
    ])
  );
  const hotelId =
    asString(pick(raw, ['hotel_id', 'hotelId', 'property_id', 'propertyId'])) ||
    asString(fallbackHotelId);
  if (!bookingId || !hotelId) return null;

  const guestName = asString(
    pick(raw, ['guest_name', 'guestName', 'booker_name', 'bookerName', 'name', 'full_name'])
  );
  const phone = asString(
    pick(raw, ['phone_number', 'phoneNumber', 'phone', 'guest_phone', 'telephone', 'mobile'])
  );
  const email = asString(pick(raw, ['guest_email', 'guestEmail', 'email', 'booker_email']));
  const adults = asNumber(pick(raw, ['adults', 'adult_count', 'number_of_adults', 'nr_adults']));
  const children = asNumber(
    pick(raw, ['children', 'child_count', 'number_of_children', 'nr_children'])
  );
  const checkIn = asString(
    pick(raw, ['check_in', 'checkin', 'checkIn', 'arrival_date', 'arrivalDate', 'from_date'])
  ).slice(0, 10);
  const checkOut = asString(
    pick(raw, ['check_out', 'checkout', 'checkOut', 'departure_date', 'departureDate', 'to_date'])
  ).slice(0, 10);
  const legacyAmount = asNumber(
    pick(raw, ['amount', 'price', 'total_price', 'totalPrice', 'price_euro', 'commissionable_amount'])
  );
  const listAmount = asNumber(pick(raw, ['list_amount', 'listAmount'])) ??
    (source === 'detail_api' ? null : legacyAmount);
  const totalAmount = asNumber(pick(raw, ['total_amount', 'totalAmount'])) ??
    (source === 'detail_api' ? legacyAmount : null);
  const currency = asString(pick(raw, ['currency', 'currency_code', 'currencyCode'])).toUpperCase();
  const roomName = asString(pick(raw, ['room_name', 'roomName', 'room_type', 'roomType', 'unit_name']));
  const status = normalizeStatus(pick(raw, ['status', 'booking_status', 'reservation_status']));

  return {
    booking_id: bookingId,
    hotel_id: hotelId,
    guest_name: guestName || null,
    phone_number: phone || null,
    guest_email: email ? email.toLowerCase() : null,
    adults,
    children,
    check_in: /^\d{4}-\d{2}-\d{2}$/.test(checkIn) ? checkIn : parseExtranetDate(checkIn),
    check_out: /^\d{4}-\d{2}-\d{2}$/.test(checkOut) ? checkOut : parseExtranetDate(checkOut),
    list_amount: listAmount,
    total_amount: totalAmount,
    currency: currency || null,
    status,
    room_name: roomName || null,
    source,
    captured_at: new Date().toISOString(),
  };
}

function walkCollect(node, out, depth = 0) {
  if (depth > 8 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) walkCollect(item, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;

  const looksLikeBooking =
    pick(node, ['reservation_id', 'reservationId', 'res_id', 'resId', 'confirmation_number']) !=
      null ||
    (pick(node, ['check_in', 'checkin', 'arrival_date', 'arrivalDate']) != null &&
      pick(node, ['guest_name', 'booker_name', 'bookerName', 'name']) != null);

  if (looksLikeBooking) {
    out.push(node);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') walkCollect(value, out, depth + 1);
  }
}

function extractBookingsFromApiBody(body, sourceHint) {
  const hotelId = hotelIdFromPage();
  const pageBookingId = bookingIdFromPage();
  const candidates = [];
  walkCollect(body, candidates);

  const normalized = [];
  const seen = new Set();
  for (const raw of candidates) {
    const item = normalizeOne(raw, hotelId, sourceHint);
    if (!item) continue;
    if (seen.has(item.booking_id)) continue;
    seen.add(item.booking_id);
    normalized.push(item);
  }

  if (normalized.length === 0 && pageBookingId && hotelId) {
    const phone = asString(
      pick(body, ['phone_number', 'phoneNumber', 'phone', 'guest_phone', 'telephone'])
    );
    const email = asString(pick(body, ['guest_email', 'guestEmail', 'email']));
    if (phone || email) {
      const row = emptyBooking(pageBookingId, hotelId, 'detail_api');
      row.phone_number = phone || null;
      row.guest_email = email ? email.toLowerCase() : null;
      normalized.push(row);
    }
  }

  return normalized;
}

function parseIdsFromHref(href) {
  try {
    const url = new URL(href, window.location.origin);
    const bookingId = url.searchParams.get('res_id') || url.searchParams.get('reservation_id') || '';
    const hotelId = url.searchParams.get('hotel_id') || url.searchParams.get('hotelId') || '';
    return { bookingId, hotelId };
  } catch {
    return { bookingId: '', hotelId: '' };
  }
}

function headingCell(row, heading) {
  const el =
    row.querySelector(`td[data-heading="${heading}"], th[data-heading="${heading}"]`) ||
    row.querySelector(`[data-heading="${heading}"]`);
  return el ? asString(el.textContent) : '';
}

function parseListFromDom() {
  const table = document.querySelector('table.reservation-table');
  if (!table) return [];

  const rows = [...table.querySelectorAll('tbody tr.bui-table__row, tbody tr')].filter((row) =>
    row.querySelector('a[href*="res_id="], a[href*="reservation_id="]')
  );
  const fallbackHotel = hotelIdFromPage();
  const out = [];
  const seen = new Set();

  for (const row of rows) {
    const nameLink =
      row.querySelector('th[data-heading="Guest Name"] a[href*="res_id="]') ||
      row.querySelector('a[href*="res_id="]');
    if (!nameLink) continue;
    const { bookingId, hotelId: hrefHotel } = parseIdsFromHref(nameLink.getAttribute('href') || '');
    const hotelId = hrefHotel || fallbackHotel;
    if (!bookingId || !hotelId || seen.has(bookingId)) continue;
    seen.add(bookingId);

    const guestName = asString(nameLink.textContent) || null;
    const guestCounts = parseGuestCounts(headingCell(row, 'Guest Name'));
    const check_in = parseExtranetDate(headingCell(row, 'Check-in'));
    const check_out = parseExtranetDate(headingCell(row, 'Check-out'));
    const room_name = headingCell(row, 'Rooms') || null;
    const statusText =
      asString(row.querySelector('.status--cancelled, .reservation-status__main')?.textContent) ||
      headingCell(row, 'Status');
    const { amount, currency } = parseAmountCurrency(headingCell(row, 'Price'));

    out.push({
      ...emptyBooking(bookingId, hotelId, 'dom_fallback'),
      guest_name: guestName,
      adults: guestCounts.adults,
      children: guestCounts.children,
      check_in,
      check_out,
      list_amount: amount,
      total_amount: null,
      currency,
      status: normalizeStatus(statusText || 'ok'),
      room_name: room_name || null,
    });
  }

  return out;
}

function findOverviewRoot() {
  return (
    document.querySelector('.res-reservation-overview') ||
    document.querySelector('[data-test-id="reservation-overview"]') ||
    document.querySelector('[class*="reservation-overview"]')
  );
}

function labeledValue(root, labelRe) {
  const nodes = [...root.querySelectorAll('div, dt, dd, span, p, li, th, td')];
  for (const node of nodes) {
    const text = asString(node.textContent);
    if (!labelRe.test(text)) continue;
    if (text.length > 120) continue;
    const next = node.nextElementSibling;
    if (next) {
      const v = asString(next.textContent);
      if (v && !labelRe.test(v)) return v;
    }
    const stripped = text.replace(labelRe, '').replace(/^[:\s]+/, '');
    if (stripped && stripped !== text) return stripped;
  }
  return '';
}

function parseDetailFromDom() {
  const bookingId = bookingIdFromPage();
  const hotelId = hotelIdFromPage();
  if (!bookingId || !hotelId) return [];

  const root = findOverviewRoot() || document.body;
  const row = emptyBooking(bookingId, hotelId, 'dom_fallback');

  const nameEl =
    root.querySelector('[data-test-id="reservation-overview-name"]') ||
    root.querySelector('[data-test-id*="guest-name"]') ||
    root.querySelector('h1, h2');
  row.guest_name = nameEl ? asString(nameEl.textContent) || null : null;

  const checkInRaw =
    labeledValue(root, /^check[- ]?in\b/i) ||
    asString(root.querySelector('[data-test-id*="check-in"], [class*="check-in"]')?.textContent);
  const checkOutRaw =
    labeledValue(root, /^check[- ]?out\b/i) ||
    asString(root.querySelector('[data-test-id*="check-out"], [class*="check-out"]')?.textContent);
  row.check_in = parseExtranetDate(checkInRaw);
  row.check_out = parseExtranetDate(checkOutRaw);

  const guestsRaw =
    labeledValue(root, /total\s*guests?\b/i) ||
    labeledValue(root, /^guests?\b/i) ||
    asString(root.querySelector('[data-test-id*="guest"], [class*="guest-count"]')?.textContent);
  const counts = parseGuestCounts(guestsRaw);
  row.adults = counts.adults;
  row.children = counts.children;

  const priceRaw =
    labeledValue(root, /total\s*price|price\b/i) ||
    asString(root.querySelector('[data-test-id*="price"], [class*="total-price"]')?.textContent);
  const { amount, currency } = parseAmountCurrency(priceRaw);
  row.list_amount = null;
  row.total_amount = amount;
  row.currency = currency;

  const bookingNo =
    labeledValue(root, /booking\s*number|reservation\s*(?:number|id)/i) || bookingId;
  if (/^\d{6,}$/.test(asString(bookingNo))) {
    row.booking_id = asString(bookingNo);
  }

  row.guest_email = parseEmailFromRoot(root);
  row.phone_number = parsePhoneFromText(root.innerText || root.textContent || '');
  row.status = 'ok';

  return [row];
}

function ensurePhoneHintStyles() {
  if (document.getElementById('fdm-bcom-phone-hint-style')) return;
  const style = document.createElement('style');
  style.id = 'fdm-bcom-phone-hint-style';
  style.textContent = `
    #fdm-bcom-phone-hint {
      position: fixed;
      z-index: 2147483646;
      left: 16px;
      bottom: 16px;
      max-width: min(360px, calc(100vw - 32px));
      padding: 12px 14px;
      border-radius: 10px;
      background: #111827;
      color: #f9fafb;
      font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,.28);
    }
    #fdm-bcom-phone-hint strong { display:block; margin-bottom: 4px; }
    #fdm-bcom-phone-hint button {
      margin-top: 8px;
      border: 0;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f9fafb;
      color: #111827;
      cursor: pointer;
      font: inherit;
    }
  `;
  document.documentElement.appendChild(style);
}

function hidePhoneHint() {
  document.getElementById('fdm-bcom-phone-hint')?.remove();
}

function showPhoneHint(bookingId) {
  if (phoneHintShownFor === bookingId && document.getElementById('fdm-bcom-phone-hint')) return;
  phoneHintShownFor = bookingId;
  ensurePhoneHintStyles();
  hidePhoneHint();
  const el = document.createElement('div');
  el.id = 'fdm-bcom-phone-hint';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<strong>Frontdesk Mate</strong>Click <em>Show phone number</em> on this page so we can sync the guest phone. Email is used if phone stays hidden.';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Dismiss';
  btn.addEventListener('click', hidePhoneHint);
  el.appendChild(btn);
  document.documentElement.appendChild(el);
}

function hasShowPhoneControl(root) {
  const nodes = [...(root || document).querySelectorAll('button, a, span')];
  return nodes.some((n) => /show\s+phone/i.test(asString(n.textContent)));
}

function maybeHintForPhone(detailBooking) {
  if (!detailBooking) return;
  if (detailBooking.phone_number) {
    hidePhoneHint();
    return;
  }
  const root = findOverviewRoot() || document.body;
  if (hasShowPhoneControl(root)) {
    showPhoneHint(detailBooking.booking_id);
  }
}

function watchPhoneReveal() {
  if (phoneObserver || !bookingIdFromPage()) return;
  phoneObserver = new MutationObserver(() => {
    const bookings = parseDetailFromDom();
    if (!bookings[0]?.phone_number) return;
    hidePhoneHint();
    emitBookings(bookings, 'patch');
  });
  phoneObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function parseDomFallback() {
  if (bookingIdFromPage()) {
    return parseDetailFromDom();
  }
  const list = parseListFromDom();
  if (list.length) return list;

  // Last resort: IDs only (legacy)
  const hotelId = hotelIdFromPage();
  const text = document.body?.innerText || '';
  const ids = [...text.matchAll(/\b(\d{8,12})\b/g)].map((m) => m[1]);
  const unique = [...new Set(ids)].slice(0, 40);
  if (!hotelId || unique.length === 0) return [];
  return unique.map((bookingId) => emptyBooking(bookingId, hotelId, 'dom_fallback'));
}

function sendToBackground(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    /* extension context invalidated */
  }
}

function rememberHotelId(hotelId) {
  const id = asString(hotelId) || hotelIdFromPage();
  if (!id) return;
  sendToBackground({ type: 'remember_hotel_id', hotelId: id });
}

function pageKindFromUrl() {
  try {
    const path = window.location.pathname || '';
    if (path.includes('search_reservations')) return 'list';
    if (path.includes('booking.html') && bookingIdFromPage()) return 'detail';
    return 'extranet';
  } catch {
    return 'extranet';
  }
}

function getPageContext() {
  const hotelId = hotelIdFromPage();
  const bookingId = bookingIdFromPage();
  return {
    ok: true,
    kind: pageKindFromUrl(),
    hotelId,
    bookingId,
    href: window.location.href,
  };
}

function emitBookings(bookings, mode) {
  if (!bookings.length) return;

  const hotelId = hotelIdFromPage() || asString(bookings[0]?.hotel_id);
  rememberHotelId(hotelId);

  const isDetail =
    mode === 'patch' ||
    (bookings.length === 1 &&
      (bookings[0].phone_number ||
        bookings[0].guest_email ||
        bookings[0].guest_name ||
        bookingIdFromPage()));

  if (isDetail && bookings.length === 1) {
    sendToBackground({
      type: 'bookings.patch',
      booking: bookings[0],
    });
    return;
  }

  sendToBackground({
    type: 'bookings.upsert_batch',
    bookings,
  });
}

function syncDomNow() {
  const onDetail = Boolean(bookingIdFromPage());
  const bookings = parseDomFallback();
  if (onDetail && bookings[0]) {
    maybeHintForPhone(bookings[0]);
    watchPhoneReveal();
  }
  emitBookings(bookings, onDetail ? 'patch' : 'batch');
  return bookings.length;
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== SOURCE) return;

  if (data.type === 'api_response' && data.payload) {
    const onDetail = Boolean(bookingIdFromPage());
    const sourceHint = onDetail ? 'detail_api' : 'list_api';
    const bookings = extractBookingsFromApiBody(data.payload.body, sourceHint);
    const hasUsefulFields = bookings.some(
      (b) => b.guest_name || b.check_in || b.list_amount != null || b.total_amount != null || b.phone_number
    );
    if (bookings.length && hasUsefulFields) {
      emitBookings(bookings, onDetail ? 'patch' : 'batch');
      return;
    }
    // Sparse API body (ids-only) → DOM fallback
    syncDomNow();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get_page_context') {
    sendResponse(getPageContext());
    return false;
  }
  if (message?.type === 'sync_current_page') {
    const count = syncDomNow();
    rememberHotelId(hotelIdFromPage());
    sendResponse({ ok: true, count, context: getPageContext() });
    return true;
  }
  return false;
});

function scheduleAutoDomSync() {
  rememberHotelId(hotelIdFromPage());
  const run = () => {
    try {
      syncDomNow();
    } catch {
      /* ignore */
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(run, 800), { once: true });
  } else {
    setTimeout(run, 800);
  }
  setTimeout(run, 2500);
}

scheduleAutoDomSync();
