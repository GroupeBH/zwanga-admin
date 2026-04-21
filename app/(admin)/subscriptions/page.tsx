"use client";

import { useMemo, useState } from "react";

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
  useGetDocumentFundingRequestsQuery,
  useGetSubscriptionPlansQuery,
} from "@/lib/features/subscriptions/subscriptionsApi";

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
            <h2>Paiements, abonnements et financement</h2>
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
                  ? `jusqu'a ${formatAmount(
                      plan.documentFundingLimit ?? 0,
                      plan.documentFundingCurrency
                    )}`
                  : "desactive"}
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
            </article>
          ))}
        </div>
      </section>

      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Demandes de financement de documents</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filteredRequests.length} demande(s) selon les filtres
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (conducteur, document)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
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

        {isLoading ? (
          <p>Chargement des demandes...</p>
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
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      Aucune demande de financement trouvee
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
                          {request.driver?.phone ?? "Telephone indisponible"}
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
