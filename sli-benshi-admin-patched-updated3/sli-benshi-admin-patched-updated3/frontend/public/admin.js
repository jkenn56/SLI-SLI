const API = 'http://localhost:5000/api';
const MEDIA = 'http://localhost:5000';
const root = document.getElementById('admin-root');
const KEY = 'sliAdminToken';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const whatsappPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.startsWith('0') ? `250${digits.slice(1)}` : digits;
};
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

function applyTheme() {
  document.body.className = state.dark ? '' : 'light';
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.textContent = state.dark ? '☀ LIGHT' : '☾ DARK');
}

/* ── LOGIN ── */
function renderLogin() {
  root.innerHTML = `
    <div class="login-wrap">
      <a href="/" class="back-home">HOME</a>
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
      <button data-tab="analytics" class="${state.tab==='analytics'?'active':''}">ANALYTICS</button>
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
  else if (state.tab === 'analytics') renderAnalyticsTab(body);
  else renderSettingsTab(body);
}

/* ── MONTHLY ANALYTICS ── */
async function renderAnalyticsTab(body) {
  body.innerHTML = `
    <p class="section-label">MONTHLY PERFORMANCE</p>
    <p class="analytics-note">Anonymous first-party visitor counts, public page views, orders, and recorded sales. Download any month as a Word document.</p>
    <span data-msg aria-live="polite"></span>
    <div id="analytics-box"><div class="empty-state"><strong>LOADING...</strong></div></div>`;

  try {
    const res = await fetch(API + '/analytics/monthly', { headers: { Authorization: 'Bearer ' + state.token } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not load monthly analytics.');
    const box = document.getElementById('analytics-box');
    if (!box) return;
    box.innerHTML = data.reports.map(report => {
      const monthLabel = new Date(report.month + '-01T00:00:00Z').toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return '<section class="analytics-month">' +
        '<div class="analytics-month-head"><h2>' + esc(monthLabel) + '</h2>' +
        '<button class="btn-primary" data-download-report="' + esc(report.month) + '">DOWNLOAD WORD REPORT</button></div>' +
        '<div class="analytics-metrics">' +
        '<div><strong>' + Number(report.pageViews).toLocaleString() + '</strong><span>PAGE VIEWS</span></div>' +
        '<div><strong>' + Number(report.uniqueVisitors).toLocaleString() + '</strong><span>UNIQUE VISITORS</span></div>' +
        '<div><strong>' + Number(report.orders).toLocaleString() + '</strong><span>ORDERS</span></div>' +
        '<div><strong>RWF ' + Number(report.revenue).toLocaleString() + '</strong><span>RECORDED SALES</span></div>' +
        '</div></section>';
    }).join('');

    box.addEventListener('click', async event => {
      const button = event.target.closest('[data-download-report]');
      if (!button) return;
      const month = button.dataset.downloadReport;
      button.disabled = true;
      try {
        const response = await fetch(API + '/analytics/report/' + encodeURIComponent(month), {
          headers: { Authorization: 'Bearer ' + state.token },
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Could not download the Word report.');
        }
        const fileUrl = URL.createObjectURL(await response.blob());
        const download = document.createElement('a');
        download.href = fileUrl;
        download.download = 'sli-benshi-report-' + month + '.docx';
        download.click();
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      } catch (error) {
        msg(error.message);
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    const box = document.getElementById('analytics-box');
    if (box) box.innerHTML = '<div class="empty-state"><strong>' + esc(error.message) + '</strong></div>';
  }
}

/* ── ORDERS TAB ── */
async function renderOrdersTab(body) {
  body.innerHTML = `
    <p class="section-label">PLACED ORDERS</p>
    <span data-msg aria-live="polite"></span>
    <div id="orders-box"><div class="empty-state"><strong>LOADING...</strong></div></div>`;

  try {
    const res = await fetch(`${API}/orders`, { headers: { Authorization: `Bearer ${state.token}` } });
    const orders = await res.json();
    if (!res.ok) throw new Error(orders.message || 'Could not load orders.');
    const box = document.getElementById('orders-box');
    if (!orders.length) {
      box.innerHTML = `<div class="empty-state"><strong>NO ORDERS YET</strong><span>Orders placed through the store checkout will appear here.</span></div>`;
    } else {
      box.innerHTML = orders.map(o => `
        <div class="product-row">
          <div class="product-row-thumb">#${orders.length}</div>
          <div class="product-row-info">
            <strong>${esc(o.email)}</strong>
            ${o.phone ? `<span>WhatsApp: <a href="https://wa.me/${esc(whatsappPhone(o.phone))}" target="_blank" rel="noreferrer">${esc(o.phone)}</a></span>` : ''}
            <span>${new Date(o.createdAt).toLocaleString()} · ${o.items.reduce((s, i) => s + i.qty, 0)} item(s)</span>
            <span>${o.items.map(i => `${esc(i.name)} (${i.qty} × RWF ${Number(i.price).toLocaleString()})`).join(' · ')}</span>
          </div>
          <strong style="white-space:nowrap">RWF ${Number(o.total).toLocaleString()}</strong>
        </div>`).join('');
    }
  } catch (_) {
    const box = document.getElementById('orders-box');
    if (box) box.innerHTML = `<div class="empty-state"><strong>COULD NOT LOAD ORDERS</strong></div>`;
  }
}

/* ── ITEM HELPERS ── */
async function deleteItem(type, id) {
  if (!confirm('Delete this item permanently? This cannot be undone.')) return;
  const url = type === 'product' ? `${API}/products/${id}` : `${API}/last-league/${id}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not delete item.');
    if (type === 'product') state.products = state.products.filter(p => p.id !== id);
    else state.league = state.league.filter(l => l.id !== id);
    if (state.editing && state.editing.id === id) state.editing = null;
    msg('Item deleted.', 'ok');
    renderTab();
  } catch (err) {
    msg(err.message);
  }
}

