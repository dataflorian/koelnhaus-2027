import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bath,
  BedDouble,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flag,
  Home,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Pin,
  Plus,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trees,
  Calculator,
  X
} from 'lucide-react';
import {
  ListingMode,
  PropertyListing,
  PropertyStatus,
  RoommateProfile,
  RoommateVote,
  ScreenerFilters,
  TodoCategory
} from '../types/housing';
import {
  assessCommutes,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsUrl,
  formatEUR
} from '../utils/housingMath';

interface ScreenerTabProps {
  listings: PropertyListing[];
  roommates: RoommateProfile[];
  activeRoommateId: string;
  onTogglePin: (id: string) => void;
  onUpdateStatus: (id: string, status: PropertyStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onToggleVote: (propertyId: string, roommateId: string, vote: RoommateVote) => void;
  onAddListing: (listing: PropertyListing) => void;
  onAddTodoForProperty: (title: string, propertyId: string, category: TodoCategory, assignedTo: string) => void;
  onOpenInLoanCalculator: (propertyId: string) => void;
  onOpenInOutreach: (propertyId: string) => void;
}

const DEFAULT_FILTERS: ScreenerFilters = {
  searchText: '',
  mode: 'all',
  quickFilter: 'all',
  maxMonthlyPerPerson: 950,
  minTotalRooms: 4.5,
  minAiBedrooms: 5,
  minBathrooms: 1.5,
  minSqm: 140,
  maxSingleCommuteMins: 45,
  hideCommuteFlagged: false,
  requireGarden: false,
  requireWgFriendly: false,
  excludeErbpacht: false,
  excludeWbs: true,
  selectedVeedels: [],
  selectedPortal: 'all',
  sortBy: 'aiScore'
};

const MODE_LABELS: Record<ListingMode, { label: string; color: string }> = {
  rent: { label: 'RENT', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  buy: { label: 'BUY', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  zvg: { label: 'ZVG AUCTION', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  erbpacht: { label: 'ERBPACHT', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
};

const STATUS_LABELS: Record<PropertyStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-700 text-slate-200' },
  pinned: { label: 'Pinned', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' },
  contacted: { label: 'Contacted', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
  viewing: { label: 'Viewing Scheduled', color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' },
  archived: { label: 'Archived', color: 'bg-slate-800 text-slate-400' }
};

export const ScreenerTab: React.FC<ScreenerTabProps> = ({
  listings,
  roommates,
  activeRoommateId,
  onTogglePin,
  onUpdateStatus,
  onUpdateNotes,
  onToggleVote,
  onAddListing,
  onAddTodoForProperty,
  onOpenInLoanCalculator,
  onOpenInOutreach
}) => {
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);
  const [todoModalProperty, setTodoModalProperty] = useState<PropertyListing | null>(null);
  const [todoDraftTitle, setTodoDraftTitle] = useState('');
  const [todoDraftAssignee, setTodoDraftAssignee] = useState(activeRoommateId);
  const [showImportModal, setShowImportModal] = useState(false);

  // Import modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<ListingMode>('buy');
  const [newVeedel, setNewVeedel] = useState('Ehrenfeld');
  const [newAddress, setNewAddress] = useState('');
  const [newPortal, setNewPortal] = useState('ImmoScout24');
  const [newPortalUrl, setNewPortalUrl] = useState('');
  const [newPrice, setNewPrice] = useState(740000);
  const [newSqm, setNewSqm] = useState(190);
  const [newRooms, setNewRooms] = useState(6);

  const allVeedels = useMemo(
    () => Array.from(new Set(listings.map((l) => l.veedel))).sort(),
    [listings]
  );

  const allPortals = useMemo(
    () => Array.from(new Set(listings.map((l) => l.portal))).sort(),
    [listings]
  );

  const filteredListings = useMemo(() => {
    const query = filters.searchText.trim().toLowerCase();

    return listings
      .map((item) => ({
        item,
        commuteInfo: assessCommutes(item, roommates, filters.maxSingleCommuteMins)
      }))
      .filter(({ item, commuteInfo }) => {
        if (filters.mode !== 'all' && item.mode !== filters.mode) return false;
        if (filters.quickFilter === 'pinned' && !item.pinned) return false;
        if (
          filters.quickFilter === 'contacted' &&
          item.status !== 'contacted' &&
          item.status !== 'viewing'
        )
          return false;
        if (filters.quickFilter === 'top-ai' && item.aiScore < 88) return false;
        if (filters.quickFilter === 'wg-friendly' && !item.wgFriendly) return false;

        if (item.effectiveMonthlyPerPerson > filters.maxMonthlyPerPerson) return false;
        if (item.listedRooms < filters.minTotalRooms) return false;
        if (item.aiViableBedrooms < filters.minAiBedrooms) return false;
        if (item.bathroomsAndWcs < filters.minBathrooms) return false;
        if (item.livingSpaceSqm < filters.minSqm) return false;
        if (commuteInfo.maxKvbMins > filters.maxSingleCommuteMins) return false;
        if (filters.hideCommuteFlagged && commuteInfo.hasFlag) return false;
        if (filters.requireGarden && !item.hasGarden) return false;
        if (filters.requireWgFriendly && !item.wgFriendly) return false;
        if (filters.excludeErbpacht && item.mode === 'erbpacht') return false;
        if (filters.excludeWbs && item.isWbsRequired) return false;
        if (filters.selectedVeedels.length > 0 && !filters.selectedVeedels.includes(item.veedel))
          return false;
        if (filters.selectedPortal !== 'all' && item.portal !== filters.selectedPortal) return false;

        if (query) {
          const haystack = [
            item.title,
            item.veedel,
            item.approxAddress,
            item.portal,
            item.aiSummary,
            item.aiFloorplanInsight,
            item.notes,
            item.contactName
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'costAsc':
            return a.item.effectiveMonthlyPerPerson - b.item.effectiveMonthlyPerPerson;
          case 'sqmDesc':
            return b.item.livingSpaceSqm - a.item.livingSpaceSqm;
          case 'commuteAsc':
            return a.commuteInfo.maxKvbMins - b.commuteInfo.maxKvbMins;
          case 'newest':
            return new Date(b.item.publishedAt).getTime() - new Date(a.item.publishedAt).getTime();
          case 'aiScore':
          default:
            return b.item.aiScore - a.item.aiScore;
        }
      });
  }, [listings, roommates, filters]);

  const stats = useMemo(() => {
    const pinnedCount = listings.filter((l) => l.pinned).length;
    const contactedCount = listings.filter(
      (l) => l.status === 'contacted' || l.status === 'viewing'
    ).length;
    const avgPerPerson = Math.round(
      filteredListings.reduce((acc, x) => acc + x.item.effectiveMonthlyPerPerson, 0) /
        Math.max(1, filteredListings.length)
    );
    return { pinnedCount, contactedCount, avgPerPerson };
  }, [listings, filteredListings]);

  const toggleVeedel = (veedel: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedVeedels: prev.selectedVeedels.includes(veedel)
        ? prev.selectedVeedels.filter((v) => v !== veedel)
        : [...prev.selectedVeedels, veedel]
    }));
  };

  const handleCreateManualListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const monthlyPerPerson =
      newMode === 'rent'
        ? Math.round((newPrice + 420) / 6)
        : Math.round(((newPrice * 0.85 * 0.052) / 12 + 420) / 6);

    const created: PropertyListing = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      mode: newMode,
      propertyType: 'Einfamilienhaus',
      veedel: newVeedel,
      approxAddress: newAddress.trim() || `${newVeedel}, Köln`,
      lat: 50.9375,
      lng: 6.9603,
      googleMapsQuery: newAddress.trim() || `${newVeedel} Köln`,
      isExactAddress: false,
      portal: newPortal,
      portalUrl: newPortalUrl.trim() || 'https://www.immobilienscout24.de/',
      publishedAt: new Date().toISOString(),
      availableFrom: 'Sommer 2027',
      basePriceOrColdRent: newPrice,
      monthlyUtilitiesOrHausgeld: 420,
      brokerFeePct: newMode === 'buy' ? 3.57 : 0,
      effectiveMonthlyPerPerson: monthlyPerPerson,
      livingSpaceSqm: newSqm,
      listedRooms: newRooms,
      aiViableBedrooms: Math.min(6, Math.floor(newRooms)),
      bathroomsAndWcs: 2.0,
      hasGarden: true,
      hasBalconyOrTerrace: true,
      hasFittedKitchen: false,
      hasBasementOrSouterrain: true,
      wgFriendly: true,
      isWbsRequired: false,
      energyClass: 'D',
      heatingType: 'To be verified',
      kvbLines: ['KVB Check Pending'],
      commutes: Object.fromEntries(
        roommates.map((rm) => [rm.id, { kvbMins: 24, bikeMins: 20 }])
      ),
      aiScore: 82,
      aiSummary: 'Manually added by roommate — verify floorplan and exact KVB commute.',
      aiFloorplanInsight: 'Pending AI floorplan inspection.',
      aiRedFlags: [],
      contactName: 'Manual Entry',
      contactRole: newMode === 'rent' ? 'Privatvermieter' : 'Makler',
      pinned: true,
      status: 'pinned',
      notes: 'Imported manually via dashboard.',
      votes: { [activeRoommateId]: 'up' }
    };
    onAddListing(created);
    setShowImportModal(false);
    setNewTitle('');
    setNewAddress('');
    setNewPortalUrl('');
  };

  return (
    <div className="space-y-5">
      {/* Top KPI & Quick Actions Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Matching Properties</div>
          <div className="text-2xl font-bold text-white mt-0.5">
            {filteredListings.length}{' '}
            <span className="text-xs font-normal text-slate-400">/ {listings.length} total</span>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Pinned High-Interest</div>
          <div className="text-2xl font-bold text-amber-400 mt-0.5">{stats.pinnedCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Contacted / Viewing</div>
          <div className="text-2xl font-bold text-emerald-400 mt-0.5">{stats.contactedCount}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Avg. Effective Cost / Person</div>
          <div className="text-2xl font-bold text-sky-400 mt-0.5">
            {formatEUR(stats.avgPerPerson)}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full h-full min-h-[60px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 transition shadow-lg shadow-indigo-950/50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Listing URL</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Listings' },
            { id: 'pinned', label: `📌 Pinned (${stats.pinnedCount})` },
            { id: 'contacted', label: `✅ Contacted (${stats.contactedCount})` },
            { id: 'top-ai', label: '🔥 AI Score 88+' },
            { id: 'wg-friendly', label: '🤝 WG-Friendly' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  quickFilter: pill.id as ScreenerFilters['quickFilter']
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filters.quickFilter === pill.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => setFilters((f) => ({ ...f, searchText: e.target.value }))}
            placeholder="Search Veedel, street, Souterrain, Nachmieter..."
            className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setShowFiltersPanel((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showFiltersPanel ? 'Hide Filters' : 'Filters'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Filter Sidebar */}
        {showFiltersPanel && (
          <aside className="lg:col-span-4 xl:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-400" />
                Screener Parameters
              </h3>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Acquisition Track
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'rent', label: 'Rent' },
                  { id: 'buy', label: 'Buy' },
                  { id: 'zvg', label: 'ZVG Auction' },
                  { id: 'erbpacht', label: 'Erbpacht' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      setFilters((f) => ({ ...f, mode: m.id as ScreenerFilters['mode'] }))
                    }
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      filters.mode === m.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Monthly Per Person */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Max Cost / Person / Mo</span>
                <span className="font-semibold text-sky-400">
                  €{filters.maxMonthlyPerPerson}
                </span>
              </div>
              <input
                type="range"
                min={350}
                max={1000}
                step={25}
                value={filters.maxMonthlyPerPerson}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxMonthlyPerPerson: Number(e.target.value) }))
                }
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Max Single Commute + Flag Toggle */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  Max Commute (Any Roommate)
                </span>
                <span className="font-semibold text-amber-300">
                  {filters.maxSingleCommuteMins} min
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                step={5}
                value={filters.maxSingleCommuteMins}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxSingleCommuteMins: Number(e.target.value) }))
                }
                className="w-full accent-amber-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={filters.hideCommuteFlagged}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, hideCommuteFlagged: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-800 text-indigo-600"
                />
                <span>Hide properties with Commute Flag</span>
              </label>
            </div>

            {/* Rooms, AI Bedrooms, Baths, SqM */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Min Listed Rooms</label>
                <select
                  value={filters.minTotalRooms}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minTotalRooms: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value={4}>4.0+ Rooms</option>
                  <option value={4.5}>4.5+ Rooms</option>
                  <option value={5.5}>5.5+ Rooms</option>
                  <option value={6}>6.0+ Rooms</option>
                  <option value={7}>7.0+ Rooms</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  AI Viable Bedrooms
                </label>
                <select
                  value={filters.minAiBedrooms}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minAiBedrooms: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value={5}>5+ Bedrooms</option>
                  <option value={6}>6+ Bedrooms (Exact Fit)</option>
                  <option value={7}>7+ Bedrooms</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Min Baths / WCs</label>
                <select
                  value={filters.minBathrooms}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minBathrooms: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value={1}>1.0+</option>
                  <option value={1.5}>1.5+</option>
                  <option value={2}>2.0+</option>
                  <option value={2.5}>2.5+</option>
                  <option value={3}>3.0+</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Min Space (m²)</label>
                <select
                  value={filters.minSqm}
                  onChange={(e) => setFilters((f) => ({ ...f, minSqm: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value={120}>120+ m²</option>
                  <option value={140}>140+ m²</option>
                  <option value={170}>170+ m²</option>
                  <option value={190}>190+ m²</option>
                  <option value={210}>210+ m²</option>
                </select>
              </div>
            </div>

            {/* Boolean Feature Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.requireGarden}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, requireGarden: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Garden / Yard required</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.requireWgFriendly}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, requireWgFriendly: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Exclude explicit "Keine WG"</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeErbpacht}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, excludeErbpacht: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Exclude Erbpacht (leasehold)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeWbs}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, excludeWbs: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-800"
                />
                <span>Exclude WBS-restricted flats</span>
              </label>
            </div>

            {/* Veedel Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Cologne Veedel / Belt ({filters.selectedVeedels.length || 'All'})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allVeedels.map((v) => {
                  const active = filters.selectedVeedels.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => toggleVeedel(v)}
                      className={`px-2 py-1 rounded text-[11px] transition ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Portal & Sort */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Source Portal</label>
                <select
                  value={filters.selectedPortal}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, selectedPortal: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="all">All Portals ({allPortals.length})</option>
                  {allPortals.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sort Results By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sortBy: e.target.value as ScreenerFilters['sortBy']
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="aiScore">AI Match Score (High → Low)</option>
                  <option value="costAsc">Lowest €/Person/Mo</option>
                  <option value="sqmDesc">Largest Living Space (m²)</option>
                  <option value="commuteAsc">Fastest Max Commute</option>
                  <option value="newest">Most Recently Published</option>
                </select>
              </div>
            </div>
          </aside>
        )}

        {/* Listings Feed */}
        <div
          className={`${
            showFiltersPanel ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'
          } space-y-4`}
        >
          {filteredListings.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Home className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-base font-medium text-white">No listings match current filters</h4>
              <p className="text-sm text-slate-400">
                Try increasing Max €/Person/Mo, lowering Min AI Bedrooms to 5, or resetting filters.
              </p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
              </button>
            </div>
          ) : (
            filteredListings.map(({ item, commuteInfo }) => {
              const mapsUrl = buildGoogleMapsUrl(item);
              const modeInfo = MODE_LABELS[item.mode];
              const statusInfo = STATUS_LABELS[item.status];
              const upVotes = Object.values(item.votes).filter((v) => v === 'up').length;

              return (
                <article
                  key={item.id}
                  className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 transition ${
                    item.pinned
                      ? 'border-amber-500/60 shadow-lg shadow-amber-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Badges + Pin + Status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-[260px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${modeInfo.color}`}
                        >
                          {modeInfo.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                          {item.propertyType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-indigo-300">
                          {item.portal}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          AI Fit: {item.aiScore}/100
                        </span>
                        {commuteInfo.hasFlag ? (
                          <span
                            title="One or more roommates exceed commute threshold"
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1"
                          >
                            <Flag className="w-3 h-3" />
                            Commute Flag ({commuteInfo.maxKvbMins}m)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            All ≤ {commuteInfo.maxKvbMins}m
                          </span>
                        )}
                        {!item.wgFriendly && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-900/40 text-rose-300 border border-rose-700">
                            "Keine WG" Alert
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-white leading-snug">
                        {item.title}
                      </h3>

                      {/* Location + Direct Approximate Google Maps Link */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-medium text-slate-200">{item.veedel}</span>
                        <span>•</span>
                        <span>{item.approxAddress}</span>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-medium transition"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            Google Maps ({item.isExactAddress ? 'Exact' : 'Approx. Area'})
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Pin + Status Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onTogglePin(item.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          item.pinned
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{item.pinned ? 'Pinned' : 'Pin'}</span>
                      </button>

                      <select
                        value={item.status}
                        onChange={(e) =>
                          onUpdateStatus(item.id, e.target.value as PropertyStatus)
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${statusInfo.color}`}
                      >
                        <option value="new">Status: New</option>
                        <option value="pinned">Status: Pinned</option>
                        <option value="contacted">Status: Contacted ✅</option>
                        <option value="viewing">Status: Viewing 📅</option>
                        <option value="archived">Status: Archived</option>
                      </select>

                      <a
                        href={item.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
                      >
                        <span>Original Ad</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Specs & Pricing Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 my-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div>
                      <div className="text-[11px] text-slate-400">
                        {item.mode === 'rent' ? 'Kaltmiete + NK' : 'Purchase Price'}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {formatEUR(item.basePriceOrColdRent)}
                        {item.mode === 'rent' && (
                          <span className="text-xs font-normal text-slate-400">
                            {' '}
                            (+{item.monthlyUtilitiesOrHausgeld})
                          </span>
                        )}
                      </div>
                      {item.erbpachtMonthly && (
                        <div className="text-[10px] text-purple-300">
                          +{item.erbpachtMonthly}€/mo Erbpacht
                        </div>
                      )}
                      {item.mode !== 'rent' && (
                        <div className="text-[10px] text-slate-400">
                          Makler: {item.brokerFeePct}%
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Est. €/Person/Mo</div>
                      <div className="text-sm font-bold text-sky-400">
                        {formatEUR(item.effectiveMonthlyPerPerson)}/mo
                      </div>
                      <div className="text-[10px] text-slate-500">Split 6 ways</div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Space & Plot</div>
                      <div className="text-sm font-semibold text-white">
                        {item.livingSpaceSqm} m²
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.plotSqm ? `${item.plotSqm} m² plot` : 'Apartment'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <BedDouble className="w-3 h-3 text-indigo-400" /> Bedrooms
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {item.aiViableBedrooms} viable{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({item.listedRooms} Zi)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">Energy: {item.energyClass}</div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Bath className="w-3 h-3 text-sky-400" /> Baths / Features
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {item.bathroomsAndWcs} Baths
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        {item.hasGarden && (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <Trees className="w-3 h-3" /> Garden
                          </span>
                        )}
                        {item.hasFittedKitchen && <span>• EBK</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Move-In Target
                      </div>
                      <div className="text-xs font-semibold text-slate-200 mt-0.5">
                        {item.availableFrom}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.kvbLines.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Per-Roommate Commute Matrix */}
                  <div className="mb-3.5">
                    <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>6-Roommate KVB Transit & Bike Matrix (click any pill for Maps directions)</span>
                      <span className="text-slate-500">Avg KVB: {commuteInfo.avgKvbMins} min</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                      {roommates.map((rm) => {
                        const c = item.commutes[rm.id] ?? { kvbMins: 30, bikeMins: 25 };
                        const over = c.kvbMins > rm.maxCommuteMins;
                        return (
                          <a
                            key={rm.id}
                            href={buildGoogleMapsDirectionsUrl(item, rm.destinationName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${rm.name} -> ${rm.destinationName} (Limit: ${rm.maxCommuteMins}m)`}
                            className={`px-2 py-1.5 rounded-lg border text-xs transition hover:opacity-90 ${
                              over
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                                : 'bg-slate-800/70 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            <div className="font-medium truncate flex items-center justify-between">
                              <span>{rm.name.split(' ')[0]}</span>
                              {over && <Flag className="w-3 h-3 text-rose-400 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              🚋 {c.kvbMins}m • 🚲 {c.bikeMins}m
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Analysis & Floorplan Insight */}
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/25 space-y-1.5 mb-3.5">
                    <div className="flex items-start gap-2 text-xs text-slate-200">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-indigo-300">AI Screener Note: </span>
                        {item.aiSummary}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 pl-6">
                      <span className="font-semibold text-sky-300">Layout / Bedrooms: </span>
                      {item.aiFloorplanInsight}
                    </div>
                    {item.aiRedFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-6 pt-1">
                        {item.aiRedFlags.map((flag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px]"
                          >
                            <AlertTriangle className="w-3 h-3" /> {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact, Votes, Notes & Action Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    {/* Contact Details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="font-medium text-white">
                        {item.contactName}{' '}
                        <span className="text-slate-400 font-normal">({item.contactRole})</span>
                      </span>
                      {item.contactPhone && (
                        <a
                          href={`tel:${item.contactPhone}`}
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {item.contactPhone}
                        </a>
                      )}
                      {item.contactEmail && (
                        <a
                          href={`mailto:${item.contactEmail}`}
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                        >
                          <Mail className="w-3 h-3" /> {item.contactEmail}
                        </a>
                      )}
                    </div>

                    {/* Voting + Quick Tools */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-2 py-1 border border-slate-700">
                        <span className="text-[11px] text-slate-400 mr-1">
                          Vote ({upVotes}/6 👍):
                        </span>
                        {(['up', 'maybe', 'down'] as RoommateVote[]).map((voteType) => {
                          const selected = item.votes[activeRoommateId] === voteType;
                          return (
                            <button
                              key={voteType}
                              onClick={() => onToggleVote(item.id, activeRoommateId, voteType)}
                              className={`px-1.5 py-0.5 rounded text-xs transition ${
                                selected
                                  ? voteType === 'up'
                                    ? 'bg-emerald-600 text-white'
                                    : voteType === 'maybe'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-rose-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {voteType === 'up' ? (
                                <ThumbsUp className="w-3.5 h-3.5" />
                              ) : voteType === 'down' ? (
                                <ThumbsDown className="w-3.5 h-3.5" />
                              ) : (
                                '🤔'
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => {
                          setTodoModalProperty(item);
                          setTodoDraftTitle(`Follow up on ${item.veedel}: ${item.title.slice(0, 42)}...`);
                          setTodoDraftAssignee(activeRoommateId);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Todo</span>
                      </button>

                      {item.mode !== 'rent' && (
                        <button
                          onClick={() => onOpenInLoanCalculator(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-xs text-emerald-300 border border-emerald-500/30"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Model Loan</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenInOutreach(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Pitch</span>
                      </button>
                    </div>
                  </div>

                  {/* Shared Notes Line */}
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                      placeholder="Shared roommate notes (e.g., called landlord, asked for floorplan)..."
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Add Todo Modal for a Property */}
      {todoModalProperty && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Add Task for {todoModalProperty.veedel} Property
              </h4>
              <button
                onClick={() => setTodoModalProperty(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-400">{todoModalProperty.title}</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Task Description</label>
                <input
                  type="text"
                  value={todoDraftTitle}
                  onChange={(e) => setTodoDraftTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Assign To</label>
                <select
                  value={todoDraftAssignee}
                  onChange={(e) => setTodoDraftAssignee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="All">All 6 Roommates</option>
                  {roommates.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTodoModalProperty(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (todoDraftTitle.trim()) {
                    onAddTodoForProperty(
                      todoDraftTitle.trim(),
                      todoModalProperty.id,
                      'property',
                      todoDraftAssignee
                    );
                    setTodoModalProperty(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-xs text-white font-medium hover:bg-indigo-500"
              >
                Save to Shared Todo List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Custom Listing Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManualListing}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Add / Import Property Listing</h4>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Listing Title *</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., 6-Zi Reihenhaus in Nippes mit Garten"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mode</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as ListingMode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="rent">Rent</option>
                  <option value="buy">Buy</option>
                  <option value="zvg">ZVG Auction</option>
                  <option value="erbpacht">Erbpacht</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Veedel</label>
                <input
                  type="text"
                  value={newVeedel}
                  onChange={(e) => setNewVeedel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Approx. Street / Area (for Google Maps link)
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., Neusser Straße / Florastraße, 50733 Köln"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Portal</label>
                <input
                  type="text"
                  value={newPortal}
                  onChange={(e) => setNewPortal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Listing URL</label>
                <input
                  type="url"
                  value={newPortalUrl}
                  onChange={(e) => setNewPortalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {newMode === 'rent' ? 'Kaltmiete (€/mo)' : 'Purchase Price (€)'}
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Space (m²)</label>
                  <input
                    type="number"
                    value={newSqm}
                    onChange={(e) => setNewSqm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rooms</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRooms}
                    onChange={(e) => setNewRooms(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-xs text-white font-medium hover:bg-indigo-500"
              >
                Add & Pin to Screener
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
