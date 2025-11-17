"use client";

import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";

import shared from "../styles/page.module.css";

export default function ReportsPage() {
  const { data: reports = [] } = useGetReportsQuery();

  const statusClass = (status: typeof reports[number]["status"]) => {
    if (status === "résolu") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "ouvert") return `${shared.badge} ${shared.badgeDanger}`;
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Signalements & modération</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {reports.length} incidents surveillés
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Centre de résolution
          </button>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>type</th>
                <th>rapporteur</th>
                <th>description</th>
                <th>priorité</th>
                <th>statut</th>
                <th>créé</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.type}</td>
                  <td>{report.reporter}</td>
                  <td>{report.description}</td>
                  <td>
                    <span className={`${shared.badge} ${shared.badgeWarning}`}>
                      {report.priority}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(report.status)}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("fr-CD", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                    }).format(new Date(report.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

