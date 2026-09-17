"use client";
/* eslint-disable @next/next/no-img-element */

import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRestTimer } from "@/lib/store";
import { getExercises, getTemplate, saveSession, getExercisePR, type CompletedSession, type CompletedExerciseLog, type StoredExercise } from "@/lib/storage";
import { ChevronDown, ChevronUp, Play, Check, Plus, Minus, Trophy, Pencil, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import type { SetLog } from "@/types";
import Link from "next/link";
import { DraggableList } from "@/components/workout/DraggableList";
import { getSettings } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Active session persistence
// ---------------------------------------------------------------------------
const ACTIVE_SESSION_KEY = "forge_active_session";

interface ActiveSessionData {
  template_id: string;
  template_name: string;
  started_at: string;
  exercises: SessionExercise[];
}

function saveActiveSession(data: ActiveSessionData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
}

function loadActiveSession(templateId: string): ActiveSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ActiveSessionData;
    if (data.template_id === templateId) return data;
    return null;
  } catch {
    return null;
  }
}

function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

interface SessionExercise {
  exercise_id: string;
  exercise_name: string;
  rep_range: string;
  rest_seconds: number;
  sets: SetLog[];
}

export default function WorkoutSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [prs, setPrs] = useState<Record<string, { weight_lbs: number; reps: number; unit: string } | null>>({});
  const [startTime, setStartTime] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [exerciseLibrary] = useState<StoredExercise[]>(() => getExercises());
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const restTimer = useRestTimer();

  useEffect(() => {
    const template = getTemplate(id);
    if (!template) return;

    // Route-dependent local persistence is intentionally hydrated after mount.
    setTemplateName(template.name);
    setWeightUnit(getSettings().units);

    // Check for an in-progress session
    const active = loadActiveSession(id);
    if (active) {
      setExercises(active.exercises);
      setStartTime(active.started_at);
      setIsActive(true);
    } else {
      const sessionExercises: SessionExercise[] = template.exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        rep_range: ex.rep_range,
        rest_seconds: ex.rest_seconds,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          set_number: i + 1,
          weight_kg: null,
          reps: null,
          rpe: null,
          completed: false,
          notes: null,
        })),
      }));
      setExercises(sessionExercises);
    }

    // Load PRs
    const prMap: Record<string, { weight_lbs: number; reps: number; unit: string } | null> = {};
    for (const ex of template.exercises) {
      prMap[ex.exercise_id] = getExercisePR(ex.exercise_id);
    }
    setPrs(prMap);

  }, [id]);

  const detailsFor = (exercise: SessionExercise) => exerciseLibrary.find((item) => item.id === exercise.exercise_id) ?? exerciseLibrary.find((item) => item.name.toLowerCase() === exercise.exercise_name.toLowerCase());

  // Auto-save active session whenever exercises change
  useEffect(() => {
    if (isActive && templateName) {
      saveActiveSession({
        template_id: id,
        template_name: templateName,
        started_at: startTime,
        exercises,
      });
    }
  }, [exercises, isActive, id, templateName, startTime]);

  const startSession = () => {
    const now = new Date().toISOString();
    setIsActive(true);
    setStartTime(now);
    saveActiveSession({
      template_id: id,
      template_name: templateName,
      started_at: now,
      exercises,
    });
  };

  const finishSession = () => {
    const session: CompletedSession = {
      id: Date.now().toString(),
      template_id: id,
      template_name: templateName,
      started_at: startTime,
      completed_at: new Date().toISOString(),
      unit: weightUnit,
      exercises: exercises.map((ex, i): CompletedExerciseLog => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order: i,
        sets: ex.sets.filter((s) => s.completed),
      })),
    };
    saveSession(session);
    clearActiveSession();
    router.push("/workouts");
  };

  const cancelSession = () => {
    if (confirm("Cancel this workout? Progress will be lost.")) {
      clearActiveSession();
      setIsActive(false);
      // Reset exercises to template defaults
      const template = getTemplate(id);
      if (template) {
        setExercises(template.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          rep_range: ex.rep_range,
          rest_seconds: ex.rest_seconds,
          sets: Array.from({ length: ex.sets }, (_, i) => ({
            set_number: i + 1,
            weight_kg: null,
            reps: null,
            rpe: null,
            completed: false,
            notes: null,
          })),
        })));
      }
    }
  };

  const completeSet = (exIndex: number, setIndex: number, reps: number, weight: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exIndex].sets];
      sets[setIndex] = { ...sets[setIndex], weight_kg: weight, reps, completed: true };
      updated[exIndex] = { ...updated[exIndex], sets };
      return updated;
    });
    restTimer.start(exercises[exIndex].rest_seconds);
  };

  const addSet = (exIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const currentSets = updated[exIndex].sets;
      const lastSet = currentSets[currentSets.length - 1];
      updated[exIndex] = {
        ...updated[exIndex],
        sets: [
          ...currentSets,
          {
            set_number: currentSets.length + 1,
            weight_kg: lastSet?.weight_kg ?? null,
            reps: null,
            rpe: null,
            completed: false,
            notes: null,
          },
        ],
      };
      return updated;
    });
  };

  const removeSet = (exIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const currentSets = updated[exIndex].sets;
      if (currentSets.length <= 1) return prev;
      const lastUncompleted = [...currentSets].reverse().findIndex((s) => !s.completed);
      if (lastUncompleted === -1) return prev;
      const removeIndex = currentSets.length - 1 - lastUncompleted;
      updated[exIndex] = {
        ...updated[exIndex],
        sets: currentSets.filter((_, i) => i !== removeIndex),
      };
      return updated;
    });
  };

  if (!templateName) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-forge-text-muted">Template not found.</p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-forge-text">{templateName}</h1>
          <Link href={`/workouts/${id}/edit`}>
            <Button variant="ghost" size="sm">
              <Pencil size={16} className="mr-1" />
              Edit
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {exercises.map((ex) => {
            const pr = prs[ex.exercise_id];
            const details = detailsFor(ex);
            const expanded = expandedExercise === ex.exercise_id;
            return (
              <Card key={ex.exercise_id}>
                <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setExpandedExercise(expanded ? null : ex.exercise_id)} aria-expanded={expanded}>
                  {details?.imageStart && <img src={details.imageStart} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" loading="lazy" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-forge-text">{ex.exercise_name}</p>
                    <p className="text-sm text-forge-text-muted">
                      {ex.sets.length} x {ex.rep_range} · {ex.rest_seconds}s rest
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">{pr && (
                    <span className="text-xs bg-forge-warning/20 text-forge-warning px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy size={10} />
                      PR: {pr.weight_lbs} {pr.unit} x {pr.reps}
                    </span>
                  )}{expanded ? <ChevronUp size={16} className="text-forge-text-muted" /> : <ChevronDown size={16} className="text-forge-text-muted" />}</div>
                </button>
                {expanded && details && <ExerciseGuide details={details} />}
              </Card>
            );
          })}
        </div>
        <Button size="lg" className="w-full" onClick={startSession}>
          <Play size={18} className="mr-2" />
          Start Workout
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forge-text">{templateName}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={cancelSession}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={finishSession}>
            Finish
          </Button>
        </div>
      </div>

      <DraggableList
        items={exercises}
        onReorder={setExercises}
        keyExtractor={(ex, i) => `${ex.exercise_id}-${i}`}
        renderItem={(exercise, exIndex, dragHandleProps) => (
          <ExerciseLogger
            exercise={exercise}
            pr={prs[exercise.exercise_id]}
            weightUnit={weightUnit}
            details={detailsFor(exercise)}
            dragHandleProps={dragHandleProps}
            onCompleteSet={(setIndex, reps, weight) =>
              completeSet(exIndex, setIndex, reps, weight)
            }
            onAddSet={() => addSet(exIndex)}
            onRemoveSet={() => removeSet(exIndex)}
          />
        )}
      />
    </div>
  );
}

