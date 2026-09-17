import { notifyLocalDataChanged } from "@/lib/local-data-events";

/**
 * App settings stored in localStorage.
 */

export type Theme = "dark" | "light";
export type WeightUnit = "lbs" | "kg";

export interface AppSettings {
  theme: Theme;
  units: WeightUnit;
  hydration_goal_ml: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  units: "lbs",
  hydration_goal_ml: 3000,
};

const SETTINGS_KEY = "forge_settings";

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  notifyLocalDataChanged();
}

// ---------------------------------------------------------------------------
// Hydration tracking
// ---------------------------------------------------------------------------
const HYDRATION_KEY = "forge_hydration";

interface HydrationLog {
  date: string;
  total_ml: number;
  entries: { ml: number; time: string }[];
}

function getAllHydration(): HydrationLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HYDRATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getHydration(date: string): HydrationLog {
  const all = getAllHydration();
  return all.find((h) => h.date === date) ?? { date, total_ml: 0, entries: [] };
}

export function addHydration(date: string, ml: number): HydrationLog {
  const all = getAllHydration();
  let log = all.find((h) => h.date === date);
  if (log) {
    log.total_ml += ml;
    log.entries.push({ ml, time: new Date().toISOString() });
  } else {
    log = { date, total_ml: ml, entries: [{ ml, time: new Date().toISOString() }] };
    all.push(log);
  }
  localStorage.setItem(HYDRATION_KEY, JSON.stringify(all));
  notifyLocalDataChanged();
  return log;
}

export function removeLastHydration(date: string): HydrationLog {
  const all = getAllHydration();
  const log = all.find((h) => h.date === date);
  if (log && log.entries.length > 0) {
    const removed = log.entries.pop()!;
    log.total_ml -= removed.ml;
    if (log.total_ml < 0) log.total_ml = 0;
  }
  localStorage.setItem(HYDRATION_KEY, JSON.stringify(all));
  notifyLocalDataChanged();
  return log ?? { date, total_ml: 0, entries: [] };
}


// ---------------------------------------------------------------------------
// Unit conversion helpers
// ---------------------------------------------------------------------------
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

/**
 * Format a weight value for display based on user's unit preference.
 * Internally, all weights are stored in the user-input unit (lbs by default).
 * This helper converts if needed for display.
 */
export function formatWeight(value: number, fromUnit: WeightUnit = "lbs"): string {
  const settings = getSettings();
  if (settings.units === fromUnit) {
    return `${Math.round(value * 10) / 10}`;
  }
  if (fromUnit === "lbs" && settings.units === "kg") {
    return `${Math.round(value * LBS_TO_KG * 10) / 10}`;
  }
  if (fromUnit === "kg" && settings.units === "lbs") {
    return `${Math.round(value * KG_TO_LBS * 10) / 10}`;
  }
  return `${Math.round(value * 10) / 10}`;
}

export function getWeightLabel(): string {
  return getSettings().units;
}
