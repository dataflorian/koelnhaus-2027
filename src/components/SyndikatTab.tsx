import React, { useMemo, useState } from 'react';
import {
  Building,
  ExternalLink,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  User
} from 'lucide-react';
import { SyndikatResource } from '../types/housing';

interface SyndikatTabProps {
  resources: SyndikatResource[];
}

const OWNERSHIP_MODELS = [
  {
    name: 'Mietshäuser Syndikat (Haus-GmbH + Verein)',
    capitalNeeded: '10–15% Equity + Direktkredite (1–2% interest from friends/family)',
    governance: 'Residents manage via Hausverein (~51%); Syndikat GmbH (~49%) holds resale veto',
    pros: 'Permanently de-commodified, lowest barrier for student + young workers via Direktkredite, proven in Cologne (BG1006, Die Neuerburg)',
    cons: 'No individual private capital appreciation; 4–8 month legal & assembly onboarding process',
    timelineFit: 'Strong for Summer 2027 if initiated NOW (Nov 2026)'
  },
  {
    name: 'Stiftung trias + Erbbaurecht (Land Trust)',
    capitalNeeded: '35–50% LESS total purchase price (Foundation buys land; you buy building)',
    governance: '99-year Hereditary Building Lease (Erbbaurecht) to your group entity (GbR/eG/GmbH)',
    pros: 'Massive affordability unlock in expensive Cologne neighborhoods like Lindenthal/Sülz/Ehrenfeld',
    cons: 'Monthly Erbpachtzins payable to foundation; requires foundation board alignment',
    timelineFit: 'Good for 2027 (contact Stiftung trias early before bidding)'
  },
  {
    name: 'Immobilien-GbR / Bruchteilsgemeinschaft (5 Working + 1 Tenant)',
    capitalNeeded: '15–20% Equity across the 5 working buyers',
    governance: 'Custom GbR Partnership Agreement with clear buyout / exit rules',
    pros: 'Fastest bank underwriting (Interhyp / Sparkasse), easiest to close a standard house deal in 6–10 weeks',
    cons: 'Student without full-time income normally rents from the 5 co-buyers unless parent co-signs',
    timelineFit: 'Fastest & easiest for standard 2027 house purchases'
  },
  {
    name: 'Dachgenossenschaft / Small Housing Co-op (eG)',
    capitalNeeded: 'Cooperative Shares (Genossenschaftsanteile) + KfW/NRW.BANK subsidies',
    governance: 'One member = one vote; collective liability limited to shares',
    pros: 'Cleanest long-term resident turnover (moving out = returning shares), eligible for Stadt Köln Konzeptverfahren',
    cons: 'Founding a brand-new standalone eG is heavy for only 6 people — joining an existing Dachgenossenschaft is better',
    timelineFit: 'Best via joining existing Cologne co-ops or Dachgenossenschaft'
  }
];

export const SyndikatTab: React.FC<SyndikatTabProps> = ({ resources }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(resources.map((r) => r.category)))],
    [resources]
  );

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (!q) return true;
      return [
        r.name,
        r.modelType,
        r.summary,
        r.relevanceFor6Roommates,
        r.contactPerson ?? '',
        r.email ?? '',
        r.address ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [resources, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-5 space-y-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Handshake className="w-5 h-5 text-amber-400" />
          Alternative Ownership, Mietshäuser Syndikat & Cologne Advisory Directory
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Buying or founding a 6-person house in Cologne doesn’t require traditional solo wealth.
          Below are the four proven legal/ownership frameworks in Germany alongside verified
          Cologne & NRW advisors, existing Syndikat houses, emails, phone numbers, and pre-filled
          German outreach templates.
        </p>
      </div>

      {/* 4 Alternative Legal Models Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OWNERSHIP_MODELS.map((m) => (
          <div
            key={m.name}
            className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                {m.name}
              </h3>
            </div>
            <div className="text-xs space-y-1.5">
              <div>
                <span className="text-slate-400 font-medium">Capital / Equity: </span>
                <span className="text-sky-300">{m.capitalNeeded}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Governance: </span>
                <span className="text-slate-200">{m.governance}</span>
              </div>
              <div>
                <span className="text-emerald-400 font-medium">Pros: </span>
                <span className="text-slate-300">{m.pros}</span>
              </div>
              <div>
                <span className="text-amber-400 font-medium">Watch-outs: </span>
                <span className="text-slate-300">{m.cons}</span>
              </div>
              <div className="pt-1">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]">
                  2027 Fit: {m.timelineFit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Directory Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? `All Contacts (${resources.length})` : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter contacts, Cologne projects..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredResources.map((r) => {
          const mailtoHref = r.email
            ? `mailto:${r.email}?subject=${encodeURIComponent(
                r.inquirySubject
              )}&body=${encodeURIComponent(r.inquiryBodyTemplate)}`
            : undefined;

          return (
            <article
              key={r.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold uppercase">
                    {r.category}
                  </span>
                  <span className="text-[11px] text-slate-400">{r.modelType}</span>
                </div>

                <h3 className="text-base font-bold text-white">{r.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{r.summary}</p>

                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Why this helps your 6er group: </span>
                    {r.relevanceFor6Roommates}
                  </div>
                </div>

                {/* Direct Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {r.contactPerson && (
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{r.contactPerson}</span>
                    </div>
                  )}
                  {r.phone && (
                    <div className="flex items-center gap-1.5 text-sky-300">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{r.phone}</span>
                    </div>
                  )}
                  {r.email && (
                    <div className="flex items-center gap-1.5 text-sky-300 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{r.email}</span>
                    </div>
                  )}
                  {r.address && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{r.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={r.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {r.formUrl && (
                    <a
                      href={r.formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    >
                      <span>Contact Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {mailtoHref && (
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Pre-Filled German Inquiry Email</span>
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
