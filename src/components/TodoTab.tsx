import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  MapPin,
  Pin,
  Plus,
  Trash2,
  UserCheck
} from 'lucide-react';
import {
  PropertyListing,
  RoommateProfile,
  TodoCategory,
  TodoItem,
  TodoStatus
} from '../types/housing';

interface TodoTabProps {
  todos: TodoItem[];
  listings: PropertyListing[];
  roommates: RoommateProfile[];
  activeRoommateId: string;
  onAddTodo: (todo: TodoItem) => void;
  onUpdateTodoStatus: (id: string, status: TodoStatus) => void;
  onDeleteTodo: (id: string) => void;
}

const CATEGORY_BADGES: Record<TodoCategory, { label: string; color: string }> = {
  property: { label: 'Property Action', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  application: { label: 'Bewerbungsmappe', color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  financing: { label: 'Loans & Financing', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  syndikat: { label: 'Syndikat / Legal', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  'roadmap-expansion': {
    label: 'Tool Expansion Roadmap',
    color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
  }
};

export const TodoTab: React.FC<TodoTabProps> = ({
  todos,
  listings,
  roommates,
  activeRoommateId,
  onAddTodo,
  onUpdateTodoStatus,
  onDeleteTodo
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | TodoCategory>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | TodoStatus>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // New Task Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TodoCategory>('property');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [assignedTo, setAssignedTo] = useState<string>(activeRoommateId);
  const [linkedPropertyId, setLinkedPropertyId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('2026-12-01');
  const [notes, setNotes] = useState<string>('');

  const activeRoommateName =
    roommates.find((r) => r.id === activeRoommateId)?.name ?? 'Roommate';

  const pinnedOrContactedProperties = useMemo(
    () =>
      listings.filter(
        (l) => l.pinned || l.status === 'contacted' || l.status === 'viewing'
      ),
    [listings]
  );

  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
      return true;
    });
  }, [todos, filterCategory, filterStatus, filterAssignee]);

  const counts = useMemo(() => {
    return {
      open: todos.filter((t) => t.status !== 'done').length,
      done: todos.filter((t) => t.status === 'done').length,
      expansion: todos.filter((t) => t.category === 'roadmap-expansion').length
    };
  }, [todos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: title.trim(),
      category,
      status: 'todo',
      priority,
      assignedTo,
      linkedPropertyId: linkedPropertyId || undefined,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      createdBy: activeRoommateName,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    onAddTodo(newTodo);
    setTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Summary + Pinned / Contacted Property Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-400" />
              Active Shortlist (Pinned & Contacted Properties)
            </h2>
            <span className="text-xs text-slate-400">
              {pinnedOrContactedProperties.length} properties tracked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pinnedOrContactedProperties.map((prop) => {
              const linkedCount = todos.filter(
                (t) => t.linkedPropertyId === prop.id && t.status !== 'done'
              ).length;
              return (
                <div
                  key={prop.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-amber-300">{prop.veedel}</span>
                      <span className="text-slate-500">•</span>
                      <span className="uppercase text-[10px] text-slate-400">{prop.status}</span>
                    </div>
                    <div className="text-xs font-medium text-white truncate mt-0.5">
                      {prop.title}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setLinkedPropertyId(prop.id);
                      setCategory('property');
                    }}
                    className="shrink-0 px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-[11px] text-slate-200 transition"
                    title="Select this property in the New Task form"
                  >
                    {linkedCount} open
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs text-slate-400">Group Progress</div>
            <div className="text-2xl font-bold text-white mt-1">
              {counts.open} Open{' '}
              <span className="text-sm font-normal text-emerald-400">({counts.done} Done)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/30 text-xs text-fuchsia-200">
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5" /> Future Expansion Backlog ({counts.expansion})
            </div>
            Includes live mortgage-rate scraping (Interhyp/Dr. Klein/KfW), Direktkredit pledge tracking, and portal session upgrades.
          </div>
        </div>
      </div>

      {/* Add Task Form (Anyone can add!) */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Shared Task or Property Follow-Up (Posting as {activeRoommateName})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call KSK-Immobilien about Klettenberg floorplan..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TodoCategory)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
            >
              <option value="property">Property Task</option>
              <option value="application">Bewerbungsmappe</option>
              <option value="financing">Financing / Credit</option>
              <option value="syndikat">Syndikat / Legal</option>
              <option value="roadmap-expansion">Tool Expansion</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
            >
              <option value="All">All 6 Roommates</option>
              {roommates.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={linkedPropertyId}
              onChange={(e) => setLinkedPropertyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
            >
              <option value="">No Linked Property (General)</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  [{l.veedel}] {l.title.slice(0, 38)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes, contact context, or checklist details..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
            />
          </div>
          <div className="md:col-span-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="high">Priority: High</option>
              <option value="medium">Priority: Medium</option>
              <option value="low">Priority: Low</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg px-4 py-2 transition"
            >
              + Add Task
            </button>
          </div>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'property', label: '🏠 Property Tasks' },
            { id: 'application', label: '📄 Application Dossier' },
            { id: 'financing', label: '💶 Financing' },
            { id: 'syndikat', label: '🤝 Syndikat' },
            { id: 'roadmap-expansion', label: '🚀 Tool Expansion Roadmap' }
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id as 'all' | TodoCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterCategory === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | TodoStatus)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All Assignees</option>
            {roommates.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Todo Cards */}
      <div className="space-y-2.5">
        {filteredTodos.map((todo) => {
          const catBadge = CATEGORY_BADGES[todo.category];
          const linkedProp = todo.linkedPropertyId
            ? listings.find((l) => l.id === todo.linkedPropertyId)
            : undefined;
          const assignee =
            todo.assignedTo === 'All'
              ? 'All 6 Roommates'
              : roommates.find((r) => r.id === todo.assignedTo)?.name ?? todo.assignedTo;

          return (
            <div
              key={todo.id}
              className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                todo.status === 'done'
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() =>
                    onUpdateTodoStatus(
                      todo.id,
                      todo.status === 'done' ? 'todo' : 'done'
                    )
                  }
                  className="mt-0.5 text-slate-400 hover:text-emerald-400 transition shrink-0"
                  title="Toggle complete"
                >
                  {todo.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : todo.status === 'in-progress' ? (
                    <Clock className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge.color}`}
                    >
                      {catBadge.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                        todo.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300'
                          : todo.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {todo.priority}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> {assignee}
                    </span>
                    {todo.dueDate && (
                      <span className="text-[11px] text-slate-500">Due: {todo.dueDate}</span>
                    )}
                  </div>

                  <div
                    className={`text-sm font-medium ${
                      todo.status === 'done' ? 'line-through text-slate-400' : 'text-white'
                    }`}
                  >
                    {todo.title}
                  </div>

                  {todo.notes && <p className="text-xs text-slate-400">{todo.notes}</p>}

                  {linkedProp && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-sky-300">
                      <MapPin className="w-3 h-3" />
                      <span>
                        Linked Property: <strong>{linkedProp.veedel}</strong> —{' '}
                        {linkedProp.title.slice(0, 55)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <select
                  value={todo.status}
                  onChange={(e) => onUpdateTodoStatus(todo.id, e.target.value as TodoStatus)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done ✅</option>
                </select>
                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
