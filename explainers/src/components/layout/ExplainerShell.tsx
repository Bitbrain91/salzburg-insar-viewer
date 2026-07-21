/**
 * Gemeinsames Seitengerüst beider Explainer: sticky Topbar (mobil),
 * sticky Seitenleiste mit Explainer-Umschalter und Kapitel-Rail (xl) sowie
 * die Hauptspalte mit Kopfbereich und Kapitelfolge.
 */
import type { ReactNode } from "react";
import { ChapterRail, ChapterTopbar, useActiveChapter } from "@/components/layout/ChapterNav";
import { ExplainerSwitch } from "@/components/ExplainerSwitch";
import type { ChapterMeta } from "@/content/chapters";
import type { ExplainerView } from "@/lib/router";

type ExplainerShellProps<Id extends string> = {
  view: ExplainerView;
  chapters: readonly ChapterMeta<Id>[];
  railTitel: string;
  header: ReactNode;
  children: ReactNode;
};

export function ExplainerShell<Id extends string>({
  view,
  chapters,
  railTitel,
  header,
  children,
}: ExplainerShellProps<Id>) {
  const active = useActiveChapter(chapters);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <ChapterTopbar chapters={chapters} active={active} />

        <div className="pt-6 xl:hidden">
          <div className="max-w-xs">
            <ExplainerSwitch active={view} />
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-10">
          <aside className="hidden xl:block">
            <div className="sticky top-6 grid gap-6 pt-10">
              <div>
                <p className="section-title">Salzburg InSAR Viewer</p>
                <p className="text-sm font-bold leading-snug text-foreground">{railTitel}</p>
              </div>
              <ExplainerSwitch active={view} />
              <ChapterRail chapters={chapters} active={active} />
            </div>
          </aside>

          <main className="grid gap-16 pt-10 xl:gap-20">
            {header}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
