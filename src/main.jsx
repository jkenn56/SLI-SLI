import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './background-tuning.css';

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_ORIGIN = /^https?:\/\//i.test(API) ? API.replace(/\/api$/, '') : '';
const fmt = (n) => `RWF ${Number(n || 0).toLocaleString()}`;

/* â”€â”€â”€ INTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Intro({ onDone }) {
  const canvas = useRef(null);
  const [phase, setPhase] = useState('glitch'); // glitch → out

  useEffect(() => {
    if (phase !== 'glitch') return;
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const buf = document.createElement('canvas');
    buf.width = 160; buf.height = 90;
    const bx = buf.getContext('2d');
    let raf;
    const resize = () => { el.width = el.offsetWidth; el.height = el.offsetHeight; };
    function draw() {
      const img = bx.createImageData(buf.width, buf.height);
      const px = new Uint32Array(img.data.buffer);
      for (let i = 0; i < px.length; i++) { const v = Math.random() * 255 | 0; px[i] = 255 << 24 | v << 16 | v << 8 | v; }
      bx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(buf, 0, 0, el.width, el.height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      for (let y = 0; y < el.height; y += 4) ctx.fillRect(0, y, el.width, 1);
      if (Math.random() < 0.6) {
        ctx.fillStyle = '#ffffff55'; ctx.fillRect(0, Math.random() * el.height, el.width, 16);
      }
      raf = requestAnimationFrame(draw);
    }
    resize(); draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [phase]);

  // phase sequencer
  useEffect(() => {
    let t;
    if (phase === 'glitch') t = setTimeout(() => setPhase('out'), 600);
    if (phase === 'out') t = setTimeout(onDone, 250);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  return (
    <div className="intro">
      {/* tv-noise glitch behind everything */}
      <canvas ref={canvas} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }} />

      <button onClick={onDone} style={{ position:'absolute', right:25, bottom:25, zIndex:10, color:'#aaa', border:'1px solid #444', background:'transparent', padding:'9px 14px', fontSize:10, letterSpacing:'.12em', cursor:'pointer' }}>SKIP â†’</button>
    </div>
  );
}

