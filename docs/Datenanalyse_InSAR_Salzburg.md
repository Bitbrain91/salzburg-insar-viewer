# Analysebericht: InSAR-Datensätze Stadt Salzburg

**Erstellt:** 27.11.2025
**Aktualisiert:** 22.01.2026 (Erweiterte Analyse aller 3 Datensätze)

---

## 1. Zusammenfassung

Der Ordner `insar_viewer_app/data/Daten` enthält **3 GeoPackage-Dateien** mit InSAR-Daten für das Stadtgebiet Salzburg. Die Daten stammen vom **Sentinel-1 Satellitensystem** der ESA und erfassen Bodenbewegungen über einen Zeitraum von fast **3 Jahren** (April 2022 - März 2025).

| Datei | Größe | Typ | Messpunkte | Beschreibung |
|-------|-------|-----|------------|--------------|
| `ASC_T44_AMP.gpkg` | ca. 289 MB | Rohdaten | 338.728 | SAR-Amplituden Track 44 |
| `ASC_T95_AMP.gpkg` | ca. 285 MB | Rohdaten | 336.497 | SAR-Amplituden Track 95 |
| `Stadt_Salzburg.gpkg` | ca. 539 MB | Verarbeitet | 550.764 | Bewegungsmessungen (beide Tracks) |

---

## 2. Datensätze im Detail

### 2.1 ASC_T44_AMP.gpkg (SAR-Amplituden Track 44)

| Parameter | Wert |
|-----------|------|
| **Layer** | AUSTRIA_SNT_T44_A_ES10968A004S_AMP |
| **Geometrie** | Point (EPSG:4326) |
| **Messpunkte** | 338.728 |
| **Zeitreihe** | 90 Termine (05.04.2022 - 20.03.2025) |

**Attribute:**
- `CODE`: Eindeutiger Messpunkt-Identifikator
- `D20220405`, `D20220417`, ... : Amplitudenwerte pro Aufnahmedatum (90 Spalten)

### 2.2 ASC_T95_AMP.gpkg (SAR-Amplituden Track 95)

| Parameter | Wert |
|-----------|------|
| **Layer** | AUSTRIA_SNT_T95_D_ES10968A003S_4_AMP |
| **Geometrie** | Point (EPSG:4326) |
| **Messpunkte** | 336.497 |
| **Zeitreihe** | 88 Termine (09.04.2022 - 24.03.2025) |

**Attribute:**
- `CODE`: Eindeutiger Messpunkt-Identifikator
- `D20220409`, `D20220421`, ... : Amplitudenwerte pro Aufnahmedatum (88 Spalten)

### 2.3 Stadt_Salzburg.gpkg (Verarbeitete Bewegungsdaten)

| Parameter | Layer "44" | Layer "95" |
|-----------|------------|------------|
| **Geometrie** | Point (EPSG:4326) | Point (EPSG:4326) |
| **Messpunkte** | 247.388 | 303.376 |
| **Blickrichtung (LOS)** | A (Ascending) | D (Descending) |
| **Einfallswinkel** | 38,79° (38,53° - 39,15°) | 38,52° (38,16° - 38,78°) |
| **Zeitreihe** | 90 Termine | 88 Termine |

**Vollständige Attributstruktur:**

| Attribut | Typ | Beschreibung | Einheit |
|----------|-----|--------------|---------|
| `id` | INTEGER | Interne Feature-ID | - |
| `file_id` | INTEGER | Datenquellen-ID | - |
| `code` | TEXT | Messpunkt-Identifikator | - |
| `track` | REAL | Orbit-Track Nummer | - |
| `los` | TEXT | Line of Sight (A/D) | - |
| `vel` | REAL | Mittlere Bewegungsgeschwindigkeit | mm/Jahr |
| `v_stdev` | REAL | Standardabweichung Geschwindigkeit | mm/Jahr |
| `acc` | REAL | Beschleunigung der Bewegung | mm/Jahr² |
| `a_stdev` | REAL | Standardabweichung Beschleunigung | mm/Jahr² |
| `height` | REAL | Ellipsoidische Höhe | m |
| `h_stdev` | REAL | Standardabweichung Höhe | m |
| `coherence` | REAL | Kohärenz (Signalqualität) | 0-1 |
| `incidence_angle` | REAL | Einfallswinkel des Radarsignals | Grad |
| `season_amp` | REAL | Amplitude saisonaler Schwankungen | mm |
| `s_amp_std` | REAL | Standardabweichung saisonale Amplitude | mm |
| `season_phs` | REAL | Phase saisonaler Schwankungen | - |
| `s_phs_std` | REAL | Standardabweichung saisonale Phase | - |
| `eff_area` | INTEGER | Effektive Fläche des Streuers | - |
| `dYYYYMMDD` | REAL | Kumulative Verschiebung pro Datum | mm |

