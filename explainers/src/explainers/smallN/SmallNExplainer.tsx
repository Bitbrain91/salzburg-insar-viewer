import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, Slider } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  smallNScenarios,
  smallNGlossary,
  smallNSteps,
  type SmallNPoint,
  type SmallNScenario,
} from "./smallNContent";

type Props = {
  onBack: () => void;
};

type Branch = "insufficient_support" | "small_n" | "density";
type Role = "core" | "noise" | "insufficient" | "hdbscan";

type ClassifiedPoint = SmallNPoint & {
  alongLookOffset: number;
  crossLookOffset: number;
  score: number;
  probability: number;
  role: Role;
  scoreParts: {
    velocity: number;
    acceleration: number;
    alongLook: number;
    crossLook: number;
    primaryStep: number;
    heightEdge: number;
    coherenceGap: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function mad(values: number[], center: number) {
  return median(values.map((value) => Math.abs(value - center)));
}

function branchForCount(count: number): Branch {
  if (count < 3) return "insufficient_support";
  if (count <= 5) return "small_n";
  return "density";
}

function branchLabel(branch: Branch) {
  if (branch === "insufficient_support") return "insufficient_support";
  if (branch === "small_n") return "Small-N-Fallback";
  return "HDBSCAN/OPTICS";
}

function classifyScenario(
  scenario: SmallNScenario,
  pointCount: number,
  threshold: number,
  deviationBoost: number
): ClassifiedPoint[] {
  const points = scenario.points.slice(0, pointCount);
  const branch = branchForCount(points.length);
  const centerX = median(points.map((point) => point.x));
  const centerY = median(points.map((point) => point.y));
  const centers = {
    velocity: median(points.map((point) => point.velocity)),
    acceleration: median(points.map((point) => point.acceleration)),
    step: median(points.map((point) => point.step)),
    x: centerX,
    y: centerY,
  };
  const scales = {
    velocity: Math.max(1.4826 * mad(points.map((point) => point.velocity), centers.velocity), 0.5),
    acceleration: Math.max(1.4826 * mad(points.map((point) => point.acceleration), centers.acceleration), 0.5),
    step: Math.max(1.4826 * mad(points.map((point) => point.step), centers.step), 0.75),
    x: Math.max(1.4826 * mad(points.map((point) => point.x), centers.x), 45),
    y: Math.max(1.4826 * mad(points.map((point) => point.y), centers.y), 45),
  };
  const boost = deviationBoost / 100;

  const raw = points.map((point) => {
    const velocityZ = Math.abs(point.velocity - centers.velocity) / scales.velocity;
    const accelerationZ = Math.abs(point.acceleration - centers.acceleration) / scales.acceleration;
    const stepZ = Math.abs(point.step - centers.step) / scales.step;
    const alongZ = Math.abs(point.x - centers.x) / scales.x;
    const crossZ = Math.abs(point.y - centers.y) / scales.y;
    const heightEdge = Math.abs(point.heightRank - 0.5) * 1.4;
    const coherenceGap = Math.max(0, (0.65 - point.coherence) / 0.65);
    const velocityPart = (velocityZ / 3.5) * boost;
    const accelerationPart = (accelerationZ / 3.5) * boost;
    const alongLook = (alongZ / 4.0) * boost;
    const crossLook = (crossZ / 4.0) * boost;
    const primaryStep = (stepZ / 3.0) * boost;
    const scaledHeightEdge = heightEdge * boost;
    const scaledCoherenceGap = coherenceGap * boost;
    const score = clamp(
      Math.max(
        velocityPart,
        accelerationPart,
        primaryStep,
        alongLook,
        crossLook,
        scaledHeightEdge,
        scaledCoherenceGap
      ),
      0,
      1
    );

    return {
      ...point,
      alongLookOffset: point.x - centers.x,
      crossLookOffset: point.y - centers.y,
      score,
      probability: clamp(1 - score, 0.05, 0.95),
      role: "noise" as Role,
      scoreParts: {
        velocity: velocityPart,
        acceleration: accelerationPart,
        alongLook,
        crossLook,
        primaryStep,
        heightEdge: scaledHeightEdge,
        coherenceGap: scaledCoherenceGap,
      },
    };
  });

  if (branch === "insufficient_support") {
    return raw.map((point) => ({ ...point, role: "insufficient" }));
  }
  if (branch === "density") {
    return raw.map((point) => ({ ...point, role: "hdbscan" }));
  }

  const coreIndexes = raw.reduce<number[]>((indexes, point, index) => {
    if (point.score <= threshold) indexes.push(index);
    return indexes;
  }, []);
  if (coreIndexes.length === 0 && raw.length > 0) {
    let bestIndex = 0;
    for (let index = 1; index < raw.length; index += 1) {
      if (raw[index].score < raw[bestIndex].score) bestIndex = index;
    }
    coreIndexes.push(bestIndex);
  }
  const coreSet = new Set(coreIndexes);
  return raw.map((point, index) => ({ ...point, role: coreSet.has(index) ? "core" : "noise" }));
}

function roleColour(role: Role) {
  if (role === "core") return "#087f73";
  if (role === "noise") return "#c16a2f";
  if (role === "hdbscan") return "#3172a8";
  return "#7b6f5a";
}

function roleLabel(role: Role) {
  if (role === "core") return "Core";
  if (role === "noise") return "Noise";
  if (role === "hdbscan") return "Dichte-Clusterung";
  return "Insufficient";
}

function SmallNDiagram({ points, activeStep }: { points: ClassifiedPoint[]; activeStep: number }) {
  return (
    <svg viewBox="0 0 720 360" className="h-auto w-full rounded-lg border border-border bg-[#f8f7ef]">
      <defs>
        <linearGradient id="smalln-roof" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dde8df" />
          <stop offset="100%" stopColor="#f2dfbf" />
        </linearGradient>
      </defs>
      <path d="M78 96 L356 54 L650 120 L602 314 L110 306 Z" fill="url(#smalln-roof)" stroke="#9ca89d" strokeWidth="2" />
      <path d="M356 54 L342 308" stroke="#b6bdae" strokeDasharray="8 8" strokeWidth="2" />
      <path d="M78 96 L602 314" stroke="#d0c1aa" strokeDasharray="4 8" strokeWidth="2" />
      {activeStep >= 2 && (
        <text x="36" y="338" className="fill-muted-foreground text-[12px]">
          local_deviation_score = max(velocity_z/3.5, acceleration_z/3.5, step_z/3.0, along_z/4.0, cross_z/4.0, height_edge, coherence_gap)
        </text>
      )}
      {points.map((point) => (
        <g key={point.id}>
          <circle
            cx={point.x}
            cy={point.y}
            r={activeStep >= 3 ? 14 + point.score * 8 : 14}
            fill={activeStep >= 1 ? roleColour(point.role) : "#44534d"}
            opacity={point.role === "noise" ? 0.68 : 0.92}
            stroke="#ffffff"
            strokeWidth="3"
          />
          <text x={point.x} y={point.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
            {point.id}
          </text>
          {activeStep >= 2 && (
            <text x={point.x} y={point.y + 34} textAnchor="middle" className="fill-foreground text-[11px] font-bold">
              {point.score.toFixed(2)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ScoreBars({ point }: { point: ClassifiedPoint }) {
  const bars = [
    ["velocity_z / 3.5", point.scoreParts.velocity],
    ["acceleration_z / 3.5", point.scoreParts.acceleration],
    ["step_z / 3.0", point.scoreParts.primaryStep],
    ["along_z / 4.0", point.scoreParts.alongLook],
    ["cross_z / 4.0", point.scoreParts.crossLook],
    ["height_edge", point.scoreParts.heightEdge],
    ["coherence_gap", point.scoreParts.coherenceGap],
  ] as const;

  return (
    <div className="space-y-2">
      {bars.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>{label}</span>
            <span>{value.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${clamp(value * 100, 0, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ControlHelp() {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
      <p>
        <span className="font-bold text-foreground">Noise-Schwelle:</span> Entspricht dem Repo-Parameter{" "}
        <span className="font-mono">small_n_noise_threshold</span>. Der Default ist 0.80.
      </p>
      <p className="mt-2">
        <span className="font-bold text-foreground">Punktanzahl:</span> Simuliert, wie die Pipeline zwischen{" "}
        <span className="font-mono">insufficient_support</span>, Small-N und HDBSCAN/OPTICS verzweigt.
      </p>
      <p className="mt-2">
        <span className="font-bold text-foreground">Abweichung verstärken:</span> Didaktischer Regler. Er macht
        Unterschiede in den sieben Score-Beitraegen sichtbarer; so ein Regler existiert im Backend nicht direkt.
      </p>
    </div>
  );
}

export default function SmallNExplainer({ onBack }: Props) {
  const [activeScenarioId, setActiveScenarioId] = useState(smallNScenarios[0].id);
  const activeScenario = smallNScenarios.find((scenario) => scenario.id === activeScenarioId) ?? smallNScenarios[0];
  const [activeStep, setActiveStep] = useState(0);
  const [thresholdPercent, setThresholdPercent] = useState(80);
  const [pointCount, setPointCount] = useState(activeScenario.points.length);
  const [deviationBoost, setDeviationBoost] = useState(100);

  const effectivePointCount = Math.min(pointCount, activeScenario.points.length);
  const threshold = thresholdPercent / 100;
  const branch = branchForCount(effectivePointCount);
  const classifiedPoints = useMemo(
    () => classifyScenario(activeScenario, effectivePointCount, threshold, deviationBoost),
    [activeScenario, deviationBoost, effectivePointCount, threshold]
  );
  const coreCount = classifiedPoints.filter((point) => point.role === "core").length;
  const noiseCount = classifiedPoints.filter((point) => point.role === "noise").length;
  const selectedPoint = classifiedPoints.reduce<ClassifiedPoint | undefined>((current, point) => {
    if (!current || point.score > current.score) return point;
    return current;
  }, undefined);
  const safetyFallbackActive = branch === "small_n" && classifiedPoints.length > 0 && coreCount === 1 && classifiedPoints.every((point) => point.score > threshold);

  function selectScenario(id: string) {
    const next = smallNScenarios.find((scenario) => scenario.id === id) ?? smallNScenarios[0];
    setActiveScenarioId(next.id);
    setPointCount(next.points.length);
    setActiveStep(0);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Zur Uebersicht
            </Button>
            <Badge variant="secondary">Small-N · 3-5 kept Punkte · anomaly_local_v1</Badge>
          </div>
          <p className="section-title">Interaktives Step-by-Step-Diagramm</p>
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">
            Wie der Small-N-Fallback aus wenigen InSAR-Punkten Core und Noise ableitet
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Der Explainer zeigt die echte Branch-Logik der Pipeline und visualisiert didaktisch, wie
            `local_deviation_score`, Threshold und Safety-Fallback zusammenwirken.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Wann aktiv?</p>
              <p className="text-sm leading-relaxed">
                Nur bei <span className="font-mono font-bold">3-5</span> kept Punkten pro Gebaeude und Track.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Was wird entschieden?</p>
              <p className="text-sm leading-relaxed">Ob ein Punkt den angenommenen Kerncluster stuetzt oder Noise ist.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Wie sicher?</p>
              <p className="text-sm leading-relaxed">Immer vorsichtig lesen: Small-N ist eine Heuristik mit wenig Support.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="p-5">
            <p className="section-title">Szenario</p>
            <div className="flex flex-wrap gap-2">
              {smallNScenarios.map((scenario) => (
                <Button
                  key={scenario.id}
                  onClick={() => selectScenario(scenario.id)}
                  variant={scenario.id === activeScenario.id ? "default" : "outline"}
                  size="sm"
                >
                  {scenario.shortLabel}
                </Button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Noise-Schwelle <span>{threshold.toFixed(2)}</span>
                </span>
                <Slider min={30} max={95} value={[thresholdPercent]} onValueChange={([value]) => setThresholdPercent(value)} />
              </label>
              <label className="block">
                <span className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Punktanzahl <span>{effectivePointCount}</span>
                </span>
                <Slider
                  min={Math.min(2, activeScenario.points.length)}
                  max={activeScenario.points.length}
                  value={[effectivePointCount]}
                  onValueChange={([value]) => setPointCount(value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Abweichung verstärken <span>{deviationBoost}%</span>
                </span>
                <Slider min={60} max={160} value={[deviationBoost]} onValueChange={([value]) => setDeviationBoost(value)} />
              </label>
            </div>
            <ControlHelp />

            <div className="mt-5 rounded-lg border border-border bg-secondary p-4">
              <p className="section-title">Aktueller Branch</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={branch === "small_n" ? "default" : branch === "insufficient_support" ? "destructive" : "secondary"}>
                  {branchLabel(branch)}
                </Badge>
                <Badge variant="secondary">{effectivePointCount} kept Punkte</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{activeScenario.takeaway}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Wichtig: Die Diagramm-Punkte sind Beispielpunkte. Die Methodik folgt der Repo-Logik, die numerischen
                Scores dienen hier der Erklärung und sind keine Live-Daten aus der Datenbank.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-title">{activeScenario.question}</p>
                <h2 className="text-2xl font-bold">{activeScenario.title}</h2>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Core {coreCount}</Badge>
                <Badge variant={noiseCount > 0 ? "destructive" : "secondary"}>Noise {noiseCount}</Badge>
              </div>
            </div>
            <div className="mt-4">
              <SmallNDiagram points={classifiedPoints} activeStep={activeStep} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
                <p className="section-title">Core</p>
                <p>Stuetzt die Ein-Cluster-Hypothese. Bei Small-N heisst das: plausibel, nicht bewiesen.</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
                <p className="section-title">Noise</p>
                <p>Weicht in mindestens einem relevanten Merkmal zu stark von der kleinen Gruppe ab.</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
                <p className="section-title">Score</p>
                <p>0 ist unauffaellig, 1 ist stark auffaellig. Der hoechste Teilscore bestimmt das Ergebnis.</p>
              </div>
            </div>
            {safetyFallbackActive && (
              <div className="mt-4 flex gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <p>
                  Safety-Fallback aktiv: Kein Punkt liegt unter der Schwelle. Der niedrigste Score wird trotzdem
                  Core. Fachlich ist das ein sehr schwaches Signal.
                </p>
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <Card className="p-5">
            <p className="section-title">Step-by-Step</p>
            <div className="space-y-2">
              {smallNSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    index === activeStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary hover:border-primary"
                  )}
                >
                  <span className="block text-xs font-bold uppercase tracking-wide opacity-80">
                    Schritt {index + 1}: {step.label}
                  </span>
                  <span className="mt-1 block font-bold">{step.title}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                variant="outline"
                disabled={activeStep === 0}
              >
                Zurück
              </Button>
              <Button
                onClick={() => setActiveStep((step) => Math.min(smallNSteps.length - 1, step + 1))}
                disabled={activeStep === smallNSteps.length - 1}
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  setActiveStep(0);
                  setThresholdPercent(80);
                  setDeviationBoost(100);
                  setPointCount(activeScenario.points.length);
                }}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <p className="section-title">Schritt {activeStep + 1}</p>
            <h2 className="text-2xl font-bold">{smallNSteps[activeStep].title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{smallNSteps[activeStep].detail}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="section-title">Warum dieser Schritt?</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{smallNSteps[activeStep].why}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="section-title">Wie lesen?</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {smallNSteps[activeStep].interpretation}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-card p-3">
              <p className="section-title">Variablen in diesem Schritt</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {smallNSteps[activeStep].variables.map((variable) => (
                  <div key={variable.name} className="rounded-md border border-border bg-secondary p-2">
                    <p className="font-mono text-xs font-bold text-primary">{variable.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{variable.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-secondary p-3 text-xs">
              <code>{smallNSteps[activeStep].codeHint}</code>
            </pre>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {classifiedPoints.map((point) => (
                <div key={point.id} className="rounded-lg border border-border bg-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{point.id}</p>
                      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                        Rohwerte des Beispielpunkts. Die Score-Balken darunter verwenden dieselben Variablen nach
                        robuster Normalisierung gegen die lokale Gruppe.
                      </p>
                    </div>
                    <Badge variant={point.role === "noise" || point.role === "insufficient" ? "destructive" : "secondary"}>
                      {roleLabel(point.role)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                    <div>
                      <p className="font-mono text-muted-foreground">velocity</p>
                      <p className="font-mono font-bold">{point.velocity.toFixed(1)} mm/a</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">acceleration</p>
                      <p className="font-mono font-bold">{point.acceleration.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">ts_primary_step_abs</p>
                      <p className="font-mono font-bold">{point.step.toFixed(1)} mm</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        max(|diff(displacement)|), nicht Amplitude
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">along_look_offset_m</p>
                      <p className="font-mono font-bold">{point.alongLookOffset.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">cross_look_offset_m</p>
                      <p className="font-mono font-bold">{point.crossLookOffset.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">height_rank_in_building</p>
                      <p className="font-mono font-bold">{point.heightRank.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">coherence</p>
                      <p className="font-mono font-bold">{point.coherence.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">local_deviation_score</p>
                      <p className="font-mono font-bold">{point.score.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-muted-foreground">cluster_probability</p>
                      <p className="font-mono font-bold">{point.probability.toFixed(2)}</p>
                    </div>
                  </div>
                  {activeStep >= 2 && (
                    <div className="mt-3">
                      <ScoreBars point={point} />
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        Der <span className="font-mono">local_deviation_score</span> ist der groesste dieser
                        sieben Teilwerte. Deshalb kann ein einzelner auffaelliger Beitrag reichen. Beispiel: ein
                        hoher <span className="font-mono">velocity_z / 3.5</span>-Wert kann den Punkt auffaellig
                        machen, auch wenn <span className="font-mono">along_z / 4.0</span>,{" "}
                        <span className="font-mono">cross_z / 4.0</span> und{" "}
                        <span className="font-mono">coherence_gap</span> klein sind.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedPoint && (
              <p className="mt-4 rounded-lg border border-border bg-card p-3 text-sm leading-relaxed">
                Hoechster aktueller Score: <span className="font-bold">{selectedPoint.id}</span> mit{" "}
                <span className="font-mono font-bold">{selectedPoint.score.toFixed(2)}</span>. Im echten Backend
                wird dieser Score als `cluster_outlier_score` weitergegeben.
              </p>
            )}
          </Card>
        </section>

        <Card className="p-5">
          <p className="section-title">Glossar</p>
          <h2 className="text-xl font-bold">Die wichtigsten Begriffe ohne Pipeline-Jargon</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {smallNGlossary.map((item) => (
              <div key={item.name} className="rounded-lg border border-border bg-secondary p-3">
                <p className="font-bold">{item.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
