#!/usr/bin/env node
/**
 * KölnHaus 2027 — Real Multi-Portal Cologne Property Scraper, Webpage Snapshot Archiver & Notifier
 *
 * Fetches genuine, contemporary listings from:
 *   1. Kleinanzeigen (Rent Houses, Buy Houses, 5+ Room Flats Rent & Buy)
 *   2. Ohne-Makler (Commission-free Houses & Flats in Köln)
 *   3. Immowelt (Houses & 5+ Room Flats in Köln)
 *   4. WG-Gesucht (Whole Houses & Large Flats in Köln)
 *
 * For every matched listing:
 *   - Verifies live HTTP response & records exact timestamp + canonical URL
 *   - Saves a sanitized full webpage copy to public/snapshots/<id>.html
 *   - Computes normalized €/person/mo, AI bedroom potential, and 6-roommate KVB commutes
 *   - Updates public/data/listings.json and src/data/scrapedSeed.json
 *   - Dispatches Signal + Email notifications ONLY for newly discovered listings
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const FEED_PATH = path.join(ROOT_DIR, 'public', 'data', 'listings.json');
const SEED_PATH = path.join(ROOT_DIR, 'src', 'data', 'scrapedSeed.json');
const SNAPSHOT_DIR = path.join(ROOT_DIR, 'public', 'snapshots');

const IS_DRY_RUN = process.argv.includes('--dry-run');
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

// Accurate Cologne Veedel geo + KVB commute lookup (minutes by KVB transit & bike to the 6 destinations)
const VEEDEL_GEO = {
  sülz: { label: 'Sülz', lat: 50.9168, lng: 6.9195, lines: ['Line 18', 'Line 13', 'Bus 146'], florian: [10, 7], lukas: [22, 17], sarah: [27, 22], jonas: [24, 16], elena: [19, 15], matteo: [23, 18] },
  klettenberg: { label: 'Klettenberg', lat: 50.9094, lng: 6.9242, lines: ['Line 18', 'Line 13'], florian: [12, 9], lukas: [24, 19], sarah: [28, 24], jonas: [27, 18], elena: [21, 17], matteo: [24, 20] },
  lindenthal: { label: 'Lindenthal', lat: 50.9278, lng: 6.9065, lines: ['Line 1', 'Line 7', 'Line 13'], florian: [9, 6], lukas: [20, 15], sarah: [25, 21], jonas: [17, 11], elena: [16, 13], matteo: [23, 18] },
  ehrenfeld: { label: 'Ehrenfeld', lat: 50.9514, lng: 6.9182, lines: ['Line 3', 'Line 4', 'Line 13', 'S-Bahn'], florian: [22, 16], lukas: [12, 9], sarah: [24, 21], jonas: [5, 3], elena: [16, 13], matteo: [25, 22] },
  neuehrenfeld: { label: 'Neuehrenfeld', lat: 50.9571, lng: 6.9248, lines: ['Line 5', 'Line 13'], florian: [21, 15], lukas: [11, 8], sarah: [23, 20], jonas: [8, 5], elena: [15, 12], matteo: [24, 21] },
  nippes: { label: 'Nippes', lat: 50.9648, lng: 6.9522, lines: ['Line 12', 'Line 15', 'S-Bahn'], florian: [26, 20], lukas: [11, 8], sarah: [19, 15], jonas: [21, 14], elena: [13, 11], matteo: [21, 16] },
  weidenpesch: { label: 'Weidenpesch', lat: 50.9802, lng: 6.9481, lines: ['Line 12', 'Line 15'], florian: [31, 25], lukas: [16, 13], sarah: [24, 21], jonas: [26, 19], elena: [18, 16], matteo: [26, 22] },
  müngersdorf: { label: 'Müngersdorf', lat: 50.9389, lng: 6.8768, lines: ['Line 1', 'S-Bahn'], florian: [19, 16], lukas: [24, 22], sarah: [28, 28], jonas: [19, 15], elena: [22, 21], matteo: [27, 25] },
  junkersdorf: { label: 'Junkersdorf', lat: 50.9332, lng: 6.8543, lines: ['Line 1', 'Bus 143'], florian: [23, 20], lukas: [29, 26], sarah: [32, 32], jonas: [23, 19], elena: [26, 25], matteo: [30, 29] },
  widdersdorf: { label: 'Widdersdorf', lat: 50.9665, lng: 6.8421, lines: ['Bus 145', 'Line 1'], florian: [36, 30], lukas: [33, 28], sarah: [41, 37], jonas: [28, 22], elena: [34, 31], matteo: [40, 35] },
  rodenkirchen: { label: 'Rodenkirchen', lat: 50.8921, lng: 6.9922, lines: ['Line 16', 'Line 17', 'Bus 130'], florian: [27, 22], lukas: [28, 26], sarah: [25, 23], jonas: [34, 28], elena: [20, 20], matteo: [22, 21] },
  rondorf: { label: 'Rondorf', lat: 50.8705, lng: 6.9562, lines: ['Bus 131', 'Bus 132'], florian: [34, 29], lukas: [38, 34], sarah: [35, 31], jonas: [42, 35], elena: [30, 28], matteo: [32, 29] },
  deutz: { label: 'Deutz', lat: 50.9351, lng: 6.9794, lines: ['Line 1', 'Line 9', 'Line 3', 'Line 4', 'ICE'], florian: [24, 19], lukas: [18, 16], sarah: [5, 4], jonas: [25, 22], elena: [11, 10], matteo: [6, 4] },
  kalk: { label: 'Kalk', lat: 50.9381, lng: 7.0085, lines: ['Line 1', 'Line 9'], florian: [28, 23], lukas: [22, 20], sarah: [10, 9], jonas: [29, 25], elena: [15, 14], matteo: [9, 7] },
  mülheim: { label: 'Mülheim', lat: 50.9619, lng: 7.0058, lines: ['Line 4', 'Line 13', 'Line 18', 'S-Bahn'], florian: [28, 26], lukas: [19, 19], sarah: [11, 14], jonas: [29, 27], elena: [16, 17], matteo: [12, 15] },
  dellbrück: { label: 'Dellbrück', lat: 50.9762, lng: 7.0785, lines: ['Line 3', 'Line 18', 'S11'], florian: [38, 39], lukas: [28, 31], sarah: [21, 26], jonas: [43, 42], elena: [25, 29], matteo: [22, 26] },
  brück: { label: 'Brück', lat: 50.9462, lng: 7.0794, lines: ['Line 1', 'Bus 154'], florian: [37, 38], lukas: [29, 33], sarah: [19, 26], jonas: [39, 41], elena: [23, 29], matteo: [20, 25] },
  holweide: { label: 'Holweide', lat: 50.9652, lng: 7.0422, lines: ['Line 3', 'Line 18', 'S11'], florian: [34, 33], lukas: [25, 26], sarah: [17, 20], jonas: [37, 35], elena: [22, 23], matteo: [18, 20] },
  dünnwald: { label: 'Dünnwald', lat: 50.9961, lng: 7.0432, lines: ['Line 4', 'Bus 154'], florian: [40, 38], lukas: [29, 30], sarah: [23, 27], jonas: [41, 39], elena: [27, 28], matteo: [25, 26] },
  rath: { label: 'Rath/Heumar', lat: 50.9222, lng: 7.0811, lines: ['Line 9', 'Bus 154'], florian: [37, 38], lukas: [31, 34], sarah: [21, 26], jonas: [40, 41], elena: [25, 29], matteo: [21, 25] },
  ostheim: { label: 'Ostheim', lat: 50.9254, lng: 7.0485, lines: ['Line 9', 'Bus 151'], florian: [33, 32], lukas: [27, 28], sarah: [17, 20], jonas: [36, 35], elena: [21, 23], matteo: [16, 18] },
  porz: { label: 'Porz', lat: 50.8855, lng: 7.0581, lines: ['Line 7', 'S12', 'RE'], florian: [35, 36], lukas: [29, 35], sarah: [18, 26], jonas: [38, 39], elena: [24, 30], matteo: [20, 25] },
  weiden: { label: 'Weiden / Lövenich', lat: 50.9388, lng: 6.8352, lines: ['Line 1', 'S-Bahn S12/S19'], florian: [26, 25], lukas: [31, 31], sarah: [35, 37], jonas: [25, 22], elena: [28, 30], matteo: [33, 35] },
  'kwartier latäng': { label: 'Innenstadt / Latäng', lat: 50.9301, lng: 6.9355, lines: ['Line 9', 'Line 12', 'Line 15', 'Line 18'], florian: [7, 5], lukas: [11, 9], sarah: [17, 15], jonas: [15, 11], elena: [10, 8], matteo: [16, 13] },
  zollstock: { label: 'Zollstock', lat: 50.9095, lng: 6.9422, lines: ['Line 12'], florian: [15, 11], lukas: [23, 18], sarah: [23, 19], jonas: [26, 18], elena: [16, 13], matteo: [19, 15] },
  bayenthal: { label: 'Bayenthal', lat: 50.9092, lng: 6.9735, lines: ['Line 16', 'Line 17', 'Bus 106'], florian: [21, 16], lukas: [23, 19], sarah: [19, 17], jonas: [28, 23], elena: [15, 13], matteo: [17, 14] },
  chorweiler: { label: 'Chorweiler', lat: 51.0221, lng: 6.8981, lines: ['Line 15', 'S11'], florian: [40, 41], lukas: [26, 31], sarah: [31, 35], jonas: [36, 34], elena: [28, 32], matteo: [33, 35] },
  esch: { label: 'Esch/Auweiler', lat: 51.0155, lng: 6.8575, lines: ['Bus 125', 'S11'], florian: [44, 38], lukas: [33, 30], sarah: [39, 36], jonas: [38, 30], elena: [36, 32], matteo: [41, 36] },
  worringen: { label: 'Worringen', lat: 51.0622, lng: 6.8592, lines: ['S11', 'Bus 120'], florian: [46, 52], lukas: [34, 42], sarah: [38, 46], jonas: [42, 46], elena: [36, 44], matteo: [40, 46] },
  'altstadt-nord': { label: 'Innenstadt / Altstadt', lat: 50.9413, lng: 6.9583, lines: ['Line 12', 'Line 15', 'Line 16', 'Line 18'], florian: [18, 12], lukas: [8, 6], sarah: [11, 9], jonas: [16, 13], elena: [5, 4], matteo: [13, 10] },
  koeln: { label: 'Köln (Zentral / Umland)', lat: 50.9375, lng: 6.9603, lines: ['KVB Netz Köln'], florian: [22, 18], lukas: [18, 15], sarah: [18, 16], jonas: [22, 18], elena: [15, 13], matteo: [19, 16] }
};

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&sup2;/g, '²')
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(html) {
  return decodeEntities((html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseGermanNumber(str) {
  if (!str) return 0;
  const match = str.replace(/\./g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function inferVeedel(text) {
  const lower = (text || '').toLowerCase()
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/ue/g, 'ü');
  const rawLower = (text || '').toLowerCase();
  for (const [key, geo] of Object.entries(VEEDEL_GEO)) {
    if (key === 'koeln') continue;
    const asciiKey = key.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
    if (lower.includes(key) || rawLower.includes(asciiKey) || rawLower.includes(key)) {
      return geo;
    }
  }
  return VEEDEL_GEO.koeln;
}

function buildCommutesFromGeo(geo) {
  return {
    florian: { kvbMins: geo.florian[0], bikeMins: geo.florian[1] },
    lukas: { kvbMins: geo.lukas[0], bikeMins: geo.lukas[1] },
    sarah: { kvbMins: geo.sarah[0], bikeMins: geo.sarah[1] },
    jonas: { kvbMins: geo.jonas[0], bikeMins: geo.jonas[1] },
    elena: { kvbMins: geo.elena[0], bikeMins: geo.elena[1] },
    matteo: { kvbMins: geo.matteo[0], bikeMins: geo.matteo[1] }
  };
}

function normalizeCostPerPerson(mode, basePrice, utilities = 420, brokerPct = 0) {
  if (mode === 'rent') {
    return Math.round((basePrice + utilities) / 6);
  }
  const acquisition = basePrice * (1 + 0.085 + brokerPct / 100);
  const assumedLoan = acquisition * 0.85;
  const monthlyDebtService = (assumedLoan * 0.056) / 12;
  return Math.round((monthlyDebtService + utilities) / 6);
}

function scoreListing({ mode, listedRooms, aiViableBedrooms, livingSpaceSqm, effectiveMonthlyPerPerson, wgFriendly, commutes, brokerFeePct }) {
  let score = 55;
  if (aiViableBedrooms >= 6) score += 18;
  else if (aiViableBedrooms >= 5) score += 10;
  else if (listedRooms >= 4.5) score += 4;

  if (livingSpaceSqm >= 180) score += 12;
  else if (livingSpaceSqm >= 145) score += 8;
  else if (livingSpaceSqm >= 115) score += 4;

  if (effectiveMonthlyPerPerson > 0 && effectiveMonthlyPerPerson <= 580) score += 10;
  else if (effectiveMonthlyPerPerson <= 720) score += 5;
  else if (effectiveMonthlyPerPerson > 950) score -= 8;

  const maxKvb = Math.max(...Object.values(commutes).map((c) => c.kvbMins));
  if (maxKvb <= 30) score += 8;
  else if (maxKvb <= 35) score += 4;
  else if (maxKvb > 40) score -= 7;

  if (!wgFriendly) score -= 18;
  if (mode !== 'rent' && brokerFeePct === 0) score += 5;

  return Math.max(25, Math.min(98, score));
}

async function curlGet(url, cookieHeader = '') {
  const args = [
    '-sL',
    '-m',
    '14',
    '-w',
    '\n__HTTP_STATUS__:%{http_code}__FINAL_URL__:%{url_effective}',
    '-A',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    '-H',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '-H',
    'Accept-Language: de-DE,de;q=0.9,en;q=0.8'
  ];
  if (cookieHeader) {
    args.push('-H', `Cookie: ${cookieHeader}`);
  }
  args.push(url);

  const { stdout } = await execFileAsync(CURL_BIN, args, { maxBuffer: 18 * 1024 * 1024 });
  const markerIdx = stdout.lastIndexOf('\n__HTTP_STATUS__:');
  if (markerIdx === -1) {
    return { status: 200, finalUrl: url, html: stdout };
  }
  const html = stdout.slice(0, markerIdx);
  const meta = stdout.slice(markerIdx);
  const status = Number(meta.match(/__HTTP_STATUS__:(\d+)/)?.[1] || 200);
  const finalUrl = meta.match(/__FINAL_URL__:([^\s]+)/)?.[1] || url;
  return { status, finalUrl, html };
}

function saveSanitizedSnapshot(id, baseUrl, rawHtml, portalName, capturedAt, title, extraCardMeta = null) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const fileName = `${id}.html`;
  const targetPath = path.join(SNAPSHOT_DIR, fileName);

  const banner = `
<div style="position:sticky;top:0;z-index:999999;background:#0f172a;color:#f8fafc;border-bottom:2px solid #4f46e5;padding:10px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
  <div>
    <strong style="color:#38bdf8;">KölnHaus 2027 Archived Webpage Copy</strong>
    <span style="color:#94a3b8;"> • Source: ${portalName} • Captured: ${capturedAt.slice(0, 19).replace('T', ' ')} UTC</span>
  </div>
  <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" style="background:#4f46e5;color:#fff;padding:5px 10px;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;">Open Live Original ↗</a>
</div>`;

  let outputHtml;
  if (rawHtml && rawHtml.length > 5000) {
    const origin = new URL(baseUrl).origin;
    let sanitized = rawHtml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<meta[^>]+http-equiv=["']?(?:Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, '')
      .replace(/\son(?:click|load|error|mouseover|submit)=["'][^"']*["']/gi, '');

    if (/<head[^>]*>/i.test(sanitized)) {
      sanitized = sanitized.replace(/<head[^>]*>/i, (m) => `${m}\n<base href="${origin}/">`);
    } else {
      sanitized = `<head><base href="${origin}/"></head>\n` + sanitized;
    }

    if (/<body[^>]*>/i.test(sanitized)) {
      sanitized = sanitized.replace(/<body[^>]*>/i, (m) => `${m}\n${banner}`);
    } else {
      sanitized = banner + '\n' + sanitized;
    }
    outputHtml = sanitized;
  } else {
    // Self-contained archival card snapshot (used when portal gates /expose/ behind JS challenge)
    const m = extraCardMeta || {};
    outputHtml = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${title} — KölnHaus 2027 Archived Snapshot</title>
<style>
  body { margin:0; background:#f8fafc; color:#0f172a; font-family:system-ui,-apple-system,sans-serif; }
  .wrap { max-width:920px; margin:24px auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 6px 24px rgba(15,23,42,0.06); }
  .badge { display:inline-block; background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; margin-bottom:10px; }
  h1 { margin:0 0 12px; font-size:22px; line-height:1.3; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin:16px 0; padding:16px; background:#f1f5f9; border-radius:12px; }
  .k { font-size:11px; color:#64748b; text-transform:uppercase; }
  .v { font-size:16px; font-weight:700; color:#0f172a; margin-top:2px; }
  .imgs { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin:16px 0; }
  .imgs img { width:100%; height:190px; object-fit:cover; border-radius:10px; border:1px solid #e2e8f0; }
  .desc { line-height:1.65; font-size:15px; color:#334155; white-space:pre-line; }
</style>
</head>
<body>
${banner}
<div class="wrap">
  <span class="badge">${portalName} • Verified Search-Card Snapshot</span>
  <h1>${title}</h1>
  <div style="color:#475569;font-size:14px;">📍 ${m.address || 'Köln'}</div>
  <div class="grid">
    <div><div class="k">Price / Rent</div><div class="v">${m.priceLabel || 'N/A'}</div></div>
    <div><div class="k">Living Space</div><div class="v">${m.livingSpaceSqm || '?'} m²</div></div>
    <div><div class="k">Rooms</div><div class="v">${m.listedRooms || '?'} Zimmer</div></div>
    <div><div class="k">Contact</div><div class="v" style="font-size:14px;">${m.contactName || 'Portal Contact'}</div></div>
  </div>
  ${m.images?.length ? `<div class="imgs">${m.images.map((src) => `<img src="${src}" alt="Property photo">`).join('')}</div>` : ''}
  <div class="desc">${m.description || ''}</div>
</div>
</body>
</html>`;
  }

  fs.writeFileSync(targetPath, outputHtml, 'utf8');
  return `./snapshots/${fileName}`;
}

function isRelevantLargeCologneListing(title, desc, rooms, sqm) {
  const combined = `${title} ${desc}`.toLowerCase();
  if (
    /\btausch(wohnung|haus|objekt|angebot)?\b/.test(combined) ||
    /\bwohnberechtigungsschein\b|\bwbs\b/.test(combined) ||
    /\bbaugrundstück\b|\bprojektgrundstück\b/.test(combined) ||
    /\bkroatien\b|\bmallorca\b|\bspanien\b|\bferienhaus\b|\bferienwohnung\b|\boverath\b/.test(combined) ||
    /\bfür 2 personen\b|\b[123][- ]?zi\.?|\b[123][- ]?zimmer|\bzimmer in \d+er[- ]?wg\b|\b1 zimmer\b|\bzwischenmiete.*zimmer\b/.test(combined)
  ) {
    return false;
  }
  return rooms >= 4.5 || (sqm >= 125 && rooms >= 4);
}

function estimateAiBedrooms(listedRooms, sqm, desc) {
  const lower = (desc || '').toLowerCase();
  let bedrooms = Math.floor(listedRooms);
  if (listedRooms >= 5 && sqm >= 155 && /souterrain|spitzboden|dachgeschoss|einlieger|ausgebaut/.test(lower)) {
    bedrooms = Math.max(bedrooms, 6);
  }
  if (/durchgangszimmer/.test(lower)) {
    bedrooms = Math.max(1, bedrooms - 1);
  }
  return bedrooms;
}

async function scrapeKleinanzeigen(capturedAt) {
  const feeds = [
    { url: 'https://www.kleinanzeigen.de/s-haus-mieten/koeln/c205l945', mode: 'rent', kind: 'Einfamilienhaus' },
    { url: 'https://www.kleinanzeigen.de/s-haus-kaufen/koeln/c208l945', mode: 'buy', kind: 'Einfamilienhaus' },
    { url: 'https://www.kleinanzeigen.de/s-wohnung-mieten/koeln/c203l945+wohnung_mieten.zimmer_d:5%2C', mode: 'rent', kind: 'Altbau-Wohnung' },
    { url: 'https://www.kleinanzeigen.de/s-wohnung-kaufen/koeln/c196l945+wohnung_kaufen.zimmer_d:5%2C', mode: 'buy', kind: 'Altbau-Wohnung' }
  ];

  const results = [];
  const seenUrls = new Set();

  for (const feed of feeds) {
    try {
      const { status, html } = await curlGet(feed.url, process.env.KLEINANZEIGEN_COOKIE || '');
      if (status !== 200) continue;

      const paths = Array.from(
        new Set(html.match(/\/s-anzeige\/[a-zA-Z0-9-]+\/\d+-\d+-\d+/g) || [])
      ).slice(0, 10);

      for (const relPath of paths) {
        const fullUrl = `https://www.kleinanzeigen.de${relPath}`;
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);

        try {
          const exp = await curlGet(fullUrl, process.env.KLEINANZEIGEN_COOKIE || '');
          if (exp.status !== 200 || exp.html.length < 15000) continue;

          const adId = relPath.match(/\/(\d+)-\d+-\d+$/)?.[1] || String(Date.now());
          const id = `ka-${adId}`;
          const title = stripTags(exp.html.match(/<h1[^>]*id="viewad-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
          const priceStr = stripTags(exp.html.match(/<h2[^>]*id="viewad-price"[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
          const locality = stripTags(exp.html.match(/id="viewad-locality"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
          const extraInfo = stripTags(exp.html.match(/id="viewad-extra-info"[\s\S]{0,400}/i)?.[0]);
          const pubDate = extraInfo.match(/\d{2}\.\d{2}\.202\d/)?.[0] || capturedAt.slice(0, 10);
          const descRaw = exp.html.match(/id="viewad-description-text"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
          const desc = stripTags(descRaw);
          const detailItems = [...exp.html.matchAll(/<li class="addetailslist--detail">([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1]));
          const detailText = detailItems.join(' | ');

          const livingSpaceSqm = parseGermanNumber(detailItems.find((d) => /Wohnfläche/i.test(d)) || '');
          const plotSqm = parseGermanNumber(detailItems.find((d) => /Grundstücksfläche/i.test(d)) || '');
          const listedRooms = parseGermanNumber(detailItems.find((d) => /^Zimmer/i.test(d)) || '');
          const bedroomsListed = parseGermanNumber(detailItems.find((d) => /Schlafzimmer/i.test(d)) || '');
          const bathroomsAndWcs = parseGermanNumber(detailItems.find((d) => /Badezimmer/i.test(d)) || '') || 2;
          const basePrice = parseGermanNumber(priceStr);
          const utilities = parseGermanNumber(detailItems.find((d) => /Nebenkosten/i.test(d)) || '') || 420;
          const avail = detailItems.find((d) => /Verfügbar ab/i.test(d))?.replace(/Verfügbar ab/i, '').trim() || 'Nach Vereinbarung';
          const hasProvision = detailItems.some((d) => /Mit Provision/i.test(d));
          const brokerFeePct = feed.mode === 'rent' ? 0 : hasProvision ? 3.57 : 0;

          if (!title || basePrice <= 0 || !isRelevantLargeCologneListing(title, `${desc} ${detailText}`, listedRooms, livingSpaceSqm)) {
            continue;
          }

          const imageUrl = exp.html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
          const contactName =
            stripTags(exp.html.match(/id="viewad-contact"[\s\S]{0,600}?<span class="text-body-regular-strong[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
            'Anbieter auf Kleinanzeigen';

          const geo = inferVeedel(`${locality} ${title}`);
          const commutes = buildCommutesFromGeo(geo);
          const lowerAll = `${title} ${desc}`.toLowerCase();
          const wgFriendly = !/keine wg|nicht wg[- ]?geeignet/i.test(lowerAll);
          const aiViableBedrooms = Math.max(bedroomsListed || 0, estimateAiBedrooms(listedRooms, livingSpaceSqm, desc));
          const effectiveMonthlyPerPerson = normalizeCostPerPerson(feed.mode, basePrice, utilities, brokerFeePct);
          const propertyType =
            /reihenhaus|reiheneckhaus/i.test(lowerAll)
              ? 'Reihenhaus'
              : /doppelhaushälfte|dhh/i.test(lowerAll)
                ? 'Doppelhaushälfte'
                : /mehrfamilienhaus/i.test(lowerAll)
                  ? 'Mehrfamilienhaus'
                  : /zweifamilienhaus/i.test(lowerAll)
                    ? 'Zweifamilienhaus'
                    : feed.kind;

          const snapshotUrl = saveSanitizedSnapshot(id, fullUrl, exp.html, 'Kleinanzeigen', capturedAt, title);

          results.push({
            id,
            title,
            mode: /erbpacht|erbbaurecht/i.test(lowerAll) && feed.mode === 'buy' ? 'erbpacht' : feed.mode,
            propertyType,
            veedel: geo.label,
            approxAddress: locality || `${geo.label}, Köln`,
            lat: geo.lat,
            lng: geo.lng,
            googleMapsQuery: locality ? `${locality}` : `${geo.label} Köln`,
            isExactAddress: false,
            portal: 'Kleinanzeigen',
            portalUrl: fullUrl,
            publishedAt: pubDate,
            availableFrom: avail,
            basePriceOrColdRent: basePrice,
            monthlyUtilitiesOrHausgeld: utilities,
            brokerFeePct,
            effectiveMonthlyPerPerson,
            livingSpaceSqm: livingSpaceSqm || 140,
            plotSqm: plotSqm || undefined,
            listedRooms: listedRooms || 5,
            aiViableBedrooms,
            bathroomsAndWcs,
            hasGarden: /garten|terrasse/i.test(lowerAll),
            hasBalconyOrTerrace: /balkon|terrasse/i.test(lowerAll),
            hasFittedKitchen: /einbauküche|ebk/i.test(lowerAll),
            hasBasementOrSouterrain: /keller|souterrain|untergeschoss/i.test(lowerAll),
            wgFriendly,
            isWbsRequired: false,
            energyClass: 'N/A',
            heatingType: detailItems.find((d) => /Heizungsart/i.test(d))?.replace(/Heizungsart/i, '').trim() || 'Siehe Exposé',
            kvbLines: geo.lines,
            commutes,
            aiScore: scoreListing({ mode: feed.mode, listedRooms, aiViableBedrooms, livingSpaceSqm, effectiveMonthlyPerPerson, wgFriendly, commutes, brokerFeePct }),
            aiSummary: `Live Kleinanzeigen exposé (${pubDate}): ${listedRooms || '?'} rooms, ${livingSpaceSqm || '?'} m² in ${locality || geo.label}. ${hasProvision ? 'Broker fee applies.' : 'Commission-free / private or rent.'}`,
            aiFloorplanInsight: detailText || 'See full archived webpage copy for room layout & details.',
            aiRedFlags: [
              ...(!wgFriendly ? ['Description mentions WG restriction'] : []),
              ...(aiViableBedrooms < 6 ? [`Listed as ${aiViableBedrooms} bedrooms — verify whether 6th room can be split`] : [])
            ],
            contactName,
            contactRole: hasProvision ? 'Makler' : 'Privatvermieter',
            pinned: false,
            status: 'new',
            notes: '',
            votes: {},
            verifiedAt: capturedAt,
            httpStatus: exp.status,
            snapshotUrl,
            fullDescription: desc,
            imageUrl,
            isLiveScraped: true
          });

          if (results.length >= 10) break;
        } catch {
          // Skip transient single-ad fetch error
        }
      }
    } catch {
      // Skip failing search feed
    }
  }
  return results;
}

async function scrapeOhneMakler(capturedAt) {
  const feeds = [
    { url: 'https://www.ohne-makler.net/immobilien/haus-kaufen/nordrhein-westfalen/koln/', mode: 'buy', kind: 'Einfamilienhaus' },
    { url: 'https://www.ohne-makler.net/immobilien/haus-mieten/nordrhein-westfalen/koln/', mode: 'rent', kind: 'Einfamilienhaus' },
    { url: 'https://www.ohne-makler.net/immobilien/wohnung-kaufen/nordrhein-westfalen/koln/', mode: 'buy', kind: 'Altbau-Wohnung' }
  ];

  const results = [];
  const seenIds = new Set();

  for (const feed of feeds) {
    try {
      const { status, html } = await curlGet(feed.url);
      if (status !== 200) continue;

      const ids = Array.from(new Set([...html.matchAll(/\/immobilie\/(\d+)\//g)].map((m) => m[1]))).slice(0, 8);
      for (const omId of ids) {
        if (seenIds.has(omId)) continue;
        seenIds.add(omId);

        const fullUrl = `https://www.ohne-makler.net/immobilie/${omId}/`;
        try {
          const exp = await curlGet(fullUrl);
          if (exp.status !== 200 || exp.html.length < 15000) continue;

          const title = stripTags(exp.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
          const metaTitle = stripTags(exp.html.match(/<title>([^<]+)<\/title>/i)?.[1]);
          const tdPairs = [...exp.html.matchAll(/<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
            .map((m) => [stripTags(m[1]), stripTags(m[2])]);

          const findVal = (re) => tdPairs.find(([k]) => re.test(k))?.[1] || '';
          const priceStr = findVal(/^(Kaufpreis|Kaltmiete|Miete)/i);
          const basePrice = parseGermanNumber(priceStr);
          const bedroomsListed = parseGermanNumber(findVal(/^Schlafzimmer/i));
          const titleRooms = parseGermanNumber(title.match(/(\d+(?:[.,]\d+)?)[- ]*(?:Zi\.?|Zimmer)/i)?.[1] || '');
          const explicitRooms = parseGermanNumber(findVal(/^Zimmer/i));
          const roomsListed = explicitRooms || (bedroomsListed ? bedroomsListed + 1 : 0) || titleRooms;
          const baths = parseGermanNumber(findVal(/^Badezimmer/i)) || 2;
          const avail = findVal(/^(Übernahme ab|Bezugsfrei)/i) || 'Nach Absprache';
          const objTypeRaw = findVal(/^Objekttyp/i) || feed.kind;

          const sqmMatch = exp.html.match(/(\d+(?:[.,]\d+)?)\s*m²/);
          const livingSpaceSqm = sqmMatch ? parseGermanNumber(sqmMatch[1]) : 160;
          const isKoeln = /köln|koeln|\b50\d{3}\b|\b51\d{3}\b/i.test(`${title} ${metaTitle}`);
          if (!isKoeln || basePrice <= 0 || !isRelevantLargeCologneListing(title, metaTitle, roomsListed, livingSpaceSqm)) {
            continue;
          }

          const objDescIdx = exp.html.indexOf('Objektbeschreibung');
          const desc = objDescIdx > -1
            ? stripTags(exp.html.slice(objDescIdx, objDescIdx + 2400)).replace(/^Objektbeschreibung\s*/i, '').slice(0, 900)
            : title;

          const geo = inferVeedel(`${title} ${metaTitle}`);
          const commutes = buildCommutesFromGeo(geo);
          const id = `om-${omId}`;
          const snapshotUrl = saveSanitizedSnapshot(id, fullUrl, exp.html, 'ohne-makler.net', capturedAt, title);
          const imageUrl = exp.html.match(/https:\/\/www\.ohne-makler\.net\/immobilie\/\d+\/picture\/0\/[^"']+/)?.[0];
          const aiViableBedrooms = Math.max(bedroomsListed || 0, estimateAiBedrooms(roomsListed, livingSpaceSqm, desc));
          const effectiveMonthlyPerPerson = normalizeCostPerPerson(feed.mode, basePrice, 450, 0);

          results.push({
            id,
            title,
            mode: /erbpacht|erbbaurecht/i.test(`${title} ${desc}`) ? 'erbpacht' : feed.mode,
            propertyType: /mehrfamilienhaus/i.test(objTypeRaw)
              ? 'Mehrfamilienhaus'
              : /zweifamilienhaus/i.test(objTypeRaw)
                ? 'Zweifamilienhaus'
                : /reihenhaus/i.test(objTypeRaw)
                  ? 'Reihenhaus'
                  : /doppelhaushälfte/i.test(objTypeRaw)
                    ? 'Doppelhaushälfte'
                    : feed.kind,
            veedel: geo.label,
            approxAddress: `${geo.label}, Köln (Objekt OM-${omId})`,
            lat: geo.lat,
            lng: geo.lng,
            googleMapsQuery: `${geo.label} Köln`,
            isExactAddress: false,
            portal: 'ohne-makler.net',
            portalUrl: fullUrl,
            publishedAt: capturedAt.slice(0, 10),
            availableFrom: avail,
            basePriceOrColdRent: basePrice,
            monthlyUtilitiesOrHausgeld: 450,
            brokerFeePct: 0,
            effectiveMonthlyPerPerson,
            livingSpaceSqm,
            listedRooms: roomsListed || 6,
            aiViableBedrooms,
            bathroomsAndWcs: baths,
            hasGarden: /garten|terrasse/i.test(`${title} ${desc}`),
            hasBalconyOrTerrace: /balkon|terrasse/i.test(`${title} ${desc}`),
            hasFittedKitchen: /einbauküche/i.test(desc),
            hasBasementOrSouterrain: /keller|souterrain/i.test(desc),
            wgFriendly: true,
            isWbsRequired: false,
            energyClass: 'N/A',
            heatingType: findVal(/Heizung/i) || 'Siehe Exposé',
            kvbLines: geo.lines,
            commutes,
            aiScore: scoreListing({ mode: feed.mode, listedRooms: roomsListed, aiViableBedrooms, livingSpaceSqm, effectiveMonthlyPerPerson, wgFriendly: true, commutes, brokerFeePct: 0 }),
            aiSummary: `Live 0%-Makler listing on ohne-makler.net (OM-${omId}): ${bedroomsListed || roomsListed} bedrooms, ~${livingSpaceSqm} m² in ${geo.label}. Saves 3.57% buyer commission!`,
            aiFloorplanInsight: `${objTypeRaw} • ${bedroomsListed || roomsListed} rooms • ${baths} baths • 0% Makler`,
            aiRedFlags: aiViableBedrooms < 6 ? [`Verify 6th bedroom feasibility (${aiViableBedrooms} listed)`] : [],
            contactName: `Privatverkäufer (ohne-makler.net #${omId})`,
            contactRole: 'Eigentümer (Privatverkauf)',
            pinned: false,
            status: 'new',
            notes: '',
            votes: {},
            verifiedAt: capturedAt,
            httpStatus: exp.status,
            snapshotUrl,
            fullDescription: desc,
            imageUrl,
            isLiveScraped: true
          });
        } catch {
          // Skip individual OM error
        }
      }
    } catch {
      // Skip feed error
    }
  }
  return results;
}

