"use client";

// ─── Module : Entreprises & Partenaires ────────────────────────────────────
// Gère les entreprises propriétaires de flottes de véhicules.
// Comme il n'existe pas d'API dédiée, on combine :
//   • useGetUsersQuery  → conducteurs réels
//   • useGetAllTripsQuery → trajets pour statistiques
//   • PARTNER_COMPANIES → données statiques des entreprises partenaires

import { useMemo, useState } from "react";
import { Building2, Car, Users, TrendingUp, Phone, Search } from "lucide-react";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import shared from "../styles/page.module.css";

// ─── Types ─────────────────────────────────────────────────────────────────

type CompanyStatus = "active" | "pending" | "inactive";

interface PartnerCompany {
  id: string;
  name: string;
  type: string;
  contact: string;
  zone: string;
  vehicles: number;
  drivers: number;
  status: CompanyStatus;
  joinedAt: string;
}

// ─── Données statiques des entreprises partenaires ─────────────────────────

const PARTNER_COMPANIES: PartnerCompany[] = [
  {
    id: "cmp-001",
    name: "Taxi Express SARL",
    type: "Flotte VTC",
    contact: "+243 81 111 2222",
    zone: "Gombe",
    vehicles: 8,
    drivers: 6,
    status: "active",
    joinedAt: "2024-03-15",
  },
  {
    id: "cmp-002",
    name: "Transport Kivu SA",
    type: "Covoiturage entreprise",
    contact: "+243 82 222 3333",
    zone: "Ngaliema",
    vehicles: 12,
    drivers: 10,
    status: "active",
    joinedAt: "2024-05-20",
  },
  {
    id: "cmp-003",
    name: "Congo Mobility",
    type: "Flotte mixte",
    contact: "+243 83 333 4444",
    zone: "Limete",
    vehicles: 5,
    drivers: 5,
    status: "pending",
    joinedAt: "2024-08-10",
  },
  {
    id: "cmp-004",
    name: "Kinshasa Fleet",
    type: "VTC premium",
    contact: "+243 84 444 5555",
    zone: "Gombe",
    vehicles: 15,
    drivers: 13,
    status: "active",
    joinedAt: "2024-01-08",
  },
  {
    id: "cmp-005",
    name: "Transport Rapide SPRL",
    type: "Covoiturage",
    contact: "+243 85 555 6666",
    zone: "Bandalungwa",
    vehicles: 3,
    drivers: 3,
    status: "inactive",
    joinedAt: "2024-06-30",
  },
];

// ─── Libellés des statuts ──────────────────────────────────────────────────

const STATUS_LABELS: Record<CompanyStatus, string> = {
  active: "Actif",
  pending: "En attente",
  inactive: "Inactif",
};

