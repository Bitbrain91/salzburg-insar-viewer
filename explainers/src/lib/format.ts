/** Deutsche Zahlformatierung (Dezimal-Komma) für alle angezeigten Werte. */

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Score 0..1 mit zwei Nachkommastellen, z. B. "0,62". */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return formatNumber(Math.min(Math.max(value, 0), 1), 2);
}

/** Millimeter pro Jahr mit Vorzeichen, z. B. "+2,7 mm/a". */
export function formatMmPerYear(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)} mm/a`;
}

/** Meter, z. B. "15,9 m". */
export function formatMeters(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)} m`;
}

/** Grad, z. B. "38,5°". */
export function formatDegrees(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}°`;
}

/** Prozent aus Anteil 0..1, z. B. "50 %". */
export function formatPercent(value: number, digits = 0): string {
  return `${formatNumber(value * 100, digits)} %`;
}
