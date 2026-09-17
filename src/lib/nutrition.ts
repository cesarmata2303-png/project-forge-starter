/**
 * Nutrition storage and calculation layer.
 * Food database served via API route; meals/diary in localStorage.
 */

import type { Food, MealTemplate, MealComponent, FoodDiary, DiaryEntry, MacroTotals, NutritionSnapshot, BodyWeightEntry, FuelingRecord, FoodUsage } from "@/types/nutrition";
import { notifyLocalDataChanged } from "@/lib/local-data-events";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const KEYS = {
  meals: "forge_meal_templates",
  diary: "forge_food_diary",
  usage: "forge_food_usage",
  bodyWeight: "forge_body_weight",
  fueling: "forge_fueling_records",
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notifyLocalDataChanged();
}

// ---------------------------------------------------------------------------
// Meal Templates
// ---------------------------------------------------------------------------
export function getMealTemplates(): MealTemplate[] {
  return getItem<MealTemplate[]>(KEYS.meals, []);
}

export function getMealTemplate(id: string): MealTemplate | null {
  return getMealTemplates().find((m) => m.id === id) ?? null;
}

export function saveMealTemplate(meal: MealTemplate): void {
  const current = getMealTemplates();
  const existing = current.findIndex((m) => m.id === meal.id);
  if (existing >= 0) {
    current[existing] = meal;
  } else {
    current.unshift(meal);
  }
  setItem(KEYS.meals, current);
}

export function deleteMealTemplate(id: string): void {
  const current = getMealTemplates().filter((m) => m.id !== id);
  setItem(KEYS.meals, current);
}

// ---------------------------------------------------------------------------
// Food Diary
// ---------------------------------------------------------------------------
function getAllDiaries(): FoodDiary[] {
  return getItem<FoodDiary[]>(KEYS.diary, []);
}

export function getDiary(date: string): FoodDiary {
  const all = getAllDiaries();
  return all.find((d) => d.date === date) ?? { date, entries: [] };
}

export function addDiaryEntry(date: string, entry: DiaryEntry): void {
  const all = getAllDiaries();
  const existing = all.find((d) => d.date === date);
  if (existing) {
    existing.entries.push(entry);
  } else {
    all.push({ date, entries: [entry] });
  }
  setItem(KEYS.diary, all);
}

export function removeDiaryEntry(date: string, entryId: string): void {
  const all = getAllDiaries();
  const diary = all.find((d) => d.date === date);
  if (diary) {
    diary.entries = diary.entries.filter((e) => e.id !== entryId);
  }
  setItem(KEYS.diary, all);
}

export function copyDiary(sourceDate: string, targetDate: string): number {
  const source = getDiary(sourceDate).entries;
  const all = getAllDiaries();
  const copies = source.map((entry, index) => ({ ...entry, id: `${Date.now()}-${index}`, logged_at: new Date().toISOString() }));
  const target = all.find((diary) => diary.date === targetDate);
  if (target) target.entries.push(...copies); else all.push({ date: targetDate, entries: copies });
  setItem(KEYS.diary, all);
  return copies.length;
}

export function createNutritionSnapshot(food: Food, grams: number): NutritionSnapshot {
  const factor = grams / 100;
  return {
    label: food.name, quantity: grams, unit: "g", grams,
    calories: round(food.calories * factor), protein: round(food.protein * factor),
    carbs: round(food.carbs * factor), fat: round(food.fat * factor), fiber: round(food.fiber * factor),
  };
}

export function recordFoodUse(foodId: string): void {
  const usage = getItem<FoodUsage[]>(KEYS.usage, []);
  const row = usage.find((item) => item.food_id === foodId);
  if (row) { row.use_count += 1; row.last_used_at = new Date().toISOString(); }
  else usage.push({ food_id: foodId, use_count: 1, last_used_at: new Date().toISOString(), favorite: false });
  setItem(KEYS.usage, usage);
}

export function rankFoods(foods: Food[]): Food[] {
  const usage = new Map(getItem<FoodUsage[]>(KEYS.usage, []).map((item) => [item.food_id, item]));
  return [...foods].sort((a, b) => {
    const left = usage.get(a.id); const right = usage.get(b.id);
    return Number(right?.favorite ?? false) - Number(left?.favorite ?? false)
      || (right?.use_count ?? 0) - (left?.use_count ?? 0)
      || (right?.last_used_at ?? "").localeCompare(left?.last_used_at ?? "");
  });
}

export function getFoodUsage(): FoodUsage[] { return getItem(KEYS.usage, []); }
export function toggleFavoriteFood(foodId: string): boolean {
  const usage = getFoodUsage();
  let row = usage.find((item) => item.food_id === foodId);
  if (!row) {
    row = { food_id: foodId, use_count: 0, last_used_at: new Date(0).toISOString(), favorite: true };
    usage.push(row);
  } else {
    row.favorite = !row.favorite;
  }
  setItem(KEYS.usage, usage);
  return row.favorite;
}

export function getCustomFoods(): Food[] { return getItem<Food[]>("forge_custom_foods", []); }
export function saveCustomFoods(foods: Food[]): void { setItem("forge_custom_foods", foods); }

export function getBodyWeightEntries(): BodyWeightEntry[] { return getItem(KEYS.bodyWeight, []); }
export function saveBodyWeight(entry: BodyWeightEntry): void { setItem(KEYS.bodyWeight, [entry, ...getBodyWeightEntries().filter((item) => item.id !== entry.id)]); }
export function getFuelingRecords(): FuelingRecord[] { return getItem(KEYS.fueling, []); }
export function saveFuelingRecord(entry: FuelingRecord): void { setItem(KEYS.fueling, [entry, ...getFuelingRecords().filter((item) => item.id !== entry.id)]); }

// ---------------------------------------------------------------------------
// Macro Calculation
// ---------------------------------------------------------------------------
export function calculateComponentMacros(component: MealComponent, food: Food): MacroTotals {
  const factor = component.grams / 100;
  return {
    calories: Math.round(food.calories * factor * 10) / 10,
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
    fiber: Math.round(food.fiber * factor * 10) / 10,
  };
}

export function calculateMealMacros(components: MealComponent[], foodLookup: Map<string, Food>): MacroTotals {
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const comp of components) {
    const food = foodLookup.get(comp.food_id);
    if (food) {
      const m = calculateComponentMacros(comp, food);
      totals.calories += m.calories;
      totals.protein += m.protein;
      totals.carbs += m.carbs;
      totals.fat += m.fat;
      totals.fiber += m.fiber;
    }
  }
  // Round totals
  totals.calories = Math.round(totals.calories);
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;
  return totals;
}

function round(value: number): number { return Math.round(value * 10) / 10; }


// ---------------------------------------------------------------------------
// Macro Goals
// ---------------------------------------------------------------------------
export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

const DEFAULT_GOALS: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 280,
  fat: 80,
  fiber: 30,
};

export function getMacroGoals(): MacroGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  try {
    const raw = localStorage.getItem("forge_macro_goals");
    return raw ? JSON.parse(raw) : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveMacroGoals(goals: MacroGoals): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("forge_macro_goals", JSON.stringify(goals));
  notifyLocalDataChanged();
}