// ─── Utilitaire : formatage de date ────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function CompaniesPage() {
  // Récupération des conducteurs pour enrichir les statistiques globales
  const { data: driversData } = useGetUsersQuery({
    role: "driver",
    limit: 50,
  });

  // Récupération des trajets pour contextualisation (non affiché directement)
  const { data: tripsData } = useGetAllTripsQuery({ page: 1, limit: 50 });

  // ── Filtres locaux ──────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<"all" | CompanyStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── KPIs calculés depuis les données statiques ──────────────────────────
  const kpis = useMemo(() => {
    const actives = PARTNER_COMPANIES.filter((c) => c.status === "active");
    const totalVehicles = PARTNER_COMPANIES.reduce(
      (sum, c) => sum + c.vehicles,
      0
    );
    const totalDrivers = PARTNER_COMPANIES.reduce(
      (sum, c) => sum + c.drivers,
      0
    );
    return {
      activeCompanies: actives.length,
      totalVehicles,
      totalDrivers,
    };
  }, []);

  // ── Filtre + recherche ──────────────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    return PARTNER_COMPANIES.filter((company) => {
      const matchesStatus =
        statusFilter === "all" || company.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        company.name.toLowerCase().includes(query) ||
        company.zone.toLowerCase().includes(query) ||
        company.type.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  // ── Classe badge selon le statut ────────────────────────────────────────
  function getBadgeClass(status: CompanyStatus): string {
    switch (status) {
      case "active":
        return `${shared.badge} ${shared.badgeSuccess}`;
      case "pending":
        return `${shared.badge} ${shared.badgeWarning}`;
      case "inactive":
      default:
        return shared.badge; // badge gris (défaut)
    }
  }

  // ── Handler : action Détails ────────────────────────────────────────────
  function handleDetails(company: PartnerCompany) {
    console.log("[Companies] Détails demandés pour :", company);
  }

  // ── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div className={shared.page}>
      {/* ── Titre principal ─────────────────────────────────────────────── */}
      <h1>Entreprises et partenaires</h1>

      {/* ── Section KPIs ────────────────────────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.grid}>
          {/* KPI : Entreprises actives */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <Building2
                size={20}
                style={{ color: "var(--color-primary)" }}
              />
              <span className={shared.mutedText}>Entreprises actives</span>
            </div>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
              {kpis.activeCompanies}
            </p>
            <span className={shared.mutedText}>
              sur {PARTNER_COMPANIES.length} partenaires
            </span>
          </div>

          {/* KPI : Véhicules de flotte */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <Car size={20} style={{ color: "var(--color-primary)" }} />
              <span className={shared.mutedText}>Véhicules de flotte</span>
            </div>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
              {kpis.totalVehicles}
            </p>
            <span className={shared.mutedText}>
              véhicules enregistrés
            </span>
          </div>

          {/* KPI : Conducteurs partenaires */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <Users size={20} style={{ color: "var(--color-primary)" }} />
              <span className={shared.mutedText}>Conducteurs partenaires</span>
            </div>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
              {kpis.totalDrivers}
            </p>
            <span className={shared.mutedText}>
              {driversData?.total
                ? `/ ${driversData.total} conducteurs sur la plateforme`
                : "conducteurs affiliés"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section Tableau des entreprises ─────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2>Liste des entreprises partenaires</h2>
          <span className={shared.mutedText}>
            {filteredCompanies.length} entreprise
            {filteredCompanies.length !== 1 ? "s" : ""} affichée
            {filteredCompanies.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Barre de filtres ─────────────────────────────────────────── */}
        <div className={shared.toolbar}>
          {/* Recherche par nom / zone / type */}
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="company-search">
              <Search size={14} style={{ marginRight: "0.25rem" }} />
              Rechercher
            </label>
            <input
              id="company-search"
              type="text"
              className={shared.filterSearch}
              placeholder="Nom, zone, type…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtre par statut */}
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="status-filter">
              Statut
            </label>
            <select
              id="status-filter"
              className={shared.filterSearch}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | CompanyStatus)
              }
            >
              <option value="all">Tous</option>
              <option value="active">Actif</option>
              <option value="pending">En attente</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>

        {/* ── Tableau ──────────────────────────────────────────────────── */}
        {filteredCompanies.length === 0 ? (
          <div className={shared.emptyState}>
            <Building2 size={40} />
            <p>Aucune entreprise ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Type</th>
                  <th>Zone</th>
                  <th>Véhicules</th>
                  <th>Conducteurs</th>
                  <th>Statut</th>
                  <th>Membre depuis</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    {/* Entreprise : nom + contact */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{company.name}</div>
                      <div
                        className={shared.mutedText}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          marginTop: "0.2rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        <Phone size={11} />
                        {company.contact}
                      </div>
                    </td>

                    {/* Type de flotte */}
                    <td>
                      <span className={shared.mutedText}>{company.type}</span>
                    </td>

                    {/* Zone d'activité */}
                    <td>{company.zone}</td>

                    {/* Nombre de véhicules */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Car
                          size={14}
                          style={{ color: "var(--color-text-muted)" }}
                        />
                        {company.vehicles}
                      </div>
                    </td>

                    {/* Nombre de conducteurs */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Users
                          size={14}
                          style={{ color: "var(--color-text-muted)" }}
                        />
                        {company.drivers}
                      </div>
                    </td>

                    {/* Badge de statut */}
                    <td>
                      <span className={getBadgeClass(company.status)}>
                        {STATUS_LABELS[company.status]}
                      </span>
                    </td>

                    {/* Date d'adhésion */}
                    <td className={shared.mutedText}>
                      {formatDate(company.joinedAt)}
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className={shared.secondaryButton}
                        onClick={() => handleDetails(company)}
                        title={`Voir les détails de ${company.name}`}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section d'aide / note informative ───────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.card}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <TrendingUp
              size={20}
              style={{
                color: "var(--color-primary)",
                flexShrink: 0,
                marginTop: "0.1rem",
              }}
            />
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
                À propos de ce module
              </p>
              <p className={shared.mutedText} style={{ margin: 0 }}>
                Ce module présente les entreprises et partenaires propriétaires
                de flottes de véhicules enregistrés sur la plateforme Zwanga.
                Les données affichées combinent les informations contractuelles
                statiques et les conducteurs actifs récupérés via l'API.
              </p>
              <p
                className={shared.mutedText}
                style={{ marginTop: "0.5rem", marginBottom: 0 }}
              >
                <strong style={{ color: "var(--color-warning)" }}>
                  Note&nbsp;:
                </strong>{" "}
                La gestion complète des contrats et des tarifs négociés sera
                disponible dans une prochaine mise à jour.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
