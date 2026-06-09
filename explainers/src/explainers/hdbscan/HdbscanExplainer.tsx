import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Badge, Button, Card, Slider } from "@/components/ui";
import { cn } from "@/lib/utils";

type Phase = "features" | "density" | "hierarchy" | "result";
type PointRole = "unassigned" | "core" | "border" | "noise" | "fallback-core" | "fallback-noise";

type DiagramPoint = {
  id: string;
  x: number;
  y: number;
  featureNote: string;
  fallbackRole?: "core" | "noise";
};

type Scenario = {
  id: string;
  name: string;
  building: string;
  track: number;
  message: string;
  points: DiagramPoint[];
};

type Cluster = {
  id: number;
  memberIds: string[];
  coreIds: string[];
};

type DensitySnapshot = {
  clusters: Cluster[];
  roles: Map<string, PointRole>;
  neighbourCounts: Map<string, number>;
};

const phases: Array<{ id: Phase; label: string; title: string; detail: string }> = [
  {
    id: "features",
    label: "1. Features",
    title: "Punkte im lokalen Merkmalsraum",
    detail:
      "Die Pipeline betrachtet immer nur ein Gebäude und einen Track. Im Code sind es sechs robuste Features; die Grafik reduziert sie zum Verständnis auf zwei Dimensionen.",
  },
  {
    id: "density",
    label: "2. Dichte",
    title: "Dichte Nachbarschaften statt vorgegebener Clusterzahl",
    detail:
      "Klicke einen Punkt an und ändere den Demonstrationsradius. Kernpunkte haben ausreichend Nachbarn; isolierte Punkte werden Noise-Kandidaten.",
  },
  {
    id: "hierarchy",
    label: "3. Hierarchie",
    title: "Cluster über mehrere Dichteskalen",
    detail:
      "HDBSCAN untersucht eine Dichtehierarchie. Gruppen, die über viele Skalen bestehen bleiben, sind stabiler als kurzlebige Verbindungen.",
  },
  {
    id: "result",
    label: "4. Ergebnis",
    title: "Stabile Cluster und Noise-Markierung",
    detail:
      "Im Backend werden Clusterzugehörigkeit, Membership-Probability und Outlier-Score weiter in Anomaly- und Quality-Scores einbezogen.",
  },
];

const hierarchyRadii = [28, 38, 48, 58, 68, 78, 88];
const clusterColours = ["#087f73", "#3172a8", "#6b55a3", "#c16a2f"];

