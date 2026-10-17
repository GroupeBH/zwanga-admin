/**
 * Page "Zones géographiques" — Zwanga Admin
 *
 * Présente les zones opérationnelles de la plateforme, centrée sur Kinshasa.
 * Comme il n'existe pas d'API dédiée aux zones, on dérive les statistiques
 * à partir des trajets chargés via useGetAllTripsQuery (jusqu'à 500 trajets).
 * Les zones elles-mêmes sont définies statiquement dans KINSHASA_ZONES.
 */
"use client";

import { useMemo } from "react";
import { MapPin, Activity, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import shared from "../styles/page.module.css";

// ---------------------------------------------------------------------------
// Données statiques des zones de Kinshasa
// ---------------------------------------------------------------------------
const KINSHASA_ZONES = [
  { id: "gombe",        name: "Gombe",              description: "Centre-ville, zone commerciale principale",    active: true,  color: "#ff7a00" },
  { id: "ngaliema",     name: "Ngaliema",            description: "Ouest, quartiers résidentiels",               active: true,  color: "#3dd598" },
  { id: "limete",       name: "Limete",              description: "Est, zone industrielle et résidentielle",     active: true,  color: "#4ecdc4" },
  { id: "bandalungwa",  name: "Bandalungwa",         description: "Centre-ouest, quartier animé",                active: true,  color: "#ffe66d" },
  { id: "lemba",        name: "Lemba",               description: "Sud-est, zone universitaire",                active: true,  color: "#a29bfe" },
  { id: "matete",       name: "Matete",              description: "Est, zone populaire",                        active: true,  color: "#fd79a8" },
  { id: "masina",       name: "Masina",              description: "Est lointain, forte densité",                active: false, color: "#636e72" },
  { id: "mont-ngafula", name: "Mont-Ngafula",        description: "Sud-ouest, zone périphérique",               active: false, color: "#636e72" },
  { id: "kintambo",     name: "Kintambo",            description: "Ouest, bord du fleuve",                      active: true,  color: "#00b894" },
  { id: "kinshasa",     name: "Kinshasa (commune)",  description: "Commune centrale",                           active: true,  color: "#e17055" },
] as const;

type Zone = (typeof KINSHASA_ZONES)[number];

// ---------------------------------------------------------------------------
// Détection des trajets par zone via mots-clés dans les champs de localisation
// ---------------------------------------------------------------------------
function detectTripsForZone(
  zone: Zone,
  trips: Array<{ departureLocation: string; arrivalLocation: string }>
): number {
  // On utilise le nom de la zone (et son ID sans tiret) comme mots-clés
  const keywords = [zone.name.toLowerCase(), zone.id.replace("-", " ")];

  return trips.filter((trip) => {
    const dep = trip.departureLocation.toLowerCase();
    const arr = trip.arrivalLocation.toLowerCase();
    return keywords.some((kw) => dep.includes(kw) || arr.includes(kw));
  }).length;
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export default function ZonesPage() {
  const { data: trips = [], isFetching } = useGetAllTripsQuery({ page: 1, limit: 500 });

  // Comptages dérivés des données de trajets
  const zoneStats = useMemo(
    () =>
      KINSHASA_ZONES.map((zone) => ({
        ...zone,
        tripCount: detectTripsForZone(zone, trips),
      })),
    [trips]
  );

  // KPIs globaux
  const activeCount = KINSHASA_ZONES.filter((z) => z.active).length;
  const pendingCount = KINSHASA_ZONES.filter((z) => !z.active).length;
  const totalTripsAnalysed = trips.length;

  return (
    <div className={shared.page}>
      {/* ------------------------------------------------------------------ */}
      {/* En-tête                                                             */}
      {/* ------------------------------------------------------------------ */}
      <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <MapPin size={28} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
        Zones géographiques
      </h1>

      {/* ------------------------------------------------------------------ */}
      {/* Section KPIs                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section} aria-labelledby="kpi-title">
        <div className={shared.sectionHeader}>
          <h2 id="kpi-title" style={{ margin: 0 }}>
            Vue d'ensemble
          </h2>
          {isFetching && (
            <p className={shared.mutedText} aria-live="polite">
              Analyse des trajets en cours…
            </p>
          )}
        </div>

        <div className={shared.grid}>
          {/* KPI 1 — Zones actives */}
          <article className={shared.card} aria-label={`${activeCount} zones actives`}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)" }}>
              <CheckCircle size={16} aria-hidden="true" style={{ color: "var(--color-success)" }} />
              Zones actives
            </span>
            <strong style={{ fontSize: "2rem", color: "var(--color-success)" }}>
              {activeCount}
            </strong>
            <small className={shared.mutedText}>
              Couverture opérationnelle en service
            </small>
          </article>

          {/* KPI 2 — Zones en préparation */}
          <article className={shared.card} aria-label={`${pendingCount} zones en préparation`}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)" }}>
              <XCircle size={16} aria-hidden="true" style={{ color: "var(--color-warning)" }} />
              Zones en préparation
            </span>
            <strong style={{ fontSize: "2rem", color: "var(--color-warning)" }}>
              {pendingCount}
            </strong>
            <small className={shared.mutedText}>
              Couverture non encore activée
            </small>
          </article>

          {/* KPI 3 — Trajets analysés */}
          <article className={shared.card} aria-label={`${totalTripsAnalysed} trajets analysés`}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)" }}>
              <TrendingUp size={16} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
              Trajets analysés
            </span>
            <strong style={{ fontSize: "2rem", color: "var(--color-primary)" }}>
              {isFetching ? "…" : totalTripsAnalysed}
            </strong>
            <small className={shared.mutedText}>
              Données issues des 500 derniers trajets
            </small>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Carte OpenStreetMap                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section} aria-labelledby="map-title">
        <div className={shared.sectionHeader}>
          <h2 id="map-title" style={{ margin: 0 }}>
            Carte de Kinshasa
          </h2>
          <span
            className={`${shared.badge} ${shared.badgeSuccess}`}
            aria-label="Source OpenStreetMap"
          >
            <Activity size={12} aria-hidden="true" />
            OpenStreetMap
          </span>
        </div>

        {/* Iframe OpenStreetMap centrée sur Kinshasa */}
        <div
          style={{
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid var(--color-border)",
            height: "320px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <iframe
            title="Carte de Kinshasa — zones opérationnelles Zwanga"
            src="https://www.openstreetmap.org/export/embed.html?bbox=15.20,-4.55,15.45,-4.25&layer=mapnik"
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
            loading="lazy"
            allowFullScreen
          />
        </div>

        <p className={shared.mutedText} style={{ fontSize: "0.82rem", margin: 0 }}>
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>OpenStreetMap</a> contributeurs — Les limites de zones affichées sont indicatives.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Tableau des zones                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section} aria-labelledby="zones-table-title">
        <div className={shared.sectionHeader}>
          <div>
            <h2 id="zones-table-title" style={{ margin: 0 }}>
              Détail des zones
            </h2>
            <p className={shared.mutedText} style={{ margin: "4px 0 0", fontSize: "0.88rem" }}>
              {KINSHASA_ZONES.length} zones répertoriées · détection par mots-clés dans les trajets
            </p>
          </div>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Description</th>
                <th>Statut</th>
                <th>Trajets détectés</th>
                <th>Activité</th>
              </tr>
            </thead>
            <tbody>
              {zoneStats.map((zone) => {
                // Calcul d'un indicateur d'activité relatif au max
                const maxTrips = Math.max(...zoneStats.map((z) => z.tripCount), 1);
                const activityPct = Math.round((zone.tripCount / maxTrips) * 100);

                return (
                  <tr key={zone.id}>
                    {/* Colonne Zone */}
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-block",
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: zone.color,
                            flexShrink: 0,
                          }}
                        />
                        <strong>{zone.name}</strong>
                      </span>
                    </td>

                    {/* Colonne Description */}
                    <td>
                      <span className={shared.mutedText} style={{ fontSize: "0.88rem" }}>
                        {zone.description}
                      </span>
                    </td>

                    {/* Colonne Statut */}
                    <td>
                      {zone.active ? (
                        <span className={`${shared.badge} ${shared.badgeSuccess}`}>
                          <CheckCircle size={11} aria-hidden="true" />
                          Active
                        </span>
                      ) : (
                        <span className={`${shared.badge} ${shared.badgeWarning}`}>
                          <XCircle size={11} aria-hidden="true" />
                          En préparation
                        </span>
                      )}
                    </td>

                    {/* Colonne Trajets détectés */}
                    <td>
                      {isFetching ? (
                        <span className={shared.mutedText}>…</span>
                      ) : (
                        <strong style={{ color: zone.tripCount > 0 ? "var(--color-text)" : "var(--color-text-muted)" }}>
                          {zone.tripCount}
                        </strong>
                      )}
                    </td>

                    {/* Colonne Activité — barre de progression indicative */}
                    <td>
                      <div
                        title={`${activityPct}% de l'activité max`}
                        aria-label={`Activité : ${activityPct}%`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 120,
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.07)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${activityPct}%`,
                              background: zone.active ? zone.color : "var(--color-text-muted)",
                              borderRadius: 999,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <span className={shared.mutedText} style={{ fontSize: "0.78rem", minWidth: 34, textAlign: "right" }}>
                          {activityPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Note explicative — géofencing                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section} aria-labelledby="help-title">
        <h2 id="help-title" style={{ margin: 0, fontSize: "1rem" }}>
          À propos de la détection des zones
        </h2>

        <p className={shared.mutedText} style={{ margin: 0, lineHeight: 1.65 }}>
          La colonne <strong style={{ color: "var(--color-text)" }}>Trajets détectés</strong> est calculée
          côté client par recherche de mots-clés dans les champs{" "}
          <em>departureLocation</em> et <em>arrivalLocation</em> des 500 derniers trajets. Cette méthode
          est approximative : un trajet peut traverser plusieurs zones ou employer un libellé différent
          du nom de commune.
        </p>

        <div
          style={{
            marginTop: 4,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255, 208, 71, 0.25)",
            background: "rgba(255, 208, 71, 0.07)",
            color: "var(--color-warning)",
            fontSize: "0.88rem",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
          role="note"
        >
          <Activity size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Géofencing précis :</strong> pour une couverture géographique exacte (polygones de
            zones, attribution automatique des trajets, alertes hors-zone), une configuration backend
            est nécessaire — typiquement une table <code>zones</code> avec des géométries PostGIS et
            une API <code>/admin/zones</code> dédiée.
          </span>
        </div>
      </section>
    </div>
  );
}
