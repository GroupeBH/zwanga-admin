"use client";

/**
 * Page : Agents de terrain – /terrain-agents
 *
 * Affiche le classement et les KPIs des agents qui recrutent des conducteurs
 * et des passagers sur le terrain à Kinshasa.
 *
 * Données agents : constante statique (pas d'API dédiée dans la v1).
 * Données conducteurs : useGetUsersQuery({ role: "driver" }) → enrichit les stats.
 */

import { useMemo, useState } from "react";
import {
  Award,
  Download,
  Info,
  MapPin,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import shared from "../styles/page.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerrainAgent {
  id: string;
  name: string;
  zone: string;
  phone: string;
  /** Nombre de recrutements déclarés par l'agent sur le terrain */
  declared: number;
  /** Conducteurs réellement inscrits sur la plateforme via cet agent */
  registered: number;
  /** KYC validés parmi les inscrits */
  kycApproved: number;
  /** Conducteurs ayant effectué au moins un trajet */
  firstTrip: number;
  status: "active" | "inactive";
}

// ---------------------------------------------------------------------------
// Données statiques de démonstration – seront remplacées par l'API v2
// ---------------------------------------------------------------------------

const TERRAIN_AGENTS: TerrainAgent[] = [
  {
    id: "agt-001",
    name: "Jean-Pierre Mbala",
    zone: "Gombe",
    phone: "+243 81 234 5678",
    declared: 45,
    registered: 38,
    kycApproved: 22,
    firstTrip: 18,
    status: "active",
  },
  {
    id: "agt-002",
    name: "Marie Lunkamba",
    zone: "Ngaliema",
    phone: "+243 82 345 6789",
    declared: 32,
    registered: 28,
    kycApproved: 19,
    firstTrip: 16,
    status: "active",
  },
  {
    id: "agt-003",
    name: "Christian Banzuzi",
    zone: "Limete",
    phone: "+243 83 456 7890",
    declared: 28,
    registered: 21,
    kycApproved: 14,
    firstTrip: 11,
    status: "active",
  },
  {
    id: "agt-004",
    name: "Patricia Nkosi",
    zone: "Bandalungwa",
    phone: "+243 84 567 8901",
    declared: 19,
    registered: 15,
    kycApproved: 8,
    firstTrip: 6,
    status: "active",
  },
  {
    id: "agt-005",
    name: "Robert Kabuya",
    zone: "Lemba",
    phone: "+243 85 678 9012",
    declared: 41,
    registered: 12,
    kycApproved: 4,
    firstTrip: 3,
    status: "inactive",
  },
];

// Zones extraites depuis les données agents + option "Toutes"
const ALL_ZONES = ["Toutes", ...Array.from(new Set(TERRAIN_AGENTS.map((a) => a.zone))).sort()];

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Calcule le taux de performance d'un agent :
 * (premier trajet effectué / recrutements déclarés) × 100
 */
const computePerformance = (agent: TerrainAgent): number => {
  if (agent.declared === 0) return 0;
  return Math.round((agent.firstTrip / agent.declared) * 100);
};

/**
 * Retourne la combinaison de classes CSS badge appropriée selon le taux.
 * > 50 % → succès · 30-50 % → avertissement · < 30 % → danger
 */
const performanceBadgeClass = (perf: number): string => {
  if (perf >= 50) return `${shared.badge} ${shared.badgeSuccess}`;
  if (perf >= 30) return `${shared.badge} ${shared.badgeWarning}`;
  return `${shared.badge} ${shared.badgeDanger}`;
};

