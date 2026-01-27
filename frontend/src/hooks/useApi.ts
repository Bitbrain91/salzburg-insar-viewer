export const apiBase = import.meta.env.VITE_API_URL || "";

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${apiBase}${url}`);
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
