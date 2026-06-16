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
import { Button, Input } from "./ui";

function resultTypeLabel(result: SearchResult) {
  if (result.result_type === "point") return "Punkt";
  if (result.result_type === "building") return result.source === "gba" ? "GBA" : "Gebäude";
  if (result.result_type === "ml_run") return "ML Run";
  return result.external ? "Adresse" : "OSM";
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
    (selection.source === "gba" || selection.source === "osm") &&
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
    <div className="search-panel">
      <div className="search-panel-header">
        <span className="badge">Salzburg InSAR Viewer</span>
        <span className="text-muted-foreground">Multi-Source-Bewegungsanalytik</span>
      </div>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <Search aria-hidden="true" className="search-input-icon" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, ML Run oder Adresse"
            aria-label="ID, ML Run oder Adresse suchen"
            className="search-input"
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
        <div className="search-results">
          {error && <div className="search-message warning">{error}</div>}
          {showEmptyState && (
            <div className="search-message">Keine Treffer für {lastQuery}</div>
          )}
          {fallbackUsed && results.length > 0 && (
            <div className="search-message">Externer Adresstreffer</div>
          )}
          {results.map((result) => (
            <button
              key={`${result.result_type}:${result.id}`}
              type="button"
              className="search-result"
              onClick={() => applyResult(result)}
            >
              <span className="search-result-icon">
                <ResultIcon result={result} />
              </span>
              <span className="search-result-body">
                <span className="search-result-title">
                  <span>{result.label}</span>
                  <span className="search-result-kind">{resultTypeLabel(result)}</span>
                </span>
                {result.subtitle && (
                  <span className="search-result-subtitle">{result.subtitle}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
