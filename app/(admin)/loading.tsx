export default function AdminLoading() {
  return (
    <div className="skeleton-page" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only" style={{ position: "absolute", left: -9999 }}>
        Chargement de la page…
      </span>
      <div className="skeleton" style={{ height: 34, width: "min(320px, 60%)" }} />
      <div className="skeleton-metrics">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton" style={{ height: 104 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 44, width: "min(520px, 100%)" }} />
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
