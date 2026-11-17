import {
  AlertConfig,
  LoanProviderBenchmark,
  PortalSource,
  PropertyListing,
  RoommateProfile,
  SyndikatResource,
  TodoItem
} from '../types/housing';
import scrapedSeed from './scrapedSeed.json';

export const INITIAL_ROOMMATES: RoommateProfile[] = [
  {
    id: 'florian',
    name: 'Florian (You)',
    role: 'Student',
    occupation: 'University Student (with Elternbürgschaft)',
    netMonthlyIncome: 1150,
    availableEquity: 10000,
    hasParentGuarantor: true,
    destinationName: 'Uni Köln (Albertus-Magnus-Platz)',
    maxCommuteMins: 30,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  {
    id: 'lukas',
    name: 'Lukas',
    role: 'Working',
    occupation: 'Software Engineer (Full-time)',
    netMonthlyIncome: 3450,
    availableEquity: 45000,
    hasParentGuarantor: false,
    destinationName: 'MediaPark / Hansaring',
    maxCommuteMins: 32,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'sarah',
    name: 'Sarah',
    role: 'Working',
    occupation: 'Management Consultant (Full-time)',
    netMonthlyIncome: 3800,
    availableEquity: 55000,
    hasParentGuarantor: false,
    destinationName: 'Köln Messe/Deutz ICE',
    maxCommuteMins: 35,
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  {
    id: 'jonas',
    name: 'Jonas',
    role: 'Working',
    occupation: 'Media Producer (Full-time)',
    netMonthlyIncome: 2950,
    availableEquity: 30000,
    hasParentGuarantor: false,
    destinationName: 'Ehrenfeld (Venloer Str.)',
    maxCommuteMins: 35,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'elena',
    name: 'Elena',
    role: 'Working',
    occupation: 'Legal Counsel (Full-time)',
    netMonthlyIncome: 3900,
    availableEquity: 60000,
    hasParentGuarantor: false,
    destinationName: 'Innenstadt / Dom / Bankenviertel',
    maxCommuteMins: 30,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  {
    id: 'matteo',
    name: 'Matteo',
    role: 'Working',
    occupation: 'Civil / Energy Engineer (Full-time)',
    netMonthlyIncome: 3200,
    availableEquity: 40000,
    hasParentGuarantor: false,
    destinationName: 'TH Köln (Deutz / Südstadt)',
    maxCommuteMins: 35,
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  }
];

export const INITIAL_LISTINGS: PropertyListing[] = scrapedSeed as PropertyListing[];

export const PORTAL_SOURCES: PortalSource[] = [
  {
    id: 'immoscout24',
    name: 'ImmoScout24',
    url: 'https://www.immobilienscout24.de/Suche/de/nordrhein-westfalen/koeln/haus-kaufen',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes:
      'Desktop search returns 401 (AWS WAF bot protection) to unauthenticated scripts. Supplying an optional IMMOSCOUT_COOKIE or using orangecoding/fredy mobile BFF API unlocks live feeds & 48h Plus listings.',
    scrapingStrategy: 'Mobile BFF API / authenticated cookie session',
    pollIntervalLabel: 'Every 5–10 min',
    enabledInScraper: false,
    priority: 'critical'
  },
  {
    id: 'kleinanzeigen',
    name: 'Kleinanzeigen (eBay Kleinanzeigen)',
    url: 'https://www.kleinanzeigen.de/s-haus-mieten/koeln/c205l945',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'required-for-contact',
    loginNotes:
      'LIVE SCRAPED TODAY (200 OK, no login needed to read & archive full webpage copies!). A free account/cookie is only needed to message private landlords.',
    scrapingStrategy: 'Live curl HTML/exposé parser + full webpage snapshot archiver',
    pollIntervalLabel: 'Every 30 min (GitHub Actions)',
    enabledInScraper: true,
    priority: 'critical'
  },
  {
    id: 'wg-gesucht',
    name: 'WG-Gesucht.de',
    url: 'https://www.wg-gesucht.de/haeuser-in-Koeln.73.3.1.0.html',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: false,
    loginRequirement: 'required-for-contact',
    loginNotes:
      'LIVE SCRAPED TODAY (200 OK, whole houses & large flats in Köln!). A free WG-Gesucht login/cookie is only needed to view hidden contact details or send messages.',
    scrapingStrategy: 'Live curl category + exposé parser + full webpage snapshot archiver',
    pollIntervalLabel: 'Every 30 min (GitHub Actions)',
    enabledInScraper: true,
    priority: 'critical'
  },
  {
    id: 'immowelt',
    name: 'Immowelt & Immonet',
    url: 'https://www.immowelt.de/suche/koeln/haeuser/kaufen',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes:
      'LIVE SCRAPED TODAY (200 OK on search cards). Individual /expose/ pages use a JS bot challenge, so the scraper archives full search-card specs, photos, address & canonical link.',
    scrapingStrategy: 'Live curl search-card extractor + archival card snapshot',
    pollIntervalLabel: 'Every 30 min (GitHub Actions)',
    enabledInScraper: true,
    priority: 'high'
  },
  {
    id: 'ohne-makler',
    name: 'ohne-makler.net',
    url: 'https://www.ohne-makler.net/immobilien/haus-kaufen/nordrhein-westfalen/koln/',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes:
      'LIVE SCRAPED TODAY (200 OK, no login needed!). Commission-free private sellers only (saves 3.57% buyer fee). Uses /koln/ URL slug.',
    scrapingStrategy: 'Live curl exposé parser + full webpage snapshot archiver',
    pollIntervalLabel: 'Every 30 min (GitHub Actions)',
    enabledInScraper: true,
    priority: 'high'
  },
  {
    id: 'meinestadt',
    name: 'meinestadt.de Köln',
    url: 'https://www.meinestadt.de/koeln/immobilien',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'Blocks automated bots (403) — browse manually in Chrome.',
    scrapingStrategy: 'Manual browser check',
    pollIntervalLabel: 'Manual',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'immopool',
    name: 'immopool.de & 1a-immobilienmarkt.de',
    url: 'https://www.immopool.de/',
    category: 'National Portals',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login needed (200 OK). Used by regional Makler CRM software.',
    scrapingStrategy: 'HTML scraper',
    pollIntervalLabel: 'Every 2 hours',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'yourimmo',
    name: 'yourIMMO (Kölner Stadt-Anzeiger / Rundschau / EXPRESS)',
    url: 'https://www.yourimmo.de/',
    category: 'Cologne Regional & Print',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login needed (200 OK). Captures local newspaper print-combo ads from older homeowners.',
    scrapingStrategy: 'Manual / regional search watcher',
    pollIntervalLabel: 'Every 60 min (peak Saturday morning)',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'ksta-print',
    name: 'KStA / Kölnische Rundschau Samstags-Immobilienteil',
    url: 'https://www.ksta.de/',
    category: 'Cologne Regional & Print',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes: 'E-Paper subscription optional; digital sister listings mirror onto yourIMMO.',
    scrapingStrategy: 'Saturday morning checklist / yourIMMO feed',
    pollIntervalLabel: 'Weekly (Saturdays 07:00)',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'kalaydo-regional',
    name: 'Regionalimmobilien24 / Immoradar Köln',
    url: 'https://www.regionalimmobilien24.de/',
    category: 'Cologne Regional & Print',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login needed (200 OK).',
    scrapingStrategy: 'HTML regional crawler',
    pollIntervalLabel: 'Every 2 hours',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'ksk-immobilien',
    name: 'KSK Immobilien (Kreissparkasse Köln)',
    url: 'https://www.ksk-immobilien.de/immobilie-kaufen/haus-kaufen/',
    category: 'Banks & Broker-First',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes:
      'Public pages work without login (200 OK). Creating a free VIP search alert emails pre-market listings 24–72h before ImmoScout24.',
    scrapingStrategy: 'onOffice dynamic widget — free VIP email alert recommended',
    pollIntervalLabel: 'VIP Search Alert',
    enabledInScraper: false,
    priority: 'critical'
  },
  {
    id: 'sparkasse-koelnbonn',
    name: 'Sparkasse KölnBonn Immobilien / S-ImmoPartner',
    url: 'https://www.sparkasse-koelnbonn.de/de/home/privatkunden/immobilien.html',
    category: 'Banks & Broker-First',
    supportsRent: false,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login required to browse listings (200 OK).',
    scrapingStrategy: 'Direct HTML / S-Immo monitor',
    pollIntervalLabel: 'Every 60 min',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'volksbank-koelnbonn',
    name: 'Volksbank Köln Bonn Immobilien',
    url: 'https://www.volksbank-koeln-bonn.de/privatkunden/immobilie-und-wohnen/produkte.html',
    category: 'Banks & Broker-First',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login required (200 OK).',
    scrapingStrategy: 'HTML listing monitor',
    pollIntervalLabel: 'Every 2 hours',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'kampmeyer',
    name: 'KAMPMEYER & Engel & Völkers & LBS West',
    url: 'https://www.kampmeyer.com/immobilien/koeln-kompakt-komplett-36369/',
    category: 'Banks & Broker-First',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes: 'Public pages require no login; registering as a pre-approved buyer gives early access.',
    scrapingStrategy: 'Broker feed monitor',
    pollIntervalLabel: 'Every 2 hours',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'zvg-portal',
    name: 'ZVG-Portal.de (Amtsgericht Köln / Brühl / Bergisch Gladbach)',
    url: 'https://www.zvg-portal.de/index.php?button=Termine+suchen',
    category: 'Foreclosures & Public Auctions',
    supportsRent: false,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'Official government court portal — 100% open (200 OK), no login needed.',
    scrapingStrategy: 'Direct court schedule check (0% commission)',
    pollIntervalLabel: 'Daily',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'versteigerungspool',
    name: 'Versteigerungspool.de / ZvgScout / ZVG24',
    url: 'https://versteigerungspool.de/',
    category: 'Foreclosures & Public Auctions',
    supportsRent: false,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes: 'Basic search is free (200 OK); downloading full PDF court appraisals (Gutachten) sometimes requires free registration.',
    scrapingStrategy: 'Mirror/fallback for ZVG-Portal court schedules',
    pollIntervalLabel: 'Daily',
    enabledInScraper: false,
    priority: 'medium'
  },
  {
    id: 'nrw-blb',
    name: 'Stadt Köln Wohnungsbauleitstelle & Konzeptverfahren',
    url: 'https://www.stadt-koeln.de/service/adressen/wohnungsbauleitstelle',
    category: 'Foreclosures & Public Auctions',
    supportsRent: false,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'Official municipal page (200 OK) for Konzeptvergabe / community plots.',
    scrapingStrategy: 'Page diff watcher',
    pollIntervalLabel: 'Daily',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'erzbistum-koeln',
    name: 'Erzbistum Köln — Liegenschaften & Erbbaurecht',
    url: 'https://www.erzbistum-koeln.de/start/index.html',
    category: 'Churches, Erbpacht & Co-ops',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'none',
    loginNotes: 'No login (200 OK); contact Rendantur / Liegenschaften directly for parish houses & Erbpacht plots.',
    scrapingStrategy: 'Page monitor + direct inquiry workflow',
    pollIntervalLabel: 'Weekly',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'wohnprojekte-portal',
    name: 'Wohnprojekte-Portal (Stiftung trias) & Bring-Together.de',
    url: 'https://www.wohnprojekte-portal.de/',
    category: 'Churches, Erbpacht & Co-ops',
    supportsRent: true,
    supportsBuy: true,
    loginRequirement: 'optional-advantage',
    loginNotes: 'Browsing is free (200 OK); creating a group profile helps join existing Syndikat/Erbpacht plots.',
    scrapingStrategy: 'Region Köln-Bonn project board watcher',
    pollIntervalLabel: 'Daily',
    enabledInScraper: false,
    priority: 'high'
  },
  {
    id: 'koelner-genossenschaften',
    name: 'Kölner Genossenschaften (GAG, Die Ehrenfelder eG, KWG, GWG 1897)',
    url: 'https://www.die-ehrenfelder.de/',
    category: 'Churches, Erbpacht & Co-ops',
    supportsRent: true,
    supportsBuy: false,
    loginRequirement: 'required-for-membership',
    loginNotes:
      'Important: Registering on cooperative waiting lists (Wohnungsbewerbung) requires submitting an online applicant account ahead of time — ideal for your Summer 2027 timeline!',
    scrapingStrategy: 'Offer watcher + membership registration tracker',
    pollIntervalLabel: 'Every 6 hours',
    enabledInScraper: false,
    priority: 'high'
  }
];

export const LOAN_PROVIDERS: LoanProviderBenchmark[] = [
  {
    id: 'interhyp-best',
    name: 'Interhyp / Dr. Klein (Best Market Bank Mix)',
    category: 'Broker / Market Comparison',
    nominalRatePct: 3.58,
    effectiveRatePct: 3.65,
    zinsbindungYears: 10,
    minTilgungPct: 1.5,
    sondertilgungPct: 5.0,
    notes:
      'Compares 500+ German banks. Requires strong household net income and 15–20% equity (covering Kaufnebenkosten + down payment). Best for 5 working co-borrowers.',
    url: 'https://www.interhyp.de/'
  },
  {
    id: 'sparkasse-koelnbonn',
    name: 'Sparkasse KölnBonn Baufinanzierung',
    category: 'Regional Sparkasse / Bank',
    nominalRatePct: 3.68,
    effectiveRatePct: 3.76,
    zinsbindungYears: 15,
    minTilgungPct: 2.0,
    sondertilgungPct: 5.0,
    notes:
      'Local Cologne bank familiar with Erbpacht contracts, GbR structures, and ZVG court foreclosures.',
    url: 'https://www.sparkasse-koelnbonn.de/'
  },
  {
    id: 'gls-wohnprojekt',
    name: 'GLS Bank — Gemeinschaftliches Wohnen / Syndikat',
    category: 'Ethical / Wohnprojekt Bank',
    nominalRatePct: 3.85,
    effectiveRatePct: 3.92,
    zinsbindungYears: 15,
    minTilgungPct: 1.5,
    sondertilgungPct: 5.0,
    notes:
      'Germany’s premier bank for Mietshäuser Syndikat, Hausvereine, and Wohnprojekte. Explicitly accepts multi-party groups & Direktkredite as quasi-equity!',
    url: 'https://www.gls.de/',
    contactPhone: '+49 234 5797 300',
    contactEmail: 'kundendialog@gls.de'
  },
  {
    id: 'kfw-124',
    name: 'KfW 124 (Wohneigentumsprogramm — up to €100k)',
    category: 'Public Subsidy (KfW / NRW)',
    nominalRatePct: 4.45,
    effectiveRatePct: 4.54,
    zinsbindungYears: 10,
    minTilgungPct: 2.0,
    sondertilgungPct: 0,
    maxLoanAmount: 100000,
    notes:
      'Standard promotional top-up up to €100,000 for owner-occupied purchase regardless of energy class. Must be applied BEFORE signing notary purchase contract.',
    url: 'https://www.kfw.de/124'
  },
  {
    id: 'kfw-261',
    name: 'KfW 261 (Effizienzhaus Renovation — up to €150k + up to 40% Grant)',
    category: 'Public Subsidy (KfW / NRW)',
    nominalRatePct: 2.65,
    effectiveRatePct: 2.71,
    zinsbindungYears: 10,
    minTilgungPct: 2.0,
    sondertilgungPct: 0,
    maxLoanAmount: 150000,
    repaymentGrantPct: 25,
    notes:
      'Huge lever for older houses (Energy Class D/E/F): subsidized interest + 15–40% Tilgungszuschuss (debt forgiveness) when upgrading to Effizienzhaus standard!',
    url: 'https://www.kfw.de/261'
  },
  {
    id: 'nrw-bank',
    name: 'NRW.BANK.Wohneigentum / Wohnraumförderung',
    category: 'Public Subsidy (KfW / NRW)',
    nominalRatePct: 0.50,
    effectiveRatePct: 0.55,
    zinsbindungYears: 30,
    minTilgungPct: 1.0,
    sondertilgungPct: 5.0,
    notes:
      'Ultra-low 0.5% promotional loan in NRW (income caps apply — check individual eligibility or cooperative/rental housing funding paths via Stadt Köln).',
    url: 'https://www.nrwbank.de/'
  },
  {
    id: 'syndikat-direktkredite',
    name: 'Mietshäuser Syndikat — Direktkredite (Friends & Family Crowd-Loan)',
    category: 'Direct Loans (Syndikat)',
    nominalRatePct: 1.50,
    effectiveRatePct: 1.50,
    zinsbindungYears: 10,
    minTilgungPct: 0,
    sondertilgungPct: 100,
    notes:
      'Subordinated private loans (typically 0.5%–2.0% interest) from friends, family, and supporters used as equity substitute (Eigenkapitalersatz) in Syndikat projects.',
    url: 'https://www.syndikat.org/direktkredite/'
  }
];

export const SYNDIKAT_RESOURCES: SyndikatResource[] = [
  {
    id: 'mhs-nrw',
    name: 'Mietshäuser Syndikat — Regionalberatung NRW',
    category: 'Mietshäuser Syndikat',
    modelType: 'Haus-GmbH + Hausverein + Mietshäuser Syndikat GmbH (51/49 Veto)',
    summary:
      'Official NRW advisory team of the Mietshäuser Syndikat. Helps groups structure the two-tier legal setup (Hausverein holds ~51% of Haus-GmbH, Syndikat holds ~49% with resale veto) and plan Direktkredite campaigns.',
    relevanceFor6Roommates:
      'Essential first stop if you want to permanently de-commodify a purchased house in Cologne and raise part of the equity via family/supporter Direktkredite.',
    contactPerson: 'Regionalberatung NRW Team',
    email: 'beratung-nrw@syndikat.org',
    websiteUrl: 'https://www.syndikat.org/beratung/',
    formUrl: 'https://www.syndikat.org/kontakt/',
    inquirySubject: 'Anfrage Erstberatung Hausprojekt in Köln (6er-Gruppe, Ziel Sommer 2027)',
    inquiryBodyTemplate:
      'Hallo liebe Regionalberatung NRW,\n\nwir sind eine feste Gruppe von 6 Personen (5 Berufstätige + 1 Student) in Köln und möchten bis Sommer 2027 gemeinsam ein Haus erwerben bzw. ein langfristiges Hausprojekt gründen. Wir interessieren uns sehr für das Syndikatsmodell (inkl. Direktkredite) und würden gerne an einem der nächsten digitalen Kennenlerntreffen oder einer Erstberatung teilnehmen.\n\nViele Grüße\nFlorian & Gruppe'
  },
  {
    id: 'mhs-zentrale',
    name: 'Mietshäuser Syndikat — Zentralbüro Freiburg',
    category: 'Mietshäuser Syndikat',
    modelType: 'Bundesweiter Projektverbund (>190 Hausprojekte)',
    summary:
      'Central coordination office for the entire Syndikat network. Publishes model articles of association (Mustersatzung), Direktkredit legal templates (BaFin-compliant thresholds), and project directories.',
    relevanceFor6Roommates:
      'Provides legal blueprints, BaFin limits for subordinated loans (Nachrangdarlehen), and the "Das ist unser Haus!" handbook.',
    email: 'info@syndikat.org',
    phone: '0761 / 281892',
    address: 'Adlerstraße 12, 79098 Freiburg',
    websiteUrl: 'https://www.syndikat.org',
    inquirySubject: 'Informationsmaterial & Musterunterlagen für Neugründung in Köln',
    inquiryBodyTemplate:
      'Hallo liebes Syndikat-Team,\n\nwir planen aktuell eine Hausprojekt-Gründung in Köln (6 Personen, Zeithorizont Sommer 2027) und stehen bereits mit der Regionalberatung NRW in Kontakt. Über aktuelle Unterlagen oder Termine würden wir uns sehr freuen.\n\nViele Grüße\nFlorian'
  },
  {
    id: 'mitstadtzentrale',
    name: 'MitStadtZentrale Köln (HdAK)',
    category: 'Stadt Köln & Netzwerk',
    modelType: 'Kommunale Netzwerk- & Beratungsstelle für Wohnprojekte-Plus',
    summary:
      'The official Cologne network and advisory hub for community-oriented housing projects, housed at the Haus der Architektur Köln. Connects groups, helps with municipal Konzeptverfahren, and knows local architects/lawyers.',
    relevanceFor6Roommates:
      'Your single best local hub in Cologne to meet legal advisors, learn about city land tenders, or connect with existing initiatives needing 6 core members.',
    contactPerson: 'Beratungsteam MitStadtZentrale',
    email: 'info@mitstadtzentrale.de',
    phone: '0221 / 56096786',
    address: 'Senefelderstraße 42, 50825 Köln',
    websiteUrl: 'https://mitstadtzentrale.de',
    inquirySubject: 'Erstberatung 6er-Wohnprojekt / Hauskauf in Köln (Sommer 2027)',
    inquiryBodyTemplate:
      'Guten Tag,\n\nwir sind eine Gruppe aus 6 Personen (5 Berufstätige, 1 Student) und planen bis Sommer 2027 die Gründung eines gemeinschaftlichen Wohnprojekts / Hauskaufs in Köln. Gerne würden wir ein kurzes Orientierungsgespräch zu Rechtsformen und Kölner Förder-/Grundstücksmöglichkeiten vereinbaren.\n\nMit freundlichen Grüßen\nFlorian & Mitbewohner:innen'
  },
  {
    id: 'stadt-koeln-leitstelle',
    name: 'Stadt Köln — Büro für gemeinschaftliche Wohnbauprojekte',
    category: 'Stadt Köln & Netzwerk',
    modelType: 'Wohnungsbauleitstelle / Konzeptvergabe städtischer Grundstücke',
    summary:
      'Cologne municipal office managing concept-based allocations (Konzeptverfahren) of city-owned plots and buildings for community housing groups and cooperatives.',
    relevanceFor6Roommates:
      'Check whether city-owned buildings or smaller infill plots in Cologne are scheduled for Konzeptverfahren in 2026/2027.',
    contactPerson: 'Sabine Kollasinski & Sabine Pawlowski',
    email: 'wohnungsbauleitstelle@stadt-koeln.de',
    phone: '0221 / 221-32552 (Kollasinski) | 0221 / 221-33079 (Pawlowski)',
    address: 'Willy-Brandt-Platz 2, 50679 Köln',
    websiteUrl: 'https://www.stadt-koeln.de/service/adressen/wohnungsbauleitstelle',
    inquirySubject: 'Anfrage Konzeptverfahren / Bestandsgebäude für 6er-Wohngruppe',
    inquiryBodyTemplate:
      'Sehr geehrte Frau Kollasinski, sehr geehrte Frau Pawlowski,\n\nwir sind eine 6-köpfige Wohngruppe in Köln auf der Suche nach einem langfristigen Hausprojekt ab Sommer 2027 und möchten uns erkundigen, ob es aktuelle oder kommende Konzeptverfahren bzw. Beratungsangebote für kleinere Bestandsprojekte gibt.\n\nMit freundlichen Grüßen\nFlorian'
  },
  {
    id: 'stiftung-trias',
    name: 'Stiftung trias (Boden & Erbbaurecht)',
    category: 'Erbbaurecht & Stiftungen',
    modelType: 'Gemeinnützige Stiftung erwirbt Grundstück -> Erbbaurecht (99 Jahre)',
    summary:
      'Charitable land trust that buys the land under a house and grants a long-term hereditary building right (Erbbaurecht) to your group. Your group only buys/finances the building itself — cutting upfront capital required by 35–50%!',
    relevanceFor6Roommates:
      'Massive financial unlock in Cologne where land prices are extremely high: you avoid buying the land while permanently securing the home against speculation.',
    contactPerson: 'Projektberatung Stiftung trias',
    email: 'info@stiftung-trias.de',
    phone: '+49 2324 56970-0',
    address: 'Droste-Hülshoff-Straße 43, 45525 Hattingen',
    websiteUrl: 'https://www.stiftung-trias.de',
    formUrl: 'https://www.wohnprojekte-portal.de/',
    inquirySubject: 'Anfrage Erbbaurechts-Partnerschaft für Hauskauf in Köln',
    inquiryBodyTemplate:
      'Sehr geehrtes Team der Stiftung trias,\n\nwir sind eine 6er-Gruppe (5 Berufstätige, 1 Student) und suchen zum Sommer 2027 ein Haus in Köln. Da die Bodenpreise in Köln hoch sind, interessiert uns sehr das Modell, über Erbbaurecht gemeinsam mit Ihrer Stiftung ein Bestandsobjekt zu sichern. Könnten wir zu den aktuellen Voraussetzungen sprechen?\n\nViele Grüße\nFlorian'
  },
  {
    id: 'wohnprojekte-portal',
    name: 'Wohnprojekte-Portal (Stiftung trias)',
    category: 'Erbbaurecht & Stiftungen',
    modelType: 'Bundesweite Projekt- & Gruppenbörse',
    summary:
      'Germany’s largest database of active co-housing groups, projects looking for members, and land opportunities. Dedicated phone hours Mo & Do 10–12.',
    relevanceFor6Roommates:
      'Use to find existing Cologne projects with 6+ open units OR team up with another 6-person group to jointly acquire a larger multi-family house.',
    email: 'portal@stiftung-trias.de',
    phone: '+49 2324 56970-96',
    websiteUrl: 'https://www.wohnprojekte-portal.de',
    inquirySubject: 'Gruppenprofil & Projektanfrage Region Köln',
    inquiryBodyTemplate:
      'Hallo Portal-Team,\n\nwir möchten unser 6er-Gruppenprofil im Raum Köln einstellen bzw. nach passenden Projekten in Köln-Bonn filtern.\n\nViele Grüße\nFlorian'
  },
  {
    id: 'wohnbund-nrw',
    name: 'WohnBund-Beratung NRW GmbH',
    category: 'Spezialfinanzierung & Recht',
    modelType: 'Professionelle Wohnprojekt- & Förderberatung NRW',
    summary:
      'Leading NRW specialist consultancy (closely linked to Stiftung trias & wohnbund e.V.) advising groups on legal structures (GbR, eG, GmbH), NRW.BANK public subsidies, and economic feasibility studies.',
    relevanceFor6Roommates:
      'Ideal if you need paid/subsidized professional moderation or NRW.BANK financing feasibility checks for a multi-family house purchase.',
    email: 'kontakt@wbb-nrw.de',
    phone: '+49 234 / 90440-0',
    address: 'Humboldtstraße 42, 44787 Bochum',
    websiteUrl: 'https://www.wbb-nrw.de',
    inquirySubject: 'Beratungsanfrage Wohnprojekt-Finanzierung & Rechtsform Köln',
    inquiryBodyTemplate:
      'Guten Tag,\n\nwir sind eine Gruppe aus 6 Personen in Köln (5 Berufstätige, 1 Student) und prüfen aktuell den gemeinsamen Erwerb eines größeren Hauses zum Sommer 2027 (GbR vs. Syndikat vs. Erbbaurecht). Gerne möchten wir Möglichkeiten für eine Erstberatung erfragen.\n\nMit freundlichen Grüßen\nFlorian'
  },
  {
    id: 'gls-wohnprojekte',
    name: 'GLS Bank — Fachabteilung Wohnprojekte',
    category: 'Spezialfinanzierung & Recht',
    modelType: 'Spezialbank für Wohnprojekte, Syndikat & Genossenschaften',
    summary:
      'Unlike standard commercial banks that reject complex 6-person buyer groups or Direktkredite, GLS Bank has a dedicated team underwriting collective house purchases across Germany.',
    relevanceFor6Roommates:
      'Ask GLS directly for a preliminary financing check comparing a 5-person GbR mortgage vs. a Syndikat Haus-GmbH loan.',
    contactPerson: 'Team Finanzierungen & Wohnprojekte',
    email: 'kundendialog@gls.de',
    phone: '+49 234 5797 300',
    address: 'Christstraße 9, 44789 Bochum',
    websiteUrl: 'https://www.gls.de/privatkunden/kredite-baufinanzierung/baufinanzierung/',
    inquirySubject: 'Finanzierungsvoranfrage Gemeinschaftliches Wohnprojekt Köln (6 Personen)',
    inquiryBodyTemplate:
      'Sehr geehrtes GLS-Wohnprojekte-Team,\n\nwir sind eine Gruppe aus 5 Berufstätigen und 1 Studenten in Köln und planen bis Sommer 2027 den Erwerb eines Einfamilien- oder Mehrfamilienhauses (Budget ca. 650.000–850.000 €). Gerne würden wir ein Erstgespräch zu Finanzierungsmodellen (GbR vs. Syndikats-GmbH + Direktkredite) führen.\n\nViele Grüße\nFlorian'
  },
  {
    id: 'bg1006-koeln',
    name: 'BG1006 (tausendsechs e.V. / BG 1006 GmbH — Köln-Dellbrück)',
    category: 'Mietshäuser Syndikat',
    modelType: 'Aktives Kölner Mietshäuser-Syndikat-Projekt (seit 2025)',
    summary:
      'Historic listed building on Bergisch Gladbacher Str. 1006 in Cologne-Dellbrück recently integrated into the Mietshäuser Syndikat. Proof that Syndikat deals work in today’s Cologne market!',
    relevanceFor6Roommates:
      'Incredible real-world Cologne reference for Direktkredit campaigns, bank negotiations, and renovation planning.',
    email: 'info@tausendsechs.de',
    address: 'Bergisch Gladbacher Str. 1006, 51069 Köln',
    websiteUrl: 'https://www.tausendsechs.de',
    inquirySubject: 'Erfahrungsaustausch Kölner Hausprojekt-Neugründung',
    inquiryBodyTemplate:
      'Hallo liebe Leute von BG1006,\n\nwir sind eine 6er-WG in Köln, die ebenfalls überlegt, ein Haus im Syndikatsverbund zu gründen. Falls ihr mal Zeit für einen kurzen Erfahrungsaustausch (gerne auf einen Kaffee/Getränk) habt, freuen wir uns riesig!\n\nSolidarische Grüße\nFlorian & Gruppe'
  },
  {
    id: 'die-neuerburg',
    name: 'Die Neuerburg (Syndikat Reihenhaus-Projekt Köln)',
    category: 'Mietshäuser Syndikat',
    modelType: 'Kölner Syndikat-Reihenhausprojekt',
    summary:
      'One of Cologne’s pioneering smaller Mietshäuser Syndikat terraced-house projects — proof that the Syndikat structure works even for normal single/terraced houses, not only massive apartment blocks!',
    relevanceFor6Roommates:
      'Closest match in building scale (terraced house / ~6–10 residents) to your exact target!',
    email: 'dieneuerburg@riseup.net',
    websiteUrl: 'https://dieneuerburg.wordpress.com',
    inquirySubject: 'Kurze Frage zum kleineren Syndikats-Hausmodell in Köln',
    inquiryBodyTemplate:
      'Hallo liebe Neuerburg-WG,\n\nwir sind 6 Freund:innen in Köln und möchten zum Sommer 2027 ein Haus (Reihenhaus/Zweifamilienhaus) übernehmen — idealerweise über das Syndikat. Euer Projekt passt von der Größe perfekt als Vorbild. Dürfen wir euch 2-3 Fragen zu eurer Gründung stellen?\n\nLiebe Grüße\nFlorian'
  },
  {
    id: 'grundsolidarisch',
    name: 'GrundSolidarisch (Syndikat-Initiative Köln/Brück)',
    category: 'Mietshäuser Syndikat',
    modelType: 'Aktive Gründungsinitiative in Köln (Hof/Hausprojekt)',
    summary:
      'Active Cologne initiative building a collective Syndikat housing & courtyard project in eastern Cologne.',
    relevanceFor6Roommates:
      'Potential partner initiative or source of local Direktkredit & notary insights.',
    email: 'post@grundsolidarisch.de',
    websiteUrl: 'https://grundsolidarisch.de',
    inquirySubject: 'Vernetzung Kölner Hausprojekt-Gruppen',
    inquiryBodyTemplate:
      'Hallo GrundSolidarisch-Team,\n\nwir suchen als 6er-Gruppe ein Haus in Köln für Sommer 2027 und vernetzen uns gerade in der Kölner Syndikats-Szene.\n\nViele Grüße\nFlorian'
  },
  {
    id: 'die-ehrenfelder',
    name: 'DIE EHRENFELDER eG & Kölner Wohnungsgenossenschaft eG & GAG',
    category: 'Genossenschaften & Bauprojekte',
    modelType: 'Etablierte Kölner Genossenschaften (Genossenschaftsanteile)',
    summary:
      'Major Cologne housing cooperatives occasionally offering multi-generational flats or group-friendly new builds. Requires registering early on applicant lists (2026->2027).',
    relevanceFor6Roommates:
      'Low overhead backup track: register all 6 profiles/inquiries now for 2027 cluster/large apartments.',
    email: 'info@die-ehrenfelder.de',
    phone: '0221 955600-0 (Ehrenfelder) | 0221 998787-0 (KWG) | 0221 2011-2011 (GAG)',
    address: 'Gravensteiner Str. 7, 50825 Köln',
    websiteUrl: 'https://www.die-ehrenfelder.de',
    inquirySubject: 'Interesse an Großwohnung / Cluster-Wohnung ab Sommer 2027 (6er-Gruppe)',
    inquiryBodyTemplate:
      'Sehr geehrte Damen und Herren,\n\nwir sind eine Gruppe aus 6 jungen Erwachsenen (5 Berufstätige, 1 Student) und suchen langfristigen Wohnraum (5–6 Zimmer oder Cluster-Einheit) in Köln ab Sommer 2027. Wir sind gerne bereit, Genossenschaftsanteile zu zeichnen und bitten um Information zur Wartelisten-Registrierung.\n\nMit freundlichen Grüßen\nFlorian'
  }
];

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    title: 'Request floorplan & inspect 6-bedroom suitability for live Nippes 0%-Makler house (OM-500235)',
    category: 'property',
    status: 'todo',
    priority: 'high',
    assignedTo: 'lukas',
    linkedPropertyId: 'om-500235',
    dueDate: '2026-11-24',
    notes: 'Verify current tenant lease notice periods and ceiling heights in the historical Nippes MFH.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-17'
  },
  {
    id: 'todo-2',
    title: 'Contact Kleinanzeigen Dellbrück 7-room house seller (3545987117) for Exposé & PV yield',
    category: 'property',
    status: 'todo',
    priority: 'high',
    assignedTo: 'matteo',
    linkedPropertyId: 'ka-3545987117',
    dueDate: '2026-11-25',
    notes: '225 m² DHH with PV system — evaluate in Loan Calculator with KfW/GLS options.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-17'
  },
  {
    id: 'todo-3',
    title: 'Check Dellbrück 7-room rental house (ka-3569202874) for WG suitability & move-in flexibility',
    category: 'property',
    status: 'todo',
    priority: 'high',
    assignedTo: 'jonas',
    linkedPropertyId: 'ka-3569202874',
    dueDate: '2026-11-25',
    notes: '2,470 € Kaltmiete across 7 rooms (141.6 m²) — verify KVB Line 3/18 commute trade-offs.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-17'
  },
  {
    id: 'todo-4',
    title: 'Assemble digital 6er-WG Bewerbungsmappe PDF (5 Payslips + Florian Elternbürgschaft + 6x SCHUFA)',
    category: 'application',
    status: 'in-progress',
    priority: 'high',
    assignedTo: 'florian',
    dueDate: '2026-12-01',
    notes: 'Everyone uploads their 3 latest Gehaltsabrechnungen + SCHUFA BonitätsCheck before peak season.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-15'
  },
  {
    id: 'todo-5',
    title: 'Book orientation call with MitStadtZentrale Köln & Mietshäuser Syndikat NRW',
    category: 'syndikat',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'sarah',
    dueDate: '2026-12-10',
    notes: 'Clarify GbR vs. Syndikat Haus-GmbH timeline for a Summer 2027 closing.',
    createdBy: 'Sarah',
    createdAt: '2026-11-16'
  },
  {
    id: 'todo-6',
    title: 'Get non-binding Finanzierungszertifikat from Interhyp + GLS Bank for €750k–€850k range',
    category: 'financing',
    status: 'todo',
    priority: 'high',
    assignedTo: 'matteo',
    dueDate: '2026-12-15',
    notes: 'Compare 5-working co-borrowers (with Florian renting) vs. 6-person entity.',
    createdBy: 'Matteo',
    createdAt: '2026-11-16'
  },
  {
    id: 'todo-7',
    title: '[Tool Expansion] Integrate live Baufinanzierung rate scraper (Interhyp / Dr. Klein / FMH / KfW API feeds)',
    category: 'roadmap-expansion',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'lukas',
    dueDate: '2027-01-15',
    notes: 'Automatically refresh daily 10y/15y Zinsbindung rates into the Loan Calculator tab from open-source German mortgage scrapers.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-16'
  },
  {
    id: 'todo-8',
    title: '[Tool Expansion] Build automated Direktkredit Pledge Tracker & Syndikat Feasibility Simulator',
    category: 'roadmap-expansion',
    status: 'todo',
    priority: 'low',
    assignedTo: 'florian',
    dueDate: '2027-02-01',
    notes: 'Track family/friend subordinated loan pledges (€5k–€50k at 1.5%) to lower bank LTV below 80%.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-16'
  },
  {
    id: 'todo-9',
    title: '[Tool Expansion] Add ImmoScout24 Plus cookie & Kleinanzeigen session support to GitHub Actions scraper',
    category: 'roadmap-expansion',
    status: 'todo',
    priority: 'medium',
    assignedTo: 'lukas',
    dueDate: '2027-01-10',
    notes: 'Store optional portal session secrets in GitHub Repo Secrets for zero-cost 30-min polling.',
    createdBy: 'Florian (You)',
    createdAt: '2026-11-16'
  }
];

export const INITIAL_ALERT_CONFIG: AlertConfig = {
  signalEnabled: true,
  signalPhoneNumber: '+49 176 XXXXXXXX',
  signalApiMode: 'signal-cli-rest',
  emailEnabled: true,
  emailRecipients: [
    'florian@example.de',
    'lukas@example.de',
    'sarah@example.de',
    'jonas@example.de',
    'elena@example.de',
    'matteo@example.de'
  ],
  minAiScoreForAlert: 78,
  maxCommuteMinsForAlert: 35,
  alertOnRent: true,
  alertOnBuy: true,
  alertOnZvg: true,
  pollIntervalMinutes: 30
};
