import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calculator,
  CheckSquare,
  Handshake,
  Home,
  Sparkles,
  Users
} from 'lucide-react';
import {
  INITIAL_ALERT_CONFIG,
  INITIAL_LISTINGS,
  INITIAL_ROOMMATES,
  INITIAL_TODOS,
  LOAN_PROVIDERS,
  PORTAL_SOURCES,
  SYNDIKAT_RESOURCES
} from './data/cologneData';
import {
  AlertConfig,
  PortalSource,
  PropertyListing,
  PropertyStatus,
  RoommateVote,
  TodoCategory,
  TodoItem,
  TodoStatus
} from './types/housing';
import { ScreenerTab } from './components/ScreenerTab';
import { TodoTab } from './components/TodoTab';
import { LoanCalculatorTab } from './components/LoanCalculatorTab';
import { SyndikatTab } from './components/SyndikatTab';
import { OutreachTab } from './components/OutreachTab';
import { PortalsAlertsTab } from './components/PortalsAlertsTab';

type TabId = 'screener' | 'todos' | 'loans' | 'syndikat' | 'outreach' | 'portals';

const STORAGE_KEY = 'koelnhaus-2027-state-v2';

interface PersistedState {
  listings: PropertyListing[];
  todos: TodoItem[];
  portals: PortalSource[];
  alertConfig: AlertConfig;
  activeRoommateId: string;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        listings: parsed.listings?.length ? parsed.listings : INITIAL_LISTINGS,
        todos: parsed.todos?.length ? parsed.todos : INITIAL_TODOS,
        portals: parsed.portals?.length ? parsed.portals : PORTAL_SOURCES,
        alertConfig: parsed.alertConfig ?? INITIAL_ALERT_CONFIG,
        activeRoommateId: parsed.activeRoommateId ?? INITIAL_ROOMMATES[0].id
      };
    }
  } catch {
    // Fallback to initial defaults
  }
  return {
    listings: INITIAL_LISTINGS,
    todos: INITIAL_TODOS,
    portals: PORTAL_SOURCES,
    alertConfig: INITIAL_ALERT_CONFIG,
    activeRoommateId: INITIAL_ROOMMATES[0].id
  };
}