/** Exporte les données agents au format CSV (côté client, sans dépendance) */
const exportAgentsCsv = (agents: TerrainAgent[]) => {
  const headers = [
    "ID",
    "Nom",
    "Zone",
    "Téléphone",
    "Recrutements déclarés",
    "Inscrits réels",
    "KYC validés",
    "Premiers trajets",
    "Performance (%)",
    "Statut",
  ];

  const rows = agents.map((a) => [
    a.id,
    a.name,
    a.zone,
    a.phone,
    String(a.declared),
    String(a.registered),
    String(a.kycApproved),
    String(a.firstTrip),
    String(computePerformance(a)),
    a.status === "active" ? "Actif" : "Inactif",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agents-terrain-zwanga-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function TerrainAgentsPage() {
  // Filtres
  const [zoneFilter, setZoneFilter] = useState("Toutes");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // ── Données réelles : conducteurs inscrits (pour enrichir les stats globales)
  const { data: driversData, isFetching: isLoadingDrivers } = useGetUsersQuery({
    role: "driver",
    page: 1,
    limit: 100,
  });
  const totalRealDrivers = driversData?.total ?? 0;

  // ── Agents filtrés
  const filteredAgents = useMemo(() => {
    return TERRAIN_AGENTS.filter((agent) => {
      const matchZone = zoneFilter === "Toutes" || agent.zone === zoneFilter;
      const matchStatus =
        statusFilter === "all" || agent.status === statusFilter;
      return matchZone && matchStatus;
    });
  }, [zoneFilter, statusFilter]);

  // ── Pagination appliquée
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const paginatedAgents = filteredAgents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ── KPIs agrégés calculés sur TOUS les agents (pas seulement les filtrés)
  const kpis = useMemo(() => {
    const activeAgents = TERRAIN_AGENTS.filter((a) => a.status === "active").length;
    const totalDeclared = TERRAIN_AGENTS.reduce((sum, a) => sum + a.declared, 0);
    const totalFirstTrip = TERRAIN_AGENTS.reduce((sum, a) => sum + a.firstTrip, 0);
    const totalKyc = TERRAIN_AGENTS.reduce((sum, a) => sum + a.kycApproved, 0);

    // Taux de conversion global : premiers trajets / recrutements déclarés
    const conversionRate =
      totalDeclared > 0 ? Math.round((totalFirstTrip / totalDeclared) * 100) : 0;

    return {
      totalAgents: TERRAIN_AGENTS.length,
      activeAgents,
      totalDeclared,
      totalKyc,
      conversionRate,
    };
  }, []);

  // Réinitialise la page quand les filtres changent
  const handleZoneChange = (zone: string) => {
    setZoneFilter(zone);
    setPage(1);
  };

  const handleStatusChange = (status: "all" | "active" | "inactive") => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className={shared.page}>
      {/* ================================================================
          EN-TÊTE
      ================================================================ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Agents de terrain</h1>
            <p className={shared.mutedText}>
              Suivi des performances des agents qui recrutent conducteurs et
              passagers dans les communes de Kinshasa.
            </p>
          </div>

          {/* Bouton export CSV */}
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => exportAgentsCsv(filteredAgents)}
          >
            <Download size={16} aria-hidden="true" />
            Exporter CSV
          </button>
        </div>

        {/* Note explicative */}
        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Les données ci-dessous sont basées sur les déclarations terrain et
            les inscriptions constatées sur la plateforme. La colonne{" "}
            <strong>Inscrits réels</strong> provient des comptes effectivement
            créés. La synchronisation automatique entre le terrain et le backend
            sera disponible dans une future version.
          </span>
        </p>
      </section>

      {/* ================================================================
          KPIs AGRÉGÉS
      ================================================================ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2>Vue d&apos;ensemble</h2>
        </div>

        <div className={shared.grid}>
          {/* Total agents */}
          <div className={shared.card}>
            <p className={shared.mutedText}>
              <Users size={14} aria-hidden="true" /> Total agents
            </p>
            <strong style={{ fontSize: "2rem" }}>{kpis.totalAgents}</strong>
            <p className={shared.mutedText}>
              {kpis.activeAgents} actif{kpis.activeAgents > 1 ? "s" : ""} ·{" "}
              {kpis.totalAgents - kpis.activeAgents} inactif
              {kpis.totalAgents - kpis.activeAgents > 1 ? "s" : ""}
            </p>
          </div>

          {/* Recrutements déclarés ce mois */}
          <div className={shared.card}>
            <p className={shared.mutedText}>
              <MapPin size={14} aria-hidden="true" /> Recrutements déclarés
            </p>
            <strong style={{ fontSize: "2rem" }}>{kpis.totalDeclared}</strong>
            <p className={shared.mutedText}>
              Par l&apos;ensemble des agents terrain
            </p>
          </div>

          {/* Conducteurs actifs (données API réelles) */}
          <div className={shared.card}>
            <p className={shared.mutedText}>
              <UserCheck size={14} aria-hidden="true" /> Conducteurs actifs
            </p>
            <strong style={{ fontSize: "2rem" }}>
              {isLoadingDrivers ? "…" : totalRealDrivers}
            </strong>
            <p className={shared.mutedText}>
              {kpis.totalKyc} KYC validés (terrain)
            </p>
          </div>

          {/* Taux de conversion global */}
          <div className={shared.card}>
            <p className={shared.mutedText}>
              <TrendingUp size={14} aria-hidden="true" /> Taux de conversion
            </p>
            <strong style={{ fontSize: "2rem" }}>{kpis.conversionRate} %</strong>
            <p className={shared.mutedText}>
              Premiers trajets / recrutements déclarés
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          CLASSEMENT DES AGENTS
      ================================================================ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>
              <Award size={16} aria-hidden="true" /> Classement des agents
            </h2>
            <p className={shared.mutedText}>
              {filteredAgents.length} agent
              {filteredAgents.length > 1 ? "s" : ""} · trié par performance
            </p>
          </div>

          {/* Barre de filtres */}
          <div className={shared.toolbar}>
            {/* Filtre par zone */}
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="agents-zone">
                Zone
              </label>
              <select
                id="agents-zone"
                value={zoneFilter}
                onChange={(e) => handleZoneChange(e.target.value)}
              >
                {ALL_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par statut */}
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="agents-status">
                Statut
              </label>
              <select
                id="agents-status"
                value={statusFilter}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value as "all" | "active" | "inactive"
                  )
                }
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>

            {/* Réinitialiser les filtres si actifs */}
            {(zoneFilter !== "Toutes" || statusFilter !== "all") && (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => {
                  handleZoneChange("Toutes");
                  handleStatusChange("all");
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Tableau de classement */}
        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent</th>
                <th>Zone</th>
                <th>Déclarés</th>
                <th>Inscrits réels</th>
                <th>KYC validés</th>
                <th>Premiers trajets</th>
                <th>Performance</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <p className={shared.emptyState}>
                      Aucun agent ne correspond aux filtres sélectionnés.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAgents
                  // Tri par performance décroissante
                  .slice()
                  .sort((a, b) => computePerformance(b) - computePerformance(a))
                  .map((agent, index) => {
                    const perf = computePerformance(agent);
                    const globalRank = (page - 1) * PAGE_SIZE + index + 1;

                    return (
                      <tr key={agent.id}>
                        {/* Rang */}
                        <td>
                          <span className={shared.mutedText}>
                            {globalRank === 1 ? "🥇" : globalRank === 2 ? "🥈" : globalRank === 3 ? "🥉" : `#${globalRank}`}
                          </span>
                        </td>

                        {/* Agent */}
                        <td>
                          <strong>{agent.name}</strong>
                          <br />
                          <small style={{ color: "var(--color-text-muted)" }}>
                            {agent.phone}
                          </small>
                        </td>

                        {/* Zone */}
                        <td>
                          <span className={shared.mutedText}>
                            <MapPin
                              size={12}
                              aria-hidden="true"
                              style={{ verticalAlign: "middle", marginRight: 4 }}
                            />
                            {agent.zone}
                          </span>
                        </td>

                        {/* Recrutements déclarés */}
                        <td>{agent.declared}</td>

                        {/* Inscrits réels */}
                        <td>
                          {agent.registered}
                          <br />
                          <small style={{ color: "var(--color-text-muted)" }}>
                            {agent.declared > 0
                              ? `${Math.round((agent.registered / agent.declared) * 100)} % inscrits`
                              : "—"}
                          </small>
                        </td>

                        {/* KYC validés */}
                        <td>
                          {agent.kycApproved}
                          <br />
                          <small style={{ color: "var(--color-text-muted)" }}>
                            {agent.registered > 0
                              ? `${Math.round((agent.kycApproved / agent.registered) * 100)} % des inscrits`
                              : "—"}
                          </small>
                        </td>

                        {/* Premiers trajets */}
                        <td>{agent.firstTrip}</td>

                        {/* Performance */}
                        <td>
                          <span className={performanceBadgeClass(perf)}>
                            {perf} %
                          </span>
                        </td>

                        {/* Statut agent */}
                        <td>
                          <span
                            className={
                              agent.status === "active"
                                ? `${shared.badge} ${shared.badgeSuccess}`
                                : `${shared.badge} ${shared.badgeDanger}`
                            }
                          >
                            {agent.status === "active" ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAgents.length > PAGE_SIZE && (
          <div className={shared.pagination}>
            <p className={shared.paginationInfo}>
              Page {page} sur {totalPages} · {filteredAgents.length} agent
              {filteredAgents.length > 1 ? "s" : ""}
            </p>
            <div className={shared.paginationButtons}>
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Page précédente
              </button>
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Page suivante
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================
          NOTE EXPLICATIVE (feuille de route)
      ================================================================ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2>À propos de ce module</h2>
        </div>

        <p className={shared.mutedText}>
          Ce tableau de bord terrain est actuellement alimenté par des données
          de démonstration représentatives des zones opérationnelles de Zwanga à
          Kinshasa (Gombe, Ngaliema, Limete, Bandalungwa, Lemba).
        </p>

        <ul style={{ paddingLeft: "1.2rem", color: "var(--color-text-muted)", lineHeight: 1.8 }}>
          <li>
            <strong>Recrutements déclarés</strong> – nombre de prospects
            contactés et présentés à l&apos;agent lors de ses tournées terrain.
          </li>
          <li>
            <strong>Inscrits réels</strong> – conducteurs ayant finalisé leur
            inscription sur l&apos;application Zwanga (source : API).
          </li>
          <li>
            <strong>KYC validés</strong> – inscrits dont le dossier KYC a été
            approuvé par l&apos;équipe de vérification.
          </li>
          <li>
            <strong>Premiers trajets</strong> – conducteurs KYC validés ayant
            réalisé au moins un trajet payant.
          </li>
          <li>
            <strong>Performance %</strong> – ratio premiers trajets / déclarés,
            indicateur principal de l&apos;efficacité de l&apos;agent.
          </li>
        </ul>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            <strong>Version future :</strong> les recrutements terrain seront
            saisis directement par les agents via une application mobile dédiée
            et synchronisés automatiquement avec ce back-office. Le code de
            parrainage de chaque agent permettra d&apos;automatiser
            l&apos;attribution des inscrits réels.
          </span>
        </p>
      </section>
    </div>
  );
}
