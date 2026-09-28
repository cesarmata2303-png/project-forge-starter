"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getSessions } from "@/lib/storage";

export default function RecoveryPage() {
  const [sessions] = useState(() => getSessions());
  const [now] = useState(() => Date.now());
  const summary = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    const latest = sorted[0];
    const daysSince = latest ? Math.max(0, Math.floor((now - new Date(latest.completed_at).getTime()) / 86400000)) : null;
    const weekStart = now - 7 * 86400000;
    const thisWeek = sorted.filter((session) => new Date(session.completed_at).getTime() >= weekStart);
    const completedSets = thisWeek.reduce((total, session) => total + session.exercises.reduce((exerciseTotal, exercise) => exerciseTotal + exercise.sets.filter((set) => set.completed).length, 0), 0);
    return { latest, daysSince, workoutCount: thisWeek.length, completedSets };
  }, [now, sessions]);

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-forge-accent">Recovery</p><h1 className="text-2xl font-bold text-forge-text">Balance work and rest.</h1><p className="text-sm text-forge-text-muted">A private, local summary based on the workouts saved in this browser.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric value={summary.daysSince == null ? "—" : `${summary.daysSince}d`} label="Since last workout"/><Metric value={`${summary.workoutCount}`} label="Workouts in 7 days"/><Metric value={`${summary.completedSets}`} label="Completed sets in 7 days"/></div>
    <Card><h2 className="font-semibold text-forge-text">Latest training</h2>{summary.latest ? <><p className="mt-3 text-lg font-medium text-forge-text">{summary.latest.template_name}</p><p className="text-xs text-forge-text-muted">{new Date(summary.latest.completed_at).toLocaleDateString()} · {summary.latest.exercises.length} exercises</p></> : <p className="mt-3 text-sm text-forge-text-muted">Complete a workout to begin your local recovery history.</p>}</Card>
    <Card className="border-forge-accent/30 bg-forge-accent-muted"><p className="font-semibold text-forge-text">Need connected recovery signals?</p><p className="mt-1 text-xs text-forge-text-muted">Hosted Forge combines HRV, sleep, resting heart rate, provider readiness and training load. Starter remains fully local and does not collect health data.</p></Card>
  </div>;
}

function Metric({ value, label }: { value: string; label: string }) { return <Card><p className="text-2xl font-bold text-forge-text">{value}</p><p className="text-xs text-forge-text-muted">{label}</p></Card>; }
