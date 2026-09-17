"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronDown, ChevronUp, Search, Plus, X, Pencil, Trophy } from "lucide-react";
import type { ExerciseCategory } from "@/types";
import { getExercises, addExercise as addExerciseToStorage, getExercisePR, type StoredExercise } from "@/lib/storage";
import { notifyLocalDataChanged } from "@/lib/local-data-events";

const CATEGORIES: ExerciseCategory[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "compound"
];

const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Band", "Kettlebell"];

const MUSCLE_OPTIONS = [
  "Chest", "Upper Chest", "Triceps", "Front Delts", "Side Delts", "Rear Delts",
  "Lats", "Back", "Traps", "Biceps", "Brachialis", "Forearms",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Lower Back",
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<StoredExercise[]>(() => getExercises());
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prs] = useState<Record<string, { weight_lbs: number; reps: number; unit: string } | null>>(() => {
    const exs = getExercises();
    const prMap: Record<string, { weight_lbs: number; reps: number; unit: string } | null> = {};
    for (const ex of exs) {
      prMap[ex.id] = getExercisePR(ex.id);
    }
    return prMap;
  });

  const filtered = exercises.filter((ex) => {
    const haystack = [ex.name, ex.equipment, ...ex.muscles].join(" ").toLowerCase();
    const matchesSearch = haystack.includes(search.trim().toLowerCase());
    const matchesCategory = activeCategory === "all" || ex.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).slice(0, 100);

  const handleAdd = (exercise: StoredExercise) => {
    addExerciseToStorage(exercise);
    setExercises(getExercises());
    setShowAdd(false);
  };

  const handleEdit = (exercise: StoredExercise) => {
    // Update in localStorage
    const all = getExercises();
    const index = all.findIndex((e) => e.id === exercise.id);
    if (index >= 0) {
      all[index] = exercise;
      localStorage.setItem("forge_exercises", JSON.stringify(all));
      notifyLocalDataChanged();
      setExercises(all);
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forge-text">Exercise Library</h1>
        <Button variant="ghost" size="sm" onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}>
          {showAdd ? <X size={18} className="mr-1" /> : <Plus size={18} className="mr-1" />}
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {/* Add Exercise Form */}
      {showAdd && (
        <ExerciseForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-text-muted" />
        <input
          type="search"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg pl-9 pr-3 py-2.5 text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <FilterChip label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Exercise List */}
      <div className="space-y-2">
        {filtered.map((exercise) => (
          editingId === exercise.id ? (
            <ExerciseForm
              key={exercise.id}
              initial={exercise}
              onSave={handleEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={exercise.id}>
              <div
                role="button"
                tabIndex={0}
                className="flex w-full items-start gap-3 text-left"
                onClick={() => setExpandedId((current) => current === exercise.id ? null : exercise.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpandedId((current) => current === exercise.id ? null : exercise.id); }}
                aria-expanded={expandedId === exercise.id}
              >
                {exercise.imageStart && <img src={exercise.imageStart} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" loading="lazy" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-forge-text">{exercise.name}</p>
                    {prs[exercise.id] && (
                      <span className="text-[10px] bg-forge-warning/20 text-forge-warning px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Trophy size={9} />
                        PR: {prs[exercise.id]!.weight_lbs} {prs[exercise.id]!.unit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-forge-text-muted mt-0.5">
                    {exercise.muscles.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs bg-forge-accent-muted text-forge-accent px-2 py-0.5 rounded-full">
                    {exercise.equipment}
                  </span>
                  <button
                    onClick={(event) => { event.stopPropagation(); setEditingId(exercise.id); }}
                    className="p-1 text-forge-text-muted hover:text-forge-accent"
                    aria-label="Edit exercise"
                  >
                    <Pencil size={14} />
                  </button>
                  {expandedId === exercise.id ? <ChevronUp size={16} className="text-forge-text-muted" /> : <ChevronDown size={16} className="text-forge-text-muted" />}
                </div>
              </div>
              {expandedId === exercise.id && <ExerciseDetails exercise={exercise} />}
            </Card>
          )
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-forge-text-muted text-sm py-8">
            No exercises found.
          </p>
        )}
      </div>
      <p className="text-center text-[10px] text-forge-text-muted">Starter includes a small editable local exercise library.</p>
    </div>
  );
}

function ExerciseDetails({ exercise }: { exercise: StoredExercise }) {
  return <div className="mt-4 space-y-4 border-t border-forge-border pt-4">
    {(exercise.imageStart || exercise.imagePeak) && <div className="grid grid-cols-2 gap-3">
      {exercise.imageStart && <figure><img src={exercise.imageStart} alt={`${exercise.name} start position`} className="aspect-square w-full rounded-xl bg-white object-contain" loading="lazy" /><figcaption className="mt-1 text-center text-[10px] uppercase tracking-wide text-forge-text-muted">Start</figcaption></figure>}
      {exercise.imagePeak && <figure><img src={exercise.imagePeak} alt={`${exercise.name} finish position`} className="aspect-square w-full rounded-xl bg-white object-contain" loading="lazy" /><figcaption className="mt-1 text-center text-[10px] uppercase tracking-wide text-forge-text-muted">Finish</figcaption></figure>}
    </div>}
    {exercise.description && <p className="text-sm leading-6 text-forge-text-muted">{exercise.description}</p>}
    <div className="flex flex-wrap gap-2 text-xs">
      {exercise.difficulty && <span className="rounded-full bg-forge-surface-elevated px-2 py-1 text-forge-text-muted">{exercise.difficulty}</span>}
      {exercise.mechanic && <span className="rounded-full bg-forge-surface-elevated px-2 py-1 text-forge-text-muted">{exercise.mechanic}</span>}
      {exercise.primaryMuscles?.map((muscle) => <span key={muscle} className="rounded-full bg-forge-accent-muted px-2 py-1 text-forge-accent">{muscle}</span>)}
    </div>
    {!!exercise.instructions?.length && <div><h3 className="mb-2 text-sm font-semibold text-forge-text">How to perform</h3><ol className="list-decimal space-y-2 pl-5 text-sm leading-5 text-forge-text-muted">{exercise.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol></div>}
    {!!exercise.tips?.length && <div className="rounded-lg bg-forge-accent-muted p-3"><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-forge-accent">Tips</h3><ul className="list-disc space-y-1 pl-4 text-sm text-forge-text-muted">{exercise.tips.map((tip, index) => <li key={index}>{tip}</li>)}</ul></div>}
  </div>;
}


// ---------------------------------------------------------------------------
// Exercise Form (used for Add and Edit)
// ---------------------------------------------------------------------------
function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: StoredExercise;
  onSave: (exercise: StoredExercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "chest");
  const [equipment, setEquipment] = useState(initial?.equipment ?? "Barbell");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(initial?.muscles ?? []);

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? Date.now().toString(),
      name: name.trim(),
      category,
      muscles: selectedMuscles,
      equipment,
    });
  };

  return (
    <Card>
      <h2 className="text-sm font-semibold text-forge-text mb-3">
        {initial ? "Edit Exercise" : "Add Exercise"}
      </h2>
      <div className="space-y-3">
        <Input
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-forge-text-muted font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-forge-text text-sm focus:outline-none focus:border-forge-accent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-forge-text-muted font-medium">Equipment</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-forge-text text-sm focus:outline-none focus:border-forge-accent"
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Muscle multi-select dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-forge-text-muted font-medium">
            Muscles ({selectedMuscles.length} selected)
          </label>
          {selectedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {selectedMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-forge-accent text-white"
                >
                  {muscle}
                  <button
                    type="button"
                    onClick={() => toggleMuscle(muscle)}
                    className="hover:opacity-70"
                    aria-label={`Remove ${muscle}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) toggleMuscle(e.target.value);
            }}
            className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2.5 text-forge-text text-sm focus:outline-none focus:border-forge-accent"
          >
            <option value="">Add muscle...</option>
            {MUSCLE_OPTIONS.filter((m) => !selectedMuscles.includes(m)).map((muscle) => (
              <option key={muscle} value={muscle}>{muscle}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            {initial ? "Save" : "Add Exercise"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors
        ${
          active
            ? "bg-forge-accent text-white"
            : "bg-forge-surface-elevated text-forge-text-muted border border-forge-border hover:border-forge-accent"
        }
      `}
    >
      {label}
    </button>
  );
}
