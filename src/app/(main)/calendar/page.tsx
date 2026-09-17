"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Move, Pin, Plus, Repeat2, Trash2, X } from "lucide-react";
import { addScheduleItem, copyScheduleItem, deleteScheduleItem, deleteTrainingBlock, downloadICS, getScheduleForRange, getTrainingBlocks, moveScheduleItem, repeatScheduleItem, saveTrainingBlock, updateScheduleItem, type ScheduledItem, type ScheduleItemType, type TrainingBlock } from "@/lib/schedule";
import { getMealTemplates } from "@/lib/nutrition";
import { getSessions, getTemplates, type CompletedSession } from "@/lib/storage";
import { FORGE_CLOUD_DATA_HYDRATED } from "@/lib/local-data-events";

type View = "day" | "week" | "month";
const DAY_MS = 86_400_000;
const isoDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
function shiftDate(date: string, days: number) { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + days); return isoDate(next); }
function weekStart(date: string) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - (value.getDay() || 7) + 1); return isoDate(value); }
function monthBounds(date: string) { const value = new Date(`${date}T12:00:00`); const first = new Date(value.getFullYear(), value.getMonth(), 1, 12); const last = new Date(value.getFullYear(), value.getMonth() + 1, 0, 12); return { start: weekStart(isoDate(first)), end: shiftDate(weekStart(isoDate(last)), 6) }; }

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => isoDate(new Date()));
  const [view, setView] = useState<View>("week");
  const [items, setItems] = useState<ScheduledItem[]>(() => getScheduleForRange("0000-01-01", "9999-12-31"));
  const [sessions, setSessions] = useState<CompletedSession[]>(() => getSessions());
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TrainingBlock[]>(() => getTrainingBlocks());
  const [showBlock, setShowBlock] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const range = useMemo(() => view === "day" ? { start: anchor, end: anchor } : view === "week" ? { start: weekStart(anchor), end: shiftDate(weekStart(anchor), 6) } : monthBounds(anchor), [anchor, view]);
  const refresh = useCallback(() => { setItems(getScheduleForRange("0000-01-01", "9999-12-31")); setSessions(getSessions()); }, []);
  useEffect(() => {
    window.addEventListener(FORGE_CLOUD_DATA_HYDRATED, refresh);
    return () => window.removeEventListener(FORGE_CLOUD_DATA_HYDRATED, refresh);
  }, [refresh]);
  const days = useMemo(() => { const count = Math.round((new Date(`${range.end}T12:00:00`).getTime() - new Date(`${range.start}T12:00:00`).getTime()) / DAY_MS) + 1; return Array.from({ length: count }, (_, index) => shiftDate(range.start, index)); }, [range]);
  const navigate = (direction: number) => setAnchor(shiftDate(anchor, direction * (view === "day" ? 1 : view === "week" ? 7 : 30)));
  const handleTouchDrop = (id: string, x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-calendar-date]");
    const date = target?.dataset.calendarDate;
    if (date) moveScheduleItem(id, date);
    setDragItem(null);
    setDragPoint(null);
    setDragTarget(null);
    refresh();
  };
  const handleTouchDrag = (x: number, y: number) => {
    setDragPoint({ x, y });
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-calendar-date]");
    setDragTarget(target?.dataset.calendarDate ?? null);
  };
  const draggedItem = dragItem ? items.find((item) => item.id === dragItem) : null;
  const label = view === "day" ? new Date(`${anchor}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : `${new Date(`${range.start}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${range.end}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const todayIso = isoDate(new Date()); const weekEnd = shiftDate(todayIso, 6); const nextSeven = items.filter((item) => item.date >= todayIso && item.date <= weekEnd && item.status !== "cancelled"); const nextEvent = items.filter((item) => item.date >= todayIso && (item.type === "event" || item.type === "goal") && item.status !== "cancelled").sort((a,b) => a.date.localeCompare(b.date))[0]; const pinnedEvent = items.find((item) => item.pinned && item.date >= todayIso && item.status !== "cancelled");

  return <div className="space-y-4">
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-forge-text">Planning</h1><p className="text-xs text-forge-text-muted">Plan training, compare actual work, and organize events.</p></div><div className="flex gap-2"><button onClick={() => setShowBlock(true)} className="rounded-lg border border-forge-border px-3 py-1.5 text-xs text-forge-text">Training block</button><button onClick={() => setAnchor(isoDate(new Date()))} className="rounded-lg border border-forge-border px-3 py-1.5 text-xs text-forge-text">Today</button></div></div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-forge-border bg-forge-surface p-0.5">{(["day", "week", "month"] as View[]).map((option) => <button key={option} onClick={() => setView(option)} className={`rounded-md px-3 py-1 text-xs capitalize ${view === option ? "bg-forge-accent text-white" : "text-forge-text-muted"}`}>{option}</button>)}</div>
        <div className="flex items-center gap-2"><button aria-label="Previous period" onClick={() => navigate(-1)} className="p-1.5 text-forge-text-muted"><ChevronLeft size={18} /></button><span className="min-w-44 text-center text-xs font-medium text-forge-text-muted">{label}</span><button aria-label="Next period" onClick={() => navigate(1)} className="p-1.5 text-forge-text-muted"><ChevronRight size={18} /></button></div>
      </div>
    </header>
    <div className="flex gap-4 text-[10px] text-forge-text-muted"><span><strong className="text-forge-accent">Planned</strong> is what you scheduled.</span><span><strong className="text-emerald-400">Actual</strong> is a workout completed in Forge.</span></div>
    <section className="rounded-xl border border-forge-border bg-forge-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-forge-accent">{pinnedEvent && <Pin size={11} />} {pinnedEvent ? "Pinned goal event" : "Next 7 days"}</p><h2 className="text-lg font-bold text-forge-text">{pinnedEvent?.title ?? nextEvent?.title ?? "Your training week"}</h2><p className="text-xs text-forge-text-muted">{pinnedEvent ? `${daysUntil(pinnedEvent.date)} days until ${new Date(`${pinnedEvent.date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : nextEvent ? `${daysUntil(nextEvent.date)} days away` : `${nextSeven.length} planned items`}</p></div><div className="grid grid-cols-3 gap-4 text-center"><div><strong className="block text-lg text-forge-text">{nextSeven.filter((item) => item.type === "workout").length}</strong><span className="text-[10px] text-forge-text-muted">Workouts</span></div><div><strong className="block text-lg text-forge-text">{Math.round(nextSeven.filter((item) => item.type === "workout").reduce((sum,item) => sum + (item.time && item.end_time ? Math.max(0, Number(item.end_time.slice(0,2))*60+Number(item.end_time.slice(3))-Number(item.time.slice(0,2))*60-Number(item.time.slice(3))) : 60),0)/60)}h</strong><span className="text-[10px] text-forge-text-muted">Planned</span></div><div><strong className="block text-lg text-forge-text">{nextSeven.filter((item) => item.status === "completed").length}</strong><span className="text-[10px] text-forge-text-muted">Complete</span></div></div></div></section>
    {moveItem && <div role="status" className="flex items-center justify-between rounded-lg border border-forge-accent/40 bg-forge-accent-muted px-3 py-2 text-xs text-forge-text"><span>Choose the destination day below.</span><button onClick={() => setMoveItem(null)} className="text-forge-text-muted">Cancel</button></div>}
    {blocks.filter((block) => block.end_date >= range.start && block.start_date <= range.end).map((block) => <div key={block.id} className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2"><div><div className="text-xs font-semibold text-cyan-300">{block.name}</div><div className="text-[10px] text-forge-text-muted">{block.start_date} – {block.end_date}{block.goal ? ` · ${block.goal}` : ""}</div></div><button aria-label="Delete training block" onClick={() => { deleteTrainingBlock(block.id); setBlocks(getTrainingBlocks()); }} className="text-forge-text-muted hover:text-forge-danger"><Trash2 size={13} /></button></div>)}
    <div className={view === "month" ? "grid grid-cols-7 gap-1 md:gap-2" : view === "week" ? "grid gap-2 md:grid-cols-7" : "space-y-2"}>
      {days.map((date) => { const dayItems = items.filter((item) => item.date === date); const actual = sessions.filter((session) => session.completed_at.slice(0, 10) === date); const today = date === isoDate(new Date()); return <section key={date} data-calendar-date={date} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragItem) moveScheduleItem(dragItem, date); setDragItem(null); refresh(); }} className={`relative min-h-20 rounded-xl border p-2 transition md:min-h-28 ${today ? "border-forge-accent bg-forge-accent-muted" : "border-forge-border bg-forge-surface"} ${dragTarget === date ? "scale-[1.01] ring-2 ring-forge-accent bg-forge-accent-muted" : dragItem ? "ring-1 ring-forge-accent/40" : ""}`}>
        <div className="mb-2 flex items-center justify-between"><div className="text-xs"><span className="font-semibold text-forge-text">{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span> <span className="text-forge-text-muted">{new Date(`${date}T12:00:00`).getDate()}</span></div>{moveItem ? <button onClick={() => { moveScheduleItem(moveItem, date); setMoveItem(null); refresh(); }} className="rounded bg-forge-accent px-2 py-1 text-[9px] font-semibold text-white">Move here</button> : <button aria-label={`Add plan for ${date}`} onClick={() => setShowAdd(date)} className="text-forge-text-muted hover:text-forge-accent"><Plus size={14} /></button>}</div>
        {view === "month" && <button aria-label={`Open ${date} day view`} onClick={() => { setAnchor(date); setView("day"); }} className="absolute inset-x-1 bottom-1 top-9 flex items-end justify-center gap-1 md:hidden">{dayItems.slice(0,3).map((item) => <span key={item.id} className={`h-2 w-2 rounded-full ${item.type === "workout" ? "bg-forge-accent" : item.type === "meal" ? "bg-purple-400" : "bg-amber-400"}`} />)}{actual.length > 0 && <span className="h-2 w-2 rounded-full bg-emerald-400" />}</button>}
        <div className={`space-y-1 ${view === "month" ? "hidden md:block" : ""}`}>{dayItems.map((item) => <PlanCard key={item.id} item={item} isDragging={dragItem === item.id} onChange={refresh} onDrag={setDragItem} onTouchDrag={handleTouchDrag} onTouchDrop={handleTouchDrop} onMove={setMoveItem} onEdit={setEditingItem} />)}{actual.map((session) => <div key={session.id} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5"><div className="text-[9px] font-semibold uppercase tracking-wide text-emerald-400">Actual</div><div className="truncate text-xs text-forge-text">{session.template_name}</div></div>)}{dayItems.length === 0 && actual.length === 0 && <p className="py-2 text-[10px] text-forge-text-muted">No plans</p>}</div>
      </section>; })}
    </div>
    {draggedItem && dragPoint && <div aria-hidden="true" className="pointer-events-none fixed z-[70] w-44 -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-lg border-2 border-forge-accent bg-forge-surface px-3 py-2 shadow-2xl" style={{ left: dragPoint.x, top: dragPoint.y }}><div className="text-[9px] font-semibold uppercase tracking-wide text-forge-accent">Moving {draggedItem.type}</div><div className="truncate text-sm font-semibold text-forge-text">{draggedItem.title}</div><div className="text-[10px] text-forge-text-muted">Release to move here</div></div>}
    {showAdd && <AddItemModal date={showAdd} onClose={() => setShowAdd(null)} onAdd={(item) => { addScheduleItem(item); setShowAdd(null); refresh(); }} />}
    {editingItem && <AddItemModal date={editingItem.date} initial={editingItem} onClose={() => setEditingItem(null)} onAdd={(item) => { updateScheduleItem(editingItem.id, item); setEditingItem(null); refresh(); }} />}
    {showBlock && <TrainingBlockModal anchor={anchor} onClose={() => setShowBlock(false)} onSave={(block) => { saveTrainingBlock(block); setBlocks(getTrainingBlocks()); setShowBlock(false); }} />}
  </div>;
}

function TrainingBlockModal({ anchor, onClose, onSave }: { anchor: string; onClose: () => void; onSave: (block: TrainingBlock) => void }) {
  const [name, setName] = useState(""); const [goal, setGoal] = useState(""); const [start, setStart] = useState(anchor); const [end, setEnd] = useState(shiftDate(anchor, 27));
  return <div role="dialog" aria-modal="true" aria-label="Create training block" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center"><div className="w-full max-w-md space-y-3 rounded-2xl border border-forge-border bg-forge-surface p-4"><div className="flex justify-between"><h2 className="font-semibold text-forge-text">Training block</h2><button onClick={onClose}><X size={18} /></button></div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Block name" className="w-full rounded border border-forge-border bg-forge-bg p-2 text-sm text-forge-text" /><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal (optional)" className="w-full rounded border border-forge-border bg-forge-bg p-2 text-sm text-forge-text" /><div className="grid grid-cols-2 gap-2"><label className="text-xs text-forge-text-muted">Start<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded border border-forge-border bg-forge-bg p-2 text-forge-text" /></label><label className="text-xs text-forge-text-muted">End<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded border border-forge-border bg-forge-bg p-2 text-forge-text" /></label></div><button disabled={!name.trim() || end < start} onClick={() => onSave({ id: crypto.randomUUID(), name: name.trim(), goal: goal.trim() || undefined, start_date: start, end_date: end })} className="w-full rounded-lg bg-forge-accent py-2 text-sm text-white disabled:opacity-50">Save block</button></div></div>;
}

function PlanCard({ item, isDragging, onChange, onDrag, onTouchDrag, onTouchDrop, onMove, onEdit }: { item: ScheduledItem; isDragging: boolean; onChange: () => void; onDrag: (id: string | null) => void; onTouchDrag: (x: number, y: number) => void; onTouchDrop: (id: string, x: number, y: number) => void; onMove: (id: string) => void; onEdit: (item: ScheduledItem) => void }) {
  const holdTimer = useRef<number | null>(null);
  const touchDragging = useRef(false);
  const touchPoint = useRef<{ x: number; y: number } | null>(null);
  const startTouchDrag = (event: TouchEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchPoint.current = { x: touch.clientX, y: touch.clientY };
    holdTimer.current = window.setTimeout(() => {
      touchDragging.current = true;
      onDrag(item.id);
      if (touchPoint.current) onTouchDrag(touchPoint.current.x, touchPoint.current.y);
      navigator.vibrate?.(20);
    }, 350);
  };
  const moveTouchDrag = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchDragging.current) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    touchPoint.current = { x: touch.clientX, y: touch.clientY };
    onTouchDrag(touch.clientX, touch.clientY);
    if (touch.clientY < 96) window.scrollBy({ top: -18, behavior: "instant" });
    else if (touch.clientY > window.innerHeight - 112) window.scrollBy({ top: 18, behavior: "instant" });
  };
  const endTouchDrag = (event: TouchEvent<HTMLDivElement>) => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    const touch = event.changedTouches[0];
    if (touchDragging.current && touch) onTouchDrop(item.id, touch.clientX, touch.clientY);
    touchDragging.current = false;
    touchPoint.current = null;
  };
  const tone = item.status === "cancelled" ? "opacity-50" : item.type === "workout" ? "border-forge-accent/30 bg-forge-accent/10" : item.type === "meal" ? "border-purple-500/30 bg-purple-500/10" : "border-amber-500/30 bg-amber-500/10";
  return <div draggable onDragStart={() => onDrag(item.id)} onDragEnd={() => onDrag(null)} onTouchStart={startTouchDrag} onTouchMove={moveTouchDrag} onTouchEnd={endTouchDrag} onTouchCancel={endTouchDrag} className={`group touch-none select-none rounded-md border px-2 py-1.5 md:touch-auto ${isDragging ? "scale-[1.02] opacity-80 ring-2 ring-forge-accent" : ""} ${tone}`}>
    <div className="flex items-start justify-between gap-1"><div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-wide text-forge-text-muted">Planned {item.type}{item.planned_load != null ? ` · Load ${item.planned_load}` : ""}</div><div className="flex items-center gap-1 truncate text-xs font-medium text-forge-text">{item.pinned && <Pin size={10} className="shrink-0 text-forge-accent" />}{item.title}</div>{item.time && <div className="text-[10px] text-forge-text-muted">{item.time}{item.end_time ? `–${item.end_time}` : ""}</div>}</div><button aria-label="Delete plan" onClick={() => { deleteScheduleItem(item.id); onChange(); }} className="text-forge-text-muted hover:text-forge-danger"><Trash2 size={11} /></button></div>
    <div className="mt-1 flex gap-3 text-forge-text-muted"><button title="Edit event" onClick={() => onEdit(item)} className="text-[9px]">Edit</button><button title="Move to another day" aria-label="Move to another day" onClick={() => onMove(item.id)}><Move size={12} /></button><button title="Copy to tomorrow" onClick={() => { copyScheduleItem(item.id, shiftDate(item.date, 1)); onChange(); }}><Copy size={11} /></button><button title="Repeat weekly for 4 weeks" onClick={() => { repeatScheduleItem(item.id, 4); onChange(); }}><Repeat2 size={11} /></button><button title="Export calendar event" onClick={() => downloadICS(item)}><Download size={11} /></button></div>
  </div>;
}

function AddItemModal({ date, onClose, onAdd, initial }: { date: string; onClose: () => void; onAdd: (item: ScheduledItem) => void; initial?: ScheduledItem }) {
  const [type, setType] = useState<ScheduleItemType>(initial?.type ?? "workout"); const [title, setTitle] = useState(initial?.title ?? ""); const [time, setTime] = useState(initial?.time ?? "07:00"); const [endTime, setEndTime] = useState(initial?.end_time ?? "08:00"); const [effort, setEffort] = useState(initial?.planned_load ? String(Math.max(1, Math.min(10, Math.round(initial.planned_load / 60)))) : "5"); const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const templates = useMemo(() => getTemplates(), []); const meals = useMemo(() => getMealTemplates(), []);
  const options = type === "workout" ? templates.map((item) => ({ id: item.id, name: item.name })) : type === "meal" ? meals.map((item) => ({ id: item.id, name: item.name })) : [];
  const submit = (name = title, templateId = initial?.template_id) => { if (!name.trim()) return; const [startHour, startMinute] = time.split(":").map(Number); const [endHour, endMinute] = endTime.split(":").map(Number); const duration = Math.max(1, endHour * 60 + endMinute - startHour * 60 - startMinute); const plannedEffort = Math.min(10, Math.max(1, Number(effort) || 1)); onAdd({ ...initial, id: initial?.id ?? crypto.randomUUID(), date, type, title: name.trim(), template_id: templateId, time, end_time: endTime, status: initial?.status ?? "planned", planned_load: type === "workout" ? duration * plannedEffort : undefined, pinned: (type === "event" || type === "goal") && pinned }); };
  return <div role="dialog" aria-modal="true" aria-label="Add calendar item" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 md:items-center"><div className="w-full max-w-md space-y-3 rounded-2xl border border-forge-border bg-forge-surface p-4 shadow-xl">
    <div className="flex items-center justify-between"><div><h2 className="font-semibold text-forge-text">{initial ? "Edit plan" : "Add plan"}</h2><p className="text-xs text-forge-text-muted">{date}</p></div><button onClick={onClose} className="text-forge-text-muted"><X size={18} /></button></div>
    <div className="grid grid-cols-4 gap-1 rounded-lg bg-forge-bg p-1">{(["workout", "meal", "event", "goal"] as ScheduleItemType[]).map((option) => <button key={option} onClick={() => setType(option)} className={`rounded px-2 py-1.5 text-[10px] capitalize ${type === option ? "bg-forge-accent text-white" : "text-forge-text-muted"}`}>{option}</button>)}</div>
    <div className={`grid gap-2 ${type === "workout" ? "grid-cols-3" : "grid-cols-2"}`}><label className="text-[10px] text-forge-text-muted">Start<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded border border-forge-border bg-forge-bg p-2 text-xs text-forge-text" /></label><label className="text-[10px] text-forge-text-muted">End<input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded border border-forge-border bg-forge-bg p-2 text-xs text-forge-text" /></label>{type === "workout" && <label className="text-[10px] text-forge-text-muted">Effort (1–10)<input aria-label="Planned effort from 1 to 10" type="number" min="1" max="10" value={effort} onChange={(e) => setEffort(e.target.value)} className="mt-1 w-full rounded border border-forge-border bg-forge-bg p-2 text-xs text-forge-text" /></label>}</div>
    {(type === "event" || type === "goal") && <label className="flex items-center gap-2 rounded-lg bg-forge-accent-muted p-3 text-xs text-forge-text"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /><Pin size={14} className="text-forge-accent" /><span><strong>Pin as goal event</strong><span className="block text-[10px] text-forge-text-muted">Show this as the race or event you are building toward. Pinning replaces the current one.</span></span></label>}
    {options.length > 0 && <div className="max-h-32 space-y-1 overflow-y-auto">{options.map((option) => <button key={option.id} onClick={() => submit(option.name, option.id)} className="w-full rounded px-2 py-1.5 text-left text-xs text-forge-text hover:bg-forge-accent-muted">{option.name}</button>)}</div>}
    <div className="flex gap-2"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={`Custom ${type} title`} className="min-w-0 flex-1 rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm text-forge-text" /><button onClick={() => submit()} disabled={!title.trim()} className="rounded-lg bg-forge-accent px-4 text-sm text-white disabled:opacity-50">{initial ? "Save" : "Add"}</button></div>
  </div></div>;
}
function daysUntil(value: string): number { return Math.max(0, Math.ceil((new Date(`${value}T12:00:00`).getTime() - new Date(`${isoDate(new Date())}T12:00:00`).getTime()) / DAY_MS)); }
