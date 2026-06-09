import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const contentFile = path.join(dataDir, 'content.json');
const leadsFile = path.join(dataDir, 'leads.json');
const emailSettingsFile = path.join(dataDir, 'email-settings.json');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 5174);
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
const jwtSecret = process.env.JWT_SECRET || adminPassword;
const tokenTtlMs = 1000 * 60 * 60 * 12;

const app = express();

const defaultEmailSettings = {
  enabled: false,
  method: 'mail',
  toEmail: '',
  fromEmail: '',
  subject: 'Новая заявка B-POWER',
  smtpHost: '',
  smtpPort: '465',
  smtpSecure: true,
  smtpUser: '',
  smtpPass: ''
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(leadsFile);
  } catch {
    await fs.writeFile(leadsFile, '[]\n', 'utf8');
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);
}

function escapeHtmlText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value) {
  return escapeHtmlText(value).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function replaceOrInsertHeadTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace(/<\/head>/i, `    ${replacement}\n  </head>`);
}

async function syncIndexSeo(content) {
  const seo = content?.seo;
  if (!seo || typeof seo !== 'object') return;

  const indexFile = path.join(distDir, 'index.html');
  let html;
  try {
    html = await fs.readFile(indexFile, 'utf8');
  } catch {
    return;
  }

  const title = String(seo.title || '').trim();
  const description = String(seo.description || '').trim();
  const canonical = String(seo.canonical || '').trim();
  const ogImage = String(seo.ogImage || '').trim();

  if (title) {
    html = replaceOrInsertHeadTag(html, /<title>.*?<\/title>/is, `<title>${escapeHtmlText(title)}</title>`);
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`);
  }

  if (description) {
    html = replaceOrInsertHeadTag(html, /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${escapeHtmlAttr(description)}" />`);
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`);
  }

  if (canonical) {
    html = replaceOrInsertHeadTag(html, /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`);
  }

  if (ogImage) {
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`);
  }

  await fs.writeFile(indexFile, html, 'utf8');
}

function publicEmailSettings(settings) {
  const { smtpPass, ...publicSettings } = settings;
  return { ...publicSettings, hasSmtpPass: Boolean(smtpPass) };
}

function normalizeEmailSettings(payload, current = defaultEmailSettings) {
  return {
    ...defaultEmailSettings,
    ...current,
    enabled: Boolean(payload?.enabled),
    method: String(payload?.method || current.method || 'mail') === 'smtp' ? 'smtp' : 'mail',
    toEmail: String(payload?.toEmail || '').trim(),
    fromEmail: String(payload?.fromEmail || '').trim(),
    subject: String(payload?.subject || defaultEmailSettings.subject).trim(),
    smtpHost: String(payload?.smtpHost || '').trim(),
    smtpPort: String(payload?.smtpPort || current.smtpPort || '465').trim(),
    smtpSecure: Boolean(payload?.smtpSecure),
    smtpUser: String(payload?.smtpUser || '').trim(),
    smtpPass: payload?.smtpPass ? String(payload.smtpPass) : String(current.smtpPass || '')
  };
}

function leadEmailText(lead) {
  return [
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Email: ${lead.email || '-'}`,
    `Сообщение: ${lead.message || '-'}`,
    `Источник: ${lead.source}`,
    `Дата: ${lead.createdAt}`
  ].join('\n');
}

async function sendLeadEmail(lead) {
  const settings = await readJson(emailSettingsFile, defaultEmailSettings);
  const normalized = normalizeEmailSettings(settings, settings);
  if (!normalized.enabled || !normalized.toEmail) return;

  const from = normalized.fromEmail || normalized.smtpUser || 'no-reply@localhost';
  if (normalized.method !== 'smtp') {
    if (!process.env.SENDMAIL_PATH) return;
  }

  const transporter = nodemailer.createTransport({
    host: normalized.smtpHost || process.env.SMTP_HOST,
    port: Number(normalized.smtpPort || process.env.SMTP_PORT || 465),
    secure: Boolean(normalized.smtpSecure),
    auth: normalized.smtpUser ? { user: normalized.smtpUser, pass: normalized.smtpPass } : undefined,
    sendmail: normalized.method === 'mail',
    newline: 'unix',
    path: process.env.SENDMAIL_PATH
  });

  await transporter.sendMail({
    from,
    to: normalized.toEmail,
    subject: normalized.subject || defaultEmailSettings.subject,
    text: leadEmailText(lead)
  });
}

function sendOk(res, data) {
  res.json({ ok: true, data });
}

function sendError(res, status, error) {
  res.status(status).json({ ok: false, error });
}

