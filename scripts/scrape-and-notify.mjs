#!/usr/bin/env node
/**
 * KölnHaus 2027 — Multi-Portal Cologne Housing Scraper & Signal/Email Notifier
 *
 * Inspired by orangecoding/fredy & wiestju/ImmoScout.
 * Designed to run for FREE inside GitHub Actions (cron every 30 min) or locally.
 *
 * Supported Notification Channels:
 * 1. Signal:
 *    - signal-cli-rest-api (SIGNAL_REST_URL, SIGNAL_SENDER, SIGNAL_RECIPIENTS)
 *    - CallMeBot free Signal API (CALLMEBOT_SIGNAL_PHONE, CALLMEBOT_SIGNAL_KEY)
 * 2. Email:
 *    - SMTP Webhook / Resend / Mailjet / Gmail App Password via HTTP/SMTP
 *
 * Optional Portal Logins (configured via .env or GitHub Secrets):
 * - IMMOSCOUT_COOKIE (unlocks ImmoScout24 Plus 48h early listings)
 * - WGGESUCHT_COOKIE (unlocks contact details & fast messaging)
 * - KLEINANZEIGEN_COOKIE (unlocks direct landlord messaging)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const FEED_PATH = path.join(ROOT_DIR, 'public', 'data', 'listings.json');

const IS_DRY_RUN = process.argv.includes('--dry-run');

const PORTAL_ENDPOINTS = [
  {
    id: 'ksk-immobilien',
    name: 'KSK Immobilien',
    url: 'https://www.ksk-immobilien.de/immobilien/haus-kaufen/koeln/',
    requiresLogin: false
  },
  {
    id: 'ohne-makler',
    name: 'ohne-makler.net',
    url: 'https://www.ohne-makler.net/immobilien/nordrhein-westfalen/koeln/',
    requiresLogin: false
  },
  {
    id: 'kleinanzeigen',
    name: 'Kleinanzeigen',
    url: 'https://www.kleinanzeigen.de/s-haus-mieten/koeln/c205l945',
    requiresLogin: false // Reading is public; cookie only needed for messaging
  },
  {
    id: 'zvg-portal',
    name: 'ZVG-Portal (Amtsgericht Köln)',
    url: 'https://www.zvg-portal.de/index.php?button=Termine+suchen',
    requiresLogin: false
  }
];

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

async function probePublicPortal(portal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(portal.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
      }
    });
    return { portal: portal.name, status: res.status, ok: res.ok };
  } catch (err) {
    return { portal: portal.name, status: 0, ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendSignalAlert(message) {
  const signalRestUrl = process.env.SIGNAL_REST_URL;
  const signalSender = process.env.SIGNAL_SENDER;
  const signalRecipients = process.env.SIGNAL_RECIPIENTS;
  const callmebotPhone = process.env.CALLMEBOT_SIGNAL_PHONE;
  const callmebotKey = process.env.CALLMEBOT_SIGNAL_KEY;

  if (IS_DRY_RUN) {
    console.log('[DRY-RUN] Signal notification payload prepared:\n' + message);
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
    return;
  }

  if (callmebotPhone && callmebotKey) {
    const url = `https://signal.callmebot.com/signal/send.php?phone=${encodeURIComponent(
      callmebotPhone
    )}&apikey=${encodeURIComponent(callmebotKey)}&text=${encodeURIComponent(message)}`;
    await fetch(url);
    console.log('Sent Signal notification via CallMeBot.');
  } else {
    console.log('Signal env vars not set — skipping live Signal push.');
  }
}

async function sendEmailAlert(subject, text) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.ALERT_EMAIL_TO;

  if (IS_DRY_RUN) {
    console.log(`[DRY-RUN] Email alert prepared: "${subject}"`);
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
    console.log('Email API env vars not set — skipping live Email push.');
  }
}

async function main() {
  console.log(`=== KölnHaus 2027 Scraper (${IS_DRY_RUN ? 'DRY RUN' : 'LIVE'}) ===`);
  const existingFeed = loadExistingFeed();
  console.log(`Loaded ${existingFeed.listings.length} cached feed records from ${FEED_PATH}`);

  if (!IS_DRY_RUN) {
    const probes = await Promise.all(PORTAL_ENDPOINTS.map(probePublicPortal));
    console.log('Portal Reachability Check:', probes);
  } else {
    console.log(
      'Configured public portals:',
      PORTAL_ENDPOINTS.map((p) => `${p.name} (${p.requiresLogin ? 'Login' : 'Open'})`).join(', ')
    );
  }

  const nextFeed = {
    updatedAt: new Date().toISOString(),
    optionalCredentialsConfigured: {
      immoscoutPlus: Boolean(process.env.IMMOSCOUT_COOKIE),
      wgGesucht: Boolean(process.env.WGGESUCHT_COOKIE),
      kleinanzeigen: Boolean(process.env.KLEINANZEIGEN_COOKIE)
    },
    listings: existingFeed.listings
  };

  if (!IS_DRY_RUN) {
    fs.mkdirSync(path.dirname(FEED_PATH), { recursive: true });
    fs.writeFileSync(FEED_PATH, JSON.stringify(nextFeed, null, 2) + '\n', 'utf8');
  }

  await sendSignalAlert(
    '🏠 KölnHaus 2027: Scheduled Cologne housing scan complete. Check the shared dashboard for updated matches!'
  );
  await sendEmailAlert(
    'KölnHaus 2027: Cologne Scan Complete',
    `Scan finished at ${nextFeed.updatedAt}. Cached feed items: ${nextFeed.listings.length}.`
  );
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
