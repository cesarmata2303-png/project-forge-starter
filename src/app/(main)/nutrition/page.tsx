"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus, Search, X, Trash2, UtensilsCrossed, Droplets, Minus, ChevronLeft, ChevronRight, Copy, Scale } from "lucide-react";
import type { Food, MealTemplate, DiaryEntry, MacroTotals } from "@/types/nutrition";
import {
  getMealTemplates,
  getDiary,
  addDiaryEntry,
  removeDiaryEntry,
  calculateMealMacros,
  getMacroGoals,
  type MacroGoals,
  createNutritionSnapshot,
  copyDiary,
  recordFoodUse,
  rankFoods,
  getBodyWeightEntries,
  saveBodyWeight,
  getFuelingRecords,
  saveFuelingRecord,
  getCustomFoods,
} from "@/lib/nutrition";
import { getSettings, getHydration, addHydration, removeLastHydration } from "@/lib/settings";

export default function NutritionPage() {
  const today = new Date().toISOString().split("T")[0];
  const [diaryDate, setDiaryDate] = useState(today);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [foodCache, setFoodCache] = useState<Map<string, Food>>(new Map());
  const [goals, setGoals] = useState<MacroGoals>({ calories: 2500, protein: 180, carbs: 280, fat: 80, fiber: 30 });
  const [hydrationMl, setHydrationMl] = useState(0);
  const [hydrationGoal, setHydrationGoal] = useState(3000);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [fuelingCount, setFuelingCount] = useState(0);

  useEffect(() => {
    setMeals(getMealTemplates());
    setGoals(getMacroGoals());
    const settings = getSettings();
    setHydrationGoal(settings.hydration_goal_ml);
    const hydration = getHydration(diaryDate);
    setHydrationMl(hydration.total_ml);
    const diary = getDiary(diaryDate);
    setDiaryEntries(diary.entries);
    setLatestWeight(getBodyWeightEntries()[0]?.weight ?? null);
    setFuelingCount(getFuelingRecords().filter((item) => item.date === diaryDate).length);
  }, [diaryDate]);

  // Load foods referenced in diary
  useEffect(() => {
    const foodIds = new Set<string>();
    for (const entry of diaryEntries) {
      if (entry.food_id) foodIds.add(entry.food_id);
      if (entry.components) {
        for (const c of entry.components) foodIds.add(c.food_id);
      }
    }
    if (foodIds.size === 0) return;

    // Only fetch IDs we don't already have
    const missing: string[] = [];
    foodIds.forEach((id) => {
      if (!foodCache.has(id)) missing.push(id);
    });

    if (missing.length > 0) {
      fetch(`/api/foods?ids=${missing.join(",")}`)
        .then((r) => r.json())
        .then((foods: Food[]) => {
          setFoodCache((prev) => {
            const next = new Map(prev);
            for (const f of foods) next.set(f.id, f);
            return next;
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryEntries]);

  const dailyTotals = calculateDailyTotals(diaryEntries, foodCache);

  const handleLogFood = (food: Food, grams: number) => {
    const entry: DiaryEntry = {
      id: Date.now().toString(),
      type: "food",
      food_id: food.id,
      food_name: food.name,
      grams,
      logged_at: new Date().toISOString(),
      nutrition_snapshot: createNutritionSnapshot(food, grams),
    };
    addDiaryEntry(diaryDate, entry);
    setDiaryEntries(getDiary(diaryDate).entries);
    setFoodCache((prev) => new Map(prev).set(food.id, food));
    recordFoodUse(food.id);
    setShowAddFood(false);
  };

  const handleLogMeal = (meal: MealTemplate) => {
    const servingCount = meal.servings ?? 1;
    // Load meal food data into cache
    const missingIds = meal.components
      .map((c) => c.food_id)
      .filter((id) => !foodCache.has(id));
    if (missingIds.length > 0) {
      fetch(`/api/foods?ids=${missingIds.join(",")}`)
        .then((r) => r.json())
        .then((foods: Food[]) => {
          setFoodCache((prev) => {
            const next = new Map(prev);
            for (const f of foods) next.set(f.id, f);
            return next;
          });
        });
    }

    const entry: DiaryEntry = {
      id: Date.now().toString(),
      type: "meal",
      meal_template_id: meal.id,
      meal_name: meal.name,
      components: meal.components.map((component) => ({ ...component, grams: component.grams / servingCount })),
      servings: 1,
      logged_at: new Date().toISOString(),
      nutrition_snapshot: {
        label: meal.name, quantity: 1, unit: "serving", ...scaleMacros(calculateMealMacros(meal.components, foodCache), servingCount),
      },
    };
    addDiaryEntry(diaryDate, entry);
    setDiaryEntries(getDiary(diaryDate).entries);
    setShowMealPicker(false);
  };

  const handleRemoveEntry = (entryId: string) => {
    removeDiaryEntry(diaryDate, entryId);
    setDiaryEntries(getDiary(diaryDate).entries);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forge-text">Nutrition</h1>
        <div className="flex items-center gap-1">
          <button aria-label="Previous day" onClick={() => setDiaryDate(shiftDate(diaryDate, -1))} className="p-2 text-forge-text-muted"><ChevronLeft size={16} /></button>
          <span className="text-xs text-forge-text-muted min-w-24 text-center">{diaryDate === today ? "Today" : diaryDate}</span>
          <button aria-label="Next day" onClick={() => setDiaryDate(shiftDate(diaryDate, 1))} className="p-2 text-forge-text-muted"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Daily Totals with Progress */}
      <Card>
        <h2 className="text-sm font-semibold text-forge-text-muted uppercase tracking-wide mb-3">
          Today&apos;s Progress
        </h2>
        <div className="space-y-3">
          <MacroProgress label="Calories" current={dailyTotals.calories} goal={goals.calories} color="#14b8a6" unit="kcal" />
          <MacroProgress label="Protein" current={dailyTotals.protein} goal={goals.protein} color="#c084fc" unit="g" />
          <MacroProgress label="Carbs" current={dailyTotals.carbs} goal={goals.carbs} color="#fbbf24" unit="g" />
          <MacroProgress label="Fat" current={dailyTotals.fat} goal={goals.fat} color="#f87171" unit="g" />
          <MacroProgress label="Fiber" current={dailyTotals.fiber} goal={goals.fiber} color="#4ade80" unit="g" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <div className="flex items-center gap-2 mb-2"><Scale size={15} className="text-forge-accent" /><span className="text-xs font-medium text-forge-text">Body weight</span></div>
          <button className="text-left w-full" onClick={() => {
            const value = Number(prompt("Body weight (lb):", latestWeight?.toString() ?? ""));
            if (value > 0) { saveBodyWeight({ id: Date.now().toString(), date: diaryDate, weight: value, unit: "lbs", recorded_at: new Date().toISOString() }); setLatestWeight(value); }
          }}><span className="text-lg font-semibold text-forge-text">{latestWeight ?? "—"}</span><span className="text-xs text-forge-text-muted"> lb · tap to log</span></button>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><UtensilsCrossed size={15} className="text-amber-400" /><span className="text-xs font-medium text-forge-text">Workout fueling</span></div>
          <button className="text-left w-full text-xs text-forge-text-muted" onClick={() => {
            const carbs = Number(prompt("During-workout carbs (grams per hour):", "60"));
            if (carbs >= 0) { saveFuelingRecord({ id: Date.now().toString(), date: diaryDate, during_carbs_g_per_hour: carbs }); setFuelingCount((count) => count + 1); }
          }}>{fuelingCount ? `${fuelingCount} plan${fuelingCount === 1 ? "" : "s"} logged` : "Tap to add a fueling target"}</button>
        </Card>
      </div>

      {/* Hydration */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="text-xs font-medium text-forge-text">Hydration</span>
          </div>
          <span className="text-xs text-forge-text-muted">
            {hydrationMl} / {hydrationGoal} ml
          </span>
        </div>
        <div className="h-2.5 bg-forge-surface-elevated rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((hydrationMl / hydrationGoal) * 100, 100)}%`,
              backgroundColor: hydrationMl >= hydrationGoal ? "#22c55e" : "#60a5fa",
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              const updated = removeLastHydration(diaryDate);
              setHydrationMl(updated.total_ml);
            }}
            className="w-8 h-8 rounded-lg bg-forge-surface-elevated border border-forge-border flex items-center justify-center text-forge-text-muted hover:text-forge-danger"
            aria-label="Remove last"
          >
            <Minus size={14} />
          </button>
          {[250, 500].map((amount) => (
            <button
              key={amount}
              onClick={() => {
                const updated = addHydration(diaryDate, amount);
                setHydrationMl(updated.total_ml);
              }}
              className="px-3 py-1.5 rounded-lg bg-forge-surface-elevated border border-forge-border text-xs font-medium text-forge-text hover:border-blue-400 hover:text-blue-400 transition-colors"
            >
              +{amount}ml
            </button>
          ))}
          <button
            onClick={() => {
              const custom = parseInt(prompt("Custom amount (ml):") || "0");
              if (custom > 0) {
                const updated = addHydration(diaryDate, custom);
                setHydrationMl(updated.total_ml);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-forge-surface-elevated border border-forge-border text-xs font-medium text-forge-text-muted hover:border-blue-400 hover:text-blue-400 transition-colors"
          >
            Custom
          </button>
        </div>
      </Card>

      {/* Log buttons */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setShowAddFood(true); setShowMealPicker(false); }}>
          <Plus size={14} className="mr-1" /> Log Food
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setShowMealPicker(true); setShowAddFood(false); }}>
          <UtensilsCrossed size={14} className="mr-1" /> Log Meal
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => {
        const count = copyDiary(shiftDate(diaryDate, -1), diaryDate);
        if (count > 0) setDiaryEntries(getDiary(diaryDate).entries);
      }}><Copy size={13} className="mr-1" /> Copy previous day</Button>

      {/* Food search & add */}
      {showAddFood && (
        <FoodSearchAndAdd onAdd={handleLogFood} onClose={() => setShowAddFood(false)} />
      )}

      {/* Meal picker */}
      {showMealPicker && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-forge-text">Choose a Meal</span>
            <button onClick={() => setShowMealPicker(false)} className="text-forge-text-muted">
              <X size={14} />
            </button>
          </div>
          {meals.length === 0 ? (
            <p className="text-xs text-forge-text-muted py-2">
              No meal templates yet. Create meals in Food Library (side menu).
            </p>
          ) : (
            <div className="space-y-1">
              {meals.map((meal) => {
                const macros = calculateMealMacros(meal.components, foodCache);
                return (
                  <button
                    key={meal.id}
                    onClick={() => handleLogMeal(meal)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-forge-accent-muted transition-colors"
                  >
                    <p className="text-sm font-medium text-forge-text">{meal.name}</p>
                    <p className="text-xs text-forge-text-muted">
                      1 of {meal.servings ?? 1} serving(s) · {Math.round(macros.calories / (meal.servings ?? 1))} cal · P:{Math.round(macros.protein / (meal.servings ?? 1) * 10) / 10}g
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Diary Entries */}
      {diaryEntries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-forge-text-muted uppercase tracking-wide">
            Today&apos;s Log
          </h2>
          {diaryEntries.map((entry) => (
            <DiaryEntryCard
              key={entry.id}
              entry={entry}
              foodCache={foodCache}
              onRemove={() => handleRemoveEntry(entry.id)}
            />
          ))}
        </section>
      )}

      {diaryEntries.length === 0 && !showAddFood && !showMealPicker && (
        <Card>
          <p className="text-forge-text-muted text-sm text-center py-4">
            No food logged today. Use the buttons above to add foods or meals.
          </p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MacroProgress({
  label,
  current,
  goal,
  color,
  unit,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit: string;
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const over = current > goal;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-forge-text">{label}</span>
        <span className={`text-xs ${over ? "text-forge-danger" : "text-forge-text-muted"}`}>
          {current} / {goal} {unit}
        </span>
      </div>
      <div className="h-2.5 bg-forge-surface-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: over ? "#ef4444" : color,
          }}
        />
      </div>
    </div>
  );
}

function DiaryEntryCard({
  entry,
  foodCache,
  onRemove,
}: {
  entry: DiaryEntry;
  foodCache: Map<string, Food>;
  onRemove: () => void;
}) {
  let macros: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  if (entry.nutrition_snapshot) {
    macros = entry.nutrition_snapshot;
  } else if (entry.type === "food" && entry.food_id && entry.grams) {
    const food = foodCache.get(entry.food_id);
    if (food) {
      const factor = entry.grams / 100;
      macros = {
        calories: Math.round(food.calories * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        fiber: Math.round(food.fiber * factor * 10) / 10,
      };
    }
  } else if (entry.type === "meal" && entry.components) {
    macros = calculateMealMacros(entry.components, foodCache);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-forge-text">
            {entry.type === "meal" ? entry.meal_name : entry.food_name}
          </p>
          <p className="text-xs text-forge-text-muted">
            {entry.type === "food" && `${entry.grams}g · `}
            {entry.type === "meal" && `${entry.components?.length} items · `}
            {macros.calories} cal · P:{macros.protein}g C:{macros.carbs}g F:{macros.fat}g
          </p>
        </div>
        <button onClick={onRemove} className="p-1 text-forge-text-muted hover:text-forge-danger">
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  );
}

function FoodSearchAndAdd({ onAdd, onClose }: { onAdd: (food: Food, grams: number) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [unit, setUnit] = useState<"g" | "serving">("g");

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(() => {
      fetch(`/api/foods?q=${encodeURIComponent(query)}&limit=20`)
        .then((r) => r.json())
        .then((foods: Food[]) => {
          const custom = getCustomFoods().filter((food) => food.name.toLowerCase().includes(query.toLowerCase()) || food.barcode === query);
          setResults(rankFoods([...custom, ...foods]));
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (selected) {
    const normalizedGrams = unit === "serving" ? (parseFloat(grams) || 1) * (selected.serving_grams ?? 100) : parseFloat(grams) || 0;
    const factor = normalizedGrams / 100;
    return (
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-forge-text">{selected.name}</p>
          <button onClick={() => setSelected(null)} className="text-forge-text-muted"><X size={14} /></button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="numeric"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-20 bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
          />
          <select value={unit} onChange={(event) => { const next = event.target.value as "g" | "serving"; setUnit(next); setGrams(next === "serving" ? "1" : "100"); }} className="bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-xs text-forge-text">
            <option value="g">grams</option><option value="serving">servings ({selected.serving_grams ?? 100}g)</option>
          </select>
        </div>
        <p className="text-xs text-forge-text-muted mb-3">
          {Math.round(selected.calories * factor)} cal ·
          P: {(selected.protein * factor).toFixed(1)}g ·
          C: {(selected.carbs * factor).toFixed(1)}g ·
          F: {(selected.fat * factor).toFixed(1)}g
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAdd(selected, normalizedGrams || 100)}>
            Log Food
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-forge-text">Search Food</span>
        <button onClick={onClose} className="text-forge-text-muted"><X size={14} /></button>
      </div>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted" />
        <input
          type="text"
          placeholder="Search foods or enter a barcode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg pl-8 pr-3 py-2 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {results.map((food) => (
          <button
            key={food.id}
            onClick={() => setSelected(food)}
            className="w-full text-left px-2 py-1.5 text-sm text-forge-text hover:bg-forge-accent-muted rounded transition-colors"
          >
            <span className="font-medium">{food.name}</span>
            <span className="text-xs text-forge-text-muted ml-2">{food.calories} kcal/100g</span>
          </button>
        ))}
      </div>
      {/^\d{8,14}$/.test(query) && results.length === 0 && (
        <a href={`/food-library?barcode=${encodeURIComponent(query)}`} className="block text-center text-xs text-forge-accent py-3">Barcode not found — create this food</a>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function calculateDailyTotals(entries: DiaryEntry[], foodCache: Map<string, Food>): MacroTotals {
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  for (const entry of entries) {
    if (entry.nutrition_snapshot) {
      totals.calories += entry.nutrition_snapshot.calories;
      totals.protein += entry.nutrition_snapshot.protein;
      totals.carbs += entry.nutrition_snapshot.carbs;
      totals.fat += entry.nutrition_snapshot.fat;
      totals.fiber += entry.nutrition_snapshot.fiber;
      continue;
    }
    if (entry.type === "food" && entry.food_id && entry.grams) {
      const food = foodCache.get(entry.food_id);
      if (food) {
        const factor = entry.grams / 100;
        totals.calories += food.calories * factor;
        totals.protein += food.protein * factor;
        totals.carbs += food.carbs * factor;
        totals.fat += food.fat * factor;
        totals.fiber += food.fiber * factor;
      }
    } else if (entry.type === "meal" && entry.components) {
      const mealMacros = calculateMealMacros(entry.components, foodCache);
      totals.calories += mealMacros.calories;
      totals.protein += mealMacros.protein;
      totals.carbs += mealMacros.carbs;
      totals.fat += mealMacros.fat;
      totals.fiber += mealMacros.fiber;
    }
  }

  totals.calories = Math.round(totals.calories);
  totals.protein = Math.round(totals.protein);
  totals.carbs = Math.round(totals.carbs);
  totals.fat = Math.round(totals.fat);
  totals.fiber = Math.round(totals.fiber);

  return totals;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().split("T")[0];
}

function scaleMacros(macros: MacroTotals, divisor: number): MacroTotals {
  return {
    calories: Math.round(macros.calories / divisor),
    protein: Math.round(macros.protein / divisor * 10) / 10,
    carbs: Math.round(macros.carbs / divisor * 10) / 10,
    fat: Math.round(macros.fat / divisor * 10) / 10,
    fiber: Math.round(macros.fiber / divisor * 10) / 10,
  };
}
