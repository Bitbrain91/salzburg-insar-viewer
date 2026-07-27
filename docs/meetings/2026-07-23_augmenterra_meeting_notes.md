# Meeting-Ergebnisse: AUGMENTERRA-Jour-fixe (2026-07-23)

**Stand:** 2026-07-27
**Status:** eingefroren (nachdokumentiert)
**Teilnehmerkreis:** Projektteam SP-AI + AUGMENTERRA (reduzierte Besetzung; mehrere Teilnehmer urlaubsbedingt entschuldigt)
**Vorbereitung:** `2026-07-23_augmenterra_meeting_plan.md`

**Quelle:** Audio-Transkript `mediaKI/temp/2026-07-23 13-58-31.transcript.md`
(69 min, `gpt-4o-transcribe`, ohne Sprecherzuordnung). Kennzahlen in diesem
Dokument stammen aus den eingefrorenen Artefakten, nicht aus dem Transkript.

Das Meeting folgte nicht der geplanten Agenda: Thema 1 (Gebaeudedaten) wurde
ausfuehrlich und live am Bildschirm behandelt, Thema 3 (Validierung) kurz
referiert, Thema 4 (Hanglage) und Thema 5 (Hosting) nur angerissen und
vertagt. Thema 2 (Referenzdaten/Label-Stichprobe) wurde nicht behandelt.
Dominierend war die neue Nachricht zum Wien-Datensatz.

## 1. Beschluesse

1. **Wien wird die zentrale Validierungs-Datenbasis.** AUGMENTERRA hat einen
   Auftrag der Wiener Linien erhalten: ganz Wien, 2019 bis heute, Sentinel-1
   (C-Band, aufsteigend + absteigend) plus COSMO-SkyMed (X-Band, nur
   absteigend) ueber dieselbe Zeitreihe. Dazu bekannte U-Bahn-bedingte
   Setzungen, bodengebundene In-situ-/Korrekturdaten (Anfrage laeuft, sensibel),
   voraussichtlich rueckfragbare Schadensereignisse und in Aussicht das echte
   3D-Gebaeudemodell der Stadt Wien (inkl. Dachneigungen). Lieferung ca.
   4 Wochen nach dem Meeting (Ende August 2026).
2. **Keine alten Sentinel-Bestaende fuer eine laengere SNT/TSX-Ueberlappung.**
   Weder der Landesdatensatz Salzburg 2014-2020 noch aeltere
   Bad-Gastein-Exporte (~2021-2023) werden herangezogen: alter
   Prozessierungsstand, deutlich weniger Messpunkte, keine
   Bauwerkszuordnung - der Vergleich waere wertlos. Fuer Salzburg existiert
   ohnehin nur eine TSX-Geometrie ohne Zeitueberlappung zu den SNT-Daten;
   die im Meeting-Plan formulierte Bitte um eine mehrjaehrige
   SNT/TSX-Ueberlappung ist damit nicht erfuellbar.
   **Bad Gastein bleibt primaeres Hanglagen-Testgebiet**; wie die
   Hanglagen-Methodik ohne lange hochaufloesende Referenz geprueft wird, ist
   offen (Kandidat: Vergleich auf-/absteigender Blickrichtung gegen ein
   Erwartungsmodell; Thema fuer das Meeting am 24.09.).
3. **GBA als Hoehenquelle verworfen** (nur noch Fallback). Externe
   Bestaetigung: GBA-Hoehen liegen im Mittel ~30 % zu niedrig; die
   BEV-Entscheidung als Standardquelle ist damit auch extern begruendet.
4. **Aneinandergebaute Gebaeude getrennt bewerten.** AUGMENTERRA-Position:
   Ob zwei aneinandergebaute Gebaeude auf derselben Bodenplatte stehen, ist
   nicht feststellbar; getrennte Einheiten sind die sicherere Annahme, die
   Bewegungsdifferenz ist das interessante Signal.
5. **BEV-Teilungslogik: keine verlaessliche Regel erkennbar.** In einem live
   verifizierten Fall faellt die BEV-Teilung mit einer mitten durch das
   Gebaeude laufenden Grundstuecksgrenze zusammen; bei weiteren geprueften
   Gebaeuden trifft das jedoch nicht zu. Weitere belegte Muster: ein
   Dachvorsprung als eigenes Objekt, Geisterobjekt, fehlender Neubau,
   Traufhoehen durch Vordaecher verfaelscht. Beidseitiges Fazit: Die
   BEV-Granularitaet ist fuer die Bewertungseinheit teilweise zu fein, eine
   regelbasierte Rekonstruktion ist nicht moeglich. **Konsequenz
   (Arbeitsauftrag mit Zustimmung):** ein fusionierter Gebaeudelayer
   ("das Beste aus allen Welten") mit Vertrauenswert je Grundriss aus dem
   Quellenvergleich BEV/OSM/GBA, abgeglichen mit dem
   1-m-Oberflaechen-/Gelaendemodell (DOM/DGM, teils 0,5 m / 20 cm).
   Hypothese zu pruefen: BEV-Bauwerkshoehen sind selbst aus dem DOM/DGM
   abgeleitet.