function hasUtmQuery(query) {
  return Object.keys(query || {}).some((key) => key.toLowerCase().startsWith('utm_'));
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload) {
  return crypto.createHmac('sha256', jwtSecret).update(payload).digest('base64url');
}

function createToken() {
  const payload = base64url(JSON.stringify({ exp: Date.now() + tokenTtlMs, iat: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(decoded.exp) > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token)) return sendError(res, 401, 'Требуется вход в админку');
  next();
}

function validateLead(payload) {
  const name = String(payload?.name || '').trim();
  const phone = String(payload?.phone || '').trim();
  const email = payload?.email ? String(payload.email).trim() : '';
  const message = payload?.message ? String(payload.message).trim() : '';
  const source = String(payload?.source || 'B-POWER landing').trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (name.length < 2) return { error: 'Введите имя' };
  if (phoneDigits.length < 10 || phoneDigits.length > 11) return { error: 'Введите корректный телефон' };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Введите корректный email' };

  return {
    lead: {
      id: crypto.randomUUID(),
      name,
      phone,
      email: email || undefined,
      message: message || undefined,
      source,
      createdAt: new Date().toISOString()
    }
  };
}

function validateContent(content) {
  if (!content || typeof content !== 'object') return 'Некорректный content.json';
  if (!content.seo?.title || !content.hero?.title || !Array.isArray(content.product?.items)) {
    return 'В контенте отсутствуют обязательные поля';
  }
  return '';
}

function escapeCsv(value) {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function leadsToCsv(leads) {
  const header = ['id', 'createdAt', 'name', 'phone', 'email', 'message', 'source'];
  const rows = leads.map((lead) => header.map((key) => escapeCsv(lead[key])).join(';'));
  return `\uFEFF${header.join(';')}\n${rows.join('\n')}\n`;
}

function parseMultipartPdf(contentType, body) {
  const boundaryMatch = String(contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundaryValue = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundaryValue || !Buffer.isBuffer(body)) return null;

  const boundary = Buffer.from(`--${boundaryValue}`);
  let cursor = body.indexOf(boundary);
  while (cursor !== -1) {
    const partStart = cursor + boundary.length + 2;
    const nextBoundary = body.indexOf(boundary, partStart);
    if (nextBoundary === -1) break;

    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), partStart);
    if (headerEnd > partStart && headerEnd < nextBoundary) {
      const header = body.subarray(partStart, headerEnd).toString('utf8');
      if (/name="file"/i.test(header) && /filename="/i.test(header)) {
        const fileName = header.match(/filename="([^"]*)"/i)?.[1] || 'document.pdf';
        const dataEnd = body.subarray(nextBoundary - 2, nextBoundary).toString() === '\r\n' ? nextBoundary - 2 : nextBoundary;
        return { fileName, data: body.subarray(headerEnd + 4, dataEnd) };
      }
    }

    cursor = nextBoundary;
  }

  return null;
}

async function saveUploadedPdf(req) {
  const file = parseMultipartPdf(req.headers['content-type'], req.body);
  if (!file) return { error: 'PDF файл не передан', status: 400 };
  if (file.data.length > 15 * 1024 * 1024) return { error: 'PDF больше 15 МБ', status: 413 };
  if (path.extname(file.fileName).toLowerCase() !== '.pdf') return { error: 'Можно загружать только PDF', status: 400 };
  if (!file.data.subarray(0, 5).equals(Buffer.from('%PDF-'))) return { error: 'Файл должен быть PDF', status: 400 };

  const docsDir = path.join(rootDir, 'public', 'assets', 'docs');
  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(
    path.join(docsDir, '.htaccess'),
    'Options -Indexes\n<IfModule mod_headers.c>\nHeader set X-Robots-Tag "noindex, nofollow, noarchive"\n</IfModule>\n',
    'utf8'
  );

  const storedName = `document-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${crypto.randomBytes(4).toString('hex')}.pdf`;
  await fs.writeFile(path.join(docsDir, storedName), file.data);
  return { data: { url: `/assets/docs/${storedName}`, name: storedName } };
}

async function saveLead(lead) {
  const leads = await readJson(leadsFile, []);
  leads.unshift(lead);
  await writeJson(leadsFile, leads);
  return lead;
}

app.get('/api/health', (_req, res) => {
  sendOk(res, { status: 'ok' });
});

app.post('/api/auth/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (password !== adminPassword) return sendError(res, 401, 'Неверный пароль');
  const token = createToken();
  sendOk(res, { token, expiresAt: new Date(Date.now() + tokenTtlMs).toISOString() });
});

