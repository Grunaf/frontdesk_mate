const SOURCE = 'fdm-booking-ext';

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
  const amount = asNumber(
    pick(raw, ['amount', 'price', 'total_price', 'totalPrice', 'price_euro', 'commissionable_amount'])
  );
  const currency = asString(pick(raw, ['currency', 'currency_code', 'currencyCode'])).toUpperCase();
  const roomName = asString(pick(raw, ['room_name', 'roomName', 'room_type', 'roomType', 'unit_name']));
  const status = normalizeStatus(pick(raw, ['status', 'booking_status', 'reservation_status']));

  return {
    booking_id: bookingId,
    hotel_id: hotelId,
    guest_name: guestName || null,
    phone_number: phone || null,
    adults,
    children,
    check_in: /^\d{4}-\d{2}-\d{2}$/.test(checkIn) ? checkIn : null,
    check_out: /^\d{4}-\d{2}-\d{2}$/.test(checkOut) ? checkOut : null,
    amount,
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

  // Detail page: if only phone-like fields found on a nested object with res_id in URL
  if (normalized.length === 0 && pageBookingId && hotelId) {
    const phone = asString(
      pick(body, ['phone_number', 'phoneNumber', 'phone', 'guest_phone', 'telephone'])
    );
    if (phone) {
      normalized.push({
        booking_id: pageBookingId,
        hotel_id: hotelId,
        phone_number: phone,
        guest_name: null,
        adults: null,
        children: null,
        check_in: null,
        check_out: null,
        amount: null,
        currency: null,
        status: 'unknown',
        room_name: null,
        source: 'detail_api',
        captured_at: new Date().toISOString(),
      });
    }
  }

  return normalized;
}

function parseDomFallback() {
  const hotelId = hotelIdFromPage();
  const pageBookingId = bookingIdFromPage();
  const text = document.body?.innerText || '';

  if (pageBookingId && hotelId) {
    const phoneMatch = text.match(/(\+\d[\d\s().-]{7,}\d)/);
    return [
      {
        booking_id: pageBookingId,
        hotel_id: hotelId,
        guest_name: null,
        phone_number: phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : null,
        adults: null,
        children: null,
        check_in: null,
        check_out: null,
        amount: null,
        currency: null,
        status: 'unknown',
        room_name: null,
        source: 'dom_fallback',
        captured_at: new Date().toISOString(),
      },
    ];
  }

  // List table: look for reservation id patterns
  const ids = [...text.matchAll(/\b(\d{8,12})\b/g)].map((m) => m[1]);
  const unique = [...new Set(ids)].slice(0, 40);
  if (!hotelId || unique.length === 0) return [];

  return unique.map((bookingId) => ({
    booking_id: bookingId,
    hotel_id: hotelId,
    guest_name: null,
    phone_number: null,
    adults: null,
    children: null,
    check_in: null,
    check_out: null,
    amount: null,
    currency: null,
    status: 'unknown',
    room_name: null,
    source: 'dom_fallback',
    captured_at: new Date().toISOString(),
  }));
}

function sendToBackground(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    /* extension context invalidated */
  }
}

function emitBookings(bookings, mode) {
  if (!bookings.length) return;

  const isDetail =
    mode === 'patch' ||
    (bookings.length === 1 && (bookings[0].phone_number || bookingIdFromPage()));

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

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== SOURCE) return;

  if (data.type === 'api_response' && data.payload) {
    const onDetail = Boolean(bookingIdFromPage());
    const sourceHint = onDetail ? 'detail_api' : 'list_api';
    const bookings = extractBookingsFromApiBody(data.payload.body, sourceHint);
    emitBookings(bookings, onDetail ? 'patch' : 'batch');
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sync_current_page') {
    const bookings = parseDomFallback();
    emitBookings(bookings, bookingIdFromPage() ? 'patch' : 'batch');
    sendResponse({ ok: true, count: bookings.length });
    return true;
  }
  return false;
});
