(() => {
  const SOURCE = 'fdm-booking-ext';
  const SCHEMA_VERSION = 1;

  /** Heuristic allowlist — Booking Extranet XHR/fetch paths that carry reservation JSON. */
  const URL_HINTS = [
    /reservation/i,
    /booking/i,
    /searchreservations/i,
    /reservations/i,
    /res_id/i,
  ];

  function interestedUrl(url) {
    try {
      const u = String(url || '');
      if (!u.includes('admin.booking.com') && !u.includes('booking.com')) return false;
      return URL_HINTS.some((re) => re.test(u));
    } catch {
      return false;
    }
  }

  function post(type, payload) {
    window.postMessage(
      {
        source: SOURCE,
        schemaVersion: SCHEMA_VERSION,
        type,
        payload,
        capturedAt: new Date().toISOString(),
      },
      window.location.origin
    );
  }

  function tryParseJson(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function handleBody(url, body) {
    if (!interestedUrl(url) || body == null) return;
    post('api_response', { url: String(url), body });
  }

  const originalFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input && input.url;
      if (interestedUrl(url)) {
        const clone = response.clone();
        clone
          .text()
          .then((text) => {
            const json = tryParseJson(text);
            if (json != null) handleBody(url, json);
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__fdmUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function patchedSend() {
    this.addEventListener('load', function onLoad() {
      try {
        const url = this.__fdmUrl;
        if (!interestedUrl(url)) return;
        const text = this.responseText;
        const json = tryParseJson(text);
        if (json != null) handleBody(url, json);
      } catch {
        /* ignore */
      }
    });
    return originalSend.apply(this, arguments);
  };

  post('hook_ready', { href: window.location.href });
})();
