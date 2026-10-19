"use client";

import { useState } from "react";
import { Activity, Download, Sparkles, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getImportedActivities, importActivityFiles } from "@/lib/activity-import";

const PREFIXES = ["forge_", "nutrition_"];

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  const [activityCount, setActivityCount] = useState(() => getImportedActivities().length);

  const exportData = () => {
    const data: Record<string, string> = {};
    for (let index = 0; index < localStorage.length; index += 1) { const key = localStorage.key(index); if (key && PREFIXES.some((prefix) => key.startsWith(prefix))) data[key] = localStorage.getItem(key) ?? ""; }
    const blob = new Blob([JSON.stringify({ product: "Forge Starter", version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = `forge-starter-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setMessage("Backup downloaded.");
  };
  const importData = async (file: File) => { try { const parsed = JSON.parse(await file.text()) as { product?: string; data?: Record<string,string> }; if (parsed.product !== "Forge Starter" || !parsed.data) throw new Error(); for (const [key,value] of Object.entries(parsed.data)) if (PREFIXES.some((prefix) => key.startsWith(prefix)) && typeof value === "string") localStorage.setItem(key,value); setMessage("Backup restored. Refreshing…"); window.location.reload(); } catch { setMessage("That file is not a valid Forge Starter backup."); } };
  const importActivities = async (files: File[]) => { try { setMessage("Reading activity files locally…"); const result = await importActivityFiles(files); setActivityCount(getImportedActivities().length); setMessage(`${result.imported} ${result.imported === 1 ? "activity" : "activities"} imported${result.skipped ? ` · ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped` : ""}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "These activity files could not be imported."); } };
  const loadSample = () => { if (localStorage.getItem("forge_sessions") && !confirm("Replace current workout history with synthetic sample data?")) return; const now = new Date(); const sessions = [2,5,9].map((days,index) => { const completed = new Date(now); completed.setDate(completed.getDate()-days); return { id:`sample-${index+1}`,template_id:["push-day","pull-day","leg-day"][index],template_name:["Push Day","Pull Day","Leg Day"][index],started_at:new Date(completed.getTime()-3600000).toISOString(),completed_at:completed.toISOString(),unit:"lbs",exercises:[{exercise_id:["1","4","6"][index],exercise_name:["Bench Press","Barbell Row","Squat"][index],order:0,sets:[{set_number:1,weight_kg:[60,55,80][index],reps:8,rpe:7,completed:true,notes:null},{set_number:2,weight_kg:[62.5,57.5,82.5][index],reps:8,rpe:8,completed:true,notes:null}]}]}; }); localStorage.setItem("forge_sessions",JSON.stringify(sessions)); setMessage("Synthetic sample workouts loaded. Refreshing…"); window.location.reload(); };

  return <div className="mx-auto max-w-2xl space-y-5"><header><h1 className="text-xl font-bold text-forge-text">Local data</h1><p className="text-sm text-forge-text-muted">Forge Starter has no account or cloud database. Your records remain in this browser.</p></header>
    <Card><div className="flex items-start gap-3"><Activity className="text-forge-accent"/><div><h2 className="font-semibold text-forge-text">Import activity files</h2><p className="mt-1 text-xs leading-5 text-forge-text-muted">Bring in FIT, TCX, GPX or CSV activities exported from Garmin Connect or another service. Files are decoded on this device and added to your calendar as completed workouts.</p></div></div><label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-forge-accent px-4 py-2 text-sm font-semibold text-white"><Upload size={15} className="mr-1"/>Choose activity files<input type="file" accept=".fit,.tcx,.gpx,.csv" multiple className="hidden" onChange={(event) => { const files = [...(event.target.files ?? [])]; event.target.value = ""; if (files.length) void importActivities(files); }}/></label><p className="mt-3 text-xs text-forge-text-muted">{activityCount} imported {activityCount === 1 ? "activity" : "activities"} stored locally.</p></Card>
    <Card><h2 className="font-semibold text-forge-text">Backup and restore</h2><p className="mt-1 text-xs text-forge-text-muted">Download regular backups, especially before clearing browser data or changing devices.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={exportData}><Download size={15} className="mr-1"/>Export backup</Button><label className="inline-flex cursor-pointer items-center rounded-lg border border-forge-border px-4 py-2 text-sm text-forge-text"><Upload size={15} className="mr-1"/>Restore backup<input type="file" accept="application/json" className="hidden" onChange={(event) => { const file=event.target.files?.[0]; if(file) void importData(file); }}/></label></div></Card>
    {message && <p role="status" className="rounded-lg bg-forge-accent-muted p-3 text-xs text-forge-accent">{message}</p>}
    <Card><h2 className="font-semibold text-forge-text">Try sample data</h2><p className="mt-1 text-xs text-forge-text-muted">Load three clearly labeled synthetic workouts to explore the interface.</p><Button variant="ghost" className="mt-3" onClick={loadSample}><Sparkles size={15} className="mr-1"/>Load synthetic workouts</Button></Card>
    <Card><h2 className="font-semibold text-forge-text">Starter boundary</h2><p className="mt-1 text-xs leading-5 text-forge-text-muted">Starter imports files locally but does not connect to provider accounts. Forge Online adds authorized sync, cloud storage, proprietary recovery and training intelligence, AI Coach, adaptive plans and community challenges.</p></Card>
  </div>;
}
