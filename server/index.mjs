#!/usr/bin/env node
/**
 * KölnHaus 2027 — Cloud Run / Self-Hosted Server with Shared Group Password & Cross-Device State Sync
 *
 * Features:
 * - Serves Vite production bundle (dist/) 24/7 on PORT (default 8080)
 * - Enforces a shared group password (GROUP_PASSWORD env var) via HMAC-signed HttpOnly session cookies
 * - Protects /api/state, /data/*, and /snapshots/* behind the password when GROUP_PASSWORD is set
 * - Persists shared roommate pins, statuses, votes, notes, and todos across ALL devices via:
 *     1. Google Cloud Storage (GCS_STATE_BUCKET env var) on Cloud Run -> $0 within 5GB Always Free
 *     2. Local JSON file (data/shared-state.json) when running on your always-on PC / mini-PC
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const LOCAL_STATE_PATH = path.join(ROOT_DIR, 'data', 'shared-state.json');

const PORT = Number(process.env.PORT || 8080);
const GROUP_PASSWORD = (process.env.GROUP_PASSWORD || '').trim();
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`koelnhaus-2027:${GROUP_PASSWORD || 'local-dev'}`)
    .digest('hex');
const GCS_STATE_BUCKET = (process.env.GCS_STATE_BUCKET || '').trim();
const GCS_OBJECT_NAME = process.env.GCS_OBJECT_NAME || 'koelnhaus-shared-state.json';

const COOKIE_NAME = 'koelnhaus_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

if (!GROUP_PASSWORD) {
  console.error(
    'ERROR: GROUP_PASSWORD environment variable is required to protect your private roommate dashboard.\n' +
      'Example (PowerShell): $env:GROUP_PASSWORD="YourAgreedPassword"; node server/index.mjs'
  );
  process.exit(1);
}

function sha256Buffer(val) {
  return crypto.createHash('sha256').update(String(val)).digest();
}

function verifyPassword(candidate) {
  return crypto.timingSafeEqual(sha256Buffer(candidate), sha256Buffer(GROUP_PASSWORD));
}

function signToken(payloadObj) {
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return Boolean(verifyToken(cookies[COOKIE_NAME]));
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

async function readBodyJson(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Fetch GCP access token from Cloud Run's built-in metadata server
async function getGcpAccessToken() {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!res.ok) throw new Error(`Metadata token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function readPersistedState() {
  if (GCS_STATE_BUCKET) {
    try {
      const token = await getGcpAccessToken();
      const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
        GCS_STATE_BUCKET
      )}/o/${encodeURIComponent(GCS_OBJECT_NAME)}?alt=media`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GCS read failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('GCS read fallback:', err.message);
      return null;
    }
  }

  if (fs.existsSync(LOCAL_STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function writePersistedState(stateObj) {
  const enriched = { ...stateObj, serverUpdatedAt: new Date().toISOString() };

  if (GCS_STATE_BUCKET) {
    const token = await getGcpAccessToken();
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
      GCS_STATE_BUCKET
    )}/o?uploadType=media&name=${encodeURIComponent(GCS_OBJECT_NAME)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enriched)
    });
    if (!res.ok) {
      throw new Error(`GCS write failed: ${res.status} ${await res.text()}`);
    }
    return enriched;
  }

  fs.mkdirSync(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  const tmpPath = `${LOCAL_STATE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(enriched, null, 2), 'utf8');
  fs.renameSync(tmpPath, LOCAL_STATE_PATH);
  return enriched;
}

function readScrapedFeed() {
  const distFeed = path.join(DIST_DIR, 'data', 'listings.json');
  const pubFeed = path.join(ROOT_DIR, 'public', 'data', 'listings.json');
  const target = fs.existsSync(distFeed) ? distFeed : pubFeed;
  if (!fs.existsSync(target)) return { listings: [] };
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    return { listings: [] };
  }
}

function serveStatic(req, res, urlPath) {
  const cleanRel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(DIST_DIR, cleanRel);
  if (!resolved.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback for client routes; 404 for missing snapshots/assets
    if (cleanRel.startsWith('snapshots/') || cleanRel.startsWith('assets/') || cleanRel.startsWith('data/')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    if (pathname === '/healthz') {
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/session' && req.method === 'GET') {
      return sendJson(res, 200, {
        serverMode: true,
        authenticated: isAuthenticated(req),
        storageBackend: GCS_STATE_BUCKET ? 'gcs' : 'local-file'
      });
    }

    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await readBodyJson(req);
      const password = String(body.password || '');
      if (!verifyPassword(password)) {
        return sendJson(res, 401, { ok: false, error: 'Incorrect group password' });
      }
      const token = signToken({ role: 'roommate', exp: Date.now() + SESSION_TTL_MS });
      const isHttps =
        req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.K_SERVICE);
      const cookieFlags = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
      ];
      if (isHttps) cookieFlags.push('Secure');

      return sendJson(
        res,
        200,
        { ok: true },
        { 'Set-Cookie': cookieFlags.join('; ') }
      );
    }

    if (pathname === '/api/logout' && req.method === 'POST') {
      return sendJson(
        res,
        200,
        { ok: true },
        { 'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0` }
      );
    }

    // Protect private data endpoints & archived snapshots behind group password
    const isProtectedAsset =
      pathname.startsWith('/api/') ||
      pathname.startsWith('/data/') ||
      pathname.startsWith('/snapshots/');
    if (isProtectedAsset && !isAuthenticated(req)) {
      return sendJson(res, 401, { error: 'Authentication required' });
    }

    if (pathname === '/api/state' && req.method === 'GET') {
      const saved = (await readPersistedState()) || {};
      const feed = readScrapedFeed();
      return sendJson(res, 200, {
        ...saved,
        scrapedFeedUpdatedAt: feed.updatedAt || null,
        scrapedListings: feed.listings || []
      });
    }

    if (pathname === '/api/state' && req.method === 'PUT') {
      const body = await readBodyJson(req);
      const saved = await writePersistedState({
        listings: Array.isArray(body.listings) ? body.listings : [],
        todos: Array.isArray(body.todos) ? body.todos : [],
        portals: Array.isArray(body.portals) ? body.portals : undefined,
        alertConfig: body.alertConfig || undefined
      });
      return sendJson(res, 200, { ok: true, serverUpdatedAt: saved.serverUpdatedAt });
    }

    if (pathname === '/api/scrape' && req.method === 'POST') {
      await execFileAsync('node', [path.join(ROOT_DIR, 'scripts', 'scrape-and-notify.mjs')], {
        timeout: 60000
      });
      // Mirror fresh listings.json & snapshots into dist/ so the live server serves them immediately
      const pubFeed = path.join(ROOT_DIR, 'public', 'data', 'listings.json');
      const distFeed = path.join(DIST_DIR, 'data', 'listings.json');
      if (fs.existsSync(pubFeed)) {
        fs.mkdirSync(path.dirname(distFeed), { recursive: true });
        fs.copyFileSync(pubFeed, distFeed);
      }
      const pubSnaps = path.join(ROOT_DIR, 'public', 'snapshots');
      const distSnaps = path.join(DIST_DIR, 'snapshots');
      if (fs.existsSync(pubSnaps)) {
        fs.mkdirSync(distSnaps, { recursive: true });
        for (const f of fs.readdirSync(pubSnaps)) {
          fs.copyFileSync(path.join(pubSnaps, f), path.join(distSnaps, f));
        }
      }
      return sendJson(res, 200, { ok: true });
    }

    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `KölnHaus 2027 Server running on http://0.0.0.0:${PORT} (Storage: ${
      GCS_STATE_BUCKET ? `GCS ${GCS_STATE_BUCKET}` : LOCAL_STATE_PATH
    })`
  );
});
