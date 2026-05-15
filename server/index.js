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
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 5174);
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
const jwtSecret = process.env.JWT_SECRET || adminPassword;
const tokenTtlMs = 1000 * 60 * 60 * 12;

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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

function sendOk(res, data) {
  res.json({ ok: true, data });
}

function sendError(res, status, error) {
  res.status(status).json({ ok: false, error });
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
    sendOk(res, req.body);
  } catch {
    sendError(res, 500, 'Не удалось сохранить content.json');
  }
});

app.post('/api/leads', async (req, res) => {
  const result = validateLead(req.body);
  if (result.error) return sendError(res, 400, result.error);

  try {
    const lead = await saveLead(result.lead);
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
    res.sendFile(path.join(distDir, 'index.html'));
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