function ExerciseLogger({
  exercise,
  pr,
  weightUnit,
  details,
  dragHandleProps,
  onCompleteSet,
  onAddSet,
  onRemoveSet,
}: {
  exercise: SessionExercise;
  pr: { weight_lbs: number; reps: number; unit: string } | null;
  weightUnit: string;
  details?: StoredExercise;
  dragHandleProps: { onTouchStart: (e: React.TouchEvent) => void; onMouseDown: (e: React.MouseEvent) => void };
  onCompleteSet: (setIndex: number, reps: number, weight: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing touch-none text-forge-text-muted hover:text-forge-accent p-1"
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
          {details?.imageStart && <img src={details.imageStart} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" loading="lazy" />}
          <button type="button" className="text-left" onClick={() => setShowGuide((value) => !value)} aria-expanded={showGuide}>
            <h3 className="flex items-center gap-1 font-semibold text-forge-text">{exercise.exercise_name}{showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</h3>
            <p className="text-xs text-forge-text-muted">
              Target: {exercise.rep_range} reps · {exercise.rest_seconds}s rest
            </p>
          </button>
        </div>
        {pr && (
          <span className="text-[10px] bg-forge-warning/20 text-forge-warning px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
            <Trophy size={9} />
            PR: {pr.weight_lbs} {pr.unit} x {pr.reps}
          </span>
        )}
      </div>

      {showGuide && details && <ExerciseGuide details={details} compact />}

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-forge-text-muted px-1">
          <span>Set</span>
          <span>Reps</span>
          <span>{weightUnit}</span>
          <span></span>
        </div>

        {exercise.sets.map((set, i) => (
          <SetRow
            key={i}
            setNumber={i + 1}
            completed={set.completed}
            weight={set.weight_kg}
            reps={set.reps}
            onComplete={(reps, weight) => onCompleteSet(i, reps, weight)}
          />
        ))}
      </div>

      {/* Add/Remove set buttons */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-forge-border">
        <button
          onClick={onRemoveSet}
          className="flex items-center gap-1 text-xs text-forge-text-muted hover:text-forge-danger transition-colors px-2 py-1"
          aria-label="Remove set"
        >
          <Minus size={14} />
          <span>Set</span>
        </button>
        <button
          onClick={onAddSet}
          className="flex items-center gap-1 text-xs text-forge-text-muted hover:text-forge-accent transition-colors px-2 py-1"
          aria-label="Add set"
        >
          <Plus size={14} />
          <span>Set</span>
        </button>
      </div>
    </Card>
  );
}

function ExerciseGuide({ details, compact = false }: { details: StoredExercise; compact?: boolean }) {
  return <div className={`${compact ? "mb-4" : "mt-4"} space-y-3 border-t border-forge-border pt-4`}>
    {(details.imageStart || details.imagePeak) && <div className="grid grid-cols-2 gap-3">
      {details.imageStart && <figure><img src={details.imageStart} alt={`${details.name} start position`} className={`${compact ? "max-h-48" : "max-h-72"} w-full rounded-xl bg-white object-contain`} loading="lazy" /><figcaption className="mt-1 text-center text-[10px] uppercase text-forge-text-muted">Start</figcaption></figure>}
      {details.imagePeak && <figure><img src={details.imagePeak} alt={`${details.name} finish position`} className={`${compact ? "max-h-48" : "max-h-72"} w-full rounded-xl bg-white object-contain`} loading="lazy" /><figcaption className="mt-1 text-center text-[10px] uppercase text-forge-text-muted">Finish</figcaption></figure>}
    </div>}
    {details.description && <p className="text-sm leading-5 text-forge-text-muted">{details.description}</p>}
    {!!details.instructions?.length && <div><h4 className="mb-1 text-sm font-semibold text-forge-text">How to perform</h4><ol className="list-decimal space-y-1 pl-5 text-sm leading-5 text-forge-text-muted">{details.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol></div>}
    {!!details.tips?.length && <div className="rounded-lg bg-forge-accent-muted p-3 text-sm text-forge-text-muted"><span className="font-semibold text-forge-accent">Tips: </span>{details.tips.join(" ")}</div>}
  </div>;
}

function SetRow({
  setNumber,
  completed,
  weight,
  reps,
  onComplete,
}: {
  setNumber: number;
  completed: boolean;
  weight: number | null;
  reps: number | null;
  onComplete: (reps: number, weight: number) => void;
}) {
  const [repsInput, setRepsInput] = useState(reps?.toString() || "");
  const [weightInput, setWeightInput] = useState(weight?.toString() || "");

  const handleComplete = () => {
    const r = parseInt(repsInput) || 0;
    const w = parseFloat(weightInput) || 0;
    if (r > 0) {
      onComplete(r, w);
    }
  };

  return (
    <div
      className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center px-1 py-1 rounded ${
        completed ? "bg-forge-accent-muted" : ""
      }`}
    >
      <span className="text-sm font-medium text-forge-text-muted">{setNumber}</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={repsInput}
        onChange={(e) => setRepsInput(e.target.value)}
        disabled={completed}
        className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center disabled:opacity-50"
      />
      <input
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={weightInput}
        onChange={(e) => setWeightInput(e.target.value)}
        disabled={completed}
        className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1.5 text-sm text-forge-text text-center disabled:opacity-50"
      />
      <button
        onClick={handleComplete}
        disabled={completed}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          completed
            ? "bg-forge-accent text-white"
            : "bg-forge-surface-elevated border border-forge-border text-forge-text-muted hover:border-forge-accent"
        }`}
        aria-label={`Complete set ${setNumber}`}
      >
        <Check size={14} />
      </button>
    </div>
  );
}