---

## 3. Zusammenhänge zwischen den Datensätzen

### 3.1 Hierarchische Datenstruktur

Die drei Datensätze bilden eine **hierarchische Verarbeitungskette**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROHDATEN (Amplituden)                           │
│                                                                         │
│   ┌──────────────────────────┐      ┌──────────────────────────┐       │
│   │    ASC_T44_AMP.gpkg      │      │    ASC_T95_AMP.gpkg      │       │
│   │    338.728 Punkte        │      │    336.497 Punkte        │       │
│   │    SAR-Signalstärke      │      │    SAR-Signalstärke      │       │
│   │    (kein Bewegung!)      │      │    (kein Bewegung!)      │       │
│   └────────────┬─────────────┘      └────────────┬─────────────┘       │
│                │                                 │                      │
│                └─────────────┬───────────────────┘                      │
│                              │                                          │
│                              ▼                                          │
│                    ┌─────────────────────┐                              │
│                    │  PSI-Verarbeitung   │                              │
│                    │  (Interferometrie)  │                              │
│                    └─────────┬───────────┘                              │
│                              │                                          │
│                              ▼                                          │
│              ┌───────────────────────────────────┐                      │
│              │      Stadt_Salzburg.gpkg          │                      │
│              │  ┌─────────────┐ ┌─────────────┐  │                      │
│              │  │  Layer 44   │ │  Layer 95   │  │                      │
│              │  │ 247.388 Pkt │ │ 303.376 Pkt │  │                      │
│              │  │ Ascending   │ │ Descending  │  │                      │
│              │  │ + Bewegung  │ │ + Bewegung  │  │                      │
│              │  │ + Metadaten │ │ + Metadaten │  │                      │
│              │  └─────────────┘ └─────────────┘  │                      │
│              └───────────────────────────────────┘                      │
│                         VERARBEITETE DATEN                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Fundamentaler Unterschied der Datentypen

| Aspekt | AMP-Dateien | Stadt_Salzburg.gpkg |
|--------|-------------|---------------------|
| **Datentyp** | SAR-Amplitude (Signalstärke) | Verschiebung/Bewegung |
| **Bedeutung** | Rückstreuintensität | Bodenbewegung in LOS-Richtung |
| **Einheit** | Dimensionslos | Millimeter (mm) |
| **Verarbeitungsstufe** | Rohdaten | Endergebnis der PSI-Analyse |
| **Anwendung** | Qualitätskontrolle, Punktauswahl | Bewegungsanalyse, Monitoring |

**Wichtig:** Die Amplitudenwerte in den AMP-Dateien repräsentieren **NICHT** die Bodenbewegung! Sie zeigen lediglich, wie stark das Radarsignal vom jeweiligen Punkt reflektiert wird.

### 3.3 CODE-Verknüpfung zwischen Datensätzen

Die Messpunkte können über das `CODE`-Attribut verknüpft werden:

| Verknüpfung | Übereinstimmung | Quote |
|-------------|-----------------|-------|
| ASC_T44_AMP → Stadt_Salzburg (Layer 44) | 246.865 von 247.388 | **99,8%** |
| ASC_T95_AMP → Stadt_Salzburg (Layer 95) | 242.836 von 303.376 | **80,0%** |

**Interpretation:**
- Fast alle Punkte in Stadt_Salzburg Layer 44 haben ein Pendant in ASC_T44_AMP
- Bei Track 95 haben ca. 20% der verarbeiteten Punkte kein direktes Pendant in den AMP-Daten. Moegliche Ursachen sind Filterung/Selektion oder Verarbeitungsschritte; zusaetzlich existieren auch AMP-Punkte, die nicht in der verarbeiteten Datei enthalten sind.

### 3.4 Räumliche Beziehung

| Bereich | ASC_T44_AMP | ASC_T95_AMP | Stadt_Salzburg |
|---------|-------------|-------------|----------------|
| **Lon (West)** | 12,9750° | 12,9743° | 12,9857° |
| **Lon (Ost)** | 13,0996° | 13,0947° | 13,1236° |
| **Lat (Süd)** | 47,7506° | 47,7497° | 47,7513° |
| **Lat (Nord)** | 47,8542° | 47,8543° | 47,8535° |