const scenarios: Scenario[] = [
  {
    id: "zones",
    name: "Zwei Reflexionszonen",
    building: "Beispielgebäude A",
    track: 44,
    message: "Zwei dichte Teilgruppen können z. B. Dach und Balkon repräsentieren.",
    points: [
      { id: "A1", x: 166, y: 128, featureNote: "Dachzone, konsistente Bewegung" },
      { id: "A2", x: 190, y: 115, featureNote: "Dachzone, hohe Kohärenz" },
      { id: "A3", x: 206, y: 142, featureNote: "Dachzone, konsistente Bewegung" },
      { id: "A4", x: 177, y: 154, featureNote: "Dachzone, nahe Nachbarschaft" },
      { id: "A5", x: 225, y: 124, featureNote: "Dachzone, nahe Nachbarschaft" },
      { id: "A6", x: 211, y: 168, featureNote: "Dachzone, Randpunkt" },
      { id: "A7", x: 147, y: 151, featureNote: "Dachzone, Randpunkt" },
      { id: "A8", x: 196, y: 184, featureNote: "Dachzone, Randpunkt" },
      { id: "B1", x: 442, y: 235, featureNote: "Balkonzone, anderes Bewegungsniveau" },
      { id: "B2", x: 469, y: 221, featureNote: "Balkonzone, hohe Kohärenz" },
      { id: "B3", x: 489, y: 249, featureNote: "Balkonzone, konsistente Bewegung" },
      { id: "B4", x: 454, y: 264, featureNote: "Balkonzone, nahe Nachbarschaft" },
      { id: "B5", x: 508, y: 225, featureNote: "Balkonzone, Randpunkt" },
      { id: "B6", x: 480, y: 282, featureNote: "Balkonzone, Randpunkt" },
      { id: "B7", x: 426, y: 255, featureNote: "Balkonzone, Randpunkt" },
      { id: "N1", x: 329, y: 82, featureNote: "Isolierter Reflektor" },
      { id: "N2", x: 596, y: 105, featureNote: "Punkt eines Nachbarobjekts" },
      { id: "N3", x: 306, y: 324, featureNote: "Ungewöhnliche Bewegung" },
      { id: "N4", x: 635, y: 313, featureNote: "Isolierter Reflektor" },
      { id: "N5", x: 103, y: 295, featureNote: "Punkt eines Nachbarobjekts" },
    ],
  },
  {
    id: "one-cluster",
    name: "Kernzone mit Noise",
    building: "Beispielgebäude B",
    track: 95,
    message: "Eine dominante Reflexionszone bleibt erhalten; einzelne Punkte werden Noise.",
    points: [
      { id: "C1", x: 296, y: 188, featureNote: "Stabile Kernzone" },
      { id: "C2", x: 321, y: 174, featureNote: "Stabile Kernzone" },
      { id: "C3", x: 347, y: 190, featureNote: "Stabile Kernzone" },
      { id: "C4", x: 280, y: 215, featureNote: "Stabile Kernzone" },
      { id: "C5", x: 312, y: 218, featureNote: "Stabile Kernzone" },
      { id: "C6", x: 343, y: 221, featureNote: "Stabile Kernzone" },
      { id: "C7", x: 367, y: 208, featureNote: "Stabile Kernzone" },
      { id: "C8", x: 296, y: 245, featureNote: "Randpunkt" },
      { id: "C9", x: 335, y: 248, featureNote: "Randpunkt" },
      { id: "C10", x: 375, y: 238, featureNote: "Randpunkt" },
      { id: "M1", x: 139, y: 112, featureNote: "Unplausible räumliche Lage" },
      { id: "M2", x: 541, y: 130, featureNote: "Stark abweichende Bewegung" },
      { id: "M3", x: 174, y: 321, featureNote: "Isolierter Reflektor" },
      { id: "M4", x: 565, y: 299, featureNote: "Isolierter Reflektor" },
    ],
  },
  {
    id: "small-n",
    name: "Wenige Punkte",
    building: "Kleines Gebäude C",
    track: 44,
    message: "Mit nur fünf kept Punkten verwendet dieses Repo bewusst nicht HDBSCAN.",
    points: [
      { id: "S1", x: 280, y: 185, featureNote: "Plausibler Kernpunkt", fallbackRole: "core" },
      { id: "S2", x: 316, y: 176, featureNote: "Plausibler Kernpunkt", fallbackRole: "core" },
      { id: "S3", x: 340, y: 210, featureNote: "Plausibler Kernpunkt", fallbackRole: "core" },
      { id: "S4", x: 298, y: 223, featureNote: "Plausibler Kernpunkt", fallbackRole: "core" },
      { id: "S5", x: 515, y: 104, featureNote: "Hohe lokale Abweichung", fallbackRole: "noise" },
    ],
  },
];

function repoParameters(count: number) {
  const minClusterSize = Math.max(2, Math.min(8, Math.ceil(0.2 * count)));
  return {
    minClusterSize,
    minSamples: Math.max(1, Math.floor(minClusterSize / 2)),
  };
}

