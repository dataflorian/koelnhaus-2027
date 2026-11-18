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
import { Lang, TRANSLATIONS } from '../i18n/translations';

interface PortalsAlertsTabProps {
  lang: Lang;
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
  lang,
  portals,
  alertConfig,
  onUpdateAlertConfig,
  onTogglePortalScraper,
  onExportWorkspaceState,
  onImportWorkspaceState
}) => {
  const t = TRANSLATIONS[lang].portals;
  const loginBadgeLabel: Record<PortalSource['loginRequirement'], string> = {
    none: lang === 'de' ? 'Kein Login nötig' : 'No Login Required',
    'optional-advantage':
      lang === 'de' ? 'Login optional (Frühzugriff)' : 'Login Optional (Early-Access Edge)',
    'required-for-contact':
      lang === 'de' ? 'Suche frei / Login für Nachricht' : 'Free Search / Login to Message',
    'required-for-membership':
      lang === 'de' ? 'Bewerberkonto für Warteliste' : 'Applicant Account for Waitlist'
  };
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
              {t.alertsTitle}
            </h2>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
              {t.everyWord} {alertConfig.pollIntervalMinutes} {t.minWord}
            </span>
          </div>

          {/* Signal Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageCircle className="w-4 h-4 text-sky-400" />
                <span>{t.signalHeader}</span>
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
                <label className="block text-slate-400 mb-1">{t.signalModeLabel}</label>
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
                    Self-hosted signal-cli-rest-api (Gruppenchat)
                  </option>
                  <option value="callmebot-free">
                    CallMeBot Signal API (Kostenloser Webhook)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{t.signalTargetLabel}</label>
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
              {lang === 'de' ? 'Konfiguriert in' : 'Configured in'}{' '}
              <code className="text-sky-300">scripts/scrape-and-notify.mjs</code>{' '}
              {lang === 'de' ? 'über' : 'via'}{' '}
              <code className="text-slate-300">SIGNAL_WEBHOOK_URL</code>{' '}
              {lang === 'de' ? 'oder' : 'or'}{' '}
              <code className="text-slate-300">CALLMEBOT_SIGNAL_KEY</code>.
            </p>
          </div>

          {/* Email Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>{t.emailHeader}</span>
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
                placeholder={t.addEmailPlaceholder}
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
                {t.addBtn}
              </button>
            </div>
          </div>

          {/* Trigger Thresholds */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">
                {t.minScoreAlert} ({alertConfig.minAiScoreForAlert})
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
                {t.commuteLimitAlert} ({alertConfig.maxCommuteMinsForAlert}m)
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
              {t.hostingTitle}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">{t.hostingDesc}</p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    {lang === 'de'
                      ? '1. Statisches Hosting (GitHub Pages) oder Passwort-Server (Cloud Run)'
                      : '1. Static Hosting (GitHub Pages) or Password-Protected Cloud Run'}
                  </div>
                  <div className="text-slate-400">
                    {lang === 'de'
                      ? 'Alle 6 Mitbewohner:innen greifen gemeinsam über Handy & Laptop auf denselben Stand zu.'
                      : 'All 6 roommates access the live central URL directly from phones & laptops.'}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    {lang === 'de'
                      ? '2. Automatisierter 30-Minuten Cron-Scraper (GitHub Actions)'
                      : '2. Automated 30-Min Cron Scraper (GitHub Actions)'}
                  </div>
                  <div className="text-slate-400">
                    <code className="text-sky-300">scripts/scrape-and-notify.mjs</code>{' '}
                    {lang === 'de'
                      ? 'aktualisiert regelmäßig Inserate & HTML-Kopien und sendet neue Treffer.'
                      : 'updates listings & HTML snapshots and dispatches Signal + Email alerts.'}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    {lang === 'de'
                      ? '3. Gruppen-Sync & JSON Backup jederzeit'
                      : '3. Instant Roommate State Sync & JSON Backup'}
                  </div>
                  <div className="text-slate-400">
                    {lang === 'de'
                      ? 'Favoriten, Status, Votes und To-dos bleiben gespeichert und lassen sich jederzeit als JSON exportieren.'
                      : 'Pinned properties, statuses, votes, and todos persist and can be exported/imported as JSON anytime.'}
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
                <span>{t.exportBtn}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5" />
                <span>{t.importBtn}</span>
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
              {t.portalsTitle} ({portals.length}) & {t.loginAuditTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.portalsDesc}</p>
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
                {cat === 'all' ? t.allPortals : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Highlighted Login Callout */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>{t.loginAuditTitle}:</strong> {t.loginAuditDesc}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-3">{t.colPortal}</th>
                <th className="py-2.5 px-2">{t.colTrack}</th>
                <th className="py-2.5 px-2">{t.colLogin}</th>
                <th className="py-2.5 px-2">{t.colMethod}</th>
                <th className="py-2.5 px-2">{t.colNotes}</th>
                <th className="py-2.5 pl-2 text-right">{t.colActive}</th>
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
                            {TRANSLATIONS[lang].screener.modeRent}
                          </span>
                        )}
                        {p.supportsBuy && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                            {TRANSLATIONS[lang].screener.modeBuy}
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
                        {loginBadgeLabel[p.loginRequirement]}
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
