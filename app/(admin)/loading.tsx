export default function AdminLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
      <p>Chargement de la page…</p>
    </div>
  );
}