function pointDistance(left: DiagramPoint, right: DiagramPoint) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function densitySnapshot(
  points: DiagramPoint[],
  radius: number,
  minSamples: number,
  minClusterSize: number
): DensitySnapshot {
  const neighbours = new Map<string, DiagramPoint[]>();
  for (const point of points) {
    neighbours.set(
      point.id,
      points.filter((candidate) => pointDistance(point, candidate) <= radius)
    );
  }

  const coreIds = new Set(
    points.filter((point) => (neighbours.get(point.id)?.length ?? 0) >= minSamples).map((point) => point.id)
  );
  const unvisited = new Set(coreIds);
  const components: Array<Set<string>> = [];

  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string;
    const component = new Set<string>([seedId]);
    const queue = [seedId];
    unvisited.delete(seedId);

    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      const current = points.find((point) => point.id === currentId) as DiagramPoint;
      for (const candidate of points) {
        if (!unvisited.has(candidate.id) || pointDistance(current, candidate) > radius) {
          continue;
        }
        component.add(candidate.id);
        queue.push(candidate.id);
        unvisited.delete(candidate.id);
      }
    }
    components.push(component);
  }

  for (const point of points) {
    if (coreIds.has(point.id)) {
      continue;
    }
    let closestComponent: Set<string> | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const component of components) {
      for (const memberId of component) {
        const member = points.find((candidate) => candidate.id === memberId) as DiagramPoint;
        const distance = pointDistance(point, member);
        if (distance <= radius && distance < closestDistance) {
          closestDistance = distance;
          closestComponent = component;
        }
      }
    }
    closestComponent?.add(point.id);
  }

  const clusters = components
    .filter((component) => component.size >= minClusterSize)
    .map((component, index) => ({
      id: index,
      memberIds: Array.from(component),
      coreIds: Array.from(component).filter((id) => coreIds.has(id)),
    }));
  const roles = new Map<string, PointRole>(points.map((point) => [point.id, "noise"]));
  for (const cluster of clusters) {
    for (const memberId of cluster.memberIds) {
      roles.set(memberId, coreIds.has(memberId) ? "core" : "border");
    }
  }
  return {
    clusters,
    roles,
    neighbourCounts: new Map(
      points.map((point) => [point.id, neighbours.get(point.id)?.length ?? 0])
    ),
  };
}

function smallNSnapshot(points: DiagramPoint[]): DensitySnapshot {
  const memberIds = points.filter((point) => point.fallbackRole === "core").map((point) => point.id);
  return {
    clusters: [{ id: 0, memberIds, coreIds: memberIds }],
    roles: new Map(
      points.map((point) => [
        point.id,
        point.fallbackRole === "core" ? "fallback-core" : "fallback-noise",
      ])
    ),
    neighbourCounts: new Map(points.map((point) => [point.id, 0])),
  };
}

function pointFill(role: PointRole, clusterIndex: number | undefined, phase: Phase) {
  if (phase === "features") {
    return "#44534d";
  }
  if (role === "noise" || role === "fallback-noise") {
    return "#c16a2f";
  }
  if (phase === "density") {
    return role === "border" ? "#66b6aa" : "#087f73";
  }
  return clusterColours[clusterIndex ?? 0];
}

function roleLabel(role: PointRole) {
  const labels: Record<PointRole, string> = {
    unassigned: "noch nicht bewertet",
    core: "Kernpunkt",
    border: "Randpunkt",
    noise: "Noise-Kandidat",
    "fallback-core": "Small-N Kernpunkt",
    "fallback-noise": "Small-N Noise",
  };
  return labels[role];
}

function clusterBounds(cluster: Cluster, points: DiagramPoint[]) {
  const members = points.filter((point) => cluster.memberIds.includes(point.id));
  const xs = members.map((point) => point.x);
  const ys = members.map((point) => point.y);
  return {
    x: Math.min(...xs) - 25,
    y: Math.min(...ys) - 25,
    width: Math.max(...xs) - Math.min(...xs) + 50,
    height: Math.max(...ys) - Math.min(...ys) + 50,
  };
}

