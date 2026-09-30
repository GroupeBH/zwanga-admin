"use client";

export default function UsersError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2>Impossible d’ouvrir cette fiche</h2>
      <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
        Le dossier n’a pas pu s’afficher. La liste des utilisateurs reste
        disponible.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={reset}>
          Réessayer
        </button>
        <a href="/users">Retour aux utilisateurs</a>
      </div>
    </section>
  );
}
