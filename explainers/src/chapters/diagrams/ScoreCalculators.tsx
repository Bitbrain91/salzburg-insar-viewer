/**
 * Live-Rechner für Punkt- und Cluster-Scores (Stufe 6).
 *
 * Korrektheitsanker: anomalyScore/qualityScore/labelForQuality/
 * clusterReliabilityScore aus facts.ts replizieren _score_records
 * (Z. 2274–2302) und die Cluster-Verlässlichkeit (Z. 1514–1524).
 */
import { useState } from "react";
import { FormulaBox } from "@/components/FormulaBox";
import { LabeledSlider } from "@/components/ui";
import { ScoreBar } from "@/components/ui/insights";
import {
  anomalyScore,
  clusterReliabilityScore,
  clusterScoring,
  labelForQuality,
  pointScoring,
  qualityScore,
} from "@/content/facts";
import { formatNumber, formatScore } from "@/lib/format";
import { tokens } from "@/lib/designTokens";

const LABEL_TEXT = { normal: "Normal", suspect: "Verdacht", outlier: "Ausreißer" } as const;

const CONTRIB_COLORS = ["#0c766e", "#2563eb", "#7c3aed", "#c4632d"] as const;

function ContributionBar({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="h-full transition-all"
            style={{
              width: `${Math.max(segment.value, 0) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${formatScore(segment.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {segments.map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.label}: <span className="font-mono">{formatScore(segment.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PointScoreCalculator() {
  const [clusterOutlier, setClusterOutlier] = useState(0.2);
  const [localDeviation, setLocalDeviation] = useState(0.25);
  const [rulePenalty, setRulePenalty] = useState(0.1);
  const [crossTrackC, setCrossTrackC] = useState(0.7);
  const [keptSupport, setKeptSupport] = useState(0.8);
  const [signal, setSignal] = useState(0.7);

  const anomaly = anomalyScore(clusterOutlier, localDeviation, rulePenalty);
  const quality = qualityScore(anomaly, crossTrackC, keptSupport, signal);
  const label = labelForQuality(quality);
  const aw = pointScoring.anomalyWeights;
  const qw = pointScoring.qualityWeights;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <p className="section-title !mb-0">Punkt-Rechner: Anomalie → Qualität → Label</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledSlider
          label="Cluster-Ausreißer"
          valueLabel={formatScore(clusterOutlier)}
          min={0}
          max={1}
          step={0.01}
          value={[clusterOutlier]}
          onValueChange={([value]) => setClusterOutlier(value)}
        />
        <LabeledSlider
          label="Lokale Abweichung"
          valueLabel={formatScore(localDeviation)}
          min={0}
          max={1}
          step={0.01}
          value={[localDeviation]}
          onValueChange={([value]) => setLocalDeviation(value)}
        />
        <LabeledSlider
          label="Regel-Abzüge"
          valueLabel={formatScore(rulePenalty)}
          min={0}
          max={1}
          step={0.01}
          value={[rulePenalty]}
          onValueChange={([value]) => setRulePenalty(value)}
        />
      </div>
      <ContributionBar
        segments={[
          {
            label: `0,60 · Cluster-Ausreißer`,
            value: aw.clusterOutlier * clusterOutlier,
            color: CONTRIB_COLORS[0],
          },
          {
            label: `0,25 · lokale Abweichung`,
            value: aw.localDeviation * localDeviation,
            color: CONTRIB_COLORS[1],
          },
          {
            label: `0,15 · Regel-Abzüge`,
            value: aw.rulePenalty * rulePenalty,
            color: CONTRIB_COLORS[2],
          },
        ]}
      />
      <ScoreBar
        label="anomaly_score (höher = auffälliger)"
        value={anomaly}
        direction="higher-worse"
      />

      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
        <LabeledSlider
          label="Track-Konsistenz"
          valueLabel={formatScore(crossTrackC)}
          min={0}
          max={1}
          step={0.01}
          value={[crossTrackC]}
          onValueChange={([value]) => setCrossTrackC(value)}
        />
        <LabeledSlider
          label="Lokaler Support (kept-Anteil)"
          valueLabel={formatScore(keptSupport)}
          min={0}
          max={1}
          step={0.01}
          value={[keptSupport]}
          onValueChange={([value]) => setKeptSupport(value)}
        />
        <LabeledSlider
          label="Signalqualität"
          valueLabel={formatScore(signal)}
          min={0}
          max={1}
          step={0.01}
          value={[signal]}
          onValueChange={([value]) => setSignal(value)}
        />
      </div>
      <ContributionBar
        segments={[
          {
            label: `0,45 · (1 − Anomalie)`,
            value: qw.inverseAnomaly * (1 - anomaly),
            color: CONTRIB_COLORS[0],
          },
          {
            label: `0,25 · Track-Konsistenz`,
            value: qw.crossTrack * crossTrackC,
            color: CONTRIB_COLORS[1],
          },
          {
            label: `0,20 · Support`,
            value: qw.keptSupport * keptSupport,
            color: CONTRIB_COLORS[2],
          },
          { label: `0,10 · Signal`, value: qw.signal * signal, color: CONTRIB_COLORS[3] },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <ScoreBar
          label={`quality_score (Schwellen ${formatNumber(pointScoring.labelOutlierThreshold, 2)} / ${formatNumber(pointScoring.labelNormalThreshold, 2)})`}
          value={quality}
          threshold={pointScoring.labelNormalThreshold}
        />
        <span
          className="inline-flex items-center gap-1.5 justify-self-start rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold sm:justify-self-end"
          style={{ color: tokens.pointLabel[label] }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tokens.pointLabel[label] }}
          />
          Label: {LABEL_TEXT[label]}
        </span>
      </div>
    </div>
  );
}

export function ClusterScoreCalculator() {
  const [pointCount, setPointCount] = useState(4);
  const [coherence, setCoherence] = useState(0.7);
  const [assignmentQuality, setAssignmentQuality] = useState(0.75);

  const score = clusterReliabilityScore(pointCount, coherence, assignmentQuality);
  const w = clusterScoring.weights;
  const supportComponent = Math.min(pointCount / clusterScoring.supportSaturationN, 1);

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <p className="section-title !mb-0">Cluster-Rechner: Verlässlichkeit einer Gruppe</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledSlider
          label="Punktanzahl im Cluster"
          valueLabel={formatNumber(pointCount, 0)}
          min={0}
          max={8}
          step={1}
          value={[pointCount]}
          onValueChange={([value]) => setPointCount(value)}
        />
        <LabeledSlider
          label="Mediane Kohärenz"
          valueLabel={formatScore(coherence)}
          min={0}
          max={1}
          step={0.01}
          value={[coherence]}
          onValueChange={([value]) => setCoherence(value)}
        />
        <LabeledSlider
          label="Zuordnungsqualität (Anteil nicht-nearest)"
          valueLabel={formatScore(assignmentQuality)}
          min={0}
          max={1}
          step={0.01}
          value={[assignmentQuality]}
          onValueChange={([value]) => setAssignmentQuality(value)}
        />
      </div>
      <ContributionBar
        segments={[
          {
            label: `0,45 · min(n/4 | 1)`,
            value: w.support * supportComponent,
            color: CONTRIB_COLORS[0],
          },
          { label: `0,35 · Kohärenz`, value: w.signal * coherence, color: CONTRIB_COLORS[1] },
          {
            label: `0,20 · Zuordnung`,
            value: w.assignment * assignmentQuality,
            color: CONTRIB_COLORS[2],
          },
        ]}
      />
      <ScoreBar label="cluster_reliability_score" value={score} />
      <FormulaBox
        result="Hauptcluster-Wahl"
        terms={[{ name: "größter belastbarer Core (≥ 2 Punkte, kein annex/foreign)" }]}
        note={
          <>
            Tie-Break in dieser Reihenfolge: mehr Punkte → höhere mediane Kohärenz → höherer
            Höhenrang → Cluster-ID. Der Hauptcluster trägt in Station 6 die Bewegungsbewertung des
            Gebäudes; {pointCount >= clusterScoring.reliableCoreMinPoints
              ? "dieser Cluster wäre mit seiner Punktzahl grundsätzlich hauptcluster-fähig."
              : "unter 2 Punkten ist ein Cluster nie hauptcluster-fähig."}
          </>
        }
      />
    </div>
  );
}