export function App() {
  const initial = loadInitialState();
  const [activeTab, setActiveTab] = useState<TabId>('screener');
  const [listings, setListings] = useState<PropertyListing[]>(initial.listings);
  const [todos, setTodos] = useState<TodoItem[]>(initial.todos);
  const [portals, setPortals] = useState<PortalSource[]>(initial.portals);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(initial.alertConfig);
  const [activeRoommateId, setActiveRoommateId] = useState<string>(initial.activeRoommateId);
  const [selectedPropertyForTool, setSelectedPropertyForTool] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Local + GitHub Feed Ready');

  // Persist shared workspace locally
  useEffect(() => {
    try {
      const payload: PersistedState = {
        listings,
        todos,
        portals,
        alertConfig,
        activeRoommateId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [listings, todos, portals, alertConfig, activeRoommateId]);

  // Merge fresh scraped properties from public/data/listings.json while keeping user pins/status/notes/votes
  useEffect(() => {
    let cancelled = false;
    fetch('./data/listings.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((feed: { updatedAt?: string; listings?: PropertyListing[] } | null) => {
        if (cancelled || !feed?.listings?.length) return;
        setListings((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          const mergedFeed = feed.listings!.map((liveItem) => {
            const existing = prevMap.get(liveItem.id);
            if (!existing) return liveItem;
            return {
              ...liveItem,
              pinned: existing.pinned,
              status: existing.status,
              notes: existing.notes,
              votes: Object.keys(existing.votes || {}).length ? existing.votes : liveItem.votes
            };
          });
          const liveIds = new Set(mergedFeed.map((i) => i.id));
          const customLocal = prev.filter((p) => p.id.startsWith('custom-') && !liveIds.has(p.id));
          return [...customLocal, ...mergedFeed];
        });
        if (feed.updatedAt) {
          setLastSyncedAt(`Live Feed Synced ${feed.updatedAt.slice(0, 16).replace('T', ' ')} UTC`);
        }
      })
      .catch(() => {
        // Offline or local dev without static feed falls back to bundled scrapedSeed.json
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoommate =
    INITIAL_ROOMMATES.find((r) => r.id === activeRoommateId) ?? INITIAL_ROOMMATES[0];

  const handleTogglePin = (id: string) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextPinned = !item.pinned;
        const nextStatus: PropertyStatus =
          nextPinned && item.status === 'new'
            ? 'pinned'
            : !nextPinned && item.status === 'pinned'
              ? 'new'
              : item.status;
        return { ...item, pinned: nextPinned, status: nextStatus };
      })
    );
  };

  const handleUpdateStatus = (id: string, status: PropertyStatus) => {
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, pinned: status === 'pinned' ? true : item.pinned }
          : item
      )
    );
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const handleToggleVote = (propertyId: string, roommateId: string, vote: RoommateVote) => {
    setListings((prev) =>
      prev.map((item) =>
        item.id === propertyId
          ? { ...item, votes: { ...item.votes, [roommateId]: vote } }
          : item
      )
    );
  };

  const handleAddListing = (listing: PropertyListing) => {
    setListings((prev) => [listing, ...prev]);
  };

  const handleAddTodo = (todo: TodoItem) => {
    setTodos((prev) => [todo, ...prev]);
  };

  const handleAddTodoForProperty = (
    title: string,
    propertyId: string,
    category: TodoCategory,
    assignedTo: string
  ) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title,
      category,
      status: 'todo',
      priority: 'high',
      assignedTo,
      linkedPropertyId: propertyId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdBy: activeRoommate.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setTodos((prev) => [newTodo, ...prev]);
    setActiveTab('todos');
  };

  const handleUpdateTodoStatus = (id: string, status: TodoStatus) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportWorkspaceState = () => {
    const blob = new Blob(
      [JSON.stringify({ listings, todos, portals, alertConfig }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koelnhaus-2027-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkspaceState = (jsonText: string) => {
    const parsed = JSON.parse(jsonText) as Partial<PersistedState>;
    if (parsed.listings) setListings(parsed.listings);
    if (parsed.todos) setTodos(parsed.todos);
    if (parsed.portals) setPortals(parsed.portals);
    if (parsed.alertConfig) setAlertConfig(parsed.alertConfig);
  };

  const openTodoCount = todos.filter((t) => t.status !== 'done').length;
  const pinnedCount = listings.filter((l) => l.pinned).length;

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: string | number }> = [
    {
      id: 'screener',
      label: 'Cologne Screener',
      icon: <Home className="w-4 h-4" />,
      badge: `${listings.length} (${pinnedCount}📌)`
    },
    {
      id: 'todos',
      label: 'Shared Todos & Roadmap',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: openTodoCount
    },
    {
      id: 'loans',
      label: 'Loan & Split Calculator',
      icon: <Calculator className="w-4 h-4" />
    },
    {
      id: 'syndikat',
      label: 'Syndikat & Models',
      icon: <Handshake className="w-4 h-4" />
    },
    {
      id: 'outreach',
      label: 'AI Pitch & Dossier',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: 'portals',
      label: 'Portals, Signal & Hosting',
      icon: <Bell className="w-4 h-4" />,
      badge: portals.filter((p) => p.enabledInScraper).length
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/90 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm">
                  K27
                </span>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  KölnHaus 2027{' '}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ml-1">
                    6er-WG Hub • 5 Working + 1 Student
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: Move-in Summer 2027 • Cologne Rent / Buy / ZVG / Syndikat • {lastSyncedAt}
              </p>
            </div>
          </div>

          {/* Roommate Profile Switcher (No login required!) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-slate-400">Active User:</span>
              <select
                value={activeRoommateId}
                onChange={(e) => setActiveRoommateId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {INITIAL_ROOMMATES.map((rm) => (
                  <option key={rm.id} value={rm.id} className="bg-slate-900 text-white">
                    {rm.name} ({rm.role})
                  </option>
                ))}
              </select>
            </div>

            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${activeRoommate.badgeColor}`}
            >
              Commute target: {activeRoommate.destinationName} (≤{activeRoommate.maxCommuteMins}m)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <nav className="flex items-center gap-1 pb-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'screener' && (
          <ScreenerTab
            listings={listings}
            roommates={INITIAL_ROOMMATES}
            activeRoommateId={activeRoommateId}
            onTogglePin={handleTogglePin}
            onUpdateStatus={handleUpdateStatus}
            onUpdateNotes={handleUpdateNotes}
            onToggleVote={handleToggleVote}
            onAddListing={handleAddListing}
            onAddTodoForProperty={handleAddTodoForProperty}
            onOpenInLoanCalculator={(id) => {
              setSelectedPropertyForTool(id);
              setActiveTab('loans');
            }}
            onOpenInOutreach={(id) => {
              setSelectedPropertyForTool(id);
              setActiveTab('outreach');
            }}
          />
        )}

        {activeTab === 'todos' && (
          <TodoTab
            todos={todos}
            listings={listings}
            roommates={INITIAL_ROOMMATES}
            activeRoommateId={activeRoommateId}
            onAddTodo={handleAddTodo}
            onUpdateTodoStatus={handleUpdateTodoStatus}
            onDeleteTodo={handleDeleteTodo}
          />
        )}

        {activeTab === 'loans' && (
          <LoanCalculatorTab
            listings={listings}
            roommates={INITIAL_ROOMMATES}
            loanProviders={LOAN_PROVIDERS}
            selectedPropertyId={selectedPropertyForTool}
            onSelectPropertyId={setSelectedPropertyForTool}
          />
        )}

        {activeTab === 'syndikat' && <SyndikatTab resources={SYNDIKAT_RESOURCES} />}

        {activeTab === 'outreach' && (
          <OutreachTab
            listings={listings}
            roommates={INITIAL_ROOMMATES}
            selectedPropertyId={selectedPropertyForTool}
            onSelectPropertyId={setSelectedPropertyForTool}
          />
        )}

        {activeTab === 'portals' && (
          <PortalsAlertsTab
            portals={portals}
            alertConfig={alertConfig}
            onUpdateAlertConfig={(patch) =>
              setAlertConfig((prev) => ({ ...prev, ...patch }))
            }
            onTogglePortalScraper={(id) =>
              setPortals((prev) =>
                prev.map((p) =>
                  p.id === id ? { ...p, enabledInScraper: !p.enabledInScraper } : p
                )
              )
            }
            onExportWorkspaceState={handleExportWorkspaceState}
            onImportWorkspaceState={handleImportWorkspaceState}
          />
        )}
      </main>
    </div>
  );
}

export default App;