app.get('/api/content', async (_req, res) => {
  try {
    const content = await readJson(contentFile);
    sendOk(res, content);
  } catch {
    sendError(res, 500, 'Не удалось прочитать content.json');
  }
});

app.put('/api/content', requireAdmin, async (req, res) => {
  const error = validateContent(req.body);
  if (error) return sendError(res, 400, error);
  try {
    await writeJson(contentFile, req.body);
    await syncIndexSeo(req.body);
    sendOk(res, req.body);
  } catch {
    sendError(res, 500, 'Не удалось сохранить content.json');
  }
});

app.get('/api/settings/email', requireAdmin, async (_req, res) => {
  const settings = await readJson(emailSettingsFile, defaultEmailSettings);
  sendOk(res, publicEmailSettings(normalizeEmailSettings(settings, settings)));
});

app.put('/api/settings/email', requireAdmin, async (req, res) => {
  try {
    const current = await readJson(emailSettingsFile, defaultEmailSettings);
    const next = normalizeEmailSettings(req.body, current);
    await writeJson(emailSettingsFile, next);
    sendOk(res, publicEmailSettings(next));
  } catch {
    sendError(res, 500, 'Не удалось сохранить настройки почты');
  }
});

app.post('/api/assets/upload', requireAdmin, express.raw({ type: 'multipart/form-data', limit: '15mb' }), async (req, res) => {
  try {
    const result = await saveUploadedPdf(req);
    if (result.error) return sendError(res, result.status, result.error);
    sendOk(res, result.data);
  } catch {
    sendError(res, 500, 'Не удалось сохранить PDF');
  }
});

app.post('/api/leads', async (req, res) => {
  const result = validateLead(req.body);
  if (result.error) return sendError(res, 400, result.error);

  try {
    const lead = await saveLead(result.lead);
    sendLeadEmail(lead).catch((error) => console.error('Lead email failed:', error.message));
    sendOk(res, lead);
  } catch {
    sendError(res, 500, 'Не удалось сохранить заявку');
  }
});

app.get('/api/leads', requireAdmin, async (_req, res) => {
  try {
    const leads = await readJson(leadsFile, []);
    sendOk(res, leads);
  } catch {
    sendError(res, 500, 'Не удалось прочитать заявки');
  }
});

app.delete('/api/leads/:id', requireAdmin, async (req, res) => {
  try {
    const leads = await readJson(leadsFile, []);
    const nextLeads = leads.filter((lead) => String(lead.id) !== String(req.params.id));
    if (nextLeads.length === leads.length) return sendError(res, 404, 'Заявка не найдена');
    await writeJson(leadsFile, nextLeads);
    sendOk(res, { id: req.params.id });
  } catch {
    sendError(res, 500, 'Не удалось удалить заявку');
  }
});

app.get('/api/leads/export', requireAdmin, async (_req, res) => {
  try {
    const leads = await readJson(leadsFile, []);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="b-power-leads.csv"');
    res.send(leadsToCsv(leads));
  } catch {
    sendError(res, 500, 'Не удалось выгрузить заявки');
  }
});

app.post('/api/send-lead', async (req, res) => {
  const result = validateLead(req.body);
  if (result.error) return sendError(res, 400, result.error);

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;
  if (!SMTP_HOST || !MAIL_TO) {
    return sendError(res, 503, 'SMTP не настроен. Заполните SMTP_HOST и MAIL_TO в .env');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: String(SMTP_SECURE).toLowerCase() === 'true',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });

    await transporter.sendMail({
      from: MAIL_FROM || 'B-POWER <no-reply@localhost>',
      to: MAIL_TO,
      subject: 'Новая заявка B-POWER',
      text: [
        `Имя: ${result.lead.name}`,
        `Телефон: ${result.lead.phone}`,
        `Email: ${result.lead.email || '-'}`,
        `Сообщение: ${result.lead.message || '-'}`,
        `Источник: ${result.lead.source}`,
        `Дата: ${result.lead.createdAt}`
      ].join('\n')
    });

    sendOk(res, { sent: true });
  } catch {
    sendError(res, 500, 'Не удалось отправить письмо. Проверьте SMTP-настройки');
  }
});

try {
  await fs.access(distDir);
  app.use(express.static(distDir));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.status(hasUtmQuery(req.query) ? 200 : 404).sendFile(path.join(distDir, 'index.html'));
  });
} catch {
  // Dev mode: Vite serves frontend separately.
}

await ensureDataFiles();

app.listen(port, () => {
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('ADMIN_PASSWORD is not set. Temporary local password: admin');
  }
  console.log(`B-POWER API is running on http://127.0.0.1:${port}`);
});
