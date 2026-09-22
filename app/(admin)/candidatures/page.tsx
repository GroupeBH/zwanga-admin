"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Info, RotateCcw, Trash2, X } from "lucide-react";

import {
  APPAREIL_OPTIONS,
  DEJA_TELECHARGE_OPTIONS,
  PROFIL_UTILISATEUR_OPTIONS,
  SEXE_OPTIONS,
  ZONES_DEPLOIEMENT,
} from "@/config/recrutementTerrain.config";

import shared from "../styles/page.module.css";
import styles from "./candidatures.module.css";

type CandidatureItem = {
  id: string;
  createdAt: string;
  contact: {
    nomComplet: string;
    age: number;
    telephone: string;
    sexe: string;
  };
  usage: {
    appareil: string;
    dejaTelecharge: string;
    profilUtilisateur: string;
  };
  retours: {
    problemesRencontres: string;
    comprehensionProjet: string;
    suggestionsAmelioration: string;
  };
  zonesDeploiement: string[];
};

const labelFor = (options: ReadonlyArray<{ id: string; label: string }>, id: string) =>
  options.find((option) => option.id === id)?.label ?? id ?? "—";

const formatDate = (value?: string) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const LIMIT = 15;

export default function CandidaturesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [zone, setZone] = useState("");
  const [sexe, setSexe] = useState("");
  const [appareil, setAppareil] = useState("");
  const [dejaTelecharge, setDejaTelecharge] = useState("");
  const [profilUtilisateur, setProfilUtilisateur] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<CandidatureItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selected, setSelected] = useState<CandidatureItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, zone, sexe, appareil, dejaTelecharge, profilUtilisateur]);

  const buildQuery = useCallback(
    (overrides?: Record<string, string | number>) => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (zone) params.set("zone", zone);
      if (sexe) params.set("sexe", sexe);
      if (appareil) params.set("appareil", appareil);
      if (dejaTelecharge) params.set("dejaTelecharge", dejaTelecharge);
      if (profilUtilisateur) params.set("profilUtilisateur", profilUtilisateur);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (overrides) {
        Object.entries(overrides).forEach(([key, value]) => params.set(key, String(value)));
      }
      return params.toString();
    },
    [debouncedSearch, zone, sexe, appareil, dejaTelecharge, profilUtilisateur, page],
  );

  const fetchCandidatures = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/recrutement-terrain?${buildQuery()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(
          response.status === 401
            ? "Accès réservé aux administrateurs connectés."
            : data.message ?? "Impossible de charger les candidatures.",
        );
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setErrorMessage("Impossible de charger les candidatures. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchCandidatures();
  }, [fetchCandidatures]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setZone("");
    setSexe("");
    setAppareil("");
    setDejaTelecharge("");
    setProfilUtilisateur("");
    setPage(1);
  };

  const handleExportXls = () => {
    const query = buildQuery({ format: "xls" });
    window.open(`/api/recrutement-terrain?${query}`, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette candidature ?")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/recrutement-terrain?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        window.alert(data.message ?? "Suppression impossible.");
        return;
      }
      setSelected((current) => (current?.id === id ? null : current));
      await fetchCandidatures();
    } catch {
      window.alert("Suppression impossible pour le moment.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters = useMemo(
    () => Boolean(debouncedSearch || zone || sexe || appareil || dejaTelecharge || profilUtilisateur),
    [debouncedSearch, zone, sexe, appareil, dejaTelecharge, profilUtilisateur],
  );

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Candidatures agents commerciaux</h2>
            <p className={shared.filterSummary}>
              {isLoading ? "Chargement..." : `${total} candidature${total === 1 ? "" : "s"} reçue${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className={shared.toolbar}>
            <button type="button" className={shared.primaryButton} onClick={handleExportXls}>
              <Download size={16} aria-hidden="true" style={{ marginRight: 6 }} />
              Exporter XLS
            </button>
          </div>
        </div>

        <div className={shared.toolbar}>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-search">
              Rechercher
            </label>
            <input
              id="candidatures-search"
              className={shared.filterSearch}
              placeholder="Nom ou téléphone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-zone">
              Zone
            </label>
            <select id="candidatures-zone" value={zone} onChange={(event) => setZone(event.target.value)}>
              <option value="">Toutes les zones</option>
              {ZONES_DEPLOIEMENT.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-sexe">
              Sexe
            </label>
            <select id="candidatures-sexe" value={sexe} onChange={(event) => setSexe(event.target.value)}>
              <option value="">Tous</option>
              {SEXE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-appareil">
              Téléphone
            </label>
            <select id="candidatures-appareil" value={appareil} onChange={(event) => setAppareil(event.target.value)}>
              <option value="">Tous</option>
              {APPAREIL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-telecharge">
              Déjà téléchargé
            </label>
            <select id="candidatures-telecharge" value={dejaTelecharge} onChange={(event) => setDejaTelecharge(event.target.value)}>
              <option value="">Tous</option>
              {DEJA_TELECHARGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="candidatures-profil">
              Profil
            </label>
            <select id="candidatures-profil" value={profilUtilisateur} onChange={(event) => setProfilUtilisateur(event.target.value)}>
              <option value="">Tous</option>
              {PROFIL_UTILISATEUR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button type="button" className={shared.secondaryButton} onClick={resetFilters}>
              <RotateCcw size={14} aria-hidden="true" style={{ marginRight: 6 }} />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Ces candidatures viennent du formulaire public de recrutement
            terrain. Les filtres se combinent entre eux et l’export XLS reprend
            exactement la sélection affichée. « Voir » ouvre le détail complet
            du candidat ; « Supprimer » efface définitivement la candidature.
          </span>
        </p>

        {errorMessage && <p className={shared.errorText}>{errorMessage}</p>}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Âge</th>
                <th>Téléphone</th>
                <th>Sexe</th>
                <th>Zones souhaitées</th>
                <th>Reçue le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const visibleZones = item.zonesDeploiement.slice(0, 2);
                const remaining = item.zonesDeploiement.length - visibleZones.length;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.contact.nomComplet}</strong>
                    </td>
                    <td>{item.contact.age}</td>
                    <td>{item.contact.telephone}</td>
                    <td>{labelFor(SEXE_OPTIONS, item.contact.sexe)}</td>
                    <td>
                      <div className={styles.zoneTags}>
                        {visibleZones.map((zoneId) => (
                          <span key={zoneId} className={styles.zoneTag}>
                            {labelFor(ZONES_DEPLOIEMENT, zoneId)}
                          </span>
                        ))}
                        {remaining > 0 && <span className={styles.zoneTagMore}>+{remaining}</span>}
                      </div>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={shared.primaryButton}
                          style={{ background: "rgba(255, 255, 255, 0.1)", color: "var(--color-text)" }}
                          onClick={() => setSelected(item)}
                        >
                          Détails
                        </button>
                        <button
                          type="button"
                          className={shared.dangerButton}
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <p className={shared.emptyState}>Aucune candidature ne correspond à ces critères.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={shared.pagination}>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            disabled={page === 1 || isLoading}
          >
            Page précédente
          </button>
          <span>
            Page {page} sur {totalPages}
          </span>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Page suivante
          </button>
        </div>
      </section>

      {selected && (
        <div className={shared.modalBackdrop} role="presentation" onClick={() => setSelected(null)}>
          <div
            className={shared.modalCard}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={shared.sectionHeader}>
              <h3>{selected.contact.nomComplet}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text)" }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span>Âge</span>
                {selected.contact.age} ans
              </div>
              <div className={styles.detailItem}>
                <span>Téléphone</span>
                {selected.contact.telephone}
              </div>
              <div className={styles.detailItem}>
                <span>Sexe</span>
                {labelFor(SEXE_OPTIONS, selected.contact.sexe)}
              </div>
              <div className={styles.detailItem}>
                <span>Reçue le</span>
                {formatDate(selected.createdAt)}
              </div>
              <div className={styles.detailItem}>
                <span>Type de téléphone</span>
                {labelFor(APPAREIL_OPTIONS, selected.usage.appareil)}
              </div>
              <div className={styles.detailItem}>
                <span>Déjà téléchargé Zwanga</span>
                {labelFor(DEJA_TELECHARGE_OPTIONS, selected.usage.dejaTelecharge)}
              </div>
              <div className={styles.detailItem}>
                <span>Profil</span>
                {labelFor(PROFIL_UTILISATEUR_OPTIONS, selected.usage.profilUtilisateur)}
              </div>
            </div>

            <div className={styles.detailBlock}>
              <span>Compréhension du projet</span>
              <p>{selected.retours.comprehensionProjet || "—"}</p>
            </div>
            <div className={styles.detailBlock}>
              <span>Problèmes rencontrés</span>
              <p>{selected.retours.problemesRencontres || "Aucun"}</p>
            </div>
            <div className={styles.detailBlock}>
              <span>Suggestions d&apos;amélioration</span>
              <p>{selected.retours.suggestionsAmelioration || "Aucune"}</p>
            </div>
            <div className={styles.detailBlock}>
              <span>Zones de déploiement souhaitées</span>
              <div className={styles.zoneTags}>
                {selected.zonesDeploiement.map((zoneId) => (
                  <span key={zoneId} className={styles.zoneTag}>
                    {labelFor(ZONES_DEPLOIEMENT, zoneId)}
                  </span>
                ))}
              </div>
            </div>

            <div className={shared.modalActions}>
              <button
                type="button"
                className={shared.dangerButton}
                disabled={deletingId === selected.id}
                onClick={() => handleDelete(selected.id)}
              >
                Supprimer
              </button>
              <button type="button" className={shared.secondaryButton} onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
