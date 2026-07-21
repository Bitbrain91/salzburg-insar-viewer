/**
 * Kapitelnavigation: auf xl-Screens eine sticky Stations-Rail links,
 * darunter/mobil eine sticky Topbar mit Fortschrittsbalken. Das aktive
 * Kapitel wird per IntersectionObserver (Scroll-Spy) bestimmt.
 *
 * Alle Bausteine sind über die übergebene Kapitelliste parametrisiert, damit
 * beide Explainer (Pipeline-Reise und Silver Ground Truth) dieselbe
 * Navigation mit ihrem eigenen Register verwenden können.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChapterMeta } from "@/content/chapters";

export function useActiveChapter<Id extends string>(
  chapterList: readonly ChapterMeta<Id>[]
): Id {
  const [active, setActive] = useState<Id>(chapterList[0].id);

  useEffect(() => {
    const visible = new Map<Id, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as Id;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }
        if (visible.size > 0) {
          // Oberstes sichtbares Kapitel gewinnt (Dokumentreihenfolge).
          const first = chapterList.find((chapter) => visible.has(chapter.id));
          if (first) setActive(first.id);
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.1, 0.5] }
    );
    for (const chapter of chapterList) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [chapterList]);

  return active;
}

function navigate(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

type ChapterNavProps<Id extends string> = {
  chapters: readonly ChapterMeta<Id>[];
  active: Id;
};

/** Sticky Rail für xl-Screens: nummerierte Stationskette mit Fortschritt. */
export function ChapterRail<Id extends string>({ chapters, active }: ChapterNavProps<Id>) {
  const activeIndex = chapters.findIndex((chapter) => chapter.id === active);
  return (
    <nav aria-label="Kapitel" className="grid gap-0.5">
      {chapters.map((chapter, index) => {
        const isActive = chapter.id === active;
        const isDone = index < activeIndex;
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => navigate(chapter.id)}
            className={cn(
              "group flex items-center gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
              isActive ? "bg-card shadow-sm" : "hover:bg-card/60"
            )}
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
              )}
            >
              {isDone ? "✓" : chapter.nummer}
            </span>
            <span
              className={cn(
                "font-semibold",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {chapter.kurz}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Sticky Topbar unterhalb xl: aktuelles Kapitel + Fortschrittsbalken. */
export function ChapterTopbar<Id extends string>({ chapters, active }: ChapterNavProps<Id>) {
  const activeIndex = chapters.findIndex((chapter) => chapter.id === active);
  const activeChapter = chapters[Math.max(activeIndex, 0)];
  const progress = (activeIndex + 1) / chapters.length;
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur xl:hidden">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-foreground">
          {activeChapter.nummer}. {activeChapter.kurz}
        </span>
        <div className="flex items-center gap-1.5" aria-label="Kapitel wählen">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              title={`${chapter.nummer}. ${chapter.kurz}`}
              aria-label={`${chapter.nummer}. ${chapter.kurz}`}
              onClick={() => navigate(chapter.id)}
              className={cn(
                "h-2.5 w-2.5 rounded-full border transition-colors",
                chapter.id === active
                  ? "border-primary bg-primary"
                  : "border-border bg-card hover:border-primary/60"
              )}
            />
          ))}
        </div>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
