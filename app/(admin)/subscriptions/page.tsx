"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import {
  buildPaymentOverview,
  formatDocumentType,
  formatFundingStatus,
  formatPaymentMethod,
  formatSubscriptionFeatureList,
  formatSubscriptionPlanLabel,
} from "@/lib/features/admin/insights";
import type { DocumentFundingRequest } from "@/lib/features/admin/types";
import {
  useGetActiveProSubscriptionsQuery,
  useGetDocumentFundingRequestsQuery,
  useGetSubscriptionPlansQuery,
  type ActiveProSubscription,
} from "@/lib/features/subscriptions/subscriptionsApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";

import shared from "../styles/page.module.css";

const formatAmount = (amount: number, currency: string) =>
  `${new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const daysRemaining = (endDate: string) => {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 1) return "Dernier jour";
  return `${days} jours restants`;
};

const fundingBadgeClass = (status: DocumentFundingRequest["status"]) => {
  if (status === "approved" || status === "funded") {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }
  if (status === "rejected" || status === "cancelled") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function SubscriptionsPage() {
  const { data: plans = [], isFetching: isFetchingPlans } = useGetSubscriptionPlansQuery();
  const { data: fundingRequests = [], isFetching: isFetchingRequests } =
    useGetDocumentFundingRequestsQuery();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const paymentOverview = useMemo(
    () => buildPaymentOverview(plans, fundingRequests),
    [plans, fundingRequests]
  );

  const filteredRequests = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return fundingRequests.filter((request) => {
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const driverName = request.driver
        ? `${request.driver.firstName} ${request.driver.lastName}`.toLowerCase()
        : "";
      const matchesSearch =
        searchTerm.length === 0 ||
        driverName.includes(searchTerm) ||
        formatDocumentType(request.documentType).toLowerCase().includes(searchTerm) ||
        (request.documentName ?? "").toLowerCase().includes(searchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [fundingRequests, search, statusFilter]);

  const isLoading = isFetchingPlans || isFetchingRequests;

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Abonnements et financement</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {plans.length} plan(s) exposes • {fundingRequests.length} demande(s) de financement
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Export CSV
          </button>
        </div>

        <div className={shared.grid}>
          <article className={shared.card}>
            <span style={{ color: "var(--color-text-muted)" }}>Plans premium</span>
            <strong style={{ fontSize: "1.6rem" }}>{plans.length}</strong>
            <small style={{ color: "var(--color-text-muted)" }}>
              configuration servie par le backend
            </small>
          </article>

          <article className={shared.card}>
            <span style={{ color: "var(--color-text-muted)" }}>Demandes en attente</span>
            <strong style={{ fontSize: "1.6rem" }}>
              {paymentOverview.pendingFundingRequests}
            </strong>
            <small style={{ color: "var(--color-text-muted)" }}>
              {formatAmount(
                paymentOverview.pendingAmount,
                paymentOverview.supportedCurrencies[0] ?? "CDF"
              )}{" "}
              a traiter
            </small>
          </article>

          <article className={shared.card}>
            <span style={{ color: "var(--color-text-muted)" }}>Demandes financees</span>
            <strong style={{ fontSize: "1.6rem" }}>{paymentOverview.fundedRequests}</strong>
            <small style={{ color: "var(--color-text-muted)" }}>
              {paymentOverview.approvedFundingRequests} approuvee(s)
            </small>
          </article>

          <article className={shared.card}>
            <span style={{ color: "var(--color-text-muted)" }}>Moyens de paiement</span>
            <strong style={{ fontSize: "1.1rem" }}>
              {paymentOverview.supportedMethods.length > 0
                ? paymentOverview.supportedMethods.map(formatPaymentMethod).join(", ")
                : "Aucun"}
            </strong>
            <small style={{ color: "var(--color-text-muted)" }}>
              devises: {paymentOverview.supportedCurrencies.join(", ") || "n/a"}
            </small>
          </article>
        </div>

        <div className={shared.grid}>
          {plans.map((plan) => (
            <article key={`${plan.plan}-${plan.currency}`} className={shared.card}>
              <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {formatSubscriptionPlanLabel(plan.plan)}
              </span>
              <strong style={{ fontSize: "1.4rem" }}>
                {formatAmount(plan.amount, plan.currency)}
              </strong>
              <div
                className={`${shared.badge} ${shared.badgeSuccess}`}
                style={{ alignSelf: "flex-start" }}
              >
                {plan.paymentMethods.length} moyen(x) de paiement
              </div>
              <small style={{ color: "var(--color-text-muted)" }}>
                Financement documentaire{" "}
                {plan.documentFundingEnabled
                  ? `jusqu'à ${formatAmount(
                      plan.documentFundingLimit ?? 0,
                      plan.documentFundingCurrency
                    )}`
                  : "désactivé"}
              </small>
              <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {formatSubscriptionFeatureList(plan).map((feature) => (
                  <span key={feature} className={shared.badge}>
                    {feature}
                  </span>
                ))}
              </div>
              <small style={{ color: "var(--color-text-muted)" }}>
                Paiements: {plan.paymentMethods.map(formatPaymentMethod).join(", ")}
              </small>
              {Number(plan.tokensAmount ?? plan.pointsAmount ?? 0) > 0 ? (
                <small style={{ color: "var(--color-text-muted)" }}>
                  Prix en jetons: {formatAmount(
                    Number(plan.tokensAmount ?? plan.pointsAmount ?? 0),
                    plan.tokensCurrency ?? plan.pointsCurrency ?? "PTS"
                  )}
                  {Number(plan.subscriptionRewardTokens ?? 0) > 0
                    ? ` · bonus ${plan.subscriptionRewardTokens} jetons à l'activation`
                    : ""}
                </small>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <ActiveProSubscriptions />

      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Demandes de financement de documents</h2>
            <p className={shared.filterSummary}>
              {filteredRequests.length} demande(s) selon les filtres
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="funding-search">
                Rechercher une demande
              </label>
              <input
                id="funding-search"
                className={shared.filterSearch}
                placeholder="Conducteur ou document"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="funding-status">
                Filtrer par statut
              </label>
              <select
                id="funding-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvees</option>
                <option value="funded">Financees</option>
                <option value="rejected">Rejetees</option>
                <option value="cancelled">Annulees</option>
              </select>
            </div>
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Un conducteur abonné peut demander que Zwanga avance le coût d’un
            document officiel. « En attente » signifie qu’une décision reste à
            prendre, « Approuvée » que l’accord est donné et « Financée » que
            l’argent a été versé. Cet écran est une consultation : aucune
            décision ne peut encore être enregistrée depuis le back-office.
          </span>
        </p>

        {isLoading ? (
          <p className={shared.emptyState}>Chargement des demandes...</p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Document</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Abonnement</th>
                  <th>Cree le</th>
                  <th>Note admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <p className={shared.emptyState}>
                        Aucune demande ne correspond à ce filtre. Choisissez
                        « Tous les statuts » pour voir l’ensemble des demandes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>
                          {request.driver
                            ? `${request.driver.firstName} ${request.driver.lastName}`
                            : "Conducteur inconnu"}
                        </strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {request.driver?.phone ?? "Téléphone indisponible"}
                        </small>
                      </td>
                      <td>
                        <strong>{formatDocumentType(request.documentType)}</strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {request.documentName || request.description || "Sans precision"}
                        </small>
                      </td>
                      <td>{formatAmount(Number(request.amountRequested ?? 0), request.currency)}</td>
                      <td>
                        <span className={fundingBadgeClass(request.status)}>
                          {formatFundingStatus(request.status)}
                        </span>
                      </td>
                      <td>
                        {request.subscription ? (
                          <>
                            {formatSubscriptionPlanLabel(request.subscription.plan)}
                            <br />
                            <small style={{ color: "var(--color-text-muted)" }}>
                              {request.subscription.status}
                            </small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{formatDate(request.createdAt)}</td>
                      <td>
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {request.adminNote || "Aucune note"}
                        </small>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const currentMonthLabel = () =>
  new Intl.DateTimeFormat("fr-CD", {
    timeZone: "Africa/Kinshasa",
    month: "long",
    year: "numeric",
  }).format(new Date());

function ActiveProSubscriptions() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [month, setMonth] = useState<"all" | "current" | "other">("all");
  const [page, setPage] = useState(1);
  const limit = 25;
  const monthLabel = currentMonthLabel();

  useEffect(() => {
    const next = search.trim();
    const timeout = window.setTimeout(() => {
      setAppliedSearch((current) => {
        if (current !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, error } = useGetActiveProSubscriptionsQuery({
    page,
    limit,
    search: appliedSearch || undefined,
    month: month === "all" ? undefined : month,
  });
  const subscriptions = data?.subscriptions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <section className={shared.section} aria-labelledby="active-pro-title">
      <div className={shared.sectionHeader}>
        <div>
          <h2 id="active-pro-title">Abonnements pro en cours</h2>
          <p className={shared.filterSummary}>
            {total} abonnement{total > 1 ? "s" : ""} encore valide{total > 1 ? "s" : ""}
            {month === "current" ? ` · commencés en ${monthLabel}` : ""}
            {month === "other" ? ` · commencés avant ${monthLabel}` : ""}
          </p>
        </div>
        <div className={shared.toolbar}>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="pro-subscription-search">
              Rechercher un abonné
            </label>
            <input
              id="pro-subscription-search"
              className={shared.filterSearch}
              placeholder="Nom, téléphone ou e-mail"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={shared.filterField}>
            <label className={shared.filterLabel} htmlFor="pro-subscription-month">
              Mois de début
            </label>
            <select
              id="pro-subscription-month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value as "all" | "current" | "other");
                setPage(1);
              }}
            >
              <option value="all">Tous les mois</option>
              <option value="current">Mois en cours</option>
              <option value="other">Autres mois</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <p className={shared.errorText} role="alert">
          {getApiErrorMessage(error, "Impossible de charger les abonnements pro.")}
        </p>
      ) : null}

      {isFetching && subscriptions.length === 0 ? (
        <p className={shared.emptyState}>Chargement des abonnements...</p>
      ) : (
        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Conducteur</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Reste</th>
                <th>Montant</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={shared.emptyState}>
                      {month === "current"
                        ? `Aucun abonnement pro en cours commencé en ${monthLabel}.`
                        : month === "other"
                          ? `Aucun abonnement pro en cours commencé avant ${monthLabel}.`
                          : appliedSearch
                            ? "Aucun abonnement pro en cours ne correspond à cette recherche."
                            : "Aucun abonnement pro en cours."}
                    </p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((subscription) => (
                  <ActiveProRow key={subscription.id} subscription={subscription} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {page} sur {totalPages}
          </p>
          <div className={shared.paginationButtons}>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1 || isFetching}
            >
              Page précédente
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((current) => current + 1)}
              disabled={isFetching || page >= totalPages}
            >
              Page suivante
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ActiveProRow({ subscription }: { subscription: ActiveProSubscription }) {
  const user = subscription.user;
  const name = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Conducteur"
    : "Conducteur inconnu";

  return (
    <tr>
      <td>
        {user ? (
          <a href={`/users?fiche=${encodeURIComponent(user.id)}`}>
            <strong>{name}</strong>
          </a>
        ) : (
          <strong>{name}</strong>
        )}
        <br />
        <small style={{ color: "var(--color-text-muted)" }}>
          {user?.phone ?? user?.email ?? "Contact indisponible"}
        </small>
      </td>
      <td>{formatDay(subscription.startDate)}</td>
      <td>{formatDay(subscription.endDate)}</td>
      <td>{daysRemaining(subscription.endDate)}</td>
      <td>{formatAmount(Number(subscription.amount ?? 0), subscription.currency)}</td>
      <td>
        <span className={subscription.isTrial ? shared.badge : `${shared.badge} ${shared.badgeSuccess}`}>
          {subscription.isTrial ? "Essai" : "Payé"}
        </span>
      </td>
    </tr>
  );
}
