"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Play, X, Trash2, Pencil, CalendarPlus } from "lucide-react";
import Link from "next/link";
import {
  getTemplates,
  getExercises,
  saveTemplate,
  getSessions,
  deleteSession,
  type StoredTemplate,
  type StoredExercise,
  type TemplateExerciseConfig,
  type CompletedSession,
} from "@/lib/storage";
import { addScheduleItem } from "@/lib/schedule";

export default function WorkoutsPage() {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setTemplates(getTemplates());
    setSessions(getSessions());
  }, []);

  const handleTemplateCreated = (template: StoredTemplate) => {
    saveTemplate(template);
    setTemplates(getTemplates());
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-forge-text">Strength</h1><p className="text-xs text-forge-text-muted">Strength templates and completed sessions</p></div>
        <Button variant="ghost" size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X size={18} className="mr-1" /> : <Plus size={18} className="mr-1" />}
          {showCreate ? "Cancel" : "New"}
        </Button>
      </div>

      {/* Create Template Form */}
      {showCreate && (
        <TemplateBuilder
          onSave={handleTemplateCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Workout Templates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-forge-text-muted uppercase tracking-wide">
          Templates
        </h2>
        <div className="space-y-2">
        {templates.map((template) => (
            <Card key={template.id} className="grid items-center gap-3 md:grid-cols-[minmax(220px,1fr)_120px_140px_220px]">
              <div className="min-w-0">
                <p className="font-medium text-forge-text">{template.name}</p>
                <p className="text-sm text-forge-text-muted">
                  {template.exercises.slice(0,3).map((exercise) => exercise.exercise_name).join(" · ")}{template.exercises.length > 3 ? ` +${template.exercises.length - 3}` : ""}
                </p>
              </div>
              <div className="text-xs text-forge-text-muted"><span className="md:hidden">Exercises: </span>{template.exercises.length}</div>
              <div className="text-xs text-forge-text-muted"><span className="md:hidden">Est. duration: </span>{Math.round(template.exercises.reduce((sum, exercise) => sum + exercise.sets * (exercise.rest_seconds + 40), 0) / 60)} min</div>
              <div className="flex justify-end gap-2"><Link href={`/workouts/${template.id}/edit`} aria-label={`Edit ${template.name}`} className="rounded-lg border border-forge-border p-2 text-forge-text-muted"><Pencil size={15}/></Link><button aria-label={`Add ${template.name} to calendar`} onClick={() => { const date = prompt("Schedule date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]); if (date) addScheduleItem({ id: crypto.randomUUID(), date, type: "workout", title: template.name, template_id: template.id, status: "planned" }); }} className="rounded-lg border border-forge-border p-2 text-forge-text-muted"><CalendarPlus size={15}/></button><Link href={`/workouts/${template.id}`} className="flex items-center gap-1 rounded-lg bg-forge-accent px-3 text-xs text-white"><Play size={13}/> Start</Link></div>
            </Card>
        ))}
        </div>
      </section>

      {/* Workout History */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-forge-text-muted uppercase tracking-wide">
          History
        </h2>
        {sessions.length === 0 ? (
          <Card>
            <p className="text-forge-text-muted text-sm text-center py-4">
              No workouts logged yet. Start your first session above.
            </p>
          </Card>
        ) : (
          sessions.slice(0, 10).map((session) => (
            <Card key={session.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-forge-text">{session.template_name}</p>
                  <p className="text-xs text-forge-text-muted">
                    {new Date(session.completed_at).toLocaleDateString()} ·{" "}
                    {session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} sets
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-forge-text-muted">
                    {Math.round(
                      (new Date(session.completed_at).getTime() -
                        new Date(session.started_at).getTime()) /
                        60000
                    )}{" "}
                    min
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Delete this workout from history?")) {
                        deleteSession(session.id);
                        setSessions(getSessions());
                      }
                    }}
                    className="p-1 text-forge-text-muted hover:text-forge-danger transition-colors"
                    aria-label="Delete workout"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Builder
// ---------------------------------------------------------------------------
function TemplateBuilder({
  onSave,
  onCancel,
}: {
  onSave: (template: StoredTemplate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<TemplateExerciseConfig[]>([]);
  const [allExercises, setAllExercises] = useState<StoredExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setAllExercises(getExercises());
  }, []);

  const addExerciseToTemplate = (exercise: StoredExercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        sets: 3,
        rep_range: "8-12",
        rest_seconds: 90,
      },
    ]);
    setShowExercisePicker(false);
    setSearchQuery("");
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof TemplateExerciseConfig, value: string | number) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedExercises.length === 0) return;
    const template: StoredTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      exercises: selectedExercises,
      created_at: new Date().toISOString(),
    };
    onSave(template);
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <h2 className="text-sm font-semibold text-forge-text mb-3">New Workout Template</h2>
      <div className="space-y-4">
        {/* Template name */}
        <Input
          placeholder="Template name (e.g. Push Day)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Selected exercises */}
        {selectedExercises.length > 0 && (
          <div className="space-y-2">
            {selectedExercises.map((ex, i) => (
              <div
                key={`${ex.exercise_id}-${i}`}
                className="bg-forge-surface-elevated border border-forge-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-forge-text">
                    {ex.exercise_name}
                  </span>
                  <button
                    onClick={() => removeExercise(i)}
                    className="text-forge-text-muted hover:text-forge-danger"
                    aria-label="Remove exercise"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-forge-text-muted">Sets</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={ex.sets}
                      onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 1)}
                      className="w-full bg-forge-bg border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-forge-text-muted">Reps</label>
                    <input
                      type="text"
                      value={ex.rep_range}
                      onChange={(e) => updateExercise(i, "rep_range", e.target.value)}
                      placeholder="8-12"
                      className="w-full bg-forge-bg border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-forge-text-muted">Rest (s)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={ex.rest_seconds}
                      onChange={(e) => updateExercise(i, "rest_seconds", parseInt(e.target.value) || 60)}
                      className="w-full bg-forge-bg border border-forge-border rounded px-2 py-1 text-sm text-forge-text text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add exercise button / picker */}
        {showExercisePicker ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-forge-text-muted font-medium">Choose exercise</span>
              <button
                onClick={() => { setShowExercisePicker(false); setSearchQuery(""); }}
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
              className="w-full bg-forge-surface-elevated border border-forge-border rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-forge-text-muted/50 focus:outline-none focus:border-forge-accent"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredExercises.slice(0, 15).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExerciseToTemplate(ex)}
                  className="w-full text-left px-3 py-2 text-sm text-forge-text hover:bg-forge-accent-muted rounded-lg transition-colors"
                >
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-xs text-forge-text-muted ml-2">{ex.equipment}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full border border-dashed border-forge-border rounded-lg py-3 text-sm text-forge-text-muted hover:border-forge-accent hover:text-forge-accent transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={14} />
            Add Exercise
          </button>
        )}

        {/* Save */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || selectedExercises.length === 0}
            className="flex-1"
          >
            Save Template
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
