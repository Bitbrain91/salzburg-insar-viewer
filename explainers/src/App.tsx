import { useEffect } from "react";
import { useRoute, type ExplainerView } from "@/lib/router";
import PipelineExplainer from "@/views/PipelineExplainer";
import SilverExplainer from "@/views/SilverExplainer";

/**
 * Legacy-Deep-Links der alten Hub-App (?explainer=...) auf die neue
 * Ein-Seiten-Struktur mappen. hdbscan/small-n sind jetzt Teil des
 * Cluster-Kapitels.
 */
function resolveLegacyExplainerParam() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("explainer");
  if (!requested) return;
  const hash = requested === "hdbscan" || requested === "small-n" ? "#cluster" : "";
  history.replaceState(null, "", `${window.location.pathname}${hash}`);
  if (hash) {
    document.querySelector(hash)?.scrollIntoView({ behavior: "instant", block: "start" });
  }
}

const TITLES: Record<ExplainerView, string> = {
  pipeline: "InSAR-Pipeline erklärt — Salzburg InSAR Viewer",
  silver: "Silver Ground Truth erklärt — Salzburg InSAR Viewer",
};

/**
 * Routing-Weiche: rendert anhand des Hash genau EINE Ansicht (nie beide —
 * der Scroll-Spy beobachtet sonst tote Anker). Kapitel-Anker teilen sich
 * einen Namensraum, siehe `lib/router.ts`.
 */
export default function App() {
  const { view, anchor } = useRoute();

  useEffect(() => {
    resolveLegacyExplainerParam();
  }, []);

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

  // Nach Mount bzw. View-Wechsel zum Anker scrollen: bei einem frischen
  // Deep-Link (#silver-korpus) existiert das Ziel erst nach dem Rendern.
  // Bewusst nur an `view` gebunden — Anker-Klicks innerhalb einer Ansicht
  // scrollen selbst (ChapterNav.navigate).
  useEffect(() => {
    const target = anchor && anchor !== "silver" ? document.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView({ behavior: "instant", block: "start" });
    } else {
      // "instant" umgeht das globale scroll-behavior: smooth — ein
      // Ansichtswechsel soll sich wie ein Seitenwechsel anfühlen.
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return view === "silver" ? <SilverExplainer /> : <PipelineExplainer />;
}