**Gemeinsamer Überlappungsbereich (Track 44 & 95):**
- Longitude: 12,9858° - 13,1195°
- Latitude: 47,7514° - 47,8535°
- Abgedeckte Fläche: ca. 13,4 km × 11,4 km

### 3.5 Zeitliche Beziehung

| Parameter | Track 44 | Track 95 |
|-----------|----------|----------|
| **Erstes Datum** | 05.04.2022 | 09.04.2022 |
| **Letztes Datum** | 20.03.2025 | 24.03.2025 |
| **Anzahl Aufnahmen** | 90 | 88 |
| **Mittleres Intervall** | 12,1 Tage | 12,4 Tage |
| **Minimales Intervall** | 12 Tage | 12 Tage |
| **Maximales Intervall** | 24 Tage | 36 Tage |

Die zeitlichen Abstände von ca. 12 Tagen entsprechen dem Sentinel-1 Repeat Cycle.

### 3.6 Bedeutung der zwei Blickrichtungen

| Eigenschaft | Track 44 (Ascending) | Track 95 (Descending) |
|-------------|---------------------|----------------------|
| **Flugrichtung** | Süd → Nord | Nord → Süd |
| **Blickrichtung** | Nach Osten | Nach Westen |
| **LOS-Kennzeichnung** | A | D |
| **Einfallswinkel** | ~38,8° | ~38,5° |

**Nutzen der Kombination:**
1. **Dekomposition:** Trennung von vertikaler und horizontaler Bewegung
2. **Validierung:** Gegenseitige Prüfung der Messungen
3. **Abdeckung:** Bessere Erfassung unterschiedlich orientierter Oberflächen
4. **Redundanz:** Kompensation von Datenlücken

---

## 4. Statistische Analyse der Bewegungsdaten

### 4.1 Geschwindigkeitsstatistik

| Parameter | Track 44 (Ascending) | Track 95 (Descending) |
|-----------|---------------------|----------------------|
| **Minimum** | -17,0 mm/Jahr | -21,9 mm/Jahr |
| **Maximum** | +17,0 mm/Jahr | +17,9 mm/Jahr |
| **Mittelwert** | -0,25 mm/Jahr | +0,25 mm/Jahr |
| **Median** | -0,20 mm/Jahr | +0,30 mm/Jahr |
| **Standardabweichung** | 2,03 mm/Jahr | 1,98 mm/Jahr |
| **Ø v_stdev** | 1,04 mm/Jahr | 0,66 mm/Jahr |

**Interpretation:**
- Der Mittelwert nahe Null zeigt eine insgesamt **stabile Situation**
- Die leichte Diskrepanz zwischen Ascending (-0,25) und Descending (+0,25) deutet auf eine **geringe horizontale Bewegungskomponente** hin
- Track 95 zeigt **höhere Präzision** (niedrigere Standardabweichung)

### 4.2 Klassifizierung der Bodenbewegungen

| Kategorie | Geschwindigkeit | Track 44 | % | Track 95 | % |
|-----------|-----------------|----------|---|----------|---|
| **Stabil** | -2 bis +2 mm/Jahr | 207.888 | **84,0%** | 254.972 | **84,0%** |
| **Leichte Senkung** | -2 bis -5 mm/Jahr | 19.976 | 8,1% | 16.284 | 5,4% |
| **Moderate Senkung** | -5 bis -10 mm/Jahr | 3.764 | 1,5% | 3.458 | 1,1% |
| **Starke Senkung** | < -10 mm/Jahr | 1.104 | 0,4% | 1.047 | 0,3% |
| **Hebung** | > +2 mm/Jahr | 14.656 | 5,9% | 27.615 | 9,1% |

**Fazit:** Rund **84% aller Messpunkte** zeigen stabile Verhältnisse (< ±2 mm/Jahr).

### 4.3 Qualitätsanalyse (Kohärenz)

| Qualitätsstufe | Kohärenz | Track 44 | % | Track 95 | % |
|----------------|----------|----------|---|----------|---|
| **Hoch** | > 0,8 | 87.494 | 35,4% | 105.479 | 34,8% |
| **Mittel** | 0,6 - 0,8 | 98.192 | 39,7% | 124.780 | 41,1% |
| **Niedrig** | < 0,6 | 61.702 | 24,9% | 73.117 | 24,1% |

**Bewertung:** Die Datenqualität ist **gut** - über 75% der Punkte haben eine Kohärenz ≥ 0,6.

### 4.4 Kritische Punkte (stärkste Bewegungen)