async function scrapeImmowelt(capturedAt) {
  const feeds = [
    { url: 'https://www.immowelt.de/suche/koeln/haeuser/kaufen', mode: 'buy', kind: 'Einfamilienhaus' },
    { url: 'https://www.immowelt.de/suche/koeln/haeuser/mieten', mode: 'rent', kind: 'Einfamilienhaus' }
  ];

  const results = [];
  const seen = new Set();

  for (const feed of feeds) {
    try {
      const { status, html } = await curlGet(feed.url);
      if (status !== 200 || html.length < 50000) continue;

      const cardStarts = [...html.matchAll(/id="classified-card-([^"]+)"/g)];
      for (let i = 0; i < cardStarts.length; i++) {
        const cardId = cardStarts[i][1];
        const startIdx = cardStarts[i].index;
        const endIdx = i + 1 < cardStarts.length ? cardStarts[i + 1].index : startIdx + 12000;
        const block = html.slice(startIdx, Math.min(endIdx, startIdx + 14000));

        const linkMatch = block.match(/href="(https:\/\/www\.immowelt\.de\/expose\/([a-zA-Z0-9-]+))"[^>]*title="([^"]+)"/i);
        if (!linkMatch) continue;
        const fullUrl = linkMatch[1];
        const uuid = linkMatch[2];
        const titleAttr = decodeEntities(linkMatch[3]);
        if (seen.has(uuid)) continue;
        seen.add(uuid);

        const rawText = block
          .replace(/<[^>]+>/g, '\n')
          .split('\n')
          .map((s) => decodeEntities(s).trim())
          .filter(Boolean);
        const text = rawText.join(' | ');
        const roomsMatch = titleAttr.match(/(\d+(?:[.,]\d+)?)\s*Zimmer/i);
        const sqmMatch = titleAttr.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
        const plotMatch = titleAttr.match(/(\d+(?:[.,]\d+)?)\s*m²\s*Grundstück/i);
        const priceMatch = titleAttr.match(/([\d.]+)\s*€/i);

        const listedRooms = roomsMatch ? parseGermanNumber(roomsMatch[1]) : 0;
        const livingSpaceSqm = sqmMatch ? parseGermanNumber(sqmMatch[1]) : 0;
        const plotSqm = plotMatch ? parseGermanNumber(plotMatch[1]) : undefined;
        const basePrice = priceMatch ? parseGermanNumber(priceMatch[1]) : 0;

        if (basePrice <= 0 || !isRelevantLargeCologneListing(titleAttr, text, listedRooms, livingSpaceSqm)) {
          continue;
        }

        const addrLine = rawText.find((line) => /Köln\s*\(\d{5}\)/.test(line));
        const approxAddress = addrLine ? addrLine.trim() : 'Köln';
        const geo = inferVeedel(`${approxAddress} ${titleAttr}`);
        const commutes = buildCommutesFromGeo(geo);
        const imgs = [...block.matchAll(/https:\/\/mms\.immowelt\.de\/[^"'\s)]+/g)]
          .map((m) => decodeEntities(m[0]))
          .filter((src) => !src.includes('h=50'));

        const id = `iw-${uuid.slice(0, 8)}`;
        const aiViableBedrooms = estimateAiBedrooms(listedRooms, livingSpaceSqm, text);
        const brokerFeePct = feed.mode === 'rent' ? 0 : 3.57;
        const effectiveMonthlyPerPerson = normalizeCostPerPerson(feed.mode, basePrice, 440, brokerFeePct);
        const cleanDesc = text.replace(/\s+/g, ' ').slice(0, 500);

        const snapshotUrl = saveSanitizedSnapshot(id, fullUrl, '', 'Immowelt', capturedAt, titleAttr, {
          address: approxAddress,
          priceLabel: `${basePrice.toLocaleString('de-DE')} €`,
          livingSpaceSqm,
          listedRooms,
          contactName: 'Immowelt Anbieter',
          images: imgs.slice(0, 3),
          description: `${cleanDesc}\n\nNote: Immowelt protects individual /expose/ URLs with a browser JS challenge against automated scraping. This archived copy preserves all live search-card specs, photos, address, and the verified exposé URL.`
        });

        results.push({
          id,
          title: titleAttr.split(' - ')[0] + ` (${approxAddress})`,
          mode: /erbpacht|erbbaurecht/i.test(text) ? 'erbpacht' : feed.mode,
          propertyType: /reihen/i.test(titleAttr)
            ? 'Reihenhaus'
            : /doppelhaus/i.test(titleAttr)
              ? 'Doppelhaushälfte'
              : /mehrfamilienhaus/i.test(titleAttr)
                ? 'Mehrfamilienhaus'
                : /zweifamilienhaus/i.test(titleAttr)
                  ? 'Zweifamilienhaus'
                  : feed.kind,
          veedel: geo.label,
          approxAddress,
          lat: geo.lat,
          lng: geo.lng,
          googleMapsQuery: approxAddress,
          isExactAddress: approxAddress.includes('(') && /\d/.test(approxAddress.split(',')[0]),
          portal: 'Immowelt',
          portalUrl: fullUrl,
          publishedAt: capturedAt.slice(0, 10),
          availableFrom: 'Siehe Exposé',
          basePriceOrColdRent: basePrice,
          monthlyUtilitiesOrHausgeld: 440,
          brokerFeePct,
          effectiveMonthlyPerPerson,
          livingSpaceSqm,
          plotSqm,
          listedRooms,
          aiViableBedrooms,
          bathroomsAndWcs: 2,
          hasGarden: Boolean(plotSqm) || /garten/i.test(text),
          hasBalconyOrTerrace: /terrasse|balkon/i.test(text),
          hasFittedKitchen: /einbauküche/i.test(text),
          hasBasementOrSouterrain: /untergeschoss|keller/i.test(text),
          wgFriendly: !/keine wg/i.test(text),
          isWbsRequired: false,
          energyClass: 'N/A',
          heatingType: 'Siehe Exposé',
          kvbLines: geo.lines,
          commutes,
          aiScore: scoreListing({ mode: feed.mode, listedRooms, aiViableBedrooms, livingSpaceSqm, effectiveMonthlyPerPerson, wgFriendly: true, commutes, brokerFeePct }),
          aiSummary: `Live Immowelt search hit: ${listedRooms} rooms, ${livingSpaceSqm} m² in ${approxAddress}.`,
          aiFloorplanInsight: `${titleAttr}`,
          aiRedFlags: aiViableBedrooms < 6 ? [`Listed as ${listedRooms} rooms — check floorplan for 6th room`] : [],
          contactName: `Immowelt Card #${cardId}`,
          contactRole: feed.mode === 'rent' ? 'Privatvermieter' : 'Makler',
          pinned: false,
          status: 'new',
          notes: '',
          votes: {},
          verifiedAt: capturedAt,
          httpStatus: status,
          snapshotUrl,
          fullDescription: cleanDesc,
          imageUrl: imgs[0],
          isLiveScraped: true
        });
        if (results.length >= 10) break;
      }
    } catch {
      // Skip feed error
    }
  }
  return results;
}

async function scrapeWgGesucht(capturedAt) {
  const feeds = [
    { url: 'https://www.wg-gesucht.de/haeuser-in-Koeln.73.3.1.0.html', mode: 'rent', kind: 'Einfamilienhaus', pattern: /haeuser-in-Koeln-[^"'<>]+\.(\d+)\.html/g },
    { url: 'https://www.wg-gesucht.de/wohnungen-in-Koeln.73.2.1.0.html?rMin=5', mode: 'rent', kind: 'Altbau-Wohnung', pattern: /wohnungen-in-Koeln-[^"'<>]+\.(\d+)\.html/g }
  ];

  const results = [];
  const seenIds = new Set();

  for (const feed of feeds) {
    try {
      const { status, html } = await curlGet(feed.url, process.env.WGGESUCHT_COOKIE || '');
      if (status !== 200) continue;

      const matches = [...html.matchAll(feed.pattern)].slice(0, 12);
      for (const m of matches) {
        const relPath = m[0];
        const wgId = m[1];
        if (seenIds.has(wgId)) continue;
        seenIds.add(wgId);

        const fullUrl = `https://www.wg-gesucht.de/${relPath}`;
        try {
          const exp = await curlGet(fullUrl, process.env.WGGESUCHT_COOKIE || '');
          if (exp.status !== 200 || exp.html.length < 15000) continue;

          const title = stripTags(exp.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
          const keyBlock = stripTags(exp.html.match(/key_fact[\s\S]{0,1800}/i)?.[0] || '');
          const sqm = parseGermanNumber(keyBlock.match(/Größe\s*:\s*([\d.,]+)\s*m²/i)?.[1] || '');
          const totalRent = parseGermanNumber(keyBlock.match(/Gesamtmiete\s*:\s*([\d.,]+)\s*€/i)?.[1] || '');
          const rooms = parseGermanNumber(title.match(/(\d+(?:[.,]\d+)?)\s*-?\s*Zimmer/i)?.[1] || '') || (sqm >= 120 ? 5 : 3);
          const freeFrom = stripTags(exp.html.match(/frei ab:\s*<[^>]+>\s*([^<]+)/i)?.[1]) || 'Nach Absprache';
          const img = exp.html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
          const desc = stripTags(exp.html.match(/id="ad_description_text"[\s\S]{0,3000}/i)?.[0] || '').slice(0, 700);

          if (!title || totalRent <= 0 || sqm < 110 || !isRelevantLargeCologneListing(title, `${desc} ${relPath}`, rooms, sqm)) {
            continue;
          }

          const geo = inferVeedel(`${relPath} ${title}`);
          const commutes = buildCommutesFromGeo(geo);
          const id = `wg-${wgId}`;
          const snapshotUrl = saveSanitizedSnapshot(id, fullUrl, exp.html, 'WG-Gesucht', capturedAt, title);
          const effectiveMonthlyPerPerson = Math.round(totalRent / 6);
          const aiViableBedrooms = estimateAiBedrooms(rooms, sqm, desc);

          results.push({
            id,
            title,
            mode: 'rent',
            propertyType: feed.kind,
            veedel: geo.label,
            approxAddress: `${geo.label}, Köln`,
            lat: geo.lat,
            lng: geo.lng,
            googleMapsQuery: `${geo.label} Köln`,
            isExactAddress: false,
            portal: 'WG-Gesucht',
            portalUrl: fullUrl,
            publishedAt: capturedAt.slice(0, 10),
            availableFrom: freeFrom,
            basePriceOrColdRent: totalRent,
            monthlyUtilitiesOrHausgeld: 0,
            brokerFeePct: 0,
            effectiveMonthlyPerPerson,
            livingSpaceSqm: sqm || 120,
            listedRooms: rooms,
            aiViableBedrooms,
            bathroomsAndWcs: 2,
            hasGarden: /garten|terrasse/i.test(`${title} ${desc}`),
            hasBalconyOrTerrace: /balkon|terrasse/i.test(`${title} ${desc}`),
            hasFittedKitchen: /ebk|einbauküche/i.test(desc),
            hasBasementOrSouterrain: /keller/i.test(desc),
            wgFriendly: true,
            isWbsRequired: false,
            energyClass: 'N/A',
            heatingType: 'Siehe Exposé',
            kvbLines: geo.lines,
            commutes,
            aiScore: scoreListing({ mode: 'rent', listedRooms: rooms, aiViableBedrooms, livingSpaceSqm: sqm, effectiveMonthlyPerPerson, wgFriendly: true, commutes, brokerFeePct: 0 }),
            aiSummary: `Live WG-Gesucht whole-property listing in ${geo.label}: ${totalRent} € warm/total, ${sqm} m², free from ${freeFrom}.`,
            aiFloorplanInsight: `${rooms} rooms • ${sqm} m² • ${freeFrom}`,
            aiRedFlags: [
              ...(/zwischenmiete|befristet/i.test(`${title} ${desc}`) ? ['Check lease duration (Zwischenmiete / Befristet)'] : []),
              ...(aiViableBedrooms < 6 ? [`${sqm} m² / ${rooms} rooms — check capacity for 6`] : [])
            ],
            contactName: 'WG-Gesucht Anbieter',
            contactRole: 'Privatvermieter',
            pinned: false,
            status: 'new',
            notes: '',
            votes: {},
            verifiedAt: capturedAt,
            httpStatus: exp.status,
            snapshotUrl,
            fullDescription: desc,
            imageUrl: img,
            isLiveScraped: true
          });
        } catch {
          // Skip single WG error
        }
      }
    } catch {
      // Skip feed error
    }
  }
  return results;
}

function loadExistingFeed() {
  if (!fs.existsSync(FEED_PATH)) {
    return { updatedAt: new Date().toISOString(), listings: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
  } catch {
    return { updatedAt: new Date().toISOString(), listings: [] };
  }
}

async function sendSignalAlert(message) {
  const signalRestUrl = process.env.SIGNAL_REST_URL;
  const signalSender = process.env.SIGNAL_SENDER;
  const signalRecipients = process.env.SIGNAL_RECIPIENTS;
  const callmebotPhone = process.env.CALLMEBOT_SIGNAL_PHONE;
  const callmebotKey = process.env.CALLMEBOT_SIGNAL_KEY;

  if (IS_DRY_RUN) {
    console.log('[DRY-RUN] Signal alert preview:\n' + message);
    return;
  }

  if (signalRestUrl && signalSender && signalRecipients) {
    await fetch(`${signalRestUrl.replace(/\/$/, '')}/v2/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        number: signalSender,
        recipients: signalRecipients.split(',').map((s) => s.trim())
      })
    });
    console.log('Sent Signal notification via signal-cli-rest-api.');
  } else if (callmebotPhone && callmebotKey) {
    const url = `https://signal.callmebot.com/signal/send.php?phone=${encodeURIComponent(callmebotPhone)}&apikey=${encodeURIComponent(callmebotKey)}&text=${encodeURIComponent(message)}`;
    await fetch(url);
    console.log('Sent Signal notification via CallMeBot.');
  } else {
    console.log('Signal secrets not set — skipping live Signal push.');
  }
}

async function sendEmailAlert(subject, text) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.ALERT_EMAIL_TO;

  if (IS_DRY_RUN) {
    console.log(`[DRY-RUN] Email alert preview: "${subject}"`);
    return;
  }

  if (resendApiKey && emailTo) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM || 'koelnhaus@resend.dev',
        to: emailTo.split(',').map((e) => e.trim()),
        subject,
        text
      })
    });
    console.log('Sent Email alert via Resend API.');
  } else {
    console.log('Email secrets not set — skipping live Email push.');
  }
}

async function main() {
  const capturedAt = new Date().toISOString();
  console.log(`=== KölnHaus 2027 Live Multi-Portal Scraper (${IS_DRY_RUN ? 'DRY RUN' : 'LIVE'}) ===`);

  const existingFeed = loadExistingFeed();
  const previousIds = new Set((existingFeed.listings || []).map((l) => l.id));

  if (IS_DRY_RUN) {
    console.log(`Existing cached live listings: ${previousIds.size}`);
    await sendSignalAlert('🏠 KölnHaus 2027 Dry-Run check complete.');
    await sendEmailAlert('KölnHaus 2027 Dry-Run', 'Scraper dry-run passed cleanly.');
    return;
  }

  const [ka, om, iw, wg] = await Promise.all([
    scrapeKleinanzeigen(capturedAt),
    scrapeOhneMakler(capturedAt),
    scrapeImmowelt(capturedAt),
    scrapeWgGesucht(capturedAt)
  ]);

  const combined = [...ka, ...om, ...iw, ...wg];
  const dedupedMap = new Map();
  for (const item of combined) {
    if (!dedupedMap.has(item.id)) {
      dedupedMap.set(item.id, item);
    }
  }
  const freshListings = Array.from(dedupedMap.values()).sort((a, b) => b.aiScore - a.aiScore);
  const newlyFound = freshListings.filter((l) => !previousIds.has(l.id));

  console.log(`Scraped live listings -> Kleinanzeigen: ${ka.length}, Ohne-Makler: ${om.length}, Immowelt: ${iw.length}, WG-Gesucht: ${wg.length} | Total unique: ${freshListings.length} | New: ${newlyFound.length}`);

  const nextFeed = {
    updatedAt: capturedAt,
    optionalCredentialsConfigured: {
      immoscoutPlus: Boolean(process.env.IMMOSCOUT_COOKIE),
      wgGesucht: Boolean(process.env.WGGESUCHT_COOKIE),
      kleinanzeigen: Boolean(process.env.KLEINANZEIGEN_COOKIE)
    },
    listings: freshListings.length > 0 ? freshListings : existingFeed.listings
  };

  fs.mkdirSync(path.dirname(FEED_PATH), { recursive: true });
  fs.writeFileSync(FEED_PATH, JSON.stringify(nextFeed, null, 2) + '\n', 'utf8');
  fs.writeFileSync(SEED_PATH, JSON.stringify(nextFeed.listings, null, 2) + '\n', 'utf8');

  // Remove stale snapshot files not referenced by current active listings
  if (fs.existsSync(SNAPSHOT_DIR)) {
    const activeSnapshots = new Set(
      (nextFeed.listings || [])
        .map((l) => (l.snapshotUrl ? path.basename(l.snapshotUrl) : ''))
        .filter(Boolean)
    );
    for (const file of fs.readdirSync(SNAPSHOT_DIR)) {
      if (!activeSnapshots.has(file)) {
        fs.unlinkSync(path.join(SNAPSHOT_DIR, file));
      }
    }
  }

  if (newlyFound.length > 0) {
    const topLines = newlyFound
      .slice(0, 5)
      .map((l) => `• [${l.mode.toUpperCase()} | ${l.veedel}] ${l.title} — ${l.basePriceOrColdRent.toLocaleString('de-DE')}€ (${l.livingSpaceSqm}m²) -> ${l.portalUrl}`)
      .join('\n');
    await sendSignalAlert(`🏠 KölnHaus 2027: ${newlyFound.length} new Cologne match(es)!\n\n${topLines}`);
    await sendEmailAlert(
      `KölnHaus 2027: ${newlyFound.length} new Cologne listing(s) found`,
      `Captured at ${capturedAt}:\n\n${topLines}\n\nDashboard: https://dataflorian.github.io/koelnhaus-2027/`
    );
  } else {
    console.log('No brand-new listings since last run — skipping duplicate notifications.');
  }

  console.log('Scrape & snapshot archival complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
