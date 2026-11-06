"use client";

// Module Promotions et fidélisation — Zwanga Admin
// Affiche la règle de parrainage active, les KPIs issus des données réelles,
// les codes promotionnels de démonstration et les niveaux de fidélité.

import { useMemo, useState } from "react";
import { Gift, Tag, Users, TrendingUp, Star, Copy, Link } from "lucide-react";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import shared from "../styles/page.module.css";

import local from "./promotions.module.css";

// ---------------------------------------------------------------------------
// Données statiques de démonstration — codes promotionnels
// ---------------------------------------------------------------------------
const PROMO_CODES = [
  {
    code: "ZWANGA10",
    type: "percent",
    value: 10,
    uses: 45,
    maxUses: 100,
    validUntil: "2024-12-31",
    active: true,
    description: "Remise 10% pour nouveaux passagers",
  },
  {
    code: "PREMIER5",
    type: "fixed",
    value: 5000,
    uses: 89,
    maxUses: 200,
    validUntil: "2024-11-30",
    active: true,
    description: "Réduction première course",
  },
  {
    code: "NOEL2024",
    type: "percent",
    value: 20,
    uses: 12,
    maxUses: 500,
    validUntil: "2024-12-25",
    active: true,
    description: "Promotion fêtes de fin d'année",
  },
  {
    code: "KINSHASA",
    type: "fixed",
    value: 2000,
    uses: 200,
    maxUses: 200,
    validUntil: "2024-10-01",
    active: false,
    description: "Campagne Kinshasa expirée",
  },
] as const;

