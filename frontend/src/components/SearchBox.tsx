import { FormEvent, useRef, useState } from "react";
import {
  BrainCircuit,
  Building2,
  CircleDot,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { searchTargets, type SearchResult, type SearchResultSelection } from "../hooks/useApi";
import { useAppStore, type SearchFocus, type Selection } from "../lib/store";
import { Badge, Button, Input } from "./ui";
import { cn } from "@/lib/utils";

function resultTypeLabel(result: SearchResult) {
  if (result.result_type === "point") return "Punkt";
  if (result.result_type === "building" && result.source === "bev") return "BEV";
  if (result.result_type === "building") return result.source === "gba" ? "GBA" : "Gebäude";
  if (result.result_type === "ml_run") return "ML-Lauf";
  return result.external ? "Adresse" : "OSM";
}

function SearchMessage({
  children,
  warning = false,
}: {
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-[7px] text-[11px] leading-snug [overflow-wrap:anywhere]",
        warning
          ? "border-warning/30 bg-warning/15 text-warning"
          : "border-border bg-secondary text-muted-foreground"
      )}
    >
      {children}
    </div>
  );
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.result_type === "point") return <CircleDot aria-hidden="true" />;
  if (result.result_type === "building") return <Building2 aria-hidden="true" />;
  if (result.result_type === "ml_run") return <BrainCircuit aria-hidden="true" />;
  return <MapPin aria-hidden="true" />;
}

function parseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Suche fehlgeschlagen";
  try {
    const parsed = JSON.parse(error.message) as { detail?: string };
    if (parsed.detail) return parsed.detail;
  } catch {
    // Use the raw error message below.
  }
  return error.message || "Suche fehlgeschlagen";
}

function asBbox(value: number[] | null | undefined): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const bbox = value.map((item) => Number(item));
  if (bbox.some((item) => !Number.isFinite(item))) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (minLon >= maxLon || minLat >= maxLat) return null;
  return [minLon, minLat, maxLon, maxLat];
}

function normalizeSelection(selection: SearchResultSelection | null | undefined): Selection {
  if (!selection) return null;
  if (selection.type === "point") {
    if (!selection.code || !selection.areaId || !selection.datasetId) return null;
    return {
      type: "point",
      code: selection.code,
      track:
        selection.track === undefined || selection.track === null
          ? undefined
          : Number(selection.track),
      areaId: selection.areaId,
      datasetId: selection.datasetId,
      sensor: selection.sensor ?? undefined,
    };
  }
  if (
    selection.type === "building" &&
    (selection.source === "bev" || selection.source === "gba" || selection.source === "osm") &&
    selection.id &&
    selection.areaId
  ) {
    return {
      type: "building",
      source: selection.source,
      id: selection.id,
      areaId: selection.areaId,
    };
  }
  return null;
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const requestCounterRef = useRef(0);
  const selectedAreaId = useAppStore((state) => state.selectedAreaId);
  const setSelectedAreaId = useAppStore((state) => state.setSelectedAreaId);
  const setSelection = useAppStore((state) => state.setSelection);
  const setActiveRunId = useAppStore((state) => state.setActiveRunId);
  const setSearchFocus = useAppStore((state) => state.setSearchFocus);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setError(null);
    setFallbackUsed(false);
    if (trimmed.length < 2) {
      setResults([]);
      setLastQuery("");
      return;
    }
    setIsLoading(true);
    try {
      const response = await searchTargets(trimmed, {
        areaId: selectedAreaId,
        limit: 12,
        includeExternal: true,
      });
      setResults(response.results);
      setFallbackUsed(response.external_fallback_used);
      setLastQuery(response.query);
    } catch (err) {
      setResults([]);
      setLastQuery(trimmed);
      setError(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setError(null);
    setFallbackUsed(false);
    setLastQuery("");
  }

  function applyResult(result: SearchResult) {
    if (result.area_id) {
      setSelectedAreaId(result.area_id);
    }

    if (result.result_type === "ml_run" && result.run_id) {
      setSelection(null);
      setActiveRunId(result.run_id);
    } else {
      setSelection(normalizeSelection(result.selection));
    }

    requestCounterRef.current += 1;
    const focus: SearchFocus = {
      requestId: Date.now() + requestCounterRef.current,
      resultType: result.result_type,
      label: result.label,
      areaId: result.area_id ?? null,
      center: result.center ?? null,
      bbox: asBbox(result.bbox),
      external: result.external,
    };
    setSearchFocus(focus);
    window.dispatchEvent(new CustomEvent("insar:search-focus", { detail: focus }));
  }

  const hasQuery = query.trim().length > 0;
  const showEmptyState = !isLoading && !error && lastQuery && results.length === 0;

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <Badge>Salzburg InSAR Viewer</Badge>
        <span className="text-muted-foreground">Multi-Source-Bewegungsanalytik</span>
      </div>
      <form
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5"
        onSubmit={handleSubmit}
      >
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, ML-Lauf oder Adresse"
            aria-label="ID, ML-Lauf oder Adresse suchen"
            className="pl-[34px]"
          />
        </div>
        {hasQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            aria-label="Suche löschen"
          >
            <X aria-hidden="true" />
          </Button>
        )}
        <Button type="submit" size="icon" disabled={isLoading || query.trim().length < 2} aria-label="Suchen">
          {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
        </Button>
      </form>

      {(results.length > 0 || error || showEmptyState) && (
        <div className="grid max-h-[min(380px,calc(100vh-170px))] gap-1.5 overflow-y-auto overscroll-contain pt-0.5">
          {error && <SearchMessage warning>{error}</SearchMessage>}
          {showEmptyState && (
            <SearchMessage>Keine Treffer für {lastQuery}</SearchMessage>
          )}
          {fallbackUsed && results.length > 0 && (
            <SearchMessage>Externer Adresstreffer</SearchMessage>
          )}
          {results.map((result) => (
            <button
              key={`${result.result_type}:${result.id}`}
              type="button"
              className="grid w-full min-w-0 grid-cols-[30px_minmax(0,1fr)] items-start gap-2 rounded-md border border-border bg-card/95 p-2 text-left text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => applyResult(result)}
            >
              <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md bg-secondary text-primary [&_svg]:h-4 [&_svg]:w-4">
                <ResultIcon result={result} />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="flex min-w-0 items-baseline justify-between gap-2 text-[13px] font-bold leading-tight">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{result.label}</span>
                  <span className="flex-none text-[10px] uppercase leading-tight tracking-[0.6px] text-muted-foreground">
                    {resultTypeLabel(result)}
                  </span>
                </span>
                {result.subtitle && (
                  <span className="min-w-0 text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                    {result.subtitle}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
