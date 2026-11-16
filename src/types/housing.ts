export type ListingMode = 'rent' | 'buy' | 'zvg' | 'erbpacht';

export type PropertyStatus = 'new' | 'pinned' | 'contacted' | 'viewing' | 'archived';

export type RoommateVote = 'up' | 'maybe' | 'down';

export interface CommuteTime {
  kvbMins: number;
  bikeMins: number;
}

export interface RoommateProfile {
  id: string;
  name: string;
  role: 'Working' | 'Student';
  occupation: string;
  netMonthlyIncome: number;
  availableEquity: number;
  hasParentGuarantor: boolean;
  destinationName: string;
  maxCommuteMins: number;
  badgeColor: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  mode: ListingMode;
  propertyType:
    | 'Einfamilienhaus'
    | 'Reihenhaus'
    | 'Doppelhaushälfte'
    | 'Zweifamilienhaus'
    | 'Altbau-Wohnung'
    | 'Mehrfamilienhaus'
    | 'Hof / Wohnprojekt';
  veedel: string;
  approxAddress: string;
  lat: number;
  lng: number;
  googleMapsQuery: string;
  isExactAddress: boolean;
  portal: string;
  portalUrl: string;
  publishedAt: string;
  availableFrom: string;
  /** Kaltmiete €/mo for 'rent', or Kaufpreis € for 'buy' | 'zvg' | 'erbpacht' */
  basePriceOrColdRent: number;
  /** Monthly Nebenkosten/Hausgeld € */
  monthlyUtilitiesOrHausgeld: number;
  /** Monthly Erbpachtzins € if mode === 'erbpacht' */
  erbpachtMonthly?: number;
  /** Buyer commission % (e.g. 3.57 or 0) */
  brokerFeePct: number;
  /** Normalized effective monthly cost per roommate (€/person/month) */
  effectiveMonthlyPerPerson: number;
  livingSpaceSqm: number;
  plotSqm?: number;
  listedRooms: number;
  /** AI-detected truly private bedrooms (excluding walkthrough rooms, including Souterrain/Spitzboden potential) */
  aiViableBedrooms: number;
  bathroomsAndWcs: number;
  hasGarden: boolean;
  hasBalconyOrTerrace: boolean;
  hasFittedKitchen: boolean;
  hasBasementOrSouterrain: boolean;
  wgFriendly: boolean;
  isWbsRequired: boolean;
  energyClass: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'N/A';
  heatingType: string;
  kvbLines: string[];
  commutes: Record<string, CommuteTime>;
  aiScore: number;
  aiSummary: string;
  aiFloorplanInsight: string;
  aiRedFlags: string[];
  contactName: string;
  contactRole:
    | 'Privatvermieter'
    | 'Makler'
    | 'Hausverwaltung'
    | 'Amtsgericht / ZVG'
    | 'Aktuelle WG (Nachmieter)'
    | 'Eigentümer (Privatverkauf)';
  contactPhone?: string;
  contactEmail?: string;
  pinned: boolean;
  status: PropertyStatus;
  notes: string;
  votes: Record<string, RoommateVote>;
}

export type TodoCategory =
  | 'property'
  | 'application'
  | 'financing'
  | 'syndikat'
  | 'roadmap-expansion';

export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface TodoItem {
  id: string;
  title: string;
  category: TodoCategory;
  status: TodoStatus;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  linkedPropertyId?: string;
  dueDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface LoanProviderBenchmark {
  id: string;
  name: string;
  category:
    | 'Ethical / Wohnprojekt Bank'
    | 'Broker / Market Comparison'
    | 'Regional Sparkasse / Bank'
    | 'Public Subsidy (KfW / NRW)'
    | 'Direct Loans (Syndikat)';
  nominalRatePct: number;
  effectiveRatePct: number;
  zinsbindungYears: number;
  minTilgungPct: number;
  sondertilgungPct: number;
  maxLoanAmount?: number;
  repaymentGrantPct?: number;
  notes: string;
  url: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface BorrowerShareConfig {
  roommateId: string;
  isCoBorrower: boolean;
  equityContribution: number;
  /** Weight or percentage of mortgage responsibility (when co-borrower) */
  loanSharePct: number;
  /** Monthly internal WG rent paid if non-buyer (e.g. student paying rent to buying roommates) */
  internalRentIfNonBuyer: number;
}

export interface SyndikatResource {
  id: string;
  name: string;
  category:
    | 'Mietshäuser Syndikat'
    | 'Erbbaurecht & Stiftungen'
    | 'Stadt Köln & Netzwerk'
    | 'Genossenschaften & Bauprojekte'
    | 'Spezialfinanzierung & Recht';
  modelType: string;
  summary: string;
  relevanceFor6Roommates: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  websiteUrl: string;
  formUrl?: string;
  inquirySubject: string;
  inquiryBodyTemplate: string;
}

export interface PortalSource {
  id: string;
  name: string;
  url: string;
  category:
    | 'National Portals'
    | 'Cologne Regional & Print'
    | 'Banks & Broker-First'
    | 'Foreclosures & Public Land'
    | 'Churches, Erbpacht & Co-ops';
  supportsRent: boolean;
  supportsBuy: boolean;
  loginRequirement:
    | 'none'
    | 'optional-advantage'
    | 'required-for-contact'
    | 'required-for-membership';
  loginNotes: string;
  scrapingStrategy: string;
  pollIntervalLabel: string;
  enabledInScraper: boolean;
  priority: 'critical' | 'high' | 'medium';
}

export interface AlertConfig {
  signalEnabled: boolean;
  signalPhoneNumber: string;
  signalApiMode: 'signal-cli-rest' | 'callmebot-free';
  emailEnabled: boolean;
  emailRecipients: string[];
  minAiScoreForAlert: number;
  maxCommuteMinsForAlert: number;
  alertOnRent: boolean;
  alertOnBuy: boolean;
  alertOnZvg: boolean;
  pollIntervalMinutes: number;
}

export interface ScreenerFilters {
  searchText: string;
  mode: 'all' | ListingMode;
  quickFilter: 'all' | 'pinned' | 'contacted' | 'top-ai' | 'wg-friendly';
  maxMonthlyPerPerson: number;
  minTotalRooms: number;
  minAiBedrooms: number;
  minBathrooms: number;
  minSqm: number;
  maxSingleCommuteMins: number;
  hideCommuteFlagged: boolean;
  requireGarden: boolean;
  requireWgFriendly: boolean;
  excludeErbpacht: boolean;
  excludeWbs: boolean;
  selectedVeedels: string[];
  selectedPortal: string;
  sortBy: 'aiScore' | 'costAsc' | 'sqmDesc' | 'newest' | 'commuteAsc';
}
