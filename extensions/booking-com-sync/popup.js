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

async function loadSettingsFields() {
  const stored = await chrome.storage.local.get([
    'webhookUrl',
    'syncSecret',
    'saasOpenUrl',
    'settingsConfigured',
  ]);
  document.getElementById('webhook-url').value = stored.webhookUrl || '';
  document.getElementById('sync-secret').value = stored.syncSecret || '';
  document.getElementById('saas-url').value = stored.saasOpenUrl || '';
  return stored;
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
  await refreshStatus();
});

document.getElementById('open-saas').addEventListener('click', async () => {
  const { saasOpenUrl } = await chrome.storage.local.get('saasOpenUrl');
  const url = saasOpenUrl || 'http://localhost:3000';
  await chrome.tabs.create({ url });
});

async function boot() {
  const stored = await loadSettingsFields();
  if (!isConfigured(stored)) {
    showView('settings');
    return;
  }
  showView('status');
  await refreshStatus();
}

boot();
