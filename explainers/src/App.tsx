import { useMemo, useState } from "react";
import ClusteringMeetingDashboard from "./explainers/clusteringMeeting/ClusteringMeetingDashboard";
import HdbscanExplainer from "./explainers/hdbscan/HdbscanExplainer";
import SmallNExplainer from "./explainers/smallN/SmallNExplainer";
import { Button, Card } from "./components/ui";

type ExplainerId = "overview" | "hdbscan" | "clustering-meeting" | "small-n";

export default function App() {
  const initialExplainer = useMemo<ExplainerId>(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedExplainer = params.get("explainer");
    if (
      requestedExplainer === "hdbscan" ||
      requestedExplainer === "clustering-meeting" ||
      requestedExplainer === "small-n"
    ) {
      return requestedExplainer;
    }
    return "overview";
  }, []);
  const [activeExplainer, setActiveExplainer] = useState<ExplainerId>(initialExplainer);

  if (activeExplainer === "hdbscan") {
    return <HdbscanExplainer />;
  }

  if (activeExplainer === "clustering-meeting") {
    return <ClusteringMeetingDashboard onBack={() => setActiveExplainer("overview")} />;
  }

  if (activeExplainer === "small-n") {
    return <SmallNExplainer onBack={() => setActiveExplainer("overview")} />;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="section-title">Salzburg InSAR Viewer</p>
          <h1 className="text-3xl font-bold tracking-tight">Interaktive Erklärdiagramme</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Diese Zusatzapp ist getrennt von der produktiven Viewer-App. Sie dient nur dazu,
            fachliche Algorithmen und Pipeline-Entscheidungen interaktiv nachvollziehbar zu machen.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-4 p-5">
            <div>
              <p className="section-title">Meeting-Vorbereitung</p>
              <h2 className="text-xl font-bold">Clustering-Fragen</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ausführliche Antworten zu HDBSCAN bei wenigen Punkten, Small-N, Dachkontext,
                Features, Graph-Clustering und Clusterqualität.
              </p>
            </div>
            <Button onClick={() => setActiveExplainer("clustering-meeting")} className="mt-auto self-start">
              Fragen öffnen
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <div>
              <p className="section-title">Clustering</p>
              <h2 className="text-xl font-bold">HDBSCAN</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Zeigt lokale Dichte, Cluster-Hierarchie, Noise-Markierung und den Small-N-Fallback
                aus <span className="font-mono">anomaly_local_v1</span>.
              </p>
            </div>
            <Button onClick={() => setActiveExplainer("hdbscan")} className="mt-auto self-start">
              HDBSCAN öffnen
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <div>
              <p className="section-title">Clustering</p>
              <h2 className="text-xl font-bold">Small-N-Fallback</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Erklärt Schritt für Schritt, wie <span className="font-mono">3-5</span> kept Punkte
                ohne HDBSCAN als Core oder Noise markiert werden.
              </p>
            </div>
            <Button onClick={() => setActiveExplainer("small-n")} className="mt-auto self-start">
              Small-N öffnen
            </Button>
          </Card>
        </section>
      </div>
    </main>
  );
}
