/**
 * Local storage persistence layer for Project Forge.
 * Stores workout templates, completed sessions, and exercise library.
 * This is the bridge until we hook up Supabase.
 */

import type { SetLog } from "@/types";
import { notifyLocalDataChanged } from "@/lib/local-data-events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredExercise {
  id: string;
  name: string;
  category: string;
  muscles: string[];
  equipment: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  source?: "forge";
  sourceId?: string;
  description?: string;
  instructions?: string[];
  tips?: string[];
  imageStart?: string;
  imagePeak?: string;
  difficulty?: string;
  mechanic?: string;
}

export interface TemplateExerciseConfig {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  rep_range: string;
  rest_seconds: number;
}

export interface StoredTemplate {
  id: string;
  name: string;
  exercises: TemplateExerciseConfig[];
  created_at: string;
}

export interface CompletedSession {
  id: string;
  template_id: string | null;
  template_name: string;
  started_at: string;
  completed_at: string;
  unit: string;
  exercises: CompletedExerciseLog[];
}

export interface CompletedExerciseLog {
  exercise_id: string;
  exercise_name: string;
  order: number;
  sets: SetLog[];
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const KEYS = {
  exercises: "forge_exercises",
  templates: "forge_templates",
  sessions: "forge_sessions",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
// Exercises
// ---------------------------------------------------------------------------
const SEED_EXERCISES: StoredExercise[] = [
  { id: "1", name: "Bench Press", category: "chest", muscles: ["Chest", "Triceps", "Front Delts"], equipment: "Barbell" },
  { id: "2", name: "Incline Dumbbell Press", category: "chest", muscles: ["Upper Chest", "Triceps"], equipment: "Dumbbell" },
  { id: "3", name: "Pull Up", category: "back", muscles: ["Lats", "Biceps"], equipment: "Bodyweight" },
  { id: "4", name: "Barbell Row", category: "back", muscles: ["Back", "Biceps", "Rear Delts"], equipment: "Barbell" },
  { id: "5", name: "Overhead Press", category: "shoulders", muscles: ["Front Delts", "Triceps"], equipment: "Barbell" },
  { id: "6", name: "Squat", category: "legs", muscles: ["Quads", "Glutes", "Core"], equipment: "Barbell" },
  { id: "7", name: "Romanian Deadlift", category: "legs", muscles: ["Hamstrings", "Glutes", "Lower Back"], equipment: "Barbell" },
  { id: "8", name: "Lateral Raise", category: "shoulders", muscles: ["Side Delts"], equipment: "Dumbbell" },
  { id: "9", name: "Barbell Curl", category: "biceps", muscles: ["Biceps"], equipment: "Barbell" },
  { id: "10", name: "Tricep Pushdown", category: "triceps", muscles: ["Triceps"], equipment: "Cable" },
  { id: "11", name: "Leg Press", category: "legs", muscles: ["Quads", "Glutes"], equipment: "Machine" },
  { id: "12", name: "Leg Curl", category: "legs", muscles: ["Hamstrings"], equipment: "Machine" },
  { id: "13", name: "Lat Pulldown", category: "back", muscles: ["Lats", "Biceps"], equipment: "Cable" },
  { id: "14", name: "Face Pull", category: "shoulders", muscles: ["Rear Delts", "Traps"], equipment: "Cable" },
  { id: "15", name: "Dumbbell Fly", category: "chest", muscles: ["Chest"], equipment: "Dumbbell" },
  { id: "16", name: "Cable Fly", category: "chest", muscles: ["Chest"], equipment: "Cable" },
  { id: "17", name: "Hammer Curl", category: "biceps", muscles: ["Biceps", "Brachialis"], equipment: "Dumbbell" },
  { id: "18", name: "Skull Crusher", category: "triceps", muscles: ["Triceps"], equipment: "Barbell" },
  { id: "19", name: "Calf Raise", category: "legs", muscles: ["Calves"], equipment: "Machine" },
  { id: "20", name: "Plank", category: "core", muscles: ["Core"], equipment: "Bodyweight" },
];

export function getExercises(): StoredExercise[] {
  const stored = getItem<StoredExercise[]>(KEYS.exercises, []);
  if (stored.length === 0) {
    setItem(KEYS.exercises, SEED_EXERCISES);
    return SEED_EXERCISES;
  }
  return stored;
}

export function addExercise(exercise: StoredExercise): void {
  const current = getExercises();
  const existing = current.findIndex((item) => item.id === exercise.id);
  if (existing >= 0) current[existing] = exercise;
  else current.unshift(exercise);
  setItem(KEYS.exercises, current);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const SEED_TEMPLATES: StoredTemplate[] = [
  {
    id: "push-day",
    name: "Push Day",
    exercises: [
      { exercise_id: "1", exercise_name: "Bench Press", sets: 4, rep_range: "6-8", rest_seconds: 120 },
      { exercise_id: "2", exercise_name: "Incline Dumbbell Press", sets: 3, rep_range: "8-10", rest_seconds: 90 },
      { exercise_id: "16", exercise_name: "Cable Fly", sets: 3, rep_range: "10-12", rest_seconds: 60 },
      { exercise_id: "10", exercise_name: "Tricep Pushdown", sets: 3, rep_range: "10-12", rest_seconds: 60 },
      { exercise_id: "18", exercise_name: "Skull Crusher", sets: 3, rep_range: "10-12", rest_seconds: 60 },
      { exercise_id: "8", exercise_name: "Lateral Raise", sets: 4, rep_range: "12-15", rest_seconds: 45 },
    ],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "pull-day",
    name: "Pull Day",
    exercises: [
      { exercise_id: "3", exercise_name: "Pull Up", sets: 4, rep_range: "6-10", rest_seconds: 120 },
      { exercise_id: "4", exercise_name: "Barbell Row", sets: 4, rep_range: "8-10", rest_seconds: 90 },
      { exercise_id: "13", exercise_name: "Lat Pulldown", sets: 3, rep_range: "10-12", rest_seconds: 60 },
      { exercise_id: "14", exercise_name: "Face Pull", sets: 3, rep_range: "12-15", rest_seconds: 60 },
      { exercise_id: "9", exercise_name: "Barbell Curl", sets: 3, rep_range: "8-12", rest_seconds: 60 },
      { exercise_id: "17", exercise_name: "Hammer Curl", sets: 3, rep_range: "10-12", rest_seconds: 60 },
    ],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "leg-day",
    name: "Leg Day",
    exercises: [
      { exercise_id: "6", exercise_name: "Squat", sets: 4, rep_range: "6-8", rest_seconds: 150 },
      { exercise_id: "7", exercise_name: "Romanian Deadlift", sets: 4, rep_range: "8-10", rest_seconds: 120 },
      { exercise_id: "11", exercise_name: "Leg Press", sets: 3, rep_range: "10-12", rest_seconds: 90 },
      { exercise_id: "12", exercise_name: "Leg Curl", sets: 3, rep_range: "10-12", rest_seconds: 60 },
      { exercise_id: "19", exercise_name: "Calf Raise", sets: 4, rep_range: "12-15", rest_seconds: 45 },
    ],
    created_at: "2026-01-01T00:00:00Z",
  },
];

export function getTemplates(): StoredTemplate[] {
  const stored = getItem<StoredTemplate[]>(KEYS.templates, []);
  if (stored.length === 0) {
    setItem(KEYS.templates, SEED_TEMPLATES);
    return SEED_TEMPLATES;
  }
  return stored;
}

export function getTemplate(id: string): StoredTemplate | null {
  return getTemplates().find((t) => t.id === id) ?? null;
}

export function saveTemplate(template: StoredTemplate): void {
  const current = getTemplates();
  const existing = current.findIndex((t) => t.id === template.id);
  if (existing >= 0) {
    current[existing] = template;
  } else {
    current.unshift(template);
  }
  setItem(KEYS.templates, current);
}

export function deleteTemplate(id: string): void {
  const current = getTemplates().filter((t) => t.id !== id);
  setItem(KEYS.templates, current);
}

// ---------------------------------------------------------------------------
// Sessions (completed workouts)
// ---------------------------------------------------------------------------
export function getSessions(): CompletedSession[] {
  return getItem<CompletedSession[]>(KEYS.sessions, []);
}

export function saveSession(session: CompletedSession): void {
  const current = getSessions();
  current.unshift(session);
  setItem(KEYS.sessions, current);
}

export function deleteSession(sessionId: string): void {
  const current = getSessions().filter((s) => s.id !== sessionId);
  setItem(KEYS.sessions, current);
}

// ---------------------------------------------------------------------------
// PR Tracking
// ---------------------------------------------------------------------------
export interface ExercisePR {
  weight_lbs: number;
  reps: number;
  date: string;
  unit: string;
}

export function getExercisePR(exerciseId: string): ExercisePR | null {
  const sessions = getSessions();
  let maxWeightKg = 0;
  let pr: ExercisePR | null = null;

  for (const session of sessions) {
    const sessionUnit = session.unit || "lbs";
    for (const ex of session.exercises) {
      if (ex.exercise_id === exerciseId) {
        for (const set of ex.sets) {
          if (set.completed && set.weight_kg != null && set.weight_kg > 0) {
            // Normalize to kg for comparison
            const weightInKg = sessionUnit === "kg" ? set.weight_kg : set.weight_kg * 0.453592;
            if (weightInKg > maxWeightKg) {
              maxWeightKg = weightInKg;
              pr = {
                weight_lbs: set.weight_kg, // raw value as entered
                reps: set.reps ?? 0,
                date: session.completed_at.split("T")[0],
                unit: sessionUnit,
              };
            }
          }
        }
      }
    }
  }

  return pr;
}

export function getAllPRs(): Record<string, ExercisePR> {
  const sessions = getSessions();
  const prs: Record<string, ExercisePR> = {};
  const maxWeights: Record<string, number> = {}; // normalized to kg

  for (const session of sessions) {
    const sessionUnit = session.unit || "lbs";
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed && set.weight_kg != null && set.weight_kg > 0) {
          const weightInKg = sessionUnit === "kg" ? set.weight_kg : set.weight_kg * 0.453592;
          const currentMax = maxWeights[ex.exercise_id] || 0;
          if (weightInKg > currentMax) {
            maxWeights[ex.exercise_id] = weightInKg;
            prs[ex.exercise_id] = {
              weight_lbs: set.weight_kg,
              reps: set.reps ?? 0,
              date: session.completed_at.split("T")[0],
              unit: sessionUnit,
            };
          }
        }
      }
    }
  }

