const API = `${window.location.origin}/api`;
const MEDIA = window.location.origin;
const root = document.getElementById('admin-root');
const KEY = 'sliAdminToken';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localDateTimeValue = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const state = {
  token: localStorage.getItem(KEY),
  tab: 'store',
  dark: true,
  editing: null,
  settings: { siteOffline: false, storeOffline: false, leagueOffline: false, reopeningAt: '', emailNotificationsEnabled: false },
  products: [],
  league: [],
};

function msg(text, type = 'err') {
  document.querySelectorAll('[data-msg]').forEach(el => { el.textContent = text; el.className = type; });
}

async function optimizeProductPhoto(file) {
  if (!file.type.startsWith('image/')) return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#f2f0eb';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.68));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    return file;
  } finally {
    bitmap?.close();
  }
}

function applyTheme() {
  document.body.className = state.dark ? '' : 'light';
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.textContent = state.dark ? '☀ LIGHT' : '☾ DARK');
}

/* ── LOGIN ── */
function renderLogin() {
  root.innerHTML = `
    <div class="login-wrap">
      <a href="/" class="back-home">← HOME</a>
      <div class="login-card">
        <p class="kicker">SLI-BENSHII / PRIVATE ACCESS</p>
        <h1>ADMIN<br/><span>SIGN IN</span></h1>
        <p class="sub">Manage store, Last League broadcasts and site availability.</p>
        <form id="lf">
          <label>EMAIL<input name="email" type="email" autocomplete="username" required value="slibenshii.btr@gmail.com"/></label>
          <label>PASSWORD<input name="password" type="password" autocomplete="current-password" required/></label>
          <button class="btn-primary" type="submit">SIGN IN</button>
        </form>
        <span data-msg aria-live="polite"></span>
      </div>
    </div>`;
  applyTheme();

  document.getElementById('lf').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const btn = e.currentTarget.querySelector('button');
    btn.disabled = true;
    msg('Signing in...', 'ok');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email').trim(), password: fd.get('password') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to sign in.');
      state.token = data.token;
      localStorage.setItem(KEY, state.token);
      await renderDashboard();
    } catch (err) {
      msg(err.message);
      btn.disabled = false;
    }
  });
}

/* ── DASHBOARD ── */
async function renderDashboard() {
  root.innerHTML = `
    <div class="admin-topbar">
      <button class="admin-brand">SLI<span style="color:var(--danger)">-</span>BENSHII</button>
      <div class="admin-topbar-right">
        <button class="theme-btn" data-theme-btn>☀ LIGHT</button>
        <button class="logout-btn" data-logout>LOG OUT</button>
      </div>
    </div>
    <div class="admin-tabs">
      <button data-tab="store" class="${state.tab==='store'?'active':''}">SLI-STORE</button>
      <button data-tab="league" class="${state.tab==='league'?'active':''}">LAST LEAGUE</button>
      <button data-tab="orders" class="${state.tab==='orders'?'active':''}">ORDERS</button>
      <button data-tab="settings" class="${state.tab==='settings'?'active':''}">SETTINGS</button>
    </div>
    <div class="admin-body" id="tab-body"></div>`;

  applyTheme();

  document.querySelector('[data-logout]').addEventListener('click', () => {
    localStorage.removeItem(KEY); state.token = null; renderLogin();
  });
  document.querySelector('[data-theme-btn]').addEventListener('click', () => {
    state.dark = !state.dark; applyTheme();
  });
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.editing = null;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
      renderTab();
    });
  });

  try {
    const [sr, lr, setr] = await Promise.all([
      fetch(`${API}/products`),
      fetch(`${API}/last-league`),
      fetch(`${API}/settings`),
    ]);
    if (sr.ok) state.products = await sr.json();
    if (lr.ok) state.league = await lr.json();
    if (setr.ok) state.settings = await setr.json();
  } catch (_) {}

  renderTab();
}

