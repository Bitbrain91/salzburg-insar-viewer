export const apiBase =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${apiBase}${url}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function getPointDetail(code: string, track?: number) {
  const query = track ? `?track=${track}` : "";
  return fetchJson(`/api/points/${encodeURIComponent(code)}${query}`);
}

export function getPointTimeseries(code: string, track?: number) {
  const query = track ? `?track=${track}` : "";
  return fetchJson(`/api/points/${encodeURIComponent(code)}/timeseries${query}`);
}

export function getBuildingDetail(source: "gba" | "osm", id: string) {
  const suffix = source === "gba" ? "gba" : "osm";
  return fetchJson(`/api/buildings/${suffix}/${encodeURIComponent(id)}`);
}

export function getBuildingPoints(source: "gba" | "osm", id: string) {
  return fetchJson(`/api/buildings/${source}/${encodeURIComponent(id)}/points`);
}

export function listMlPipelines() {
  return fetchJson(`/api/ml/pipelines`);
}

export function listMlRuns() {
  return fetchJson(`/api/ml/runs`);
}

export function getMlRunDetail(runId: string) {
  return fetchJson(`/api/ml/runs/${encodeURIComponent(runId)}`);
}

export function createMlRun(payload: any) {
  return fetchJson(`/api/ml/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteMlRun(runId: string, force = false) {
  const query = force ? "?force=true" : "";
  return fetchJson(`/api/ml/runs/${encodeURIComponent(runId)}${query}`, {
    method: "DELETE",
  });
}
