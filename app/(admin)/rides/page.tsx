"use client";

import { useMemo, useState } from "react";

import { useGetRidesQuery } from "@/lib/features/rides/ridesApi";

import shared from "../styles/page.module.css";

export default function RidesPage() {
  const { data: rides = [] } = useGetRidesQuery();
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("");

  const filtered = useMemo(() => {
    return rides.filter((ride) => {
      const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
      const matchesZone =
        zoneFilter.trim().length === 0 ||
        ride.departure.toLowerCase().includes(zoneFilter.toLowerCase()) ||
        ride.arrival.toLowerCase().includes(zoneFilter.toLowerCase());
      return matchesStatus && matchesZone;
    });
  }, [rides, statusFilter, zoneFilter]);

  const badgeClass = (status: typeof rides[number]["status"]) => {
    if (status === "actif") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "terminé") return `${shared.badge} ${shared.badgeWarning}`;
    return `${shared.badge} ${shared.badgeDanger}`;
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion des trajets</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} trajets affichés • monitoring temps réel
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Filtrer par zone..."
              value={zoneFilter}
              onChange={(event) => setZoneFilter(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="terminé">Terminés</option>
              <option value="annulé">Annulés</option>
            </select>
          </div>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>trajet</th>
                <th>chauffeur</th>
                <th>statut</th>
                <th>places</th>
                <th>prix</th>
                <th>départ</th>
                <th>demande</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ride) => (
                <tr key={ride.id}>
                  <td>
                    <strong>
                      {ride.departure} → {ride.arrival}
                    </strong>
                  </td>
                  <td>{ride.driver}</td>
                  <td>
                    <span className={badgeClass(ride.status)}>{ride.status}</span>
                  </td>
                  <td>{ride.seats}</td>
                  <td>{ride.price.toFixed(2)} $</td>
                  <td>
                    {new Intl.DateTimeFormat("fr-CD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(ride.departureTime))}
                  </td>
                  <td>{ride.demandLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

