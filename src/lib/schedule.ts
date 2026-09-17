import { notifyLocalDataChanged } from "@/lib/local-data-events";

/**
 * Workout/Meal schedule stored in localStorage.
 * Supports planned workouts and meals per date with drag-to-reschedule.
 */

export type ScheduleItemType = "workout" | "meal" | "event" | "goal";
export type ScheduleItemStatus = "planned" | "completed" | "cancelled";

export interface ScheduledItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: ScheduleItemType;
  title: string;
  template_id?: string;
  time?: string; // HH:MM start time (optional)
  end_time?: string; // HH:MM end time (optional)
  notes?: string;
  status?: ScheduleItemStatus;
  planned_load?: number;
  actual_session_id?: string;
  training_block_id?: string;
  recurrence_id?: string;
  pinned?: boolean;
}

const SCHEDULE_KEY = "forge_schedule";
const TRAINING_BLOCKS_KEY = "forge_training_blocks";

export interface TrainingBlock {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal?: string;
  color?: string;
}

function getAll(): ScheduledItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(items: ScheduledItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(items));
  notifyLocalDataChanged();
}

export function getScheduleForWeek(startDate: string): ScheduledItem[] {
  const all = getAll();
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().split("T")[0];
  return all.filter((item) => item.date >= startDate && item.date < endStr);
}

export function getScheduleForRange(startDate: string, endDate: string): ScheduledItem[] {
  return getAll().filter((item) => item.date >= startDate && item.date <= endDate);
}

export function getScheduleForDate(date: string): ScheduledItem[] {
  return getAll().filter((item) => item.date === date);
}

export function addScheduleItem(item: ScheduledItem): void {
  const all = getAll();
  if (item.pinned) for (const existing of all) existing.pinned = false;
  all.push(item);
  saveAll(all);
}

export function updateScheduleItem(id: string, updates: Partial<ScheduledItem>): void {
  const all = getAll();
  const index = all.findIndex((item) => item.id === id);
  if (index >= 0) {
    if (updates.pinned) for (const item of all) item.pinned = false;
    all[index] = { ...all[index], ...updates };
    saveAll(all);
  }
}

export function moveScheduleItem(id: string, newDate: string): void {
  updateScheduleItem(id, { date: newDate });
}

export function copyScheduleItem(id: string, newDate: string): void {
  const source = getAll().find((item) => item.id === id);
  if (!source) return;
  addScheduleItem({
    ...source,
    id: crypto.randomUUID(),
    date: newDate,
    status: "planned",
    actual_session_id: undefined,
    pinned: false,
  });
}

export function repeatScheduleItem(id: string, weeks: number): void {
  const source = getAll().find((item) => item.id === id);
  if (!source || weeks < 1) return;
  const recurrenceId = source.recurrence_id ?? crypto.randomUUID();
  updateScheduleItem(id, { recurrence_id: recurrenceId });
  for (let week = 1; week <= weeks; week += 1) {
    const date = new Date(`${source.date}T12:00:00`);
    date.setDate(date.getDate() + week * 7);
    addScheduleItem({
      ...source,
      id: crypto.randomUUID(),
      date: date.toISOString().slice(0, 10),
      recurrence_id: recurrenceId,
      status: "planned",
      actual_session_id: undefined,
    });
  }
}

export function deleteScheduleItem(id: string): void {
  const all = getAll().filter((item) => item.id !== id);
  saveAll(all);
}

export function getTrainingBlocks(): TrainingBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRAINING_BLOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrainingBlock(block: TrainingBlock): void {
  const blocks = getTrainingBlocks();
  const index = blocks.findIndex((item) => item.id === block.id);
  if (index >= 0) blocks[index] = block;
  else blocks.push(block);
  localStorage.setItem(TRAINING_BLOCKS_KEY, JSON.stringify(blocks));
  notifyLocalDataChanged();
}

export function deleteTrainingBlock(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAINING_BLOCKS_KEY, JSON.stringify(getTrainingBlocks().filter((block) => block.id !== id)));
  notifyLocalDataChanged();
}

/**
 * Generate .ics calendar file content for a scheduled item.
 */
export function generateICS(item: ScheduledItem): string {
  const dateCompact = item.date.replace(/-/g, "");
  const startTime = item.time || "07:00";
  const [sh, sm] = startTime.split(":");
  const startDateTime = `${dateCompact}T${sh}${sm}00`;

  // Use explicit end time if set, otherwise default duration
  let endDateTime: string;
  if (item.end_time) {
    const [eh, em] = item.end_time.split(":");
    endDateTime = `${dateCompact}T${eh}${em}00`;
  } else {
    const durationMinutes = item.type === "workout" ? 60 : 30;
    const start = new Date(`${item.date}T${startTime}:00`);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const eh = String(end.getHours()).padStart(2, "0");
    const em = String(end.getMinutes()).padStart(2, "0");
    endDateTime = `${dateCompact}T${eh}${em}00`;
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Project Forge//EN
BEGIN:VEVENT
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${item.title}
DESCRIPTION:${item.notes || `${item.type === "workout" ? "Workout" : "Meal"} from Project Forge`}
END:VEVENT
END:VCALENDAR`;
}

export function downloadICS(item: ScheduledItem): void {
  const content = generateICS(item);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${item.title.replace(/\s+/g, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
