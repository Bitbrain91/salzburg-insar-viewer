import { Eye, EyeOff, Hexagon, RotateCcw, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MlBuildingAnalysis,
  MlBuildingClusterSummary,
} from "../../../hooks/useApi";
import { clusterColor } from "../../../lib/clusterColor";
import {
  fmtNum,
  fmtNumDe,
  formatLabelCounts,
  formatSignedTrackMotion,
  shortClusterId,
} from "../../../lib/formatters";
import {
  isV3ModelSetVersion,
  V3_ANNEX_CLASSIFICATION_NOTE,
} from "../../../lib/mlClusterKind";
import {
  useAppStore,
  type MlBuildingPointFocusMode,
  type MlBuildingTrackFilter,
} from "../../../lib/store";
import {
  Badge,
  Button,
  KindBadge,
  Label as UiLabel,
  SegmentedTabs,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui";

const buildingPointFocusOptions: Array<{
  id: MlBuildingPointFocusMode;
  label: string;
  title: string;
}> = [
  { id: "run", label: "Run", title: "Alle Punkte des aktiven ML-Laufs anzeigen." },
  {
    id: "building",
    label: "Gebäude",
    title: "Nur Punkte anzeigen, die diesem Gebäude im aktiven Lauf zugeordnet wurden.",
  },
  {
    id: "scored",
    label: "Scoring",
    title: "Nur nicht gate-ausgeschlossene Punkte dieses Gebäudes anzeigen.",
  },
  {
    id: "cluster",
    label: "Cluster",
    title: "Nur Core-Clusterpunkte dieses Gebäudes anzeigen.",
  },
];

type PointRecord = Record<string, unknown>;

export type ClusterSectionProps = {
  analysis: MlBuildingAnalysis;
  trackOptions: Array<{ value: MlBuildingTrackFilter; label: string }>;
  pointsByCluster: Map<string, PointRecord[]>;
  pointsLoading: boolean;
  isSelectedPoint: (point: PointRecord) => boolean;
  onFocusPoint: (point: PointRecord, cluster: MlBuildingClusterSummary) => void;
  onEndFocus: () => void;
};

/**
 * "Bewegungsmuster am Gebäude": interaktive Cluster-Karten mit
 * Karten-Highlight (hoveredClusterId) und den bestehenden
 * Sichtbarkeits-/Fokus-Steuerungen. Foreign-/Noise-Cluster stehen in einer
 * gedämpften Untergruppe und tragen keinen prominenten Bewegungswert.
 */
export function ClusterSection({
  analysis,
  trackOptions,
  pointsByCluster,
  pointsLoading,
  isSelectedPoint,
  onFocusPoint,
  onEndFocus,
}: ClusterSectionProps) {
  const mlBuildingTrackFilter = useAppStore((state) => state.mlBuildingTrackFilter);
  const setMlBuildingTrackFilter = useAppStore((state) => state.setMlBuildingTrackFilter);
  const mlBuildingShowExcluded = useAppStore((state) => state.mlBuildingShowExcluded);
  const setMlBuildingShowExcluded = useAppStore(
    (state) => state.setMlBuildingShowExcluded
  );
  const mlBuildingShowHulls = useAppStore((state) => state.mlBuildingShowHulls);
  const setMlBuildingShowHulls = useAppStore((state) => state.setMlBuildingShowHulls);
  const mlBuildingShowNoise = useAppStore((state) => state.mlBuildingShowNoise);
  const setMlBuildingShowNoise = useAppStore((state) => state.setMlBuildingShowNoise);
  const mlBuildingVisibleClusterIds = useAppStore(
    (state) => state.mlBuildingVisibleClusterIds
  );
  const setMlBuildingVisibleClusterIds = useAppStore(
    (state) => state.setMlBuildingVisibleClusterIds
  );
  const mlBuildingPointFocusMode = useAppStore((state) => state.mlBuildingPointFocusMode);
  const setMlBuildingPointFocusMode = useAppStore(
    (state) => state.setMlBuildingPointFocusMode
  );
  const toggleMlBuildingClusterVisibility = useAppStore(
    (state) => state.toggleMlBuildingClusterVisibility
  );
  const resetMlBuildingClusterVisibility = useAppStore(
    (state) => state.resetMlBuildingClusterVisibility
  );
  const setHoveredClusterId = useAppStore((state) => state.setHoveredClusterId);

  const clusters = analysis.clusters;
  const isV3Model = isV3ModelSetVersion(analysis.model_set_version);
  const hasAnnexCluster = clusters.some((cluster) => cluster.cluster_kind === "annex");
  const clusterIds = clusters.map((cluster) => cluster.cluster_id);
  const clusterPointCount = clusters
    .filter((cluster) => cluster.cluster_role === "core")
    .reduce((sum, cluster) => sum + cluster.point_count, 0);
  const visibleSet =
    mlBuildingVisibleClusterIds === null ? null : new Set(mlBuildingVisibleClusterIds);
  const effectiveShowExcluded =
    mlBuildingPointFocusMode === "scored" || mlBuildingPointFocusMode === "cluster"
      ? false
      : mlBuildingShowExcluded;
  const effectiveShowNoise =
    mlBuildingPointFocusMode === "cluster" ? false : mlBuildingShowNoise;
  const isClusterVisible = (cluster: MlBuildingClusterSummary) =>
    (mlBuildingPointFocusMode !== "cluster" || cluster.cluster_role === "core") &&
    (visibleSet === null || visibleSet.has(cluster.cluster_id)) &&
    (effectiveShowNoise || cluster.cluster_role !== "noise");
  const visibleClusterCount = clusters.filter(isClusterVisible).length;
  const mainClusterIds = new Set(
    clusters.filter((cluster) => cluster.is_main_cluster).map((cluster) => cluster.cluster_id)
  );
  const isClusterFilterActive = mlBuildingVisibleClusterIds !== null;
  const hasNoisePoints = analysis.noise_point_count > 0;
  const focusOptions = buildingPointFocusOptions.map((option) => ({
    ...option,
    count:
      option.id === "building"
        ? analysis.point_count
        : option.id === "scored"
          ? analysis.kept_point_count
          : option.id === "cluster"
            ? clusterPointCount
            : undefined,
  }));

  // Fachliche Regel: Fremdreflektoren und Rausch-/ausgeschlossene Cluster
  // prägen den Befund nicht — sie stehen in der gedämpften Untergruppe.
  const isSecondary = (cluster: MlBuildingClusterSummary) =>
    cluster.cluster_kind === "foreign" ||
    cluster.cluster_role === "noise" ||
    cluster.cluster_role === "excluded";
  const sortClusters = (list: MlBuildingClusterSummary[]) =>
    [...list].sort(
      (a, b) =>
        Number(b.is_main_cluster) - Number(a.is_main_cluster) ||
        (a.cluster_rank ?? 99) - (b.cluster_rank ?? 99)
    );
  const primaryClusters = sortClusters(clusters.filter((c) => !isSecondary(c)));
  const secondaryClusters = sortClusters(clusters.filter(isSecondary));

  const renderPointList = (cluster: MlBuildingClusterSummary) => {
    if (pointsLoading) {
      return (
        <div className="mt-2 text-xs text-muted-foreground">Punktliste wird geladen…</div>
      );
    }
    const points = pointsByCluster.get(cluster.cluster_id) ?? [];
    if (!points.length) {
      return (
        <div className="mt-2 text-xs text-muted-foreground">
          Keine Punktliste für dieses Cluster geladen.
        </div>
      );
    }
    const labelCounts = points.reduce<Record<string, number>>((acc, point) => {
      const label =
        typeof point.label === "string" && point.label ? point.label : "unlabeled";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <details className="mt-2 rounded-md border border-border bg-card px-2 py-1.5">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">
          {points.length} Punkte anzeigen · {formatLabelCounts(labelCounts)}
        </summary>
        <div className="mt-2 grid max-h-48 gap-1 overflow-auto pr-1">
          {points.map((point) => {
            const code = String(point.code ?? "—");
            const track = String(point.track ?? "—");
            const quality = typeof point.quality_score === "number" ? point.quality_score : null;
            const anomaly = typeof point.anomaly_score === "number" ? point.anomaly_score : null;
            const label = typeof point.label === "string" && point.label ? point.label : "—";
            const isSelected = isSelectedPoint(point);
            return (
              <button
                key={`${code}-${track}`}
                type="button"
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-sm border px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-secondary hover:border-primary/50"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onFocusPoint(point, cluster);
                }}
              >
                <span className="min-w-0 break-all font-mono text-foreground">
                  {code} · T{track}
                </span>
                <span className="font-mono text-muted-foreground">
                  {label} · Q {fmtNumDe(quality)} · A {fmtNumDe(anomaly)}
                </span>
              </button>
            );
          })}
        </div>
      </details>
    );
  };

  const renderClusterCard = (
    cluster: MlBuildingClusterSummary,
    options: { secondary?: boolean } = {}
  ) => {
    const isVisible = isClusterVisible(cluster);
    return (
      <div
        key={`${cluster.track}-${cluster.cluster_id}`}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setHoveredClusterId(cluster.cluster_id)}
        onMouseLeave={() => setHoveredClusterId(null)}
        onClick={() => {
          setMlBuildingVisibleClusterIds([cluster.cluster_id]);
          if (cluster.cluster_role === "noise") {
            setMlBuildingShowNoise(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setMlBuildingVisibleClusterIds([cluster.cluster_id]);
          }
        }}
        title="Nur dieses Cluster auf der Karte anzeigen"
        className={cn(
          "cursor-pointer rounded-md border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isVisible
            ? "border-border bg-card hover:border-primary/40"
            : "border-border bg-secondary/60 opacity-70",
          options.secondary && "opacity-70"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
            <span
              className="mt-1 h-3.5 w-3.5 rounded-sm border border-white shadow-sm"
              style={{ backgroundColor: clusterColor(cluster) }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span
                  className="min-w-0 break-all font-mono text-xs font-bold text-foreground"
                  title={cluster.cluster_id}
                >
                  {shortClusterId(cluster.cluster_id)}
                </span>
                {cluster.is_main_cluster && <Badge>★ Hauptcluster</Badge>}
                <Badge variant="secondary">T{cluster.track}</Badge>
                <KindBadge
                  kind={cluster.cluster_kind}
                  modelSetVersion={analysis.model_set_version}
                />
              </div>
              {!options.secondary ? (
                <div className="mt-1.5 text-xs text-foreground">
                  <span className="font-mono font-semibold">
                    {formatSignedTrackMotion(cluster.median_vertical_proxy_mm_a)}
                  </span>{" "}
                  · {cluster.point_count} Punkte · Zuverlässigkeit{" "}
                  <span className="font-mono">{fmtNumDe(cluster.cluster_reliability_score)}</span>
                </div>
              ) : (
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {cluster.point_count} Punkte · Rolle {cluster.cluster_role}
                </div>
              )}
              {!options.secondary &&
                cluster.motion_delta_to_main_mm_a !== null &&
                !cluster.is_main_cluster && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Δ zum Hauptcluster{" "}
                    <span className="font-mono text-foreground">
                      {formatSignedTrackMotion(cluster.motion_delta_to_main_mm_a)}
                    </span>
                  </div>
                )}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant={isVisible ? "outline" : "secondary"}
            className="h-7 w-7 shrink-0"
            onClick={(event) => {
              event.stopPropagation();
              toggleMlBuildingClusterVisibility(cluster.cluster_id, clusterIds);
            }}
            aria-label={isVisible ? "Cluster ausblenden" : "Cluster anzeigen"}
            title={isVisible ? "Cluster ausblenden" : "Cluster anzeigen"}
          >
            {isVisible ? (
              <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <div onClick={(event) => event.stopPropagation()}>{renderPointList(cluster)}</div>
      </div>
    );
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="section-title !mt-0">Bewegungsmuster am Gebäude</div>
        <span className="text-xs text-muted-foreground">
          {clusters.length ? `${visibleClusterCount} von ${clusters.length} sichtbar` : ""}
        </span>
      </div>

      {clusters.length === 0 && (
        <div className="pill">Keine Cluster für diesen aktiven Lauf vorhanden.</div>
      )}

      {isV3Model && hasAnnexCluster && (
        <div className="pill warning">Annex: {V3_ANNEX_CLASSIFICATION_NOTE}</div>
      )}

      <div className="space-y-1.5">
        <UiLabel>Kartenfokus</UiLabel>
        <SegmentedTabs
          options={focusOptions}
          value={mlBuildingPointFocusMode}
          onChange={setMlBuildingPointFocusMode}
          ariaLabel="Kartenfokus für Gebäude-ML-Punkte"
          compact
          layout="grid"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          value={mlBuildingTrackFilter}
          onValueChange={(value) =>
            setMlBuildingTrackFilter(value as MlBuildingTrackFilter)
          }
        >
          <SelectTrigger
            aria-label="Track-Filter"
            className="h-7 w-auto gap-1 rounded-full border-border bg-secondary px-2.5 py-0 text-[11px] font-medium"
          >
            <SelectValue placeholder="Track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Tracks</SelectItem>
            {trackOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <IconToggle
          active={mlBuildingShowHulls}
          onClick={() => setMlBuildingShowHulls(!mlBuildingShowHulls)}
          label={mlBuildingShowHulls ? "Cluster-Hüllen ausblenden" : "Cluster-Hüllen anzeigen"}
        >
          <Hexagon className="h-3.5 w-3.5" />
        </IconToggle>
        <IconToggle
          active={effectiveShowExcluded}
          disabled={
            mlBuildingPointFocusMode === "scored" || mlBuildingPointFocusMode === "cluster"
          }
          onClick={() => setMlBuildingShowExcluded(!mlBuildingShowExcluded)}
          label={
            effectiveShowExcluded
              ? "Gate-ausgeschlossene Punkte ausblenden"
              : "Gate-ausgeschlossene Punkte anzeigen"
          }
        >
          <X className="h-3.5 w-3.5" />
        </IconToggle>
        <IconToggle
          active={effectiveShowNoise}
          disabled={!hasNoisePoints || mlBuildingPointFocusMode === "cluster"}
          onClick={() => setMlBuildingShowNoise(!mlBuildingShowNoise)}
          label={effectiveShowNoise ? "Rauschen ausblenden" : "Rauschen anzeigen"}
        >
          {effectiveShowNoise ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </IconToggle>

        <button
          type="button"
          onClick={resetMlBuildingClusterVisibility}
          disabled={
            !isClusterFilterActive &&
            (mlBuildingPointFocusMode === "cluster" || effectiveShowNoise)
          }
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3 w-3" />
          Alle
        </button>
        <button
          type="button"
          onClick={() =>
            setMlBuildingVisibleClusterIds(
              clusterIds.filter((clusterId) => mainClusterIds.has(clusterId))
            )
          }
          disabled={mainClusterIds.size === 0}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className="h-3 w-3" />
          Nur Hauptcluster
        </button>
        <button
          type="button"
          onClick={onEndFocus}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3 w-3" />
          Fokus beenden
        </button>
      </div>

      {primaryClusters.length > 0 && (
        <div className="grid gap-2">{primaryClusters.map((c) => renderClusterCard(c))}</div>
      )}

      {secondaryClusters.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Nicht befundrelevant
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Fremdreflektoren fließen nicht in den Gebäudebefund ein.
          </p>
          <div className="grid gap-2">
            {secondaryClusters.map((c) => renderClusterCard(c, { secondary: true }))}
          </div>
        </div>
      )}
    </section>
  );
}

function IconToggle({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-grid h-7 w-7 place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-secondary text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {children}
    </button>
  );
}
