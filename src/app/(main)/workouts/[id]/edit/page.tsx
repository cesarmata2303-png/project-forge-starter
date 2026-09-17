"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, X, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  getTemplate,
  getExercises,
  saveTemplate,
  deleteTemplate,
  type StoredTemplate,
  type StoredExercise,
  type TemplateExerciseConfig,
} from "@/lib/storage";

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<TemplateExerciseConfig[]>([]);
  const [allExercises, setAllExercises] = useState<StoredExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const template = getTemplate(id);
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
    }
    setAllExercises(getExercises());
    setLoaded(true);
  }, [id]);

  const addExercise = (exercise: StoredExercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        sets: 3,
        rep_range: "8-12",
        rest_seconds: 90,
      },
    ]);
    setShowPicker(false);
    setSearchQuery("");
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof TemplateExerciseConfig, value: string | number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    setExercises((prev) => {
      const updated = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= updated.length) return prev;
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
  };

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return;
    const template: StoredTemplate = {
      id,
      name: name.trim(),
      exercises,
      created_at: getTemplate(id)?.created_at ?? new Date().toISOString(),
    };
    saveTemplate(template);
    router.push(`/workouts/${id}`);
  };

  const handleDelete = () => {
    if (confirm("Delete this template? This cannot be undone.")) {
      deleteTemplate(id);
      router.push("/workouts");
    }
  };

  if (!loaded) return null;

  const filteredExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forge-text">Edit Template</h1>
        <button
          onClick={handleDelete}
          className="text-forge-danger text-xs hover:underline"
        >
          Delete
        </button>
      </div>

      {/* Template name */}
      <Input
        label="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Exercise list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-forge-text-muted uppercase tracking-wide">
          Exercises ({exercises.length})
        </h2>

        {exercises.map((ex, i) => (
          <div
            key={`${ex.exercise_id}-${i}`}
            className="bg-forge-surface border border-forge-border rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-forge-text">
                {ex.exercise_name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveExercise(i, "up")}
                  disabled={i === 0}
                  className="p-1 text-forge-text-muted hover:text-forge-text disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveExercise(i, "down")}
                  disabled={i === exercises.length - 1}
                  className="p-1 text-forge-text-muted hover:text-forge-text disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => removeExercise(i)}
                  className="p-1 text-forge-text-muted hover:text-forge-danger"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-forge-text-muted">Sets</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={ex.sets}
                  onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 1)}
                  className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-forge-text-muted">Reps</label>
                <input
                  type="text"
                  value={ex.rep_range}
                  onChange={(e) => updateExercise(i, "rep_range", e.target.value)}
                  placeholder="8-12"
                  className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-forge-text-muted">Rest (s)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={ex.rest_seconds}
                  onChange={(e) => updateExercise(i, "rest_seconds", parseInt(e.target.value) || 60)}
                  className="w-full bg-forge-surface-elevated border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add exercise */}
      {showPicker ? (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-forge-text-muted font-medium">Choose exercise</span>
            <button
              onClick={() => { setShowPicker(false); setSearchQuery(""); }}
              className="text-forge-text-muted hover:text-forge-text"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent mb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredExercises.slice(0, 15).map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full text-left px-3 py-2 text-sm text-forge-text hover:bg-forge-accent-muted rounded-lg transition-colors"
              >
                <span className="font-medium">{ex.name}</span>
                <span className="text-xs text-forge-text-muted ml-2">{ex.equipment}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full border border-dashed border-forge-border rounded-lg py-3 text-sm text-forge-text-muted hover:border-forge-accent hover:text-forge-accent transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={14} />
          Add Exercise
        </button>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <Button
          size="md"
          onClick={handleSave}
          disabled={!name.trim() || exercises.length === 0}
          className="flex-1"
        >
          Save Changes
        </Button>
        <Button variant="ghost" size="md" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
