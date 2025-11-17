"use client";

import { useGetSubscriptionsQuery } from "@/lib/features/subscriptions/subscriptionsApi";

import shared from "../styles/page.module.css";

export default function SubscriptionsPage() {
  const { data: plans = [] } = useGetSubscriptionsQuery();

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Abonnements & revenus</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {plans.length} plans actifs • suivi Orange Money / M-Pesa / Airtel
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Export CSV
          </button>
        </div>

        <div className={shared.grid}>
          {plans.map((plan) => (
            <article key={plan.id} className={shared.card}>
              <span style={{ color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {plan.tier}
              </span>
              <strong style={{ fontSize: "1.4rem" }}>
                {plan.price === 0 ? "Gratuit" : `${plan.price} $ / mois`}
              </strong>
              <p style={{ margin: 0 }}>{plan.riders} utilisateurs</p>
              <div
                className={`${shared.badge} ${shared.badgeSuccess}`}
                style={{ alignSelf: "flex-start" }}
              >
                Renouvellement {plan.renewalRate}%
              </div>
              <small style={{ color: "var(--color-text-muted)" }}>
                Dernière facture {plan.lastInvoice}
              </small>
              <div style={{ marginTop: "auto" }}>
                <strong>Paiements:</strong> {plan.paymentProviders.join(", ")}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