function renderTab() {
  const body = document.getElementById('tab-body');
  if (!body) return;
  if (state.tab === 'store') renderStoreTab(body);
  else if (state.tab === 'league') renderLeagueTab(body);
  else if (state.tab === 'orders') renderOrdersTab(body);
  else renderSettingsTab(body);
}

/* ── ORDERS TAB ── */
function renderOrdersTab(body) {
  body.innerHTML = `
    <p class="section-label">ORDER MESSAGES</p>
    <div class="empty-state">
      <strong>ORDERS ARRIVE ON WHATSAPP</strong>
      <span>When a customer orders, WhatsApp opens with the product and quantity filled in. The customer sends that message to +250 791 744 472. New orders appear in the WhatsApp account, not in this dashboard.</span>
      <a class="btn-primary" href="https://wa.me/250791744472" target="_blank" rel="noreferrer">OPEN WHATSAPP</a>
    </div>`;
}

function renderSettingsTab(body) {
  const s = state.settings;
  body.innerHTML = `
    <p class="section-label">SERVICE AVAILABILITY</p>
    <div class="settings-grid">
      <div class="setting-card">
        <strong>SITE</strong>
        <span>Take the entire public site offline (admin panel stays reachable).</span>
        <div class="switch-row">
          <small>${s.siteOffline?'OFFLINE':'ONLINE'}</small>
          <input type="checkbox" class="switch" data-setting="siteOffline" ${s.siteOffline?'checked':''}/>
        </div>
      </div>
      <div class="setting-card">
        <strong>STORE</strong>
        <span>Disable the SLI-Store product section.</span>
        <div class="switch-row">
          <small>${s.storeOffline?'OFFLINE':'ONLINE'}</small>
          <input type="checkbox" class="switch" data-setting="storeOffline" ${s.storeOffline?'checked':''}/>
        </div>
      </div>
      <div class="setting-card">
        <strong>LEAGUE</strong>
        <span>Pause the Last League Final section.</span>
        <div class="switch-row">
          <small>${s.leagueOffline?'OFFLINE':'ONLINE'}</small>
          <input type="checkbox" class="switch" data-setting="leagueOffline" ${s.leagueOffline?'checked':''}/>
        </div>
      </div>
    </div>
    <div class="field reopening-setting">
      <label for="reopening-at">ESTIMATED REOPENING DATE AND TIME</label>
      <input id="reopening-at" type="datetime-local" value="${esc(localDateTimeValue(s.reopeningAt))}"/>
      <span>Shown to visitors while the whole site is offline. Leave blank if you do not have an estimate.</span>
    </div>
    <p class="email-alert-setting">
      Email alerts: <strong>${s.emailNotificationsEnabled ? 'CONFIGURED' : 'NOT CONFIGURED'}</strong>
      ${s.emailNotificationsEnabled
        ? ' Visitors can subscribe for one email when you bring the site back online.'
        : ' Configure SMTP on the server to collect addresses and send reopening alerts.'}
    </p>
    <div class="save-row">
      <button class="btn-primary" id="save-settings">SAVE CHANGES</button>
    </div>
    <span data-msg aria-live="polite"></span>`;

  document.getElementById('save-settings').addEventListener('click', async () => {
    const btn = document.getElementById('save-settings');
    btn.disabled = true;
    const settings = Object.fromEntries(
      [...document.querySelectorAll('[data-setting]')].map(i => [i.dataset.setting, i.checked])
    );
    const reopeningAt = document.getElementById('reopening-at').value;
    settings.reopeningAt = reopeningAt ? new Date(reopeningAt).toISOString() : '';
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save.');
      state.settings = data;
      msg(data.notificationWarning || 'Settings saved!', data.notificationWarning ? 'err' : 'ok');
    } catch (err) {
      if (/token|auth|expired/i.test(err.message)) { localStorage.removeItem(KEY); state.token = null; renderLogin(); return; }
      msg(err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ── BOOT ── */
if (state.token) renderDashboard();
else renderLogin();