export default function HdbscanExplainer() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [phase, setPhase] = useState<Phase>("features");
  const [radius, setRadius] = useState(48);
  const [selectedPointId, setSelectedPointId] = useState(scenarios[0].points[0].id);
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) as Scenario;
  const params = repoParameters(scenario.points.length);
  const hdbscanActive = scenario.points.length >= 6;
  const [minSamples, setMinSamples] = useState(params.minSamples);

  useEffect(() => {
    setRadius(48);
    setMinSamples(params.minSamples);
    setSelectedPointId(scenario.points[0].id);
  }, [scenario.id, params.minSamples, scenario.points]);

  const snapshot = useMemo(
    () =>
      hdbscanActive
        ? densitySnapshot(scenario.points, radius, minSamples, params.minClusterSize)
        : smallNSnapshot(scenario.points),
    [hdbscanActive, minSamples, params.minClusterSize, radius, scenario.points]
  );
  const hierarchy = useMemo(
    () =>
      hierarchyRadii.map((level) => ({
        radius: level,
        snapshot: densitySnapshot(scenario.points, level, minSamples, params.minClusterSize),
      })),
    [minSamples, params.minClusterSize, scenario.points]
  );
  const selectedPoint =
    scenario.points.find((point) => point.id === selectedPointId) ?? scenario.points[0];
  const selectedRole =
    phase === "features" ? "unassigned" : snapshot.roles.get(selectedPoint.id) ?? "noise";
  const pointClusterLookup = new Map<string, number>();
  for (const cluster of snapshot.clusters) {
    for (const memberId of cluster.memberIds) {
      pointClusterLookup.set(memberId, cluster.id);
    }
  }
  const selectedSurvival = hdbscanActive
    ? hierarchy.filter((level) => level.snapshot.roles.get(selectedPoint.id) !== "noise").length
    : 0;
  const phaseDescription =
    !hdbscanActive && phase === "result"
      ? "Hier greift der Small-N-Fallback: Eine konservative Ein-Cluster-Hypothese trennt plausible Kernpunkte von lokal stark abweichenden Punkten."
      : phases.find((item) => item.id === phase)?.detail;

  function resetToRepoSettings() {
    setRadius(48);
    setMinSamples(params.minSamples);
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-background px-4 py-4 text-foreground md:px-7 md:py-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="max-w-4xl space-y-2">
            <Badge variant="secondary">Interaktive Methodik</Badge>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Wie HDBSCAN lokale InSAR-Cluster findet</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Eine didaktische 2D-Projektion der Pipeline <span className="font-mono">anomaly_local_v1</span>.
              Die reale Berechnung verwendet sechs robust skalierte Features pro Gebäude und Track.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/">
              <ArrowLeft />
              Zur Übersicht
            </a>
          </Button>
        </header>

        <nav className="grid gap-2 md:grid-cols-4" aria-label="Erklärungsschritte">
          {phases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPhase(item.id)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                phase === item.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:bg-secondary"
              )}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">{item.label}</span>
              <span className="mt-1 block text-sm font-semibold">{item.title}</span>
            </button>
          ))}
        </nav>

        <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_315px]">
          <Card className="flex flex-col gap-5 p-4">
            <section className="space-y-2">
              <div className="section-title">Beispielsituation</div>
              {scenarios.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setScenarioId(candidate.id)}
                  className={cn(
                    "mb-2 w-full rounded-md border p-3 text-left transition-colors",
                    scenario.id === candidate.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <span className="block text-sm font-semibold">{candidate.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {candidate.points.length} kept Punkte, Track {candidate.track}
                  </span>
                </button>
              ))}
            </section>

            <section className="space-y-2 rounded-md border border-border bg-secondary/40 p-3">
              <div className="section-title">Repo-Entscheidung</div>
              <div className="text-sm font-semibold">{scenario.building}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{scenario.message}</p>
              {hdbscanActive ? (
                <Badge>HDBSCAN aktiv</Badge>
              ) : (
                <Badge variant="secondary">Small-N-Fallback</Badge>
              )}
            </section>

            <section className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <div className="section-title">Backend-Regel</div>
              <p>
                <span className="font-mono text-foreground">&lt; 3</span>: keine Clusterung
              </p>
              <p>
                <span className="font-mono text-foreground">3-5</span>: robuste Ein-Cluster-Hypothese
              </p>
              <p>
                <span className="font-mono text-foreground">&gt;= 6</span>: HDBSCAN, optional OPTICS-Fallback
              </p>
            </section>
          </Card>

          <Card className="flex min-h-[680px] flex-col gap-3 overflow-hidden p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="section-title">{phases.find((item) => item.id === phase)?.label}</div>
                <h2 className="text-lg font-bold">{phases.find((item) => item.id === phase)?.title}</h2>
              </div>
              <Badge variant="secondary">
                {scenario.building} / Track {scenario.track}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {phaseDescription}
            </p>

            <div className="relative flex-1 rounded-lg border border-border bg-[#faf9f5] p-2">
              <svg
                viewBox="0 0 720 410"
                className="h-full min-h-[390px] w-full"
                role="img"
                aria-label="Dichtebasiertes Clusterdiagramm"
              >
                <text x="15" y="24" fill="#65736e" fontSize="12">
                  Bewegung / Kohärenz-Projektion
                </text>
                <text x="540" y="396" fill="#65736e" fontSize="12">
                  räumliche Lage
                </text>
                <line x1="48" x2="48" y1="38" y2="368" stroke="#d4d9d4" strokeWidth="1" />
                <line x1="48" x2="688" y1="368" y2="368" stroke="#d4d9d4" strokeWidth="1" />

                {(phase === "hierarchy" || phase === "result") &&
                  snapshot.clusters.map((cluster) => {
                    const bounds = clusterBounds(cluster, scenario.points);
                    return (
                      <rect
                        key={`area-${cluster.id}`}
                        x={bounds.x}
                        y={bounds.y}
                        width={bounds.width}
                        height={bounds.height}
                        rx="30"
                        fill={`${clusterColours[cluster.id % clusterColours.length]}18`}
                        stroke={clusterColours[cluster.id % clusterColours.length]}
                        strokeWidth="2"
                        strokeDasharray={phase === "hierarchy" ? "6 5" : undefined}
                      />
                    );
                  })}

                {phase === "density" && hdbscanActive && (
                  <circle
                    cx={selectedPoint.x}
                    cy={selectedPoint.y}
                    r={radius}
                    fill="#087f7310"
                    stroke="#087f73"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}

                {scenario.points.map((point) => {
                  const role = phase === "features" ? "unassigned" : snapshot.roles.get(point.id) ?? "noise";
                  const clusterIndex = pointClusterLookup.get(point.id);
                  const selected = point.id === selectedPointId;
                  return (
                    <g
                      key={point.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${point.id}: ${point.featureNote}`}
                      onClick={() => setSelectedPointId(point.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedPointId(point.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {selected && (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="14"
                          fill="none"
                          stroke="#17221e"
                          strokeWidth="2"
                        />
                      )}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={role === "noise" || role === "fallback-noise" ? 8 : 9}
                        fill={pointFill(role, clusterIndex, phase)}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {(role === "noise" || role === "fallback-noise") && (
                        <path
                          d={`M ${point.x - 4} ${point.y - 4} L ${point.x + 4} ${point.y + 4} M ${
                            point.x + 4
                          } ${point.y - 4} L ${point.x - 4} ${point.y + 4}`}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {phase !== "features" && hdbscanActive && (
              <div className="grid gap-4 rounded-md border border-border bg-secondary/40 p-4 md:grid-cols-2">
                <label className="space-y-3 text-sm">
                  <span className="flex justify-between gap-2 font-semibold">
                    Demonstrationsradius
                    <span className="font-mono text-primary">{radius}</span>
                  </span>
                  <Slider
                    min={24}
                    max={96}
                    step={2}
                    value={[radius]}
                    onValueChange={(value) => setRadius(value[0])}
                    aria-label="Demonstrationsradius"
                  />
                  <span className="block text-xs text-muted-foreground">
                    HDBSCAN prüft viele Skalen; dieser Regler macht eine Ebene sichtbar.
                  </span>
                </label>
                <label className="space-y-3 text-sm">
                  <span className="flex justify-between gap-2 font-semibold">
                    Min. Punkte im Umkreis
                    <span className="font-mono text-primary">{minSamples}</span>
                  </span>
                  <Slider
                    min={1}
                    max={6}
                    step={1}
                    value={[minSamples]}
                    onValueChange={(value) => setMinSamples(value[0])}
                    aria-label="Minimale Punkte im Umkreis"
                  />
                  <span className="block text-xs text-muted-foreground">
                    Code-Default für dieses Beispiel: <span className="font-mono">{params.minSamples}</span>
                  </span>
                </label>
              </div>
            )}

            {phase === "hierarchy" && hdbscanActive && (
              <div className="grid grid-cols-7 gap-1" aria-label="Hierarchie über Radien">
                {hierarchy.map((level) => (
                  <button
                    key={level.radius}
                    type="button"
                    onClick={() => setRadius(level.radius)}
                    className={cn(
                      "rounded border px-1 py-2 text-center text-xs",
                      radius === level.radius
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary hover:bg-secondary/70"
                    )}
                  >
                    <span className="block font-mono">{level.radius}</span>
                    <span className="block">{level.snapshot.clusters.length} C</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-5 p-4">
            <section className="space-y-3">
              <div className="section-title">Aktuelle Parameter</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-secondary p-3">
                  <span className="block text-xs text-muted-foreground">kept n</span>
                  <span className="font-mono text-lg font-semibold">{scenario.points.length}</span>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <span className="block text-xs text-muted-foreground">min_cluster_size</span>
                  <span className="font-mono text-lg font-semibold">
                    {hdbscanActive ? params.minClusterSize : "-"}
                  </span>
                </div>
              </div>
              {hdbscanActive && (
                <Button size="sm" variant="outline" onClick={resetToRepoSettings} className="w-full">
                  <RotateCcw />
                  Code-Defaults wiederherstellen
                </Button>
              )}
            </section>

            <section className="space-y-3 rounded-md border border-border p-3">
              <div className="section-title">Ausgewählter Punkt</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{selectedPoint.id}</span>
                <Badge variant={selectedRole === "noise" || selectedRole === "fallback-noise" ? "destructive" : "secondary"}>
                  {roleLabel(selectedRole)}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{selectedPoint.featureNote}</p>
              {phase !== "features" && hdbscanActive && (
                <dl className="grid gap-2 border-t border-border pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Punkte im Umkreis, inklusive selbst</dt>
                    <dd className="font-mono">{snapshot.neighbourCounts.get(selectedPoint.id)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Cluster-Skalen überlebt</dt>
                    <dd className="font-mono">
                      {selectedSurvival} / {hierarchy.length}
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="space-y-2">
              <div className="section-title">Legende</div>
              {phase === "density" ? (
                <>
                  <LegendItem colour="#087f73" label="Kernpunkt mit dichter Nachbarschaft" />
                  <LegendItem colour="#66b6aa" label="Randpunkt eines dichten Clusters" />
                  <LegendItem colour="#c16a2f" label="Noise-Kandidat" crossed />
                </>
              ) : phase === "features" ? (
                <LegendItem colour="#44534d" label="Kept Punkt vor Clusterung" />
              ) : (
                <>
                  <LegendItem
                    colour={clusterColours[0]}
                    label={hdbscanActive ? "Stabiles Cluster 1" : "Angenommener Small-N-Kerncluster"}
                  />
                  {hdbscanActive && (
                    <LegendItem colour={clusterColours[1]} label="Stabiles Cluster 2, falls vorhanden" />
                  )}
                  <LegendItem colour="#c16a2f" label="Noise / Outlier-Kandidat" crossed />
                </>
              )}
            </section>

            <section className="mt-auto space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed">
              <div className="section-title">Wichtig zur Genauigkeit</div>
              <p className="text-muted-foreground">
                {hdbscanActive ? (
                  <>
                    Die Kreise zeigen eine vereinfachte Dichteebene. Das Backend führt tatsächlich{" "}
                    <span className="font-mono">hdbscan.HDBSCAN</span> auf einer gewichteten
                    6D-Featurematrix aus; der gezeigte Radius ist kein gespeicherter Pipelineparameter.
                  </>
                ) : (
                  <>
                    Für <span className="font-mono">3-5</span> kept Punkte führt das Backend kein HDBSCAN
                    aus. Es nutzt einen robusten lokalen Abweichungsscore für die dargestellte
                    Ein-Cluster-Hypothese.
                  </>
                )}
              </p>
            </section>
          </Card>
        </div>
      </div>
    </main>
  );
}

function LegendItem({
  colour,
  label,
  crossed = false,
}: {
  colour: string;
  label: string;
  crossed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="relative inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: colour }}
      >
        {crossed && (
          <>
            <span className="absolute left-[2px] top-[6px] h-[1px] w-[10px] rotate-45 bg-white" />
            <span className="absolute left-[2px] top-[6px] h-[1px] w-[10px] -rotate-45 bg-white" />
          </>
        )}
      </span>
      {label}
    </div>
  );
}
