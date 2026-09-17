"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus, Search, X, Trash2, Star } from "lucide-react";
import type { Food, MealComponent, MealTemplate } from "@/types/nutrition";
import {
  getMealTemplates,
  saveMealTemplate,
  deleteMealTemplate,
  calculateMealMacros,
  getFoodUsage,
  toggleFavoriteFood,
  getCustomFoods,
  saveCustomFoods,
} from "@/lib/nutrition";

export default function FoodLibraryPage() {
  const [tab, setTab] = useState<"foods" | "meals">("foods");
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [foodCache, setFoodCache] = useState<Map<string, Food>>(new Map());

  // Food search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [requestedBarcode, setRequestedBarcode] = useState("");

  useEffect(() => {
    setMeals(getMealTemplates());
    setFavoriteIds(new Set(getFoodUsage().filter((item) => item.favorite).map((item) => item.food_id)));
    const barcode = new URLSearchParams(window.location.search).get("barcode") ?? "";
    if (barcode) { setRequestedBarcode(barcode); setShowCreateFood(true); }
  }, []);

  // Load foods for meal macros
  useEffect(() => {
    const foodIds = new Set<string>();
    for (const meal of meals) {
      for (const c of meal.components) foodIds.add(c.food_id);
    }
    const missing = [...foodIds].filter((id) => !foodCache.has(id));
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
  }, [meals, foodCache]);

  // Food search — combines API results + custom foods
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(() => {
      fetch(`/api/foods?q=${encodeURIComponent(searchQuery)}&limit=30`)
        .then((r) => r.json())
        .then((apiResults: Food[]) => {
          // Also search custom foods
          const custom = getCustomFoods().filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults([...custom, ...apiResults]);
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSaveMeal = (meal: MealTemplate) => {
    saveMealTemplate(meal);
    setMeals(getMealTemplates());
    setShowMealBuilder(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forge-text">Food Library</h1>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 bg-forge-surface-elevated rounded-lg p-1 gap-1">
        <button
          onClick={() => setTab("foods")}
          className={`py-2.5 text-sm font-medium rounded-md text-center transition-colors ${
            tab === "foods" ? "bg-forge-accent text-white shadow-sm" : "text-forge-text-muted hover:text-forge-text"
          }`}
        >
          Foods
        </button>
        <button
          onClick={() => setTab("meals")}
          className={`py-2.5 text-sm font-medium rounded-md text-center transition-colors ${
            tab === "meals" ? "bg-forge-accent text-white shadow-sm" : "text-forge-text-muted hover:text-forge-text"
          }`}
        >
          Recipes
        </button>
      </div>

      {tab === "foods" && (
        <>
          {/* Actions */}
          <Button variant="secondary" size="sm" onClick={() => setShowCreateFood(true)}>
            <Plus size={14} className="mr-1" /> Create Food
          </Button>

          {showCreateFood && (
            <CreateFoodForm
              onSave={(food) => {
                // Save custom food to localStorage
                const custom = getCustomFoods();
                custom.unshift(food);
                saveCustomFoods(custom);
                setShowCreateFood(false);
              }}
              initialBarcode={requestedBarcode}
              onCancel={() => setShowCreateFood(false)}
            />
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-text-muted" />
            <input
              type="search"
              placeholder="Search USDA foods (8,120 items)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg pl-9 pr-3 py-2.5 text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
            />
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((food) => (
                <Card key={food.id}>
                  <div className="flex justify-between gap-2"><p className="font-medium text-forge-text text-sm">{food.name}</p><button aria-label="Toggle favorite" onClick={() => { const active = toggleFavoriteFood(food.id); setFavoriteIds((previous) => { const next = new Set(previous); if (active) next.add(food.id); else next.delete(food.id); return next; }); }}><Star size={16} className={favoriteIds.has(food.id) ? "fill-amber-400 text-amber-400" : "text-forge-text-muted"} /></button></div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-forge-text-muted">
                      {food.category || "Uncategorized"}
                    </p>
                    <div className="flex gap-2 text-xs text-forge-text-muted">
                      <span>{food.calories} cal</span>
                      <span>P:{food.protein}g</span>
                      <span>C:{food.carbs}g</span>
                      <span>F:{food.fat}g</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-center text-forge-text-muted text-sm py-8">
              No foods found for &quot;{searchQuery}&quot;
            </p>
          )}

          {searchQuery.length < 2 && (
            <Card>
              <p className="text-forge-text-muted text-sm text-center py-4">
                Search the USDA food database above. All values are per 100g.
              </p>
            </Card>
          )}
        </>
      )}

      {tab === "meals" && (
        <>
          <Button variant="secondary" size="sm" onClick={() => setShowMealBuilder(true)}>
            <Plus size={14} className="mr-1" /> New Recipe
          </Button>

          {showMealBuilder && (
            <MealBuilder
              foodCache={foodCache}
              setFoodCache={setFoodCache}
              onSave={handleSaveMeal}
              onCancel={() => setShowMealBuilder(false)}
            />
          )}

          {meals.length === 0 && !showMealBuilder && (
            <Card>
              <p className="text-forge-text-muted text-sm text-center py-4">
                No recipes yet. Create one to quickly log meals to your diary.
              </p>
            </Card>
          )}

          {meals.map((meal) => {
            const macros = calculateMealMacros(meal.components, foodCache);
            return (
              <Card key={meal.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-forge-text">{meal.name}</p>
                  <button
                    onClick={() => { deleteMealTemplate(meal.id); setMeals(getMealTemplates()); }}
                    className="p-1 text-forge-text-muted hover:text-forge-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-1 mb-2">
                  {meal.components.map((c, i) => (
                    <p key={i} className="text-xs text-forge-text-muted">
                      {c.food_name} — {c.grams}g
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-forge-text-muted border-t border-forge-border pt-2">
                  <span>{Math.round(macros.calories / (meal.servings ?? 1))} cal/serving</span>
                  <span>P: {Math.round(macros.protein / (meal.servings ?? 1) * 10) / 10}g</span>
                  <span>{meal.servings ?? 1} serving(s)</span>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meal Builder
// ---------------------------------------------------------------------------
function MealBuilder({
  foodCache,
  setFoodCache,
  onSave,
  onCancel,
}: {
  foodCache: Map<string, Food>;
  setFoodCache: React.Dispatch<React.SetStateAction<Map<string, Food>>>;
  onSave: (meal: MealTemplate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [components, setComponents] = useState<MealComponent[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [servings, setServings] = useState("1");

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(() => {
      fetch(`/api/foods?q=${encodeURIComponent(searchQuery)}&limit=15`)
        .then((r) => r.json())
        .then(setSearchResults);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const addComponent = (food: Food) => {
    setComponents((prev) => [...prev, { food_id: food.id, food_name: food.name, grams: 100 }]);
    setFoodCache((prev) => new Map(prev).set(food.id, food));
    setShowSearch(false);
    setSearchQuery("");
  };

  const updateGrams = (index: number, grams: number) => {
    setComponents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], grams };
      return updated;
    });
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const macros = calculateMealMacros(components, foodCache);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-forge-text mb-3">New Recipe</h2>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Meal name (e.g. Lunch)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
        />
        <div className="flex items-center gap-2">
          <input type="number" min="1" step="1" value={servings} onChange={(event) => setServings(event.target.value)} className="w-20 bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2 text-sm text-forge-text" />
          <span className="text-xs text-forge-text-muted">servings in recipe</span>
        </div>

        {components.map((c, i) => (
          <div key={i} className="flex items-center gap-2 bg-forge-surface-elevated rounded-lg px-2 py-1.5">
            <span className="text-xs text-forge-text flex-1 truncate">{c.food_name}</span>
            <input
              type="number"
              inputMode="numeric"
              value={c.grams}
              onChange={(e) => updateGrams(i, parseInt(e.target.value) || 0)}
              className="w-16 bg-forge-bg border border-forge-border rounded px-1.5 py-1 text-xs text-forge-text text-center"
            />
            <span className="text-[10px] text-forge-text-muted">g</span>
            <button onClick={() => removeComponent(i)} className="text-forge-text-muted hover:text-forge-danger">
              <X size={12} />
            </button>
          </div>
        ))}

        {showSearch ? (
          <div>
            <input
              type="text"
              placeholder="Search food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent mb-1"
            />
            <div className="max-h-36 overflow-y-auto space-y-1">
              {searchResults.map((food) => (
                <button
                  key={food.id}
                  onClick={() => addComponent(food)}
                  className="w-full text-left px-2 py-1.5 text-xs text-forge-text hover:bg-forge-accent-muted rounded"
                >
                  {food.name} <span className="text-forge-text-muted">{food.calories}kcal</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full border border-dashed border-forge-border rounded-lg py-2 text-xs text-forge-text-muted hover:border-forge-accent hover:text-forge-accent flex items-center justify-center gap-1"
          >
            <Plus size={12} /> Add Ingredient
          </button>
        )}

        {components.length > 0 && (
          <div className="flex items-center justify-between text-xs text-forge-text-muted border-t border-forge-border pt-2">
            <span>{macros.calories} cal</span>
            <span>P: {macros.protein}g</span>
            <span>C: {macros.carbs}g</span>
            <span>F: {macros.fat}g</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            if (!name.trim() || components.length === 0) return;
            onSave({ id: Date.now().toString(), name: name.trim(), components, servings: Math.max(1, parseInt(servings) || 1), created_at: new Date().toISOString() });
          }} disabled={!name.trim() || components.length === 0}>
            Save Meal
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create Food Form
// ---------------------------------------------------------------------------
function CreateFoodForm({ onSave, onCancel, initialBarcode = "" }: { onSave: (food: Food) => void; onCancel: () => void; initialBarcode?: string }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [servingGrams, setServingGrams] = useState("100");

  const handleSave = () => {
    if (!name.trim()) return;
    const food: Food = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      category: category.trim() || "Custom",
      source: "custom",
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
      barcode: barcode.trim() || undefined,
      serving_quantity: 1,
      serving_unit: "serving",
      serving_grams: parseFloat(servingGrams) || 100,
    };
    onSave(food);
  };

  return (
    <Card>
      <h2 className="text-sm font-semibold text-forge-text mb-3">Create Custom Food</h2>
      <p className="text-xs text-forge-text-muted mb-3">All values per 100g</p>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Food name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" inputMode="numeric" placeholder="Barcode (optional)" value={barcode} onChange={(event) => setBarcode(event.target.value)} className="bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text" />
          <input type="number" inputMode="decimal" placeholder="Serving grams" value={servingGrams} onChange={(event) => setServingGrams(event.target.value)} className="bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text" />
        </div>
        <input
          type="text"
          placeholder="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-forge-text-muted">Calories</label>
            <input
              type="number" inputMode="decimal" placeholder="0" value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-forge-text-muted">Protein (g)</label>
            <input
              type="number" inputMode="decimal" placeholder="0" value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-forge-text-muted">Carbs (g)</label>
            <input
              type="number" inputMode="decimal" placeholder="0" value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-forge-text-muted">Fat (g)</label>
            <input
              type="number" inputMode="decimal" placeholder="0" value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-forge-text-muted">Fiber (g)</label>
            <input
              type="number" inputMode="decimal" placeholder="0" value={fiber}
              onChange={(e) => setFiber(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            Save Food
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