function startEdit(type, id) {
  state.editing = { type, id };
  renderTab();
}

function cancelEdit() {
  state.editing = null;
  renderTab();
}

/* ── STORE TAB ── */
function renderStoreTab(body) {
  const editing = state.editing?.type === 'product' ? state.products.find(p => p.id === state.editing.id) : null;

  body.innerHTML = `
    <div class="upload-panel">
      ${editing ? `<button class="cancel-edit" data-cancel-edit>CANCEL EDIT</button>` : ''}
      <p class="kicker">${editing ? 'EDIT PRODUCT' : 'UPLOAD PRODUCT'}</p>
      <h3>${editing ? esc(editing.name) : 'Add to SLI-Store'}</h3>
      <form id="store-form">
        <div class="photo-angle-group">
          <p class="photo-angle-title">PRODUCT PHOTOS · PNG</p>
          <div class="photo-upload-grid">
            <div class="field"><label>FRONT ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="frontPhoto" type="file" accept=".png,image/png" ${editing ? '' : 'required'}/></div>
            <div class="field"><label>BACK ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="backPhoto" type="file" accept=".png,image/png" ${editing ? '' : 'required'}/></div>
            <div class="field"><label>DETAIL ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="detailPhoto" type="file" accept=".png,image/png" ${editing ? '' : 'required'}/></div>
          </div>
        </div>
        <div class="field"><label>PRODUCT NAME</label><input name="name" value="${esc(editing?.name || '')}" placeholder="NO SIGNAL TEE" required/></div>
        <div class="split-2">
          <div class="field"><label>PRICE (RWF)</label><input name="price" type="number" min="1" value="${editing ? editing.price : ''}" required/></div>
          <div class="field"><label>STOCK</label><input name="stock" type="number" min="0" value="${editing ? editing.stock : 0}"/></div>
        </div>
        <div class="field"><label>DESCRIPTION</label><textarea name="description" placeholder="Short product description...">${esc(editing?.description || '')}</textarea></div>
        <div class="field"><label>TAG</label><input name="tag" value="${esc(editing?.tag || '')}" placeholder="TEE / HOODIE / DROP"/></div>
        <button class="btn-primary" type="submit">${editing ? 'SAVE CHANGES' : 'PUBLISH TO STORE'}</button>
        <span data-msg aria-live="polite"></span>
      </form>
    </div>
    <p class="section-label">PUBLISHED PRODUCTS (${state.products.length})</p>
    ${state.products.length ? `
      <div class="product-list" data-list="product">
        ${state.products.map(p => `
          <div class="product-row">
            ${p.photoUrl
              ? `<img src="${MEDIA}${p.photoUrl}" alt="${esc(p.name)}"/>`
              : `<div class="product-row-thumb">NO IMG</div>`}
            <div class="product-row-info">
              <strong>${esc(p.name)}</strong>
              <span>RWF ${Number(p.price).toLocaleString()} · ${esc(p.tag||'DROP')} · Stock: ${p.stock}</span>
              <div class="row-actions">
                <button class="row-btn" data-edit="${p.id}">EDIT</button>
                <button class="row-btn danger" data-delete="${p.id}">DELETE</button>
              </div>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="empty-state">
        <strong>NO PRODUCTS YET</strong>
        <span>Upload your first product above.</span>
      </div>`}`;

  if (editing) document.querySelector('[data-cancel-edit]').addEventListener('click', cancelEdit);

  const list = document.querySelector('[data-list="product"]');
  if (list) list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-delete]');
    if (editBtn) return startEdit('product', editBtn.dataset.edit);
    if (delBtn) return deleteItem('product', delBtn.dataset.delete);
  });

  document.getElementById('store-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    btn.disabled = true;
    msg(editing ? 'Saving...' : 'Uploading...', 'ok');
    try {
      const res = await fetch(editing ? `${API}/products/${editing.id}` : `${API}/products`, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: new FormData(e.currentTarget),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed.');
      if (editing) {
        state.products = state.products.map(p => p.id === editing.id ? data : p);
        state.editing = null;
        msg('Product updated!', 'ok');
      } else {
        state.products.unshift(data);
        e.currentTarget.reset();
        msg('Product published!', 'ok');
      }
      renderTab();
    } catch (err) {
      msg(err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ── LEAGUE TAB ── */
function renderLeagueTab(body) {
  const editing = state.editing?.type === 'league' ? state.league.find(l => l.id === state.editing.id) : null;

  body.innerHTML = `
    <div class="upload-panel">
      ${editing ? `<button class="cancel-edit" data-cancel-edit>CANCEL EDIT</button>` : ''}
      <p class="kicker">${editing ? 'EDIT BROADCAST' : 'UPLOAD BROADCAST'}</p>
      <h3>Last League Final</h3>
      <form id="league-form">
        <div class="field"><label>EPISODE VIDEO ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="video" type="file" accept="video/*" ${editing ? '' : 'required'}/></div>
        <div class="field"><label>EPISODE TITLE</label><input name="episodeTitle" value="${esc(editing?.episodeTitle || '')}" placeholder="LAST LEAGUE EP. 06" required/></div>
        <div class="field"><label>EPISODE DESCRIPTION</label><textarea name="description" placeholder="What happened this episode...">${esc(editing?.description || '')}</textarea></div>
        <p class="kicker" style="margin-top:8px;border-top:1px solid var(--line);padding-top:16px">SPECIAL PRODUCT ${editing && editing.product?.name ? `— ${esc(editing.product.name)}` : ''}</p>
        <div class="photo-angle-group">
          <p class="photo-angle-title">PRODUCT PHOTOS · PNG (OPTIONAL UNLESS ADDING A PRODUCT)</p>
          <div class="photo-upload-grid">
            <div class="field"><label>FRONT ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="frontPhoto" type="file" accept=".png,image/png"/></div>
            <div class="field"><label>BACK ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="backPhoto" type="file" accept=".png,image/png"/></div>
            <div class="field"><label>DETAIL ${editing ? '(LEAVE EMPTY TO KEEP CURRENT)' : ''}</label><input name="detailPhoto" type="file" accept=".png,image/png"/></div>
          </div>
        </div>
        <div class="field"><label>PRODUCT NAME</label><input name="name" value="${esc(editing?.product?.name || '')}" placeholder="LAST LEAGUE SPECIAL TEE"/></div>
        <div class="field"><label>PRODUCT DESCRIPTION</label><textarea name="productDescription" placeholder="Limited edition drop for this episode...">${esc(editing?.product?.description || '')}</textarea></div>
        <div class="split-2">
          <div class="field"><label>PRICE (RWF)</label><input name="price" type="number" min="0" value="${editing ? editing.product?.price ?? 0 : 0}"/></div>
          <div class="field"><label>TAG</label><input name="tag" value="${esc(editing?.product?.tag || '')}"/></div>
        </div>
        <button class="btn-primary" type="submit">${editing ? 'SAVE CHANGES' : 'PUBLISH BROADCAST'}</button>
        <span data-msg aria-live="polite"></span>
      </form>
    </div>
    <p class="section-label">PUBLISHED BROADCASTS (${state.league.length})</p>
    ${state.league.length ? `
      <div class="product-list" data-list="league">
        ${state.league.map(l => `
          <div class="product-row">
            ${l.product?.photoUrl
              ? `<img src="${MEDIA}${l.product.photoUrl}" alt="${esc(l.product.name || '')}"/>`
              : `<div class="product-row-thumb">▶ VIDEO</div>`}
            <div class="product-row-info">
              <strong>${esc(l.episodeTitle)}</strong>
              <span>${l.description ? esc(l.description.slice(0, 60)) + '...' : 'No description'} · Special: ${esc(l.product?.name || '—')}</span>
              <div class="row-actions">
                <button class="row-btn" data-edit="${l.id}">EDIT</button>
                <button class="row-btn danger" data-delete="${l.id}">DELETE</button>
              </div>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="empty-state">
        <strong>NO BROADCASTS YET</strong>
        <span>Upload your first Last League broadcast above.</span>
      </div>`}`;

  if (editing) document.querySelector('[data-cancel-edit]').addEventListener('click', cancelEdit);

  const list = document.querySelector('[data-list="league"]');
  if (list) list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-delete]');
    if (editBtn) return startEdit('league', editBtn.dataset.edit);
    if (delBtn) return deleteItem('league', delBtn.dataset.delete);
  });

  document.getElementById('league-form').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!editing && formData.get('name')?.trim() && ['frontPhoto', 'backPhoto', 'detailPhoto'].some(name => !formData.get(name)?.size)) {
      msg('Upload front, back, and detail photos for the special product.');
      return;
    }
    const btn = e.currentTarget.querySelector('button');
    btn.disabled = true;
    msg(editing ? 'Saving...' : 'Uploading...', 'ok');
    try {
      const res = await fetch(editing ? `${API}/last-league/${editing.id}` : `${API}/last-league`, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: new FormData(e.currentTarget),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed.');
      if (editing) {
        state.league = state.league.map(l => l.id === editing.id ? data : l);
        state.editing = null;
        msg('Broadcast updated!', 'ok');
      } else {
        state.league.unshift(data);
        e.currentTarget.reset();
        msg('Broadcast published!', 'ok');
      }
      renderTab();
    } catch (err) {
      msg(err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ── SETTINGS TAB ── */
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
        ? ' Visitors can subscribe for one email when you bring the site back online. New orders are sent to WhatsApp at +250 791 744 472.'
        : ' Configure SMTP on the server for reopening email alerts. New orders are sent to WhatsApp at +250 791 744 472.'}
    </p>
    <div class="save-row">
      <button class="btn-primary" id="save-settings">SAVE CHANGES</button>
      <button class="btn-primary" id="send-reopening" ${s.emailNotificationsEnabled ? '' : 'disabled'}>BRING SITE ONLINE AND SEND ALERT</button>
    </div>
    <span data-msg aria-live="polite"></span>`;

  document.getElementById('send-reopening').addEventListener('click', async () => {
    const btn = document.getElementById('send-reopening');
    btn.disabled = true;
    try {
      const res = await fetch(`${API}/notifications/reopening/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not send reopening alerts.');
      state.settings = data.settings;
      document.querySelector('[data-setting="siteOffline"]').checked = false;
      document.querySelector('[data-setting="siteOffline"]').previousElementSibling.textContent = 'ONLINE';
      msg(data.message, data.failed ? 'err' : 'ok');
    } catch (err) {
      if (/token|auth|expired/i.test(err.message)) { localStorage.removeItem(KEY); state.token = null; renderLogin(); return; }
      msg(err.message);
    } finally {
      btn.disabled = false;
    }
  });

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