/* â”€â”€â”€ PRODUCT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <div className="product-image" data-tag={product.tag || 'DROP'}>
        {product.photoUrl
          ? <img src={`${API_ORIGIN}${product.photoUrl}`} alt={product.name} />
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
          <button onClick={onClose}>âœ•</button>
        </div>
        {items.length
          ? items.map(it => (
            <div className="cart-row" key={it.id}>
              <span>{it.name}<small>{fmt(it.price)} Ã— {it.qty}</small></span>
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
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('contact'); // contact | payment | confirm

  async function pay(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API}/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items: items.map(({ id, qty }) => ({ id, qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment could not be started.');
      window.location.assign(`${API_ORIGIN}${data.url}`);
    } catch (err) {
      onNotice(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="checkout">
      <div className="checkout-top">
        <button onClick={onClose}>âœ•</button>
        <span>SLI-BENSHII CHECKOUT</span>
      </div>
      <form className="checkout-body" onSubmit={pay}>
        <div className="checkout-brand">SLI-BENSHII</div>
        <div className="order-total">
          <span>Order total</span>
          <b>{fmt(total)}</b>
        </div>
        <h3>Contact</h3>
        <input type="email" placeholder="Email for receipt" value={email} onChange={e => setEmail(e.target.value)} required />
        <div className="payment-option">
          <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Place your order â€” we'll confirm your details and shipping by email.</p>
        </div>
        <button className="pay" disabled={busy}>{busy ? 'PLACING ORDER...' : 'PLACE ORDER'}</button>
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
            <span>No broadcasts have been published yet.<br />Check back soon â€” the Last League Final is coming.</span>
          </div>
        )}

        {items.map(item => (
          <div className="league-item" key={item.id}>
            {/* video */}
            <div className="league-video-wrap">
              {item.videoUrl
                ? <video
                    src={`${API_ORIGIN}${item.videoUrl}`}
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
                      ? <img src={`${API_ORIGIN}${item.product.photoUrl}`} alt={item.product.name} />
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
              { icon: 'â—‰', label: 'WHATSAPP', sub: 'Join the channel', href: 'https://whatsapp.com/channel/0029Vb8ISZRIyPtMl50rfi1i' },
              { icon: 'â—Ž', label: 'INSTAGRAM', sub: '@sli_benshii', href: 'https://www.instagram.com/sli_benshii' },
              { icon: 'ð•', label: 'X / TWITTER', sub: '@slibenshiibtr', href: 'https://x.com/slibenshiibtr' },
              { icon: 'âœ‰', label: 'EMAIL', sub: 'slibenshii.btr@gmail.com', href: 'mailto:slibenshii.btr@gmail.com' },
            ].map(l => (
              <a key={l.label} className="community-link" href={l.href} target="_blank" rel="noreferrer">
                <div className="community-icon">{l.icon}</div>
                <div><strong>{l.label}</strong><small>{l.sub}</small></div>
                <b>â†’</b>
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
  { id: 'community', label: 'COMMUNITY' },
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
function SiteFooter({ tab, onNavigate }) {
  const pages = FOOTER_PAGES;
  return (
    <footer className="site-footer">
      <div className="footer-socials">
        {SOCIALS.map(s => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" title={s.label}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
            <span>{s.span}</span>
          </a>
        ))}
      </div>
      <div className="footer-nav">
        {pages.map(p => (
          <button key={p.id} className={tab === p.id ? 'active' : ''} onClick={() => onNavigate(p.id)}>
            {p.label}
          </button>
        ))}
        <a className="footer-admin-link" href={`${API_ORIGIN}/admin.html`}>ADMIN</a>
      </div>
      <strong>SLI-BENSHII &copy; {new Date().getFullYear()}</strong>
    </footer>
  );
}

/* â”€â”€â”€ APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ReopeningNotificationForm() {
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
      {status && <span className="reopening-form-status" role="status">{status}</span>}
    </form>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [tab, setTab] = useState('store');
  const [notice, setNotice] = useState('');
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navBlurOff, setNavBlurOff] = useState(true);
  const [settings, setSettings] = useState({
    siteOffline: false,
    storeOffline: false,
    leagueOffline: false,
    reopeningAt: '',
    emailNotificationsEnabled: false,
  });
  const navRef = useRef(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setNavBlurOff(y <= lastY);
      lastY = y;
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
    if (!menuOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = event => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
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
      {!settings.siteOffline && (
        <video
          className={`site-background-video is-visible${scrolled ? ' is-blurred' : ''}`}
          key={dark ? 'dark-background' : 'light-background'}
          src={dark ? '/sli-navy-wide.mp4' : '/sli-white-wide.mp4'}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {intro && <Intro onDone={() => setIntro(false)} />}

      {/* NAV */}
      <header ref={navRef} className={`nav${scrolled ? ' is-scrolled' : ''}${navBlurOff ? ' is-blur-off' : ''}`}>
        <button className="brand" onClick={() => navigate('store')} aria-label="SLI-BENSHII home">
          <img src="/logo.png" alt="SLI-BENSHII" className="brand-logo" />
        </button>

        <div className={`nav-menu${menuOpen ? ' is-open' : ''}`}>
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

        <div className="nav-actions">
          <button className="theme" onClick={() => setDark(d => !d)} aria-label="Toggle theme">{dark ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>) : (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>)}</button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      {/* STORE */}
      {tab === 'store' && !settings.siteOffline && (
        <main>
          <div className="hero-shell" aria-hidden="true" />
          <section className="section" id="store-grid">
            {settings.storeOffline ? (
              <>
                <div className="section-head">
                  <h2>SLI-STORE</h2>
                </div>
                <div className="empty-state">
                  <strong>STORE IS OFFLINE</strong>
                  <span>The SLI-Store is temporarily paused.<br />New drops are coming â€” check back soon.</span>
                </div>
              </>
            ) : (
              <>
                <div className="section-head">
                  <h2>SLI-STORE</h2>
                  <span>{products.length} items</span>
                </div>
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
            {settings.emailNotificationsEnabled ? (
              <ReopeningNotificationForm />
            ) : (
              <p className="notification-unavailable">Email alerts are not available right now. Please check back soon.</p>
            )}
            <a href={`${API_ORIGIN}/admin.html`}>ADMIN ACCESS</a>
          </div>
        </main>
      )}

      {/* FOOTER */}
      {!settings.siteOffline && <SiteFooter tab={tab} onNavigate={navigate} />}

      {/* CART */}
      {cartOpen && !settings.siteOffline && <Cart items={cart} total={total} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />}

      {/* CHECKOUT */}
      {checkoutOpen && !settings.siteOffline && <Checkout items={cart} total={total} onClose={() => setCheckoutOpen(false)} onNotice={setNotice} />}

      {/* TOAST */}
      {notice && <div className="toast" onClick={() => setNotice('')}>{notice}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
