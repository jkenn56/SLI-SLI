import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'http://localhost:5000/api';
const MEDIA = API.replace('/api', '');
const fmt = (n) => `RWF ${Number(n || 0).toLocaleString()}`;
const productPhotoAngles = (product) => [
  { label: 'Front', url: product.frontPhotoUrl || product.photoUrl || '' },
  { label: 'Back', url: product.backPhotoUrl || '' },
  { label: 'Detail', url: product.detailPhotoUrl || '' },
];

/* â”€â”€â”€ INTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â”€â”€â”€ PRODUCT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ProductCard({ product, onAdd }) {
  const photos = productPhotoAngles(product).filter(photo => photo.url);
  const [activePhoto, setActivePhoto] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!previewing || photos.length < 2) return undefined;
    const timer = setInterval(() => {
      setActivePhoto(current => (current + 1) % photos.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [previewing, photos.length]);

  function startPreview() {
    setPreviewing(true);
    setActivePhoto(photos.length > 1 ? 1 : 0);
  }

  function stopPreview() {
    setPreviewing(false);
    setActivePhoto(0);
  }

  return (
    <article className="product-card">
      <div
        className="product-image"
        data-tag={product.tag === 'LIMITED' ? 'LIMITED' : 'SHOP'}
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        onFocus={startPreview}
        onBlur={stopPreview}
        tabIndex={0}
        aria-label={`${product.name} photos. Hover or focus to preview alternate angles.`}
      >
        {photos.length
          ? <>
            <img src={`${MEDIA}${photos[activePhoto].url}`} alt={`${product.name} - ${photos[activePhoto].label}`} />
            {photos.length > 1 && <span className="product-image-angle">{photos[activePhoto].label}</span>}
          </>
          : null}
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        {product.description && <p className="prod-desc">{product.description}</p>}
        <strong>{fmt(product.price)}</strong>
        <div className="product-actions">
          <button onClick={() => onAdd(product)}>ADD TO CART</button>
          <button className="solid" onClick={() => onAdd(product)}>BUY NOW</button>
        </div>
      </div>
    </article>
  );
}

/* â”€â”€â”€ CART DRAWER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Cart({ items, total, onClose, onCheckout }) {
  return (
    <>
      <div className="shade" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>YOUR CART</h2>
          <button onClick={onClose}>CLOSE</button>
        </div>
        {items.length
          ? items.map(it => (
            <div className="cart-row" key={it.id}>
              <span>{it.name}<small>{fmt(it.price)} x {it.qty}</small></span>
            </div>
          ))
          : <p className="empty">Your cart is empty.</p>}
        <div className="drawer-foot">
          <div><span>SUBTOTAL</span><b>{fmt(total)}</b></div>
          <button className="solid" onClick={onCheckout} disabled={!items.length}>CHECKOUT</button>
        </div>
      </aside>
    </>
  );
}

/* â”€â”€â”€ CHECKOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Checkout({ items, total, onClose, onNotice }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  async function pay(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API}/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, items: items.map(({ id, qty }) => ({ id, qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment could not be started.');
      window.location.assign(data.whatsappUrl);
    } catch (err) {
      onNotice(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="checkout">
      <div className="checkout-top">
        <button onClick={onClose}>CLOSE</button>
        <span>SLI-BENSHII CHECKOUT</span>
      </div>
      <form className="checkout-body" onSubmit={pay}>
        <div className="checkout-brand">SLI-BENSHII</div>
        <div className="order-total">
          <span>Order total</span>
          <b>{fmt(total)}</b>
        </div>
        <h3>Your items</h3>
        <div className="checkout-items">
          {items.map(item => (
            <article className="checkout-item" key={item.id}>
              <div className="checkout-item-images">
                {productPhotoAngles(item).map(({ label, url }) => (
                  <figure key={label}>
                    {url
                      ? <img src={`${MEDIA}${url}`} alt={`${item.name} - ${label}`} />
                      : <div className="checkout-photo-missing">No photo</div>}
                    <figcaption>{label}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="checkout-item-info">
                <strong>{item.name}</strong>
                <span>Qty {item.qty} · {fmt(item.price)} each</span>
                <b>{fmt(item.price * item.qty)}</b>
              </div>
            </article>
          ))}
        </div>
        <h3>Contact</h3>
        <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="tel" placeholder="Your WhatsApp phone number" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
        <div className="payment-option">
          <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Your order and phone number will be sent to SLI-BENSHII on WhatsApp so you can arrange fulfillment directly.</p>
        </div>
        <button className="pay" disabled={busy}>{busy ? 'SENDING ORDER...' : 'SEND ORDER ON WHATSAPP'}</button>
      </form>
    </div>
  );
}

/* â”€â”€â”€ LEAGUE OPENING VIDEO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LeagueOpeningVideo() {
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <div className="league-cinematic">
      <video
        className="league-cinematic-video"
        src="/last-league-final.mp4"
        autoPlay
        muted
        playsInline
        onEnded={() => setDone(true)}
      />
    </div>
  );
}

/* â”€â”€â”€ LEAGUE PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LeaguePage({ onAdd, offline }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`${API}/last-league`).then(r => r.ok ? r.json() : []).then(setItems).catch(() => {});
  }, []);

  if (offline) {
    return (
      <main className="league-page">
        <section className="section">
          <div className="section-head">
            <h2>LAST LEAGUE FINAL</h2>
          </div>
          <div className="empty-state">
            <strong>SIGNAL PAUSED</strong>
            <span>The Last League Final is temporarily offline.<br />Check back soon.</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="league-page">
      {/* opening cinematic video â€” fullscreen, plays once, then hides */}
      <LeagueOpeningVideo />

      <section className="section">
        <div className="section-head">
          <h2>LAST LEAGUE FINAL</h2>
          <span>{items.length} broadcasts</span>
        </div>

        {items.length === 0 && (
          <div className="empty-state">
            <strong>SIGNAL LOST</strong>
            <span>No broadcasts have been published yet.<br />Check back soon. The Last League Final is coming.</span>
          </div>
        )}

        {items.map(item => (
          <div className="league-item" key={item.id}>
            {/* video */}
            <div className="league-video-wrap">
              {item.videoUrl
                ? <video
                    src={`${API.replace('/api', '')}${item.videoUrl}`}
                    controls
                    playsInline
                  />
                : <div className="league-no-video"><span>NO SIGNAL</span></div>}
            </div>

            {/* info */}
            <div className="league-item-info">
              <span className="eyebrow red">LAST LEAGUE RADIO</span>
              <h2>{item.episodeTitle}</h2>
              {item.description && <p>{item.description}</p>}

              {/* special product */}
              {item.product?.name && (
                <div className="league-product">
                  <div className="league-product-img">
                    {item.product.photoUrl
                      ? <img src={`${API.replace('/api', '')}${item.product.photoUrl}`} alt={item.product.name} />
                      : null}
                  </div>
                  <div className="league-product-info">
                    <span className="eyebrow" style={{ color: 'var(--muted)' }}>SPECIAL DROP</span>
                    <h3>{item.product.name}</h3>
                    {item.product.description && <p>{item.product.description}</p>}
                    <strong>{fmt(item.product.price)}</strong>
                    <div className="product-actions" style={{ marginTop: 12 }}>
                      <button onClick={() => onAdd(item.product)}>ADD TO CART</button>
                      <button className="solid" onClick={() => onAdd(item.product)}>BUY NOW</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

/* â”€â”€â”€ COMMUNITY PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CommunityPage() {
  return (
    <main>
      <section className="community">
        <div className="eyebrow red">OPEN CHANNEL // COMMUNITY</div>
        <h2>STAY TUNED IN.</h2>
        <p>Signal drops, early access, and the Last League radio feed.</p>
        <div className="community-layout">
          <div className="community-links">
            {[
              { icon: 'W', label: 'WHATSAPP', sub: 'Join the channel', href: 'https://whatsapp.com/channel/0029Vb8ISZRIyPtMl50rfi1i' },
              { icon: 'I', label: 'INSTAGRAM', sub: '@sli_benshii', href: 'https://www.instagram.com/sli_benshii' },
              { icon: 'X', label: 'X / TWITTER', sub: '@slibenshiibtr', href: 'https://x.com/slibenshiibtr' },
              { icon: 'EMAIL', label: 'EMAIL', sub: 'slibenshii.btr@gmail.com', href: 'mailto:slibenshii.btr@gmail.com' },
            ].map(l => (
              <a key={l.label} className="community-link" href={l.href} target="_blank" rel="noreferrer">
                <div className="community-icon">{l.icon}</div>
                <div><strong>{l.label}</strong><small>{l.sub}</small></div>
                <b>OPEN</b>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* â”€â”€â”€ APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â”€â”€â”€ SOCIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MENU_PAGES = [
  { id: 'store', label: 'SLI-STORE' },
  { id: 'league', label: 'LAST LEAGUE FINAL' },
];

const FOOTER_PAGES = [
  { id: 'store', label: 'SLI-STORE' },
  { id: 'league', label: 'LAST LEAGUE FINAL' },
];

const SOCIALS = [
  {
    label: 'WHATSAPP', span: 'WHATSAPP',
    href: 'https://whatsapp.com/channel/0029Vb8ISZRIyPtMl50rfi1i',
    icon: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 2a8 8 0 1 1-4.2 14.8l-.4-.2-2.6.7.7-2.5-.2-.4A8 8 0 0 1 12 4Zm-3.3 4.3c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 2.9.6.6-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.5.3-.5v-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4Z"/>,
  },
  {
    label: 'INSTAGRAM', span: '@sli_benshii',
    href: 'https://www.instagram.com/sli_benshii',
    icon: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></>,
  },
  {
    label: 'X / TWITTER', span: '@slibenshiibtr',
    href: 'https://x.com/slibenshiibtr',
    icon: <path d="M3 3h4.2l4.6 6.3L17.4 3H21l-7 8.2L21.4 21H17l-5-6.9L6.2 21H2.5l7.5-8.8L3 3Z" fill="currentColor" stroke="none"/>,
  },
  {
    label: 'EMAIL', span: 'slibenshii.btr@gmail.com',
    href: 'mailto:slibenshii.btr@gmail.com',
    icon: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/></>,
  },
];

/* â”€â”€â”€ SITE FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SiteFooter({ tab, onNavigate, adminOnly = false }) {
  const pages = FOOTER_PAGES;
  return (
    <footer className="site-footer">
      {!adminOnly && (
        <div className="footer-socials">
          {SOCIALS.filter(s => s.label !== 'EMAIL').map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" title={s.label}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              <span>{s.span}</span>
            </a>
          ))}
        </div>
      )}
      {!adminOnly && SOCIALS.filter(s => s.label === 'EMAIL').map(s => (
        <a key={s.label} className="footer-email" href={s.href}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
          <span>{s.span}</span>
        </a>
      ))}
      <div className="footer-nav">
        {!adminOnly && pages.map(p => (
          <button key={p.id} className={tab === p.id ? 'active' : ''} onClick={() => onNavigate(p.id)}>
            {p.label}
          </button>
        ))}
        <a href="/admin.html">ADMIN</a>
      </div>
      {!adminOnly && <strong>SLI-BENSHII &copy; 2026</strong>}
    </footer>
  );
}

/* â”€â”€â”€ APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ReopeningNotificationForm({ emailNotificationsEnabled }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function subscribe(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch(`${API}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save your email.');
      setEmail('');
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="reopening-form" onSubmit={subscribe}>
      <label htmlFor="reopening-email">Get one email when the site is back</label>
      <div className="reopening-form-row">
        <input
          id="reopening-email"
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>{busy ? 'SAVING...' : 'NOTIFY ME'}</button>
      </div>
      <span className="reopening-form-note">Your address is used only for this reopening alert.</span>
      {!emailNotificationsEnabled && (
        <span className="reopening-form-note">Email delivery will begin once email is configured on the server.</span>
      )}
      {status && <span className="reopening-form-status" role="status">{status}</span>}
    </form>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tab, setTab] = useState('store');
  const [notice, setNotice] = useState('');
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState({
    siteOffline: false,
    storeOffline: false,
    leagueOffline: false,
    reopeningAt: '',
    emailNotificationsEnabled: false,
  });
  const navRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(scrolled => {
        if (scrolled) return window.scrollY >= 20;
        return window.scrollY > 60;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep the background mark clear of the sticky navigation.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const setVar = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => { ro.disconnect(); window.removeEventListener('resize', setVar); };
  }, []);

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.ok ? r.json() : null).then(s => { if (s) setSettings(s); }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const key = 'sliAnonymousVisitorId';
      let visitorId = window.localStorage.getItem(key);
      if (!visitorId) {
        visitorId = window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : Array.from(window.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
        window.localStorage.setItem(key, visitorId);
      }
      fetch(`${API}/analytics/page-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      }).then(response => {
        if (!response.ok) console.error('Could not record monthly page view.');
      }).catch(error => console.error('Could not record monthly page view:', error));
    } catch (error) {
      console.error('Anonymous visitor tracking is unavailable:', error);
    }
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = event => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(p) {
    setCart(c => c.find(x => x.id === p.id) ? c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }]);
    setCartOpen(true);
  }

  function navigate(t) {
    setTab(t);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`}>
      <video
        className="app-background-video"
        src={dark ? '/new-black-nvy.mp4' : '/sli-white-wide.mp4'}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="app-content">
      {/* NAV */}
      <header ref={navRef} className={`nav${scrolled ? ' is-scrolled' : ''}`}>
        <div ref={menuRef} className={`nav-menu${menuOpen ? ' is-open' : ''}`}>
          <button
            className={`menu-toggle${menuOpen ? ' open' : ''}`}
            type="button"
            aria-label={menuOpen ? 'Close site navigation' : 'Open site navigation'}
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            onClick={() => setMenuOpen(open => !open)}
          >
            <span /><span /><span />
          </button>
          <nav id="site-navigation" className="nav-desktop" aria-label="Main">
            {MENU_PAGES.map(p => (
              <button key={p.id} className={tab === p.id ? 'active' : ''} onClick={() => navigate(p.id)}>
                {p.label}
              </button>
            ))}
          </nav>
        </div>

        <button className="brand" onClick={() => navigate('store')} aria-label="SLI-BENSHII home">
          <img src="/logo.png" alt="SLI-BENSHII" className="brand-logo" />
        </button>

        <div className="nav-actions">
          <button className="theme" onClick={() => setDark(d => !d)} aria-label="Toggle theme">{dark ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>) : (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>)}</button>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label="Open shopping cart">
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      {/* STORE */}
      {tab === 'store' && !settings.siteOffline && (
        <main className="storefront">
          <section className="hero-shell" aria-label="SLI-BENSHII store">
            <div className="section-head hero-section-head">
              <h2>SLI-STORE</h2>
              <span>{products.length} items</span>
            </div>
          </section>
          <section className="section" id="store-grid">
            {settings.storeOffline ? (
              <>
                <div className="section-head">
                  <h2>SLI-STORE</h2>
                </div>
                <div className="empty-state">
                  <strong>STORE IS OFFLINE</strong>
                  <span>The SLI-Store is temporarily paused.<br />New drops are coming. Check back soon.</span>
                </div>
              </>
            ) : (
              <>
                {products.length
                  ? <div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}</div>
                  : (
                    <div className="empty-state">
                      <strong>NO ITEMS PUBLISHED YET</strong>
                      <span>Store products will appear here after an admin upload.</span>
                    </div>
                  )}
              </>
            )}
          </section>
        </main>
      )}

      {/* LEAGUE */}
      {tab === 'league' && !settings.siteOffline && <LeaguePage onAdd={addToCart} offline={settings.leagueOffline} />}

      {/* COMMUNITY */}
      {tab === 'community' && !settings.siteOffline && <CommunityPage />}

      {/* OFFLINE â€” WHOLE SITE */}
      {settings.siteOffline && (
        <main className="offline-screen">
          <div className="offline-card">
            <h1>SLI<span>-</span>BENSHII</h1>
            <p>We're a little busy right now.<br />The site is temporarily offline — stay tuned.</p>
            {settings.reopeningAt && !Number.isNaN(new Date(settings.reopeningAt).getTime()) && (
              <p className="reopening-estimate">
                Estimated reopening: <strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(settings.reopeningAt))}</strong>
              </p>
            )}
            <ReopeningNotificationForm emailNotificationsEnabled={settings.emailNotificationsEnabled} />
          </div>
        </main>
      )}

      {/* FOOTER */}
      <SiteFooter tab={tab} onNavigate={navigate} adminOnly={settings.siteOffline} />

      {/* CART */}
      {cartOpen && !settings.siteOffline && <Cart items={cart} total={total} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />}

      {/* CHECKOUT */}
      {checkoutOpen && !settings.siteOffline && <Checkout items={cart} total={total} onClose={() => setCheckoutOpen(false)} onNotice={setNotice} />}

      {/* TOAST */}
      {notice && <div className="toast" onClick={() => setNotice('')}>{notice}</div>}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
