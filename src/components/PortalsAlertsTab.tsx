import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  ShieldAlert,
  Unlock,
  Upload
} from 'lucide-react';
import { AlertConfig, PortalSource } from '../types/housing';

interface PortalsAlertsTabProps {
  portals: PortalSource[];
  alertConfig: AlertConfig;
  onUpdateAlertConfig: (patch: Partial<AlertConfig>) => void;
  onTogglePortalScraper: (id: string) => void;
  onExportWorkspaceState: () => void;
  onImportWorkspaceState: (jsonText: string) => void;
}

const LOGIN_BADGE: Record<
  PortalSource['loginRequirement'],
  { label: string; color: string; icon: 'open' | 'key' | 'lock' }
> = {
  none: {
    label: 'No Login Required',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: 'open'
  },
  'optional-advantage': {
    label: 'Login Optional (Early-Access Edge)',
    color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: 'key'
  },
  'required-for-contact': {
    label: 'Free Search / Login to Message',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: 'key'
  },
  'required-for-membership': {
    label: 'Applicant Account for Waitlist',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: 'lock'
  }
};

export const PortalsAlertsTab: React.FC<PortalsAlertsTabProps> = ({
  portals,
  alertConfig,
  onUpdateAlertConfig,
  onTogglePortalScraper,
  onExportWorkspaceState,
  onImportWorkspaceState
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newEmail, setNewEmail] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(portals.map((p) => p.category)))],
    [portals]
  );

  const filteredPortals = useMemo(
    () =>
      selectedCategory === 'all'
        ? portals
        : portals.filter((p) => p.category === selectedCategory),
    [portals, selectedCategory]
  );

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportWorkspaceState(String(reader.result));
        setImportStatus('Workspace state imported & synced!');
      } catch {
        setImportStatus('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Free Hosting + Signal & Email Notification Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Signal & Email Configurator */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              Signal & Email Instant Notification Setup
            </h2>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
              Every {alertConfig.pollIntervalMinutes} min
            </span>
          </div>

          {/* Signal Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageCircle className="w-4 h-4 text-sky-400" />
                <span>Signal Group / Direct Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={alertConfig.signalEnabled}
                onChange={(e) => onUpdateAlertConfig({ signalEnabled: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Signal Delivery Mode</label>
                <select
                  value={alertConfig.signalApiMode}
                  onChange={(e) =>
                    onUpdateAlertConfig({
                      signalApiMode: e.target.value as AlertConfig['signalApiMode']
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="signal-cli-rest">
                    Self-hosted signal-cli-rest-api (Group chat supported)
                  </option>
                  <option value="callmebot-free">
                    CallMeBot Signal API (Zero-server free webhook)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Target Phone / Group ID</label>
                <input
                  type="text"
                  value={alertConfig.signalPhoneNumber}
                  onChange={(e) =>
                    onUpdateAlertConfig({ signalPhoneNumber: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Configured in <code className="text-sky-300">scripts/scrape-and-notify.mjs</code>{' '}
              via <code className="text-slate-300">SIGNAL_WEBHOOK_URL</code> or{' '}
              <code className="text-slate-300">CALLMEBOT_SIGNAL_KEY</code> GitHub Secrets.
            </p>
          </div>

          {/* Email Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Email Digest & Instant Match Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={alertConfig.emailEnabled}
                onChange={(e) => onUpdateAlertConfig({ emailEnabled: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {alertConfig.emailRecipients.map((em) => (
                <span
                  key={em}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-200"
                >
                  {em}
                  <button
                    onClick={() =>
                      onUpdateAlertConfig({
                        emailRecipients: alertConfig.emailRecipients.filter((x) => x !== em)
                      })
                    }
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add roommate email..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                onClick={() => {
                  if (newEmail.trim()) {
                    onUpdateAlertConfig({
                      emailRecipients: [...alertConfig.emailRecipients, newEmail.trim()]
                    });
                    setNewEmail('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs text-white font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Trigger Thresholds */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">
                Min AI Score to Trigger Alert ({alertConfig.minAiScoreForAlert})
              </label>
              <input
                type="range"
                min={60}
                max={95}
                value={alertConfig.minAiScoreForAlert}
                onChange={(e) =>
                  onUpdateAlertConfig({ minAiScoreForAlert: Number(e.target.value) })
                }
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Commute Flag Alert Limit ({alertConfig.maxCommuteMinsForAlert}m)
              </label>
              <input
                type="range"
                min={25}
                max={50}
                value={alertConfig.maxCommuteMinsForAlert}
                onChange={(e) =>
                  onUpdateAlertConfig({ maxCommuteMinsForAlert: Number(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 100% Free Hosting & GitHub Actions Architecture */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              100% Free Hosting & Automated Scraping Blueprint
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              This repository is pre-configured with{' '}
              <code className="text-amber-300">.github/workflows/scrape-and-deploy.yml</code> to run
              completely free on <strong>GitHub Pages + GitHub Actions</strong> — zero credit cards,
              zero monthly VPS fees, and no separate cloud accounts needed beyond a GitHub repo.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    1. Free Static Web Hosting (GitHub Pages)
                  </div>
                  <div className="text-slate-400">
                    All 6 roommates access the live central URL directly from phones & laptops with
                    no login barrier.
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    2. Automated 30-Min Cron Scraper (GitHub Actions)
                  </div>
                  <div className="text-slate-400">
                    Runs <code className="text-sky-300">scripts/scrape-and-notify.mjs</code> on
                    schedule, updates <code className="text-sky-300">public/data/listings.json</code>,
                    and dispatches Signal + Email alerts for brand-new Cologne listings.
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    3. Instant Roommate State Export / Import Sync
                  </div>
                  <div className="text-slate-400">
                    Pinned properties, contacted statuses, votes, and todos persist in browser storage
                    and can be exported/shared as JSON anytime (or backed by a free Supabase/GitHub
                    Gist token).
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportWorkspaceState}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Group State (.json)</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Group State</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && <span className="text-xs text-emerald-400">{importStatus}</span>}
          </div>
        </div>
      </div>

      {/* Portal Sources & Login Requirements Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Consolidated Cologne Property Sources ({portals.length} Portals) & Login Audit
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Which sites can be scraped publicly vs. where your optional logins/cookies unlock early
              access or direct messaging.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Portals' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Highlighted Login Callout */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Where Logins Help You Most:</strong> Most portals (Immowelt, ohne-makler, KSK,
            Sparkasse, Volksbank, yourIMMO, ZVG-Portal) scrape cleanly with <strong>ZERO login</strong>.
            Supplying optional credentials/cookies in <code className="text-white">.env</code>{' '}
            (or GitHub Secrets) specifically upgrades: (1) <strong>ImmoScout24 Plus</strong> (unlocks
            48h early listings), (2) <strong>WG-Gesucht</strong> & <strong>Kleinanzeigen</strong>{' '}
            (unlocks seller phone/contact details), and (3){' '}
            <strong>Cologne Genossenschaften</strong> (early waitlist registration).
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-3">Portal</th>
                <th className="py-2.5 px-2">Track</th>
                <th className="py-2.5 px-2">Login Status</th>
                <th className="py-2.5 px-2">Scraper Method & Interval</th>
                <th className="py-2.5 px-2">Login / Notes</th>
                <th className="py-2.5 pl-2 text-right">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredPortals.map((p) => {
                const badge = LOGIN_BADGE[p.loginRequirement];
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-3">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-white hover:text-sky-400 inline-flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{p.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.category}</div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="flex gap-1">
                        {p.supportsRent && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">
                            Rent
                          </span>
                        )}
                        {p.supportsBuy && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                            Buy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${badge.color}`}
                      >
                        {badge.icon === 'open' ? (
                          <Unlock className="w-3 h-3" />
                        ) : badge.icon === 'key' ? (
                          <KeyRound className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-300 max-w-xs">
                      <div>{p.scrapingStrategy}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Poll: {p.pollIntervalLabel}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-300 max-w-sm">{p.loginNotes}</td>
                    <td className="py-3 pl-2 text-right">
                      <input
                        type="checkbox"
                        checked={p.enabledInScraper}
                        onChange={() => onTogglePortalScraper(p.id)}
                        className="rounded border-slate-600 bg-slate-800"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
