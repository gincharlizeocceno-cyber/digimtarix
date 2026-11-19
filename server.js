const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('Set ADMIN_PASSWORD before starting the portal.');
  process.exit(1);
}
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

app.use(express.static(path.join(ROOT, 'public')));
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="DIGIMATRIX Admin"');
    return res.status(401).send('Admin login required.');
  }
  let decoded = '';
  try { decoded = Buffer.from(header.slice(6), 'base64').toString(); } catch {}
  const split = decoded.indexOf(':');
  const user = split >= 0 ? decoded.slice(0, split) : '';
  const pass = split >= 0 ? decoded.slice(split + 1) : '';
  const userOk = user === ADMIN_USER;
  const passOk = crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
  if (!userOk || !passOk) {
    res.set('WWW-Authenticate', 'Basic realm="DIGIMATRIX Admin"');
    return res.status(401).send('Invalid admin credentials.');
  }
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['.pdf','.png','.jpg','.jpeg','.webp','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.psd','.ai','.eps','.svg','.zip']);
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) return cb(new Error('Unsupported file type: ' + ext));
    cb(null, true);
  }
});
function readOrders() { try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { return []; } }
function writeOrders(items) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(items, null, 2)); }
app.post('/api/orders', upload.array('artwork', 10), (req, res) => {
  const fields = req.body || {};
  if (!fields.customerName || !fields.contact || !fields.service) {
    (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'Please complete name, contact, and service.' });
  }
  const order = {
    id: 'DM-' + Date.now().toString().slice(-7),
    createdAt: new Date().toISOString(),
    customerName: fields.customerName.trim().slice(0, 120),
    contact: fields.contact.trim().slice(0, 80),
    email: (fields.email || '').trim().slice(0, 150),
    service: fields.service.slice(0, 100),
    width: (fields.width || '').slice(0, 30),
    height: (fields.height || '').slice(0, 30),
    sizeUnit: fields.sizeUnit || 'inches',
    quantity: (fields.quantity || '1').slice(0, 20),
    colorMode: fields.colorMode || '',
    dueDate: (fields.dueDate || '').slice(0, 40),
    notes: (fields.notes || '').slice(0, 2000),
    files: (req.files || []).map(f => ({ originalName: f.originalname, storedName: f.filename, size: f.size })),
    status: 'Pending'
  };
  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
  res.json({ ok: true, orderId: order.id });
});
app.get('/admin', adminAuth, (req, res) => {
  const orders = readOrders();
  const rows = orders.map(o => `<section class="order"><div class="top"><div><strong>${esc(o.id)} · ${esc(o.customerName)}</strong><small>${new Date(o.createdAt).toLocaleString()}</small></div><span class="status">${esc(o.status)}</span></div><p><b>Contact:</b> ${esc(o.contact)} ${o.email ? ' · ' + esc(o.email) : ''}</p><p><b>Service:</b> ${esc(o.service)} · <b>Size:</b> ${esc(o.width||'-')} × ${esc(o.height||'-')} ${esc(o.sizeUnit||'')} · <b>Qty:</b> ${esc(o.quantity)}</p><p><b>Color:</b> ${esc(o.colorMode||'-')} · <b>Deadline:</b> ${esc(o.dueDate||'-')}</p><p><b>Notes:</b> ${esc(o.notes||'None')}</p><div class="files">${(o.files||[]).map(f=>`<a href="/admin/file/${encodeURIComponent(o.id)}/${encodeURIComponent(f.storedName)}">⬇ ${esc(f.originalName)} (${(f.size/1024/1024).toFixed(1)} MB)</a>`).join('')}</div><form method="post" action="/admin/status/${encodeURIComponent(o.id)}"><label>Update status <select name="status"><option ${o.status==='Pending'?'selected':''}>Pending</option><option ${o.status==='Processing'?'selected':''}>Processing</option><option ${o.status==='Completed'?'selected':''}>Completed</option></select></label><button>Save status</button></form></section>`).join('');
  res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Admin | DIGIMATRIX</title><style>body{font-family:Arial,sans-serif;background:#f2f6fa;color:#1d2937;margin:0;padding:20px}.wrap{max-width:1000px;margin:auto}h1{color:#165da8}.order{background:white;border:1px solid #dce5ef;border-radius:14px;padding:18px;margin:14px 0}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.top small{display:block;color:#65758a;margin-top:5px}.status{background:#e8f2ff;color:#145ca5;padding:6px 10px;border-radius:30px;font-size:13px}p{line-height:1.5}.files{display:flex;gap:10px;flex-wrap:wrap}.files a{background:#eef5fc;padding:8px 10px;border-radius:8px;color:#175b9d;text-decoration:none}form{margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}button{background:#1767b2;color:white;border:0;padding:10px 14px;border-radius:8px}select{padding:9px;border:1px solid #cbd7e3;border-radius:8px}</style></head><body><div class="wrap"><h1>DIGIMATRIX PALAWAN · Admin</h1><p>Received print orders: <b>${orders.length}</b></p>${rows || '<p>No orders yet.</p>'}</div></body></html>`);
});
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
app.use(express.urlencoded({ extended: false }));
app.post('/admin/status/:id', adminAuth, (req, res) => {
  const allowed = ['Pending','Processing','Completed'];
  if (!allowed.includes(req.body.status)) return res.status(400).send('Invalid status');
  const orders = readOrders();
  const item = orders.find(o => o.id === req.params.id);
  if (!item) return res.status(404).send('Order not found');
  item.status = req.body.status;
  writeOrders(orders);
  res.redirect('/admin');
});
app.get('/admin/file/:orderId/:storedName', adminAuth, (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.orderId);
  const file = order && order.files.find(f => f.storedName === req.params.storedName);
  if (!file) return res.status(404).send('File not found');
  const fullPath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(fullPath)) return res.status(404).send('File is missing on disk');
  res.download(fullPath, file.originalName);
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || 'Upload error' });
});
app.listen(PORT, () => console.log(`DIGIMATRIX portal running on http://localhost:${PORT}`));
