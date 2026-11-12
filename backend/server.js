import express from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import seedData from './data-seed.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!JWT_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET must be configured.');
}
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

fs.mkdirSync(path.join(__dirname, 'uploads', 'products'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads', 'league'), { recursive: true });

const dataPath = path.join(__dirname, 'data.json');
let products = [];
let lastLeague = [];
let orders = [];

function readData() {
  try {
    const raw = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      : seedData;
    products = Array.isArray(raw.products) ? raw.products : [];
    lastLeague = Array.isArray(raw.league) ? raw.league : [];
    orders = Array.isArray(raw.orders) ? raw.orders : [];
  } catch (error) {
    products = [];
    lastLeague = [];
    orders = [];
  }
}

function writeData() {
  fs.writeFileSync(dataPath, JSON.stringify({ products, league: lastLeague, orders }, null, 2));
}

readData();

function safeUnlink(relUrl) {
  try {
    const filePath = path.join(__dirname, String(relUrl || '').replace(/^\//, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {}
}

const settingsPath = path.join(__dirname, 'settings.json');
const subscribersPath = path.join(__dirname, 'reopening-subscribers.json');
const defaultSettings = { siteOffline: false, storeOffline: false, leagueOffline: false, reopeningAt: '' };
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpFrom = process.env.SMTP_FROM;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const mailerConfigured = Boolean(
  smtpHost &&
  smtpFrom &&
  Number.isInteger(smtpPort) &&
  smtpPort > 0 &&
  smtpPort <= 65535 &&
  Boolean(smtpUser) === Boolean(smtpPass)
);
const mailer = mailerConfigured ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
  ...(smtpUser ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
}) : null;
let reopeningSubscribers = [];

function readSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
  } catch (error) {
    return { ...defaultSettings };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function readSubscribers() {
  try {
    const raw = JSON.parse(fs.readFileSync(subscribersPath, 'utf8'));
    if (!Array.isArray(raw) || raw.some(email => typeof email !== 'string')) {
      throw new Error('Reopening subscriber data must be an array of email addresses.');
    }
    return [...new Set(raw.map(email => email.trim().toLowerCase()).filter(Boolean))];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function writeSubscribers() {
  fs.writeFileSync(subscribersPath, JSON.stringify(reopeningSubscribers, null, 2));
}

reopeningSubscribers = readSubscribers();

async function notifyReopeningSubscribers() {
  const pending = [];
  for (const email of reopeningSubscribers) {
    try {
      await mailer.sendMail({
        from: smtpFrom,
        to: email,
        subject: 'SLI-BENSHII is back online',
        text: `SLI-BENSHII is back online. Visit ${process.env.PUBLIC_SITE_URL || FRONTEND_URL} to see what's new.`,
      });
    } catch (error) {
      pending.push(email);
      console.error('Reopening email delivery failed:', error.code || error.name || 'unknown error');
    }
  }
  const sent = reopeningSubscribers.length - pending.length;
  if (sent > 0) {
    reopeningSubscribers = pending;
    writeSubscribers();
  }
  return { sent, failed: pending.length };
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const adminDir = path.join(__dirname, 'admin');
app.use(express.static(adminDir));

const uploadProduct = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads', 'products')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `product-${Date.now()}-${Math.round(Math.random() * 100000)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});



function generateToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'SLI-BENSHII backend is running.' });
});

app.get('/api/settings', (req, res) => {
  res.json({ ...readSettings(), emailNotificationsEnabled: mailerConfigured });
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  const previousSettings = readSettings();
  const reopeningAtInput = typeof req.body?.reopeningAt === 'string' ? req.body.reopeningAt.trim() : '';
  const reopeningAtDate = reopeningAtInput ? new Date(reopeningAtInput) : null;
  if (reopeningAtInput && Number.isNaN(reopeningAtDate.getTime())) {
    return res.status(400).json({ message: 'Enter a valid estimated reopening date and time.' });
  }
  const settings = {
    siteOffline: Boolean(req.body?.siteOffline),
    storeOffline: Boolean(req.body?.storeOffline),
    leagueOffline: Boolean(req.body?.leagueOffline),
    reopeningAt: reopeningAtDate ? reopeningAtDate.toISOString() : '',
  };
  try {
    writeSettings(settings);
    let notificationWarning = '';
    if (previousSettings.siteOffline && !settings.siteOffline && reopeningSubscribers.length) {
      if (!mailer) {
        notificationWarning = 'The site is online, but reopening emails could not be sent because SMTP is not configured.';
      } else {
        const result = await notifyReopeningSubscribers();
        if (result.failed) {
          notificationWarning = `${result.sent} reopening email(s) sent; ${result.failed} could not be sent and remain saved for retry.`;
        }
      }
    }
    res.json({ ...settings, emailNotificationsEnabled: mailerConfigured, notificationWarning });
  } catch (error) {
    console.error('Could not save site settings:', error.message);
    res.status(500).json({ message: 'Could not save site settings or update reopening notifications.' });
  }
});

app.post('/api/notifications/subscribe', async (req, res) => {
  if (!mailer) {
    return res.status(503).json({ message: 'Email alerts are not available right now.' });
  }
  if (!readSettings().siteOffline) {
    return res.status(409).json({ message: 'The site is online; no reopening alert is needed.' });
  }
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  try {
    await mailer.verify();
    if (!reopeningSubscribers.includes(email)) {
      reopeningSubscribers.push(email);
      writeSubscribers();
    }
    res.json({ message: 'You’re signed up for one email when the site reopens.' });
  } catch (error) {
    console.error('Could not save reopening email subscription:', error.code || error.name || 'unknown error');
    res.status(503).json({ message: 'Email alerts are temporarily unavailable. Please try again later.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (email !== ADMIN_EMAIL || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const user = { id: 'admin', email: ADMIN_EMAIL, role: 'admin' };
  return res.json({
    token: generateToken(user),
    user,
    message: 'Admin access granted.',
  });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', requireAdmin, uploadProduct.single('photo'), (req, res) => {
  const { name, description, price, stock, tag } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required.' });
  }

  const sourceName = req.file?.originalname || '';
  const duplicate = products.find((item) => item.name === name && item.description === (description || '') && item.price === (Number(price) || 0) && item.stock === (Number(stock) || 0) && item.tag === (tag || 'DROP') && item.sourceName === sourceName);
  if (duplicate) {
    return res.status(200).json(duplicate);
  }

  const product = {
    id: `product-${Date.now()}`,
    name,
    description: description || '',
    price: Number(price) || 0,
    stock: Number(stock) || 0,
    tag: tag || 'DROP',
    photoUrl: req.file ? `/uploads/products/${req.file.filename}` : '',
    sourceName,
  };

  products.unshift(product);
  writeData();
  return res.status(201).json(product);
});

app.put('/api/products/:id', requireAdmin, uploadProduct.single('photo'), (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const { name, description, price, stock, tag } = req.body;

  if (req.file) {
    if (product.photoUrl) safeUnlink(product.photoUrl);
    product.photoUrl = `/uploads/products/${req.file.filename}`;
    product.sourceName = req.file.originalname || '';
  }
  if (name) product.name = name;
  if (description !== undefined) product.description = description || '';
  if (price !== undefined) product.price = Number(price) || 0;
  if (stock !== undefined) product.stock = Number(stock) || 0;
  if (tag) product.tag = tag;

  writeData();
  return res.json(product);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found.' });

  const [removed] = products.splice(idx, 1);
  if (removed.photoUrl) safeUnlink(removed.photoUrl);
  writeData();
  return res.json({ success: true });
});

app.get('/api/last-league', (req, res) => {
  res.json(lastLeague);
});

const uploadLeague = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'productPhoto') {
        cb(null, path.join(__dirname, 'uploads', 'products'));
      } else {
        cb(null, path.join(__dirname, 'uploads', 'league'));
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || (file.fieldname === 'video' ? '.mp4' : '.png');
      const prefix = file.fieldname === 'video' ? 'league' : 'product';
      cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

app.post('/api/last-league', requireAdmin, uploadLeague.fields([{ name: 'video', maxCount: 1 }, { name: 'productPhoto', maxCount: 1 }]), (req, res) => {
  const { episodeTitle, description, name, productDescription, price, tag } = req.body;

  if (!episodeTitle) {
    return res.status(400).json({ message: 'Episode title is required.' });
  }

  const videoFile = req.files?.video?.[0];
  const photoFile = req.files?.productPhoto?.[0];

  const item = {
    id: `league-${Date.now()}`,
    episodeTitle,
    description: description || '',
    videoUrl: videoFile ? `/uploads/league/${videoFile.filename}` : '',
    product: {
      id: `league-product-${Date.now()}`,
      name: name || '',
      description: productDescription || '',
      price: Number(price) || 0,
      tag: tag || 'SPECIAL',
      photoUrl: photoFile ? `/uploads/products/${photoFile.filename}` : '',
    },
  };

  lastLeague.unshift(item);
  writeData();
  return res.status(201).json(item);
});

app.put('/api/last-league/:id', requireAdmin, uploadLeague.fields([{ name: 'video', maxCount: 1 }, { name: 'productPhoto', maxCount: 1 }]), (req, res) => {
  const item = lastLeague.find((l) => l.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Broadcast not found.' });

  const { episodeTitle, description, name, productDescription, price, tag } = req.body;
  const videoFile = req.files?.video?.[0];
  const photoFile = req.files?.productPhoto?.[0];

  if (videoFile) {
    if (item.videoUrl) safeUnlink(item.videoUrl);
    item.videoUrl = `/uploads/league/${videoFile.filename}`;
  }
  if (photoFile) {
    item.product = item.product || {};
    if (item.product.photoUrl) safeUnlink(item.product.photoUrl);
    item.product.photoUrl = `/uploads/products/${photoFile.filename}`;
  }
  if (episodeTitle) item.episodeTitle = episodeTitle;
  if (description !== undefined) item.description = description || '';

  item.product = item.product || {};
  if (name !== undefined) item.product.name = name || '';
  if (productDescription !== undefined) item.product.description = productDescription || '';
  if (price !== undefined) item.product.price = Number(price) || 0;
  if (tag) item.product.tag = tag;

  writeData();
  return res.json(item);
});

app.delete('/api/last-league/:id', requireAdmin, (req, res) => {
  const idx = lastLeague.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Broadcast not found.' });

  const [removed] = lastLeague.splice(idx, 1);
  if (removed.videoUrl) safeUnlink(removed.videoUrl);
  if (removed.product?.photoUrl) safeUnlink(removed.product.photoUrl);
  writeData();
  return res.json({ success: true });
});

function findCartItem(id) {
  if (!id) return null;
  for (const p of products) if (p.id === id) return p;
  for (const l of lastLeague) if (l.product && l.product.id === id) return l.product;
  return null;
}

app.post('/api/checkout/session', (req, res) => {
  const { email = '', items = [] } = req.body || {};

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'A valid email is required.' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Your cart is empty.' });
  }

  const lineItems = [];
  for (const line of items) {
    const qty = Math.max(1, Math.min(99, Number(line?.qty) || 1));
    const item = findCartItem(line?.id);
    if (!item) {
      return res.status(400).json({ message: 'One of your items is no longer available.' });
    }
    if (typeof item.stock === 'number' && item.stock < qty) {
      return res.status(400).json({ message: `"${item.name}" only has ${item.stock} left in stock.` });
    }
    lineItems.push({ id: item.id, name: item.name, price: Number(item.price) || 0, qty });
  }

  const total = lineItems.reduce((s, l) => s + l.price * l.qty, 0);
  const order = {
    id: `order-${Date.now()}`,
    email,
    items: lineItems,
    total,
    status: 'placed',
    createdAt: new Date().toISOString(),
  };

  for (const line of lineItems) {
    const p = products.find((x) => x.id === line.id);
    if (p && typeof p.stock === 'number') p.stock = Math.max(0, p.stock - line.qty);
  }

  orders.unshift(order);
  writeData();
  return res.json({ url: `/checkout/success?order=${order.id}`, order });
});

app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(orders);
});

app.delete('/api/orders/:id', requireAdmin, (req, res) => {
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Order not found.' });
  orders.splice(idx, 1);
  writeData();
  return res.json({ success: true });
});

app.get('/checkout/success', (req, res) => {
  const order = orders.find((o) => o.id === req.query.order);
  if (!order) return res.status(404).send('Order not found.');

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>ORDER CONFIRMED | SLI-BENSHII</title>
<style>
  :root{font-family:'JetBrains Mono',monospace,'Courier New';color:#f2f0eb;background:#080808}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 0%,#ff2b4d22,transparent 57%)}
  .card{max-width:520px;width:calc(100% - 40px);padding:48px 32px;text-align:center;border:1px solid #2d2d2a}
  h1{font-size:11px;letter-spacing:.3em;color:#92928d}
  h2{font-size:22px;letter-spacing:.08em;margin:14px 0}
  h2 span{color:#ff2b4d}
  .order-id{font-size:10px;color:#92928d;letter-spacing:.14em;word-break:break-all}
  table{width:100%;border-collapse:collapse;margin:26px 0;font-size:11px}
  td,th{padding:10px 8px;border-bottom:1px solid #2d2d2a;text-align:left}
  th{color:#92928d;font-size:9px;letter-spacing:.14em;font-weight:400}
  .total td{font-size:13px;font-weight:700;border-bottom:0;border-top:2px solid #2d2d2a}
  .ok{display:inline-block;margin-top:8px;padding:13px 28px;background:#ff2b4d;color:#fff;text-decoration:none;font-size:10px;letter-spacing:.18em}
  p.note{color:#92928d;font-size:10px;line-height:1.8}
</style>
</head>
<body>
  <div class="card">
    <h1>SLI-BENSHII</h1>
    <h2>ORDER <span>CONFIRMED</span></h2>
    <div class="order-id">${order.id}</div>
    <table>
      <tr><th>ITEM</th><th>PRICE</th><th>QTY</th><th>TOTAL</th></tr>
      ${order.items.map(i => `<tr><td>${i.name}</td><td>RWF ${Number(i.price).toLocaleString()}</td><td>${i.qty}</td><td>RWF ${(i.price * i.qty).toLocaleString()}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTAL</td><td>RWF ${Number(order.total).toLocaleString()}</td></tr>
    </table>
    <p class="note">A confirmation was sent to <b>${order.email}</b>.<br/>We'll be in touch about shipping.</p>
    <a class="ok" href="${FRONTEND_URL}">BACK TO STORE</a>
  </div>
</body>
</html>`);
});

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(adminDir, 'admin.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload failed: ${err.message}` });
  }
  return res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SLI-BENSHII API running on http://localhost:${PORT}`);
});
