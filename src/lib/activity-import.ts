import { Decoder, Stream } from "@garmin/fitsdk";
import { addScheduleItem, getScheduleForDate } from "@/lib/schedule";
import { notifyLocalDataChanged } from "@/lib/local-data-events";

export interface ImportedActivity {
  id: string;
  source: "file";
  sourceFormat: "fit" | "tcx" | "gpx" | "csv";
  name: string;
  sport: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  importedAt: string;
}

const KEY = "forge_imported_activities";

export function getImportedActivities(): ImportedActivity[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ImportedActivity[]; } catch { return []; }
}

export async function importActivityFiles(files: File[]): Promise<{ imported: number; skipped: number }> {
  const existing = getImportedActivities();
  const byId = new Map(existing.map((activity) => [activity.id, activity]));
  let imported = 0;
  for (const file of files) {
    const activity = await parseActivity(file);
    if (byId.has(activity.id)) continue;
    byId.set(activity.id, activity); imported += 1;
    const date = activity.startedAt.slice(0, 10);
    if (!getScheduleForDate(date).some((item) => item.actual_session_id === activity.id)) addScheduleItem({ id: crypto.randomUUID(), date, type: "workout", title: activity.name, notes: `${activity.sport} · ${Math.round(activity.durationSeconds / 60)} min${activity.distanceMeters ? ` · ${(activity.distanceMeters / 1000).toFixed(2)} km` : ""} · imported ${activity.sourceFormat.toUpperCase()}`, status: "completed", actual_session_id: activity.id });
  }
  localStorage.setItem(KEY, JSON.stringify([...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))));
  notifyLocalDataChanged();
  return { imported, skipped: files.length - imported };
}

async function parseActivity(file: File): Promise<ImportedActivity> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "fit") return parseFit(file);
  if (extension === "tcx" || extension === "gpx") return parseXml(file, extension);
  if (extension === "csv") return parseCsv(file);
  throw new Error(`${file.name}: use a FIT, TCX, GPX or CSV activity file.`);
}

async function parseFit(file: File): Promise<ImportedActivity> {
  const stream = Stream.fromArrayBuffer(await file.arrayBuffer());
  if (!Decoder.isFIT(stream)) throw new Error(`${file.name}: invalid FIT file.`);
  const { messages, errors } = new Decoder(stream).read();
  const session = (messages.sessionMesgs?.[0] ?? {}) as Record<string, unknown>;
  if (errors.length && !messages.sessionMesgs?.length) throw new Error(`${file.name}: FIT activity could not be decoded.`);
  return makeActivity(file, "fit", stringValue(session.sport, "Activity"), dateValue(session.startTime ?? session.timestamp), numberValue(session.totalTimerTime ?? session.totalElapsedTime), numberValue(session.totalDistance), numberValue(session.avgHeartRate) || undefined, numberValue(session.maxHeartRate) || undefined);
}

async function parseXml(file: File, format: "tcx" | "gpx"): Promise<ImportedActivity> {
  const document = new DOMParser().parseFromString(await file.text(), "application/xml");
  if (document.querySelector("parsererror")) throw new Error(`${file.name}: invalid ${format.toUpperCase()} file.`);
  const points = [...document.querySelectorAll(format === "tcx" ? "Trackpoint" : "trkpt")];
  const times = points.map((point) => point.querySelector("Time,time")?.textContent).filter(Boolean) as string[];
  const start = times[0] ?? document.querySelector("Id,time")?.textContent ?? "";
  const duration = times.length > 1 ? Math.max(0, (Date.parse(times.at(-1)!) - Date.parse(times[0])) / 1000) : numberValue(document.querySelector("TotalTimeSeconds")?.textContent);
  const distance = numberValue(document.querySelector("DistanceMeters")?.textContent) || trackDistance(points);
  const sport = format === "tcx" ? document.querySelector("Activity")?.getAttribute("Sport") ?? "Activity" : document.querySelector("type")?.textContent ?? "Activity";
  return makeActivity(file, format, sport, dateValue(start), duration, distance);
}

async function parseCsv(file: File): Promise<ImportedActivity> {
  const rows = (await file.text()).split(/\r?\n/).filter(Boolean).map(csvRow);
  if (rows.length < 2) throw new Error(`${file.name}: CSV has no activity row.`);
  const headers = rows[0].map(normalizeHeader), values = rows[1];
  const value = (...names: string[]) => values[headers.findIndex((header) => names.includes(header))] ?? "";
  return makeActivity(file, "csv", value("activitytype", "type", "sport") || "Activity", dateValue(value("date", "starttime", "startdate")), durationValue(value("time", "duration", "elapsedtime")), distanceValue(value("distance")), numberValue(value("avgheartrate", "averageheartrate")) || undefined, numberValue(value("maxheartrate", "maximumheartrate")) || undefined, value("title", "activityname", "name"));
}

function makeActivity(file: File, sourceFormat: ImportedActivity["sourceFormat"], sport: string, startedAt: string, durationSeconds: number, distanceMeters: number, averageHeartRate?: number, maxHeartRate?: number, title?: string): ImportedActivity {
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) throw new Error(`${file.name}: activity start time is missing.`);
  const stamp = new Date(startedAt).toISOString();
  return { id: `file:${sourceFormat}:${stamp}:${Math.round(durationSeconds)}:${Math.round(distanceMeters)}`, source: "file", sourceFormat, name: title || `${titleCase(sport)} activity`, sport: titleCase(sport), startedAt: stamp, durationSeconds: Math.max(0, durationSeconds), distanceMeters: Math.max(0, distanceMeters), averageHeartRate, maxHeartRate, importedAt: new Date().toISOString() };
}

function trackDistance(points: Element[]): number { let total = 0, prior: [number, number] | null = null; for (const point of points) { const lat = Number(point.getAttribute("lat") ?? point.querySelector("LatitudeDegrees")?.textContent), lon = Number(point.getAttribute("lon") ?? point.querySelector("LongitudeDegrees")?.textContent); if (Number.isFinite(lat) && Number.isFinite(lon)) { if (prior) total += haversine(prior[0], prior[1], lat, lon); prior = [lat, lon]; } } return total; }
function haversine(a:number,b:number,c:number,d:number){const r=6371000,p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,z=Math.sin(x/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)**2;return 2*r*Math.asin(Math.sqrt(z))}
function csvRow(line:string){const result:string[]=[],pattern=/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;let match;while((match=pattern.exec(line)))result.push(match[1].replace(/^"|"$/g,"").replace(/""/g,'"').trim());return result}
function normalizeHeader(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"")}
function stringValue(value:unknown,fallback:string){return typeof value==="string"&&value?value:fallback}
function numberValue(value:unknown){const parsed=typeof value==="number"?value:Number.parseFloat(String(value??"").replace(/,/g,""));return Number.isFinite(parsed)?parsed:0}
function dateValue(value:unknown){if(value instanceof Date)return value.toISOString();return String(value??"")}
function durationValue(value:string){if(/^\d+:\d\d/.test(value)){const parts=value.split(":").map(Number);return parts.reduce((total,item)=>total*60+item,0)}return numberValue(value)}
function distanceValue(value:string){const amount=numberValue(value);return /km/i.test(value)?amount*1000:/mi/i.test(value)?amount*1609.344:amount}
function titleCase(value:string){return value.replace(/_/g," ").replace(/\b\w/g,(letter)=>letter.toUpperCase())}