6. **Anbau-Logik-Umkehr mitgetragen** (Gespraechskonsens, kein formaler
   Gate-Beschluss): Bewegen sich alle Punkte gleich, ist die Aufteilung
   unerheblich; entscheidend ist die Erkennung unterschiedlicher Bewegung,
   Hoehe/Geometrie dienen erst danach der Einordnung (Anbau oder nicht).
7. **AUGMENTERRA entwickelt parallel eine Bewegungszerlegung** aus
   Einfallswinkel + Hangneigung (Umlenkung des LOS-Vektors in die
   Bewegungsrichtung, unter der Hypothese hangabwaerts gerichteter Bewegung;
   Implementierung laeuft). Abgleich mit unserem Ansatz beim Meeting am
   24.09., wenn die zustaendigen Personen zurueck sind. Zu klaerende
   Kernfrage: eine oder beide Blickrichtungen je Gebaeude, und wird ein
   Residuum geprueft?
8. **Naechstes Meeting: 2026-09-24.** Der Termin vom 17.09. wird verschoben,
   der Zwischentermin entfaellt (Urlaube: AUGMENTERRA-Kontakt ab Mitte
   August ein Monat, SP-AI im September).

## 2. Vereinbarte Lieferungen und externe Zusagen

| Wer | Was | Wann |
|---|---|---|
| AUGMENTERRA | Wien-Datensatz (SNT ASC+DSC, CSK DSC, 2019-heute) | ~Ende August 2026 |
| AUGMENTERRA | Rueckmeldung Server-/Hosting-Option (interner Entwickler wird gefragt) | kurzfristig |
| AUGMENTERRA | Status In-situ-/Korrekturdaten Wien | offen (Anfrage laeuft) |
| AUGMENTERRA | 3D-Gebaeudemodell Stadt Wien (Format/Lizenz offen) | mit Wien-Paket |
| SP-AI | Vorarbeiten Gebaeudedatenfusion (DOM/DGM-Abgleich) | vor dem 24.09. |
| SP-AI | FH-Serveroptionen pruefen (Fallback zu AUGMENTERRA-Hosting) | vor dem 24.09. |

Erreichbarkeit: AUGMENTERRA-Kontakt bis 12./13.08., danach Urlaub bis 15.09.

## 3. Offene Punkte und vertagte Themen

- **Nicht behandelt:** Meeting-Plan Thema 2 (Label-Stichprobe 10-15 Gebaeude
  durch AUGMENTERRA). Expertenlabels sind ohnehin zurueckgestellt, solange
  die Wien-Ground-Truth der primaere Validierungspfad ist.
- **Ungeklaert:** Hoehensystem der gelieferten Punkthoehen (im Plan als
  Frage vorgesehen, nicht gestellt; betrifft P1-7/Vertikaldatum).
- **Vertagt auf 24.09.:** Hanglagen-Methodik und 2D-Zerlegung (inkl.
  Abgleich mit der AUGMENTERRA-Parallelentwicklung, Beschluss 7);
  Wien-Integrationsdetails; Hosting-Entscheidung (AUGMENTERRA-Server / FH /
  eigener Server; Randbedingung: voller Admin-Zugriff, grob 16+ GB RAM,
  ~60 GB+ Speicher fuer den aktuellen Bestand, Wien deutlich mehr).
- **Themenspeicher-Altlasten:** Differentialfall `96637447` und Track 22 Ost
  wurden nicht besprochen; bleiben im Themenspeicher des naechsten Plans.

## 4. Weiterleitungs-Checkliste (Dokumentationsimpact)

- [x] Beschluesse in `next_steps.md` (Roadmap-Umbau 2026-07-27: neue Punkte
  Gebaeudedatenfusion, Bewertungsreview, Wien-Onboarding; P1-2
  zurueckgestellt; P1-8/P1-9/P1-10 aktualisiert)
- [x] Projektziel: Motion-Referenz-Pfad auf Wien umgestellt
- [x] Beobachtung nach `docs/research/observations/`: `OBS-2026-001` um
  Meeting-Befund ergaenzt und an `next_steps.md` weitergeleitet
- [x] Lieferungen/Blocker als Startbedingungen vermerkt (Wien-Daten,
  Meeting-Input 24.09.)
- [x] Naechsten Meeting-Plan angelegt (`2026-09-24_augmenterra_meeting_plan.md`
  inkl. Themenspeicher)
- [x] Meeting-Index in `docs/meetings/README.md` aktualisiert
