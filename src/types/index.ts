// ============================================
// Exercise Model
// ============================================
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscles: string[];
  equipment: string;
  default_sets: number;
  default_rep_range: string; // e.g. "8-12"
  default_rest_seconds: number;
  progression_strategy: ProgressionStrategy;
  notes: string | null;
  created_at: string;
}

export type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core"
  | "cardio"
  | "compound";

export type ProgressionStrategy =
  | "linear"
  | "double_progression"
  | "wave_loading"
  | "rpe_based";

// ============================================
// Workout Template Model
// ============================================
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  exercise_id: string;
  order: number;
  sets: number;
  rep_range: string;
  rest_seconds: number;
  notes: string | null;
}

// ============================================
// Workout Session (Live Logging)
// ============================================
export interface WorkoutSession {
  id: string;
  template_id: string | null;
  template_name: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  exercises: WorkoutExerciseLog[];
}

export interface WorkoutExerciseLog {
  exercise_id: string;
  exercise_name: string;
  order: number;
  sets: SetLog[];
}

export interface SetLog {
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
}

// ============================================
// Dashboard / Stats
// ============================================
export interface WorkoutStats {
  total_workouts: number;
  this_week: number;
  total_volume_kg: number;
  streak_days: number;
}

// ============================================
// Rest Timer
// ============================================
export interface RestTimerState {
  is_running: boolean;
  duration_seconds: number;
  remaining_seconds: number;
}
