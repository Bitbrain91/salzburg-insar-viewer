import type { MlRunSummary } from "../../hooks/useApi";
import { deriveRunTitle, sensorLabelFromDatasetId } from "../../lib/runName";

/** Reine Filter-/Sortier-/Gruppierlogik der Run-Liste (ohne UI). */

export type RunSortOrder = "newest" | "oldest" | "area";

export type RunFilterState = {
  search: string;
  areaId: string; // "all" oder area_id
  sensor: string; // "all", "SNT", "TSX", "TSX/PAZ"
  track: string; // "all" oder Tracknummer als String
  status: "all" | "active" | "succeeded" | "failed";
};

export const initialRunFilters: RunFilterState = {
  search: "",
  areaId: "all",
  sensor: "all",
  track: "all",
  status: "all",
};

export function isRunFilterActive(filters: RunFilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.areaId !== "all" ||
    filters.sensor !== "all" ||
    filters.track !== "all" ||
    filters.status !== "all"
  );
}

function matchesStatus(run: MlRunSummary, status: RunFilterState["status"]): boolean {
  if (status === "all") return true;
  if (status === "active") return run.status === "queued" || run.status === "running";
  return run.status === status;
}

function matchesSearch(run: MlRunSummary, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    run.label,
    deriveRunTitle(run),
    run.run_id,
    run.area_id,
    run.dataset_id,
    run.experiment_id,
    run.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle.toLowerCase());
}

export function filterRuns(
  runs: MlRunSummary[],
  filters: RunFilterState
): MlRunSummary[] {
  const needle = filters.search.trim();
  return runs.filter((run) => {
    if (filters.areaId !== "all" && run.area_id !== filters.areaId) return false;
    if (
      filters.sensor !== "all" &&
      sensorLabelFromDatasetId(run.dataset_id) !== filters.sensor
    ) {
      return false;
    }
    if (filters.track !== "all") {
      if (String(run.track ?? "") !== filters.track) return false;
    }
    if (!matchesStatus(run, filters.status)) return false;
    if (!matchesSearch(run, needle)) return false;
    return true;
  });
}

export function sortRuns(runs: MlRunSummary[], order: RunSortOrder): MlRunSummary[] {
  const sorted = [...runs];
  if (order === "oldest") {
    sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } else if (order === "area") {
    sorted.sort(
      (a, b) =>
        (a.area_id ?? "").localeCompare(b.area_id ?? "") ||
        b.created_at.localeCompare(a.created_at)
    );
  } else {
    sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return sorted;
}

export type RunGroup = { key: string; label: string; runs: MlRunSummary[] };

const dayFormat = new Intl.DateTimeFormat("de-AT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function dayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unbekanntes Datum";
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const key = dayKey(iso);
  if (key === today) return "Heute";
  if (key === yesterday) return "Gestern";
  return dayFormat.format(date);
}

/** Gruppiert (bereits sortierte) Laeufe nach Kalendertag. */
export function groupRunsByDay(runs: MlRunSummary[], now = new Date()): RunGroup[] {
  const groups: RunGroup[] = [];
  for (const run of runs) {
    const key = dayKey(run.created_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.runs.push(run);
    } else {
      groups.push({ key, label: dayLabel(run.created_at, now), runs: [run] });
    }
  }
  return groups;
}

/** Verfuegbare Filteroptionen aus den vorhandenen Laeufen ableiten. */
export function runFilterOptions(runs: MlRunSummary[]) {
  const areas = new Map<string, number>();
  const sensors = new Map<string, number>();
  const tracks = new Map<string, number>();
  for (const run of runs) {
    if (run.area_id) areas.set(run.area_id, (areas.get(run.area_id) ?? 0) + 1);
    const sensor = sensorLabelFromDatasetId(run.dataset_id);
    if (sensor) sensors.set(sensor, (sensors.get(sensor) ?? 0) + 1);
    if (run.track !== null && run.track !== undefined) {
      const key = String(run.track);
      tracks.set(key, (tracks.get(key) ?? 0) + 1);
    }
  }
  return {
    areas: [...areas.keys()].sort(),
    sensors: [...sensors.keys()].sort(),
    tracks: [...tracks.keys()].sort((a, b) => Number(a) - Number(b)),
  };
}
