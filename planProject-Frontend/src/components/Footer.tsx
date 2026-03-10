export default function Footer() {
  return (
    <footer style={{ background: "#0f172a", padding: "48px 24px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="7" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
                  <rect x="11" y="2" width="7" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
                  <rect x="2" y="13" width="16" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
              <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>PlanVault</span>
            </div>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>
              Plateforme interne de gestion, modification et versioning des plans techniques.
            </p>
          </div>
          {[
            { title: "Fonctionnalités", links: ["Gestion des plans","Annotation","Versioning","Comparaison","Export"] },
            { title: "Sécurité", links: ["Authentification JWT","Gestion des rôles","Audit trail","Permissions"] },
            { title: "Support", links: ["Documentation","Contact équipe IT","Signaler un bug"] },
          ].map((col, i) => (
            <div key={i}>
              <h4 style={{ color: "white", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map((l, j) => <li key={j}><a href="#" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ color: "#334155", fontSize: 12 }}>© 2026 PlanVault — Plateforme interne. Tous droits réservés.</p>
          <p style={{ color: "#334155", fontSize: 12 }}>Stack : React · ASP.NET Core · SQL Server · FastAPI</p>
        </div>
      </div>
    </footer>
  )
}