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

async function refresh() {
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

  const stored = await chrome.storage.local.get(['webhookUrl', 'syncSecret', 'saasOpenUrl']);
  document.getElementById('webhook-url').value = stored.webhookUrl || '';
  document.getElementById('sync-secret').value = stored.syncSecret || '';
  document.getElementById('saas-url').value = stored.saasOpenUrl || '';
}

document.getElementById('save').addEventListener('click', async () => {
  const webhookUrl = document.getElementById('webhook-url').value.trim();
  const syncSecret = document.getElementById('sync-secret').value.trim();
  const saasOpenUrl = document.getElementById('saas-url').value.trim();

  const allowed = await ensureHostPermission(webhookUrl);
  if (!allowed) {
    paintStatus('error');
    const errorEl = document.getElementById('error');
    errorEl.hidden = false;
    errorEl.textContent = 'Host permission denied for webhook URL';
    return;
  }

  await chrome.storage.local.set({ webhookUrl, syncSecret, saasOpenUrl });
  await chrome.runtime.sendMessage({ type: 'flush_outbox' });
  await refresh();
});

document.getElementById('sync-page').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
  await refresh();
});

document.getElementById('open-saas').addEventListener('click', async () => {
  const { saasOpenUrl } = await chrome.storage.local.get('saasOpenUrl');
  const url = saasOpenUrl || 'http://localhost:3000';
  await chrome.tabs.create({ url });
});

refresh();
