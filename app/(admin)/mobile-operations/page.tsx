"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGetStoreStatusQuery } from "@/lib/features/stores/storesApi";
import { mobileTabs } from "@/lib/features/mobileOperations/mobilePresentation";
import { QueryState } from "./ui";
import {
  MobileOverviewPanel,
  MobileInstallationsPanel,
  MobileReleasesPanel,
  MobileEventsPanel,
} from "./ReadPanels";
import { MobileCampaignsPanel } from "./Campaigns";
import { MobilePoliciesPanel } from "./Policies";
import shared from "../styles/page.module.css";

export default function MobileOperationsPage() {
  const status = useGetStoreStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tab");
    if (value) setTab(value);
  }, []);
  const permissions = status.data?.permissions ?? [];
  const tabs = mobileTabs.filter(([, , permission]) =>
    permissions.includes(permission),
  );
  const current = tabs.find(([id]) => id === tab)?.[0] ?? tabs[0]?.[0];
  const enabled = status.data?.features?.mobileOperations === true;
  return (
    <div className={shared.page}>
      <header className={shared.sectionHeader}>
        <div>
          <h1>Supervision mobile</h1>
          <p>Installations, mises à jour et communications Android / iOS.</p>
        </div>
        {permissions.some((p) => p.startsWith("store.")) && (
          <Link href="/stores" className={shared.secondaryButton}>
            Stores & Distribution
          </Link>
        )}
      </header>
      <QueryState
        loading={status.isLoading}
        error={status.error}
        retry={status.refetch}
      />
      {status.data &&
        !status.error &&
        (!enabled ? (
          <section className={shared.section}>
            <h2>Supervision non activée</h2>
            <p>
              {status.data.features
                ? "Activez MOBILE_OPERATIONS_ENABLED sur le backend après ses migrations. Les écrans existants de l’administration restent disponibles."
                : "Ce backend n’annonce pas encore les fonctions de supervision mobile. Déployez sa version compatible avant d’utiliser cet espace."}
            </p>
            <button
              className={shared.secondaryButton}
              onClick={() => status.refetch()}
            >
              Vérifier à nouveau
            </button>
          </section>
        ) : !current ? (
          <p role="alert">
            Aucune permission de supervision attribuée à ce compte.
          </p>
        ) : (
          <>
            <nav className={shared.toolbar} aria-label="Supervision mobile">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  className={
                    current === id
                      ? shared.primaryButton
                      : shared.secondaryButton
                  }
                  aria-current={current === id ? "page" : undefined}
                  onClick={() => {
                    setTab(id);
                    window.history.replaceState(
                      null,
                      "",
                      `/mobile-operations?tab=${id}`,
                    );
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {current === "overview" && <MobileOverviewPanel />}
            {current === "installations" && <MobileInstallationsPanel />}
            {current === "releases" && <MobileReleasesPanel />}
            {current === "policies" && (
              <MobilePoliciesPanel permissions={permissions} />
            )}
            {current === "campaigns" && (
              <MobileCampaignsPanel
                permissions={permissions}
                sendingEnabled={status.data.features?.mobileCampaigns === true}
              />
            )}
            {(current === "alerts" || current === "audit") && (
              <MobileEventsPanel
                key={current}
                audit={current === "audit"}
                permissions={permissions}
              />
            )}
          </>
        ))}
    </div>
  );
}