  return prs;
}

// ---------------------------------------------------------------------------
// Volume stats
// ---------------------------------------------------------------------------
export interface VolumeStats {
  total_volume_lbs: number;
  by_muscle_group: Record<string, number>;
  by_exercise: Record<string, number>;
}

export function getVolumeStats(days?: number): VolumeStats {
  const cutoff = days == null ? null : Date.now() - days * 86_400_000;
  const sessions = getSessions().filter((session) => cutoff == null || new Date(session.completed_at).getTime() >= cutoff);
  const exercises = getExercises();
  const muscleMap: Record<string, string[]> = {};
  const primaryCountMap: Record<string, number> = {};
  for (const ex of exercises) {
    muscleMap[ex.id] = ex.muscles;
    primaryCountMap[ex.id] = ex.primaryMuscles?.length ?? 1;
  }

  let total_volume_lbs = 0;
  const by_muscle_group: Record<string, number> = {};
  const by_exercise: Record<string, number> = {};

  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed && set.weight_kg != null && set.reps != null) {
          const volume = set.weight_kg * set.reps;
          total_volume_lbs += volume;

          // By exercise
          by_exercise[ex.exercise_name] = (by_exercise[ex.exercise_name] || 0) + volume;

          // By muscle group
          addAttributedMuscleVolume(by_muscle_group, muscleMap[ex.exercise_id] || [], volume, primaryCountMap[ex.exercise_id]);
        }
      }
    }
  }

  return { total_volume_lbs, by_muscle_group, by_exercise };
}

function addAttributedMuscleVolume(target: Record<string, number>, muscles: string[], volume: number, primaryCount = 1): void {
  muscles.forEach((muscle, index) => {
    const displayMuscle = muscle === "Upper Chest" ? "Chest" : muscle;
    const contribution = volume * (index < primaryCount ? 1 : .35);
    target[displayMuscle] = (target[displayMuscle] || 0) + contribution;
  });
}
