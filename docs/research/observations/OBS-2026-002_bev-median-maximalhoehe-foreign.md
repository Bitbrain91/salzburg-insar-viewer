# OBS-2026-002: Unklare Klassifikation zwischen BEV-Median- und Maximalhoehe

**Beobachtet:** 2026-07-15

**Status:** offen

**Bereich:** Gebaeudezuordnung / BEV-Hoehen / Foreign-Klassifikation

**Evidenz:** aktive Methodik und Code zum Beobachtungszeitpunkt; bei Behandlung neu zu verifizieren

## Beobachtung

Die Candidate Area wird bei BEV anhand der maximalen Gebaeudehoehe gebildet.
Ein Punkt wird damit zunaechst aufgenommen, wenn seine Lage durch einen
entsprechend hohen Teil des Gebaeudes theoretisch erklaerbar waere.

In der anschliessenden Reichweitenpruefung wird jedoch die Medianhoehe des
Gebaeudes plus eine Toleranz verwendet. Ueberschreitet die fuer den Punkt
erforderliche Reflektorhoehe diesen Wert, wird der Punkt im aktuellen
BEV-Vertrag als `foreign` behandelt.

Dadurch entsteht ein unklarer Zwischenbereich:

```text
Medianhoehe + Toleranz
    < erforderliche Reflektorhoehe
    <= Maximalhoehe
```

Fuer einen Punkt in diesem Bereich gelten gleichzeitig zwei Aussagen:

- Nach der Maximalhoehe koennte er von einem realen hohen Gebaeudeteil stammen.
- Nach der Medianhoehe gilt er als unplausibel und wird als Fremdreflektor
  behandelt.

Die aktuelle Semantik bildet diese Mehrdeutigkeit nicht ausdruecklich ab.

## Wichtiger Kontext

Die grosszuegige Candidate Area ist grundsaetzlich sinnvoll, damit
moeglicherweise relevante Punkte nicht vor der Analyse verloren gehen.

Gleichzeitig darf die Maximalhoehe nicht automatisch jeden Punkt im gesamten
Suchbereich als plausiblen Gebaeudereflektor bestaetigen. Ein hoher
Gebaeudeteil muss nicht an jeder Stelle des Footprints vorhanden sein.

BEV ist die Standard-Gebaeudequelle. GBA wird nicht automatisch fuer einzelne
fehlende BEV-Gebaeude zugeschaltet, sondern in getrennt konfigurierten Runs als
Vergleichsquelle verwendet.

## Offene fachliche Frage

Wie soll ein Punkt behandelt werden, dessen Lage nach der dokumentierten
Maximalhoehe physikalisch moeglich, nach der typischen Medianhoehe aber
ungewoehnlich ist?

Insbesondere ist offen, ob die unmittelbare Klassifikation als `foreign` diese
Unsicherheit angemessen ausdrueckt oder echte Reflektoren hoher Gebaeudeteile
faelschlich ausschliessen kann.

## Triage und Weiterleitung

- Triage: noch offen
- `next_steps.md`: nicht aufgenommen
- aktive Methodik: unveraendert