#### Stärkste Senkungen - Track 44
| Code | Geschw. [mm/a] | Std.Abw. | Höhe [m] | Kohärenz |
|------|----------------|----------|----------|----------|
| OA3SWPR01 | -17,0 | ±1,2 | 488,9 | 0,41 |
| O0IHI7401 | -17,0 | ±1,1 | 456,0 | 0,41 |
| NZSAF9401 | -17,0 | ±1,2 | 482,9 | 0,69 |
| NU5V1LM01 | -17,0 | ±1,1 | 467,5 | 0,73 |
| OEIRNJZ01 | -16,9 | ±1,1 | 488,7 | 0,51 |

#### Stärkste Senkungen - Track 95
| Code | Geschw. [mm/a] | Std.Abw. | Höhe [m] | Kohärenz |
|------|----------------|----------|----------|----------|
| NJE9U7G01 | **-21,9** | ±0,7 | 482 | **0,82** ✓ |
| NICRL6101 | **-21,9** | ±0,7 | 473 | **0,85** ✓ |
| NHUWKZZ01 | -18,0 | ±0,6 | 474 | **0,88** ✓ |
| NJLF1G301 | -17,3 | ±0,6 | 474 | **0,85** ✓ |
| NUN4LJH01 | -17,1 | ±0,7 | 457 | **0,81** ✓ |

**Bemerkenswert:** Die stärksten Absenkungen in Track 95 haben eine **hohe Kohärenz (>0,8)** und sind damit als zuverlässig einzustufen.

---

## 5. Saisonale und Beschleunigungsanalyse

### 5.1 Saisonale Effekte

| Parameter | Track 44 | Track 95 |
|-----------|----------|----------|
| **Ø Saisonale Amplitude** | 1,26 mm | 1,17 mm |
| **Max. Saisonale Amplitude** | 13,72 mm | 11,92 mm |

Die saisonalen Schwankungen sind moderat und entsprechen typischen thermischen Ausdehnungseffekten.

### 5.2 Beschleunigung

| Parameter | Track 44 | Track 95 |
|-----------|----------|----------|
| **Ø Beschleunigung** | -0,03 mm/Jahr² | -0,01 mm/Jahr² |
| **Min. Beschleunigung** | -11,9 mm/Jahr² | -11,6 mm/Jahr² |
| **Max. Beschleunigung** | +11,0 mm/Jahr² | +11,0 mm/Jahr² |

---

## 6. Empfehlungen für die Datennutzung

### 6.1 Welche Datei für welchen Zweck?

| Anwendungsfall | Empfohlene Datei |
|----------------|------------------|
| **Bewegungsanalyse** | `Stadt_Salzburg.gpkg` |
| **Zeitreihenanalyse** | `Stadt_Salzburg.gpkg` |
| **Qualitätskontrolle** | AMP-Dateien + `Stadt_Salzburg.gpkg` |
| **Punktauswahl/Filterung** | AMP-Dateien (Signalstärke) |
| **2D/3D-Dekomposition** | `Stadt_Salzburg.gpkg` (beide Layer) |

### 6.2 Qualitätsfilter

Empfohlene Filterkriterien für zuverlässige Analysen:
- Kohärenz ≥ 0,6 (besser ≥ 0,7)
- v_stdev ≤ 1,5 mm/Jahr
- Bei Extremwerten: Kohärenz ≥ 0,8

### 6.3 Handlungsempfehlungen

1. **Hotspot-Untersuchung:** Die Punkte mit Senkungsraten > 15 mm/Jahr lokalisieren und vor Ort prüfen
2. **Dekomposition:** Vertikale und horizontale Bewegungskomponenten durch Kombination beider Tracks trennen
3. **Monitoring:** Punkte mit signifikanter Beschleunigung überwachen
4. **Validierung:** Bei wichtigen Entscheidungen beide Tracks vergleichen

---

## 7. Technische Metadaten

```
Koordinatensystem:     EPSG:4326 (WGS 84)
Geometrietyp:          POINT
Datenquelle:           Sentinel-1 (ESA Copernicus)
Verarbeitungsmethode:  Persistent Scatterer Interferometry (PSI)
Beobachtungszeitraum:  April 2022 - März 2025 (~3 Jahre)
Mittleres Intervall:   ~12 Tage (Sentinel-1 Repeat Cycle)
Gesamtpunkte:          675.225 (AMP) / 550.764 (verarbeitet)
```

---

*Bericht erstellt: 27.11.2025*
*Letzte Aktualisierung: 22.01.2026*
