import { useState } from "react";
import { fmtNum, formatSignedTrackMotion, sortTrackEntries } from "../../../lib/formatters";
import type { ReliabilityReasonTone } from "../../../lib/reliabilityReasons";
import { CollapsibleSection, FindingCard } from "../../ui";

export type WhyReason = {
  key: string;
  label: string;
  detail: string;
  tone: ReliabilityReasonTone;
};

export type WhyPanelProps = {
  title: string;
  reasons: WhyReason[];
  emptyText?: string;
  maxVisible?: number;
  defaultOpen?: boolean;
  /** Track-Bewegungen für den Vergleichs-Miniblock (optional). */
  trackMotion?: Record<string, number | null>;
  trackAgreementScore?: number | null;
  /** Erzwingt Remount bei Selektionswechsel (analog CollapsibleSection-key). */
  sectionKey?: string;
};

/**
 * "Warum diese Bewertung?" — priorisierte Grund-Karten in Klartext.
 * Mehr als maxVisible Gründe verschwinden hinter "+n weitere Gründe".
 */
export function WhyPanel({
  title,
  reasons,
  emptyText = "Alle Prüfungen waren unauffällig.",
  maxVisible = 3,
  defaultOpen = true,
  trackMotion,
  trackAgreementScore,
  sectionKey,
}: WhyPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleReasons = showAll ? reasons : reasons.slice(0, maxVisible);
  const hiddenCount = reasons.length - visibleReasons.length;
  const trackEntries = trackMotion ? sortTrackEntries(trackMotion) : [];

  return (
    <CollapsibleSection title={title} defaultOpen={defaultOpen} key={sectionKey}>
      <div className="grid gap-2">
        {visibleReasons.length > 0 ? (
          <>
            {visibleReasons.map((reason) => (
              <FindingCard
                key={reason.key}
                label={reason.label}
                detail={reason.detail}
                tone={reason.tone}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-left text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                +{hiddenCount} weitere {hiddenCount === 1 ? "Grund" : "Gründe"} anzeigen
              </button>
            )}
            {showAll && reasons.length > maxVisible && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="text-left text-xs font-medium text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Weniger anzeigen
              </button>
            )}
          </>
        ) : (
          <div className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            {emptyText}
          </div>
        )}

        {trackEntries.length > 0 && (
          <div className="rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Trackvergleich
            </div>
            <div className="grid gap-1">
              {trackEntries.map(([track, value]) => (
                <div key={track} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <span className="font-mono text-muted-foreground">T{track}</span>
                  <span className="font-semibold text-foreground">
                    {formatSignedTrackMotion(value)}
                  </span>
                </div>
              ))}
              {trackAgreementScore !== undefined && (
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border/60 pt-1">
                  <span className="font-mono text-muted-foreground">Score</span>
                  <span className="font-semibold text-foreground">
                    Track-Übereinstimmung {fmtNum(trackAgreementScore)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
