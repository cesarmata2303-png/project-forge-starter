// Nutrition module types

export interface Food {
  id: string;         // USDA FDC ID
  name: string;
  category: string;
  source: string;     // "foundation" | "sr_legacy"
  calories: number;   // per 100g
  protein: number;    // per 100g
  carbs: number;      // per 100g
  fat: number;        // per 100g
  fiber: number;      // per 100g
  brand?: string;
  barcode?: string;
  serving_quantity?: number;
  serving_unit?: string;
  serving_grams?: number;
}

export interface MealComponent {
  food_id: string;
  food_name: string;
  grams: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  components: MealComponent[];
  created_at: string;
  servings?: number;
}

export interface DiaryEntry {
  id: string;
  type: "meal" | "food";
  meal_template_id?: string;
  meal_name?: string;
  food_id?: string;
  food_name?: string;
  grams?: number;
  components?: MealComponent[];  // snapshot of meal components at time of logging
  servings?: number;
  logged_at?: string;
  nutrition_snapshot?: NutritionSnapshot;
}

export interface NutritionSnapshot extends MacroTotals {
  label: string;
  quantity: number;
  unit: string;
  grams?: number;
}

export interface BodyWeightEntry {
  id: string;
  date: string;
  weight: number;
  unit: "lbs" | "kg";
  recorded_at: string;
}

export interface FuelingRecord {
  id: string;
  date: string;
  workout_id?: string;
  workout_name?: string;
  pre_carbs_g?: number;
  during_carbs_g_per_hour?: number;
  during_fluids_ml_per_hour?: number;
  post_carbs_g?: number;
  post_protein_g?: number;
  notes?: string;
}

export interface FoodUsage {
  food_id: string;
  use_count: number;
  last_used_at: string;
  favorite: boolean;
}

export interface FoodDiary {
  date: string;  // YYYY-MM-DD
  entries: DiaryEntry[];
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
