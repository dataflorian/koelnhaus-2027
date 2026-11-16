import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { PropertyListing, RoommateProfile } from '../types/housing';
import { formatEUR } from '../utils/housingMath';

interface OutreachTabProps {
  listings: PropertyListing[];
  roommates: RoommateProfile[];
  selectedPropertyId: string | null;
  onSelectPropertyId: (id: string | null) => void;
}

type PitchStrategy =
  | 'rent-landlord'
  | 'rent-wg-takeover'
  | 'buy-broker-expose'
  | 'buy-syndikat-direct';

export const OutreachTab: React.FC<OutreachTabProps> = ({
  listings,
  roommates,
  selectedPropertyId,
  onSelectPropertyId
}) => {
  const selectedProperty = useMemo(
    () => listings.find((l) => l.id === selectedPropertyId) ?? listings[0],
    [listings, selectedPropertyId]
  );

  const [strategy, setStrategy] = useState<PitchStrategy>(() =>
    selectedProperty?.mode === 'rent' ? 'rent-landlord' : 'buy-broker-expose'
  );
  const [emphasizeJointLiability, setEmphasizeJointLiability] = useState(true);
  const [emphasizeGardenMaintenance, setEmphasizeGardenMaintenance] = useState(true);
  const [includeElternbuergschaft, setIncludeElternbuergschaft] = useState(true);
  const [customHook, setCustomHook] = useState('');
  const [copied, setCopied] = useState(false);

  const combinedMonthlyNet = useMemo(
    () => roommates.reduce((sum, r) => sum + r.netMonthlyIncome, 0),
    [roommates]
  );
  const totalEquity = useMemo(
    () => roommates.reduce((sum, r) => sum + r.availableEquity, 0),
    [roommates]
  );

  const generatedPitch = useMemo(() => {
    const p = selectedProperty;
    if (!p) return { subject: '', body: '' };

    const greeting =
      p.contactName && !p.contactName.includes('Manual')
        ? `Sehr geehrte(r) ${p.contactName},`
        : 'Sehr geehrte Damen und Herren,';

    const hookSentence = customHook.trim()
      ? customHook.trim()
      : p.hasGarden
        ? `Besonders die Kombination aus ${p.livingSpaceSqm} m² Wohnfläche, ${p.aiViableBedrooms} gut geschnittenen Zimmern und dem eigenen Garten in ${p.veedel} passt ideal zu unserem langfristigen Wohnwunsch.`
        : `Besonders der großzügige Grundriss (${p.livingSpaceSqm} m²) und die hervorragende KVB-Anbindung in ${p.veedel} passen ideal zu unseren Vorstellungen.`;

    if (strategy === 'rent-wg-takeover') {
      return {
        subject: `Übernahme eurer Haus-WG in ${p.veedel} ab Sommer 2027 – eingespielte 6er-Gruppe (5x Berufstätig + 1x Student)`,
        body: `Hallo ${p.contactName.split('(')[0].trim()},\n\neuere Anzeige für das Objekt in ${p.veedel} (${p.approxAddress}) hat uns sofort begeistert! ${hookSentence}\n\nKurz zu uns: Wir sind eine seit Jahren befreundete, ruhige und zuverlässige 6er-Gruppe in Köln:\n• 5 vollzeit-berufstätige Mitbewohner:innen (Software Engineering, Consulting, Medienproduktion, Jura, Ingenieurwesen)\n• 1 Student an der Uni Köln (abgesichert über selbstschuldnerische Elternbürgschaft)\n• Gemeinsames monatliches Netto-Haushaltseinkommen: ca. ${formatEUR(combinedMonthlyNet)}\n\nWir suchen ausdrücklich etwas Langfristiges ab ${p.availableFrom} und übernehmen Küche/Ausstattung bei fairem Abstand sehr gerne. Unsere vollständige Bewerbungsmappe (inkl. 6x SCHUFA, Gehaltsnachweisen, Mieterselbstauskunft und Elternbürgschaft) liegt bereits als sauberes Gesamt-PDF bereit.\n\nKönnen wir uns diese Woche kurz telefonisch oder bei euch vor Ort kennenlernen?\n\nLiebe Grüße\nFlorian, Lukas, Sarah, Jonas, Elena & Matteo`
      };
    }

    if (strategy === 'rent-landlord') {
      const liabilityLine = emphasizeJointLiability
        ? `\n• Maximale Mietsicherheit für Sie: Durch 5 unbefristete Arbeitsverhältnisse (kombiniertes Haushaltsnetto ca. ${formatEUR(combinedMonthlyNet)}/Monat) plus Elternbürgschaft für unseren Studenten bieten wir als gesamtschuldnerische Mietergemeinschaft ein vielfach geringeres Ausfallrisiko als ein Einzelhaushalt.`
        : '';
      const gardenLine = emphasizeGardenMaintenance
        ? `\n• Haus- & Gartenpflege: Da alle Mitglieder beruflich bzw. akademisch fest in Köln verwurzelt sind, kümmern wir uns zuverlässig und dauerhaft um Gartenpflege, Winterdienst und Werterhalt.`
        : '';

      return {
        subject: `Bewerbung: Zuverlässige Berufstätigen-Gemeinschaft (5x Vollzeit + 1x Student) für ${p.veedel} (${p.livingSpaceSqm} m²)`,
        body: `${greeting}\n\nmit großem Interesse haben wir Ihr Inserat für das Objekt in ${p.veedel} (${p.approxAddress}) gesehen. ${hookSentence}\n\nWir möchten mögliche Bedenken gegenüber einer 6-Personen-Wohngemeinschaft direkt transparent entkräften — wir sind keine wechselnde Party-WG, sondern eine gewachsene Gemeinschaft aus fünf Vollzeit-Berufstätigen (Software-Ingenieur, Unternehmensberaterin, Medienproduzent, Juristin, Bau-/Energieingenieur) und einem Studenten der Universität zu Köln:${liabilityLine}${gardenLine}${
          includeElternbuergschaft
            ? '\n• Vollständige Bonitätsunterlagen: Alle 6 Selbstauskünfte, aktuelle SCHUFA-BonitätsChecks, die letzten 3 Gehaltsabrechnungen der 5 Berufstätigen sowie die selbstschuldnerische Elternbürgschaft liegen bereits digital griffbereit.'
            : ''
        }\n\nWir streben ein ruhiges, langfristiges Mietverhältnis ab ${p.availableFrom} an und sind Nichtraucher ohne Haustiere.\n\nÜber eine Einladung zu einem persönlichen Kennenlernen und Besichtigungstermin freuen wir uns sehr.\n\nMit freundlichen Grüßen\nFlorian & Mitbewohner:innen\n(Ansprechpartner: Florian | Tel. / E-Mail auf Rückfrage)`
      };
    }

    if (strategy === 'buy-syndikat-direct') {
      return {
        subject: `Kaufinteresse ohne Spekulation: Gemeinschaftliches Hausprojekt Köln für Ihr Objekt in ${p.veedel}`,
        body: `${greeting}\n\nwir sind eine feste Gruppe aus 6 Kölner Freunden (5 Berufstätige + 1 Student) mit dem Ziel, bis Sommer 2027 langfristigen, gemeinschaftlichen Wohnraum in Köln zu schaffen. Ihr Objekt in ${p.veedel} (${p.approxAddress}) spricht uns enorm an.\n\nDa wir selbst dort wohnen und das Haus dauerhaft pflegen wollen (ggf. eingebettet in ein gemeinwohlorientiertes Wohnprojekt-Modell / mit Begleitung durch die GLS Bank bzw. Stiftung trias), suchen wir keinen kurzfristigen Weiterverkauf, sondern ein Zuhause für die nächsten Jahrzehnte. Eigenkapital (ca. ${formatEUR(totalEquity)}) sowie direkte Bankgespräche sind bereits vorbereitet.\n\nHätten Sie Interesse an einem unverbindlichen Austausch und der Zusendung des Exposés bzw. Grundrisses?\n\nMit freundlichen Grüßen\nFlorian, Lukas, Sarah, Jonas, Elena & Matteo`
      };
    }

    // default: buy-broker-expose
    return {
      subject: `Kaufanfrage & Exposé-Anforderung: ${p.propertyType} in ${p.veedel} (${formatEUR(p.basePriceOrColdRent)})`,
      body: `${greeting}\n\nwir interessieren uns konkret für den Erwerb des von Ihnen angebotenen Objekts in ${p.veedel} (${p.approxAddress}, Kaufpreis ${formatEUR(p.basePriceOrColdRent)}). ${hookSentence}\n\nZu unserer Käuferkonstellation (5 Vollzeit-Berufstätige mit kombiniertem Netto-Haushaltseinkommen von ${formatEUR(combinedMonthlyNet)}/Monat + Eigenkapitalbasis ca. ${formatEUR(totalEquity)}): Finanzierungsgespräche für eine geordnete Gemeinschaftsfinanzierung (GbR / Mehrpersonen-Darlehen) sind bereits vorgeprüft, sodass wir zeitnah eine formale Finanzierungsbestätigung vorlegen können.\n\nFür unsere Detailprüfung bitten wir vorab um Zusendung folgender Unterlagen:\n1. Vollständiges Exposé inkl. genauer Adresse & bemaßter Grundrisse\n2. Aktueller Energieausweis & Angaben zu Heizung / Sanierungen\n3. Aktueller Grundbuchauszug (inkl. etwaiger Erbbaurechte/Baulasten) & Wohnflächenberechnung\n4. Informationen zum frühestmöglichen Übergabetermin (Ziel: Frühjahr/Sommer 2027)\n\nÜber einen kurzfristigen Besichtigungstermin freuen wir uns sehr.\n\nMit freundlichen Grüßen\nFlorian & Käufergruppe Köln`
    };
  }, [
    selectedProperty,
    strategy,
    emphasizeJointLiability,
    emphasizeGardenMaintenance,
    includeElternbuergschaft,
    customHook,
    combinedMonthlyNet,
    totalEquity
  ]);

  const handleCopy = () => {
    const fullText = `Betreff: ${generatedPitch.subject}\n\n${generatedPitch.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = selectedProperty?.contactEmail
    ? `mailto:${selectedProperty.contactEmail}?subject=${encodeURIComponent(
        generatedPitch.subject
      )}&body=${encodeURIComponent(generatedPitch.body)}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Controls & Dossier Status */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI Application & Buyer Pitch Studio
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Target Property from Screener
              </label>
              <select
                value={selectedProperty?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  onSelectPropertyId(id);
                  const found = listings.find((l) => l.id === id);
                  if (found) {
                    setStrategy(
                      found.portal === 'WG-Gesucht'
                        ? 'rent-wg-takeover'
                        : found.mode === 'rent'
                          ? 'rent-landlord'
                          : 'buy-broker-expose'
                    );
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.mode.toUpperCase()} • {l.veedel}] {l.title.slice(0, 48)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Outreach Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'rent-landlord', label: 'Private Landlord (Rent)' },
                  { id: 'rent-wg-takeover', label: 'WG-Gesucht Takeover' },
                  { id: 'buy-broker-expose', label: 'Buyer / Broker Exposé' },
                  { id: 'buy-syndikat-direct', label: 'Syndikat / Direct Seller' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setStrategy(opt.id as PitchStrategy)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
                      strategy === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emphasizeJointLiability}
                  onChange={(e) => setEmphasizeJointLiability(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Highlight 5x Full-Time Income + Joint Liability</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeElternbuergschaft}
                  onChange={(e) => setIncludeElternbuergschaft(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Mention Elternbürgschaft for Florian (Student)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emphasizeGardenMaintenance}
                  onChange={(e) => setEmphasizeGardenMaintenance(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Include House & Garden Upkeep Assurance</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Optional Custom Personal Detail from Ad
              </label>
              <input
                type="text"
                value={customHook}
                onChange={(e) => setCustomHook(e.target.value)}
                placeholder="e.g., Die helle Souterrain-Einliegerwohnung und der Südgarten..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* 6er-WG Bewerbungsmappe Dossier Readiness */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Digital Bewerbungsmappe & Group Strength
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Combined Net Income</div>
                <div className="text-base font-bold text-emerald-400">
                  {formatEUR(combinedMonthlyNet)}/mo
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Available Equity Pool</div>
                <div className="text-base font-bold text-sky-400">
                  {formatEUR(totalEquity)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {roommates.map((rm) => (
                <div
                  key={rm.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-white font-medium">{rm.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rm.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {rm.hasParentGuarantor ? 'Elternbürgschaft + SCHUFA' : '3x Payslips + SCHUFA'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generated German Outreach Editor */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Ready-to-Send German Message (Anti-Ban Human-in-the-Loop)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Subject + Text'}</span>
                </button>
                {mailtoUrl && (
                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Email App</span>
                  </a>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="text-slate-400 mb-1">Betreff (Subject):</div>
              <div className="text-white font-semibold">{generatedPitch.subject}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans min-h-[340px]">
              {generatedPitch.body}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3">
            Why 1-click review beats blind auto-sending: German landlords and brokers penalize
            robotic bot spam and ImmoScout24 bans accounts using unthrottled form auto-submitters.
            Review, copy, or send via email in under 10 seconds with full personalization.
          </div>
        </div>
      </div>
    </div>
  );
};