// ---------------------------------------------------------------------------
// Niveaux de fidélité statiques
// ---------------------------------------------------------------------------
const LOYALTY_LEVELS = [
  {
    label: "Bronze",
    range: "0 – 4 trajets",
    min: 0,
    max: 4,
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.12)",
    border: "rgba(205,127,50,0.3)",
    perks: "Accès standard à la plateforme",
  },
  {
    label: "Argent",
    range: "5 – 14 trajets",
    min: 5,
    max: 14,
    color: "#a8a9ad",
    bg: "rgba(168,169,173,0.12)",
    border: "rgba(168,169,173,0.3)",
    perks: "Éligible aux codes promo exclusifs",
  },
  {
    label: "Or",
    range: "15 – 29 trajets",
    min: 15,
    max: 29,
    color: "#ffd700",
    bg: "rgba(255,215,0,0.12)",
    border: "rgba(255,215,0,0.3)",
    perks: "Priorité d'assistance + bonus parrainage",
  },
  {
    label: "Platine",
    range: "30+ trajets",
    min: 30,
    max: Infinity,
    color: "#e5e4e2",
    bg: "rgba(229,228,226,0.12)",
    border: "rgba(229,228,226,0.3)",
    perks: "Avantages VIP + réductions permanentes",
  },
] as const;

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export default function PromotionsPage() {
  // État pour le feedback de copie d'un code promo
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // -- Récupération des données réelles via RTK Query --
  const { data: usersData } = useGetUsersQuery({ page: 1, limit: 1000 });
  const { data: tripsData } = useGetAllTripsQuery({ page: 1, limit: 1000 });

  // -- KPIs calculés depuis les données réelles --
  const kpis = useMemo(() => {
    const allUsers = usersData?.users ?? [];
    const allTrips = tripsData ?? [];

    // Conducteurs inscrits (isDriver = true)
    const totalDrivers = allUsers.filter((u) => u.isDriver).length;

    // Total trajets publiés
    const totalTrips = allTrips.length;

    // Conducteurs actifs = ceux ayant au moins 1 trajet
    const driverIdsWithTrips = new Set(
      allTrips.map((t) => t.driver?.id).filter(Boolean)
    );
    const activeDriverCount = driverIdsWithTrips.size;

    // Moyenne de trajets par conducteur actif
    const avgTripsPerDriver =
      activeDriverCount > 0
        ? (totalTrips / activeDriverCount).toFixed(1)
        : "0";

    return { totalDrivers, totalTrips, avgTripsPerDriver, activeDriverCount };
  }, [usersData, tripsData]);

  // -- Copier un code promo dans le presse-papiers --
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // -- Formater la valeur d'un code selon son type --
  const formatPromoValue = (type: string, value: number) => {
    if (type === "percent") return `−${value} %`;
    return `−${value.toLocaleString("fr-CD")} FC`;
  };

  return (
    <div className={shared.page}>
      {/* ------------------------------------------------------------------ */}
      {/* Titre principal                                                      */}
      {/* ------------------------------------------------------------------ */}
      <h1>Promotions et fidélisation</h1>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Règle de parrainage active                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 className={local.m0FlexCenterGap8}>
            <Gift size={20} color="var(--color-primary)" />
            Règle de parrainage actuelle
          </h2>
          <span className={`${shared.badge} ${shared.badgeSuccess}`}>
            ● Active
          </span>
        </div>

        {/* Encadré mis en valeur */}
        <div
          className={local.p1620Radius18Border1SolidRgba61213152025BackgroundRgba612131}
        >
          <p className={local.m0SemiboldText105}>
            Le parrain reçoit{" "}
            <span className={local.success}>15 000 FC</span>{" "}
            quand son filleul atteint{" "}
            <span className={local.success}>5 trajets</span>{" "}
            terminés et éligibles.
          </p>

          <p className={`${shared.mutedText} ${local.text88}`}>
            <Link size={13} className={local.verticalAlignMiddleMr4} />
            Modifiable via le module Parrainage{" "}
            <a
              href="/referrals"
              className={local.primaryDecorationNoneSemibold}
            >
              /referrals
            </a>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. KPIs calculés depuis les données réelles                          */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 className={local.m0FlexCenterGap8}>
            <TrendingUp size={20} color="var(--color-primary)" />
            Indicateurs clés
          </h2>
          <span className={`${shared.mutedText} ${local.text82}`}>
            Calculés en temps réel depuis les données de la plateforme
          </span>
        </div>

        <div className={shared.grid}>
          {/* KPI — Conducteurs inscrits */}
          <div className={shared.card}>
            <div className={local.flexCenterGap8}>
              <Users size={18} color="var(--color-primary)" />
              <span className={`${shared.mutedText} ${local.text85}`}>
                Conducteurs inscrits
              </span>
            </div>
            <p className={local.m0Text2Bold}>
              {kpis.totalDrivers}
            </p>
            <p className={`${shared.mutedText} ${local.text8M0}`}>
              dont {kpis.activeDriverCount} actifs (au moins 1 trajet)
            </p>
          </div>

          {/* KPI — Trajets publiés */}
          <div className={shared.card}>
            <div className={local.flexCenterGap8}>
              <TrendingUp size={18} color="var(--color-primary)" />
              <span className={`${shared.mutedText} ${local.text85}`}>
                Trajets publiés
              </span>
            </div>
            <p className={local.m0Text2Bold}>
              {kpis.totalTrips}
            </p>
            <p className={`${shared.mutedText} ${local.text8M0}`}>
              Total des trajets sur la plateforme
            </p>
          </div>

          {/* KPI — Moyenne de trajets par conducteur actif */}
          <div className={shared.card}>
            <div className={local.flexCenterGap8}>
              <Star size={18} color="var(--color-primary)" />
              <span className={`${shared.mutedText} ${local.text85}`}>
                Trajets moy. / conducteur actif
              </span>
            </div>
            <p className={local.m0Text2Bold}>
              {kpis.avgTripsPerDriver}
            </p>
            <p className={`${shared.mutedText} ${local.text8M0}`}>
              Sur les conducteurs ayant au moins 1 trajet
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Codes promotionnels                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 className={local.m0FlexCenterGap8}>
            <Tag size={20} color="var(--color-primary)" />
            Codes promotionnels
          </h2>
          <span className={`${shared.badge} ${shared.badgeWarning}`}>
            Données de démonstration
          </span>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Valeur</th>
                <th>Description</th>
                <th className={local.minWidth140}>Utilisation</th>
                <th>Validité</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {PROMO_CODES.map((promo) => {
                const pct = Math.min((promo.uses / promo.maxUses) * 100, 100);
                const isFull = promo.uses >= promo.maxUses;

                return (
                  <tr key={promo.code}>
                    {/* Code + bouton copier */}
                    <td>
                      <div className={local.flexCenterGap8}>
                        <code
                          className={local.fontMonospaceBoldText95PrimaryLetterSpacing006Em}
                        >
                          {promo.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          title="Copier le code"
                          className={`${shared.secondaryButton} ${local.minHeight30P48Radius8Text75Gap4}`}

                        >
                          <Copy size={12} />
                          {copiedCode === promo.code ? "Copié !" : "Copier"}
                        </button>
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`${shared.badge} ${shared.badgeWarning}`}>
                        {promo.type === "percent" ? "Pourcentage" : "Montant fixe"}
                      </span>
                    </td>

                    {/* Valeur formatée */}
                    <td className={local.semibold}>
                      {formatPromoValue(promo.type, promo.value)}
                    </td>

                    {/* Description */}
                    <td className={`${shared.mutedText} ${local.text85}`}>
                      {promo.description}
                    </td>

                    {/* Barre de progression utilisation */}
                    <td>
                      <div className={local.flexDirColumnGap4}>
                        {/* Barre simple */}
                        <div
                          className={local.w100PctBackgroundRgba25525525501Radius4H6}
                        >
                          <div
                            style={{
                              width: pct + "%",
                              background: isFull
                                ? "var(--color-danger)"
                                : "var(--color-primary)",
                              borderRadius: 4,
                              height: 6,
                            }}
                          />
                        </div>
                        <span
                          className={`${shared.mutedText} ${local.text78}`}

                        >
                          {promo.uses} / {promo.maxUses}
                        </span>
                      </div>
                    </td>

                    {/* Date de validité */}
                    <td className={`${shared.mutedText} ${local.text85}`}>
                      {new Date(promo.validUntil).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Statut actif / inactif */}
                    <td>
                      {promo.active ? (
                        <span className={`${shared.badge} ${shared.badgeSuccess}`}>
                          Actif
                        </span>
                      ) : (
                        <span className={`${shared.badge} ${shared.badgeDanger}`}>
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Note sur la création de codes */}
        <p className={`${shared.mutedText} ${local.text85M0}`}>
          ℹ️ La création de codes promo nécessite une interface backend dédiée.
          Cette vue présente les campagnes actives.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Niveaux de fidélité                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 className={local.m0FlexCenterGap8}>
            <Star size={20} color="var(--color-primary)" />
            Niveaux de fidélité
          </h2>
          <span className={`${shared.mutedText} ${local.text82}`}>
            Basés sur le nombre de trajets complétés par le passager
          </span>
        </div>

        <div className={shared.grid}>
          {LOYALTY_LEVELS.map((level) => (
            <div
              key={level.label}
              className={shared.card}
              style={{
                border: `1px solid ${level.border}`,
                background: level.bg,
              }}
            >
              {/* En-tête de la carte : étoile + nom */}
              <div className={local.flexCenterGap10}>
                <span className={local.text16}>⭐</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: level.color,
                    }}
                  >
                    {level.label}
                  </p>
                  <p
                    className={`${shared.mutedText} ${local.m0Text8}`}

                  >
                    {level.range}
                  </p>
                </div>
              </div>

              {/* Avantages */}
              <p className={local.m0Text87}>{level.perks}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Section d'aide                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 className={local.m0}>À propos de ce module</h2>
        </div>
        <p className={shared.mutedText}>
          Ce module centralise la vue des outils de rétention et de croissance
          de Zwanga :
        </p>
        <ul className={`${shared.mutedText} ${local.paddingLeft20M0}`}>
          <li>
            <strong>Règle de parrainage</strong> — affiche la règle en vigueur ;
            la modifier via{" "}
            <a
              href="/referrals"
              className={local.primaryDecorationNoneSemibold}
            >
              /referrals
            </a>
            .
          </li>
          <li>
            <strong>Codes promo</strong> — données de démonstration représentant
            les campagnes passées et en cours. La gestion opérationnelle requiert
            un backend dédié.
          </li>
          <li>
            <strong>Niveaux de fidélité</strong> — calculés automatiquement selon
            le nombre de trajets complétés par chaque utilisateur.
          </li>
          <li>
            <strong>KPIs</strong> — métriques calculées en direct depuis les
            données de la plateforme (conducteurs, trajets).
          </li>
        </ul>
      </section>
    </div>
  );
}
