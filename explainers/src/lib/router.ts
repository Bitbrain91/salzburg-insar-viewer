/**
 * Leichtgewichtiges Hash-Routing zwischen den beiden Explainern.
 *
 * Schema "flache, global eindeutige Anker": Pipeline-Kapitel behalten ihre
 * nackten Anker (#zuordnung, #cluster, ...), Silver-Kapitel tragen das
 * Präfix `silver-` (#silver-korpus, ...); `#silver` öffnet den
 * Silver-Explainer am Seitenanfang. Alles andere (leer/unbekannt) zeigt wie
 * bisher die Pipeline-Reise.
 *
 * Innerhalb einer Ansicht navigiert `ChapterNav` weiterhin per
 * `history.replaceState` (löst kein hashchange aus); nur echte
 * Ansichtswechsel (ExplainerSwitch, Browser-Navigation, frischer Deep-Link)
 * laufen über dieses Modul.
 */
import { useEffect, useState } from "react";
import { silverChapterById } from "@/content/silverChapters";

export type ExplainerView = "pipeline" | "silver";

export function anchorFromHash(hash: string): string {
  return hash.replace(/^#/, "");
}

export function viewFromHash(hash: string): ExplainerView {
  const anchor = anchorFromHash(hash);
  if (anchor === "silver" || anchor in silverChapterById) return "silver";
  return "pipeline";
}

export type Route = { view: ExplainerView; anchor: string };

function currentRoute(): Route {
  return {
    view: viewFromHash(window.location.hash),
    anchor: anchorFromHash(window.location.hash),
  };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
