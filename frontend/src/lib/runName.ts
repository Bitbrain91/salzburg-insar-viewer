/**
 * Abgeleitete Anzeigenamen fuer ML-Laeufe. Primaer gilt das vom Nutzer
 * vergebene `label`; ohne Label wird ein sprechender Titel aus Gebiet,
 * Sensor und Track abgeleitet ("{AOI} · {Sensor} T{Track}").
 */

type RunNameSource = {
  label?: string | null;
  area_id?: string | null;
  dataset_id?: string | null;
  track?: number | null;
  run_id?: string;
};

const AREA_LABEL_FALLBACKS: Record<string, string> = {
  salzburg: "Salzburg",
  bad_gastein: "Bad Gastein",
};

export function areaLabelFromId(areaId: string | null | undefined): string {
  if (!areaId) return "Unbekanntes Gebiet";
  return (
    AREA_LABEL_FALLBACKS[areaId] ??
    areaId
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function sensorLabelFromDatasetId(
  datasetId: string | null | undefined
): string | null {
  if (!datasetId) return null;
  const normalized = datasetId.toLowerCase();
  if (normalized.includes("tsx_paz") || normalized.includes("tsx-paz")) return "TSX/PAZ";
  if (normalized.includes("tsx")) return "TSX";
  if (normalized.includes("snt")) return "SNT";
  return null;
}

export function trackLabel(track: number | null | undefined): string {
  return track === null || track === undefined ? "alle Tracks" : `T${track}`;
}

export type DeriveRunTitleOptions = {
  /** Bevorzugtes AOI-Label aus der App-Config (falls geladen). */
  areaLabel?: string | null;
  /** Bevorzugtes Sensor-Kuerzel aus der App-Config (falls geladen). */
  sensor?: string | null;
};

export function deriveRunTitle(
  run: RunNameSource,
  options: DeriveRunTitleOptions = {}
): string {
  const label = run.label?.trim();
  if (label) return label;
  const area = options.areaLabel?.trim() || areaLabelFromId(run.area_id);
  const sensor = options.sensor?.trim() || sensorLabelFromDatasetId(run.dataset_id);
  const parts = [area, [sensor, trackLabel(run.track)].filter(Boolean).join(" ")];
  return parts.filter(Boolean).join(" · ");
}

/** Kurz-ID zur Disambiguierung optisch identischer Laeufe. */
export function shortRunId(runId: string | null | undefined): string {
  return runId ? runId.slice(0, 8) : "—";
}
