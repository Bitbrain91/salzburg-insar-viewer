import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  GitBranch,
  Layers3,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  algorithmCandidates,
  currentFeatures,
  futureFeatureGroups,
  pageSummary,
  questionSections,
} from "./clusteringMeetingContent";

type Props = {
  onBack: () => void;
};

const navItems = questionSections.map((section) => ({
  id: section.id,
  label: section.eyebrow,
}));

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionCard({ sectionId }: { sectionId: string }) {
  const section = questionSections.find((item) => item.id === sectionId) ?? questionSections[0];

  return (
    <Card id={section.id} className="scroll-mt-6 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-title">{section.eyebrow}</p>
          <h2 className="max-w-4xl text-2xl font-bold tracking-tight">{section.question}</h2>
        </div>
        <Badge variant="secondary">Meeting-Antwort</Badge>
      </div>

      <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
        <p className="text-sm font-bold text-primary">Kurzantwort</p>
        <p className="mt-2 text-base leading-relaxed">{section.shortAnswer}</p>
      </div>

      <div className="mt-5 grid gap-4">
        {section.blocks.map((block) => (
          <div key={block.title} className="rounded-lg border border-border bg-secondary p-4">
            <h3 className="text-lg font-bold">{block.title}</h3>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <p className="section-title">Formulierung fürs Meeting</p>
        <p className="text-sm leading-relaxed">{section.meetingMessage}</p>
      </div>
    </Card>
  );
}

function FeatureTable() {
  return (
    <Card id="features" className="scroll-mt-6 p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Aktuelle Clustering-Features</p>
          <h2 className="text-2xl font-bold">Welche Features werden verwendet und warum?</h2>
        </div>
      </div>

      <div className="grid gap-3">
        {currentFeatures.map((feature) => (
          <div key={feature.name} className="rounded-lg border border-border bg-secondary p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-primary">{feature.name}</h3>
              {feature.weight ? <Badge variant="secondary">Gewicht {feature.weight}</Badge> : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed">{feature.explanation}</p>
            <div className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
              <p>
                <span className="font-bold text-foreground">Warum gewählt:</span> {feature.whyChosen}
              </p>
              <p>
                <span className="font-bold text-foreground">Risiko:</span> {feature.risk}
              </p>
              <p>
                <span className="font-bold text-foreground">Empfehlung:</span> {feature.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FutureFeatures() {
  return (
    <Card id="future-features" className="scroll-mt-6 p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Zusätzliche Features</p>
          <h2 className="text-2xl font-bold">Welche Informationen sollten zusätzlich ins Clustering oder in die Bewertung?</h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {futureFeatureGroups.map((group) => (
          <div key={group.title} className="rounded-lg border border-border bg-secondary p-4">
            <h3 className="text-lg font-bold">{group.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{group.explanation}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {group.examples.map((example) => (
                <li key={example} className="rounded-md border border-border bg-card px-3 py-2">
                  {example}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed">
              <span className="font-bold">Wie bekommen wir das?</span> {group.howToGetIt}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlgorithmOverview() {
  return (
    <Card id="algorithms-overview" className="scroll-mt-6 p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Network className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Algorithmus-Kandidaten</p>
          <h2 className="text-2xl font-bold">Was sollte man künftig testen?</h2>
        </div>
      </div>

      <div className="grid gap-3">
        {algorithmCandidates.map((algorithm) => (
          <div key={algorithm.name} className="rounded-lg border border-border bg-secondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{algorithm.name}</h3>
              <Badge variant={algorithm.name === "Thresholded Graph / Connected Components" ? "default" : "secondary"}>
                {algorithm.name === "Thresholded Graph / Connected Components" ? "Priorität" : "Kandidat"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-4">
              <p>
                <span className="font-bold text-foreground">Geeignet für:</span> {algorithm.usefulFor}
              </p>
              <p>
                <span className="font-bold text-foreground">Stärke:</span> {algorithm.strength}
              </p>
              <p>
                <span className="font-bold text-foreground">Schwäche:</span> {algorithm.weakness}
              </p>
              <p>
                <span className="font-bold text-foreground">Empfehlung:</span> {algorithm.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TakeawayFormula() {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Praktische Zielgröße</p>
          <h2 className="text-2xl font-bold">Clusterqualität als kombinierte Bewertung</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Für euren Use Case reicht ein Clusterlabel nicht. Ein guter Cluster sollte mathematisch plausibel,
        stabil, bewegungslogisch konsistent und objektlogisch glaubwürdig sein.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-secondary p-4 text-xs leading-relaxed">
{`cluster_quality =
  interne_Dichte
  + Stabilität_bei_Parameteränderung
  + Bewegungs_Konsistenz
  + Zeitreihen_Konsistenz
  + Gebäude_Dach_Plausibilität
  - Assignment_Risiko
  - Layover_Mixed_Reflector_Risiko`}
      </pre>
    </Card>
  );
}

export default function ClusteringMeetingDashboard({ onBack }: Props) {
  const [activeSectionId, setActiveSectionId] = useState(questionSections[0].id);
  const activeSection = useMemo(
    () => questionSections.find((section) => section.id === activeSectionId) ?? questionSections[0],
    [activeSectionId]
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Zur Übersicht
            </Button>
            <Badge variant="secondary">Projektmeeting · ausführliche Q&A</Badge>
          </div>
          <p className="section-title">Salzburg InSAR Viewer · Clustering</p>
          <h1 className="max-w-5xl text-3xl font-bold tracking-tight md:text-5xl">{pageSummary.title}</h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {pageSummary.subtitle}
          </p>
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
            <p className="section-title">Kernaussage</p>
            <p className="text-base leading-relaxed">{pageSummary.coreMessage}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="section-title">Navigation</p>
                  <h2 className="font-bold">Besprochene Fragen</h2>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSectionId(item.id);
                      scrollToSection(item.id);
                    }}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      activeSection.id === item.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary hover:border-primary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => scrollToSection("features")}
                  className="rounded-md border border-border bg-secondary px-3 py-2 text-left text-sm transition-colors hover:border-primary"
                >
                  Aktuelle Features
                </button>
                <button
                  onClick={() => scrollToSection("future-features")}
                  className="rounded-md border border-border bg-secondary px-3 py-2 text-left text-sm transition-colors hover:border-primary"
                >
                  Zusätzliche Features
                </button>
                <button
                  onClick={() => scrollToSection("algorithms-overview")}
                  className="rounded-md border border-border bg-secondary px-3 py-2 text-left text-sm transition-colors hover:border-primary"
                >
                  Algorithmus-Kandidaten
                </button>
              </div>
            </Card>
          </aside>

          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <p className="section-title">HDBSCAN</p>
                <p className="text-sm leading-relaxed">
                  Brauchbar ab sechs Punkten, aber bei Small-N nur mit Confidence und Stabilitätsprüfung.
                </p>
              </Card>
              <Card className="p-4">
                <p className="section-title">Small-N</p>
                <p className="text-sm leading-relaxed">
                  Drei bis fünf Punkte sind Plausibilitätslogik, nicht echtes robustes Clustering.
                </p>
              </Card>
              <Card className="p-4">
                <p className="section-title">Nächster Schritt</p>
                <p className="text-sm leading-relaxed">
                  Feature-Ablation, Objektkontext, Cluster-Confidence und einfacher Graph-Ansatz.
                </p>
              </Card>
            </div>

            {questionSections.map((section) => (
              <SectionCard key={section.id} sectionId={section.id} />
            ))}

            <FeatureTable />
            <FutureFeatures />
            <AlgorithmOverview />
            <TakeawayFormula />

            <Card className="p-5 md:p-6">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <div>
                  <p className="section-title">Schlussfolgerung</p>
                  <h2 className="text-2xl font-bold">Was ich im Meeting vertreten würde</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                HDBSCAN ist nicht perfekt für wenige Punkte, aber es gibt keinen klar besseren Standardalgorithmus,
                der euren Use Case automatisch löst. Die bessere Strategie ist ein kontrolliertes System:
                HDBSCAN für ausreichend Punkte, Small-N als low-confidence Plausibilitätsfall, ein erklärbarer
                Graph-Ansatz als nächster Kandidat, und darüber eine saubere Bewertung aus Stabilität,
                Featurequalität und Gebäude-/InSAR-Kontext.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
