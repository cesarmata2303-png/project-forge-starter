import { create } from "zustand";
import type {
  WorkoutSession,
  SetLog,
  RestTimerState,
} from "@/types";

// ============================================
// Active Workout Store
// ============================================
interface ActiveWorkoutState {
  session: WorkoutSession | null;
  currentExerciseIndex: number;

  startWorkout: (session: WorkoutSession) => void;
  endWorkout: () => void;
  setCurrentExercise: (index: number) => void;
  logSet: (exerciseIndex: number, setIndex: number, data: Partial<SetLog>) => void;
  addSet: (exerciseIndex: number) => void;
}

export const useActiveWorkout = create<ActiveWorkoutState>((set) => ({
  session: null,
  currentExerciseIndex: 0,

  startWorkout: (session) => set({ session, currentExerciseIndex: 0 }),

  endWorkout: () =>
    set((state) => ({
      session: state.session
        ? { ...state.session, completed_at: new Date().toISOString() }
        : null,
    })),

  setCurrentExercise: (index) => set({ currentExerciseIndex: index }),

  logSet: (exerciseIndex, setIndex, data) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = [...state.session.exercises];
      const sets = [...exercises[exerciseIndex].sets];
      sets[setIndex] = { ...sets[setIndex], ...data, completed: true };
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
      return { session: { ...state.session, exercises } };
    }),

  addSet: (exerciseIndex) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = [...state.session.exercises];
      const currentSets = exercises[exerciseIndex].sets;
      const newSet: SetLog = {
        set_number: currentSets.length + 1,
        weight_kg: currentSets.at(-1)?.weight_kg ?? null,
        reps: null,
        rpe: null,
        completed: false,
        notes: null,
      };
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: [...currentSets, newSet],
      };
      return { session: { ...state.session, exercises } };
    }),
}));

// ============================================
// Rest Timer Store
// ============================================
interface RestTimerStore extends RestTimerState {
  intervalId: ReturnType<typeof setInterval> | null;
  start: (seconds: number) => void;
  stop: () => void;
  tick: () => void;
}

export const useRestTimer = create<RestTimerStore>((set, get) => ({
  is_running: false,
  duration_seconds: 0,
  remaining_seconds: 0,
  intervalId: null,

  start: (seconds) => {
    const existing = get().intervalId;
    if (existing) clearInterval(existing);

    const intervalId = setInterval(() => get().tick(), 1000);
    set({
      is_running: true,
      duration_seconds: seconds,
      remaining_seconds: seconds,
      intervalId,
    });
  },

  stop: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ is_running: false, remaining_seconds: 0, intervalId: null });
  },

  tick: () => {
    const { remaining_seconds } = get();
    if (remaining_seconds <= 1) {
      get().stop();
      // Vibrate if available (PWA)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } else {
      set({ remaining_seconds: remaining_seconds - 1 });
    }
  },
}));
