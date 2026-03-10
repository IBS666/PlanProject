const FEATURES = [
  {
    title: "Gestion des projets et plans",
    desc: "Importez vos plans PDF, DWG ou images et organisez-les par projet et catégorie (architecture, électricité, plomberie). Navigation multi-pages avec zoom intégré.",
    color: "#eff6ff",
    border: "#ffffff",

  },
  {
    title: "Annotation et modification",
    desc: "Interface de dessin directement sur le plan : lignes, formes, commentaires, surlignage. Sauvegarde automatique ou manuelle de chaque modification.",
    color: "#eff6ff",
    border: "#ffffff",
  },
  {
    title: "Versioning complet",
    desc: "Chaque modification crée une nouvelle version. Historique complet avec date, auteur et commentaire. Comparez deux versions ou restaurez une ancienne.",
    color: "#eff6ff",
    border: "#ffffff",
  },
  {
    title: "Analyse IA automatique",
    desc: "Détection automatique des différences entre versions, classification des plans et suggestions d'actions grâce au microservice IA intégré (FastAPI / Python).",
    color: "#eff6ff",
    border: "#ffffff",
  },
  {
    title: "Tableau de bord et export",
    desc: "Vue globale des projets, plans récemment modifiés et dernières versions. Export PDF ou Excel des rapports, annotations et historiques de versions.",
    color: "#eff6ff",
    border: "#ffffff",
  },
]

export default function Features() {
  return (
    <section style={{ background: "white", padding: "72px 24px", borderTop: "1px solid #f1f5f9" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>FONCTIONNALITÉS</p>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 14 }}>
            Tout ce dont votre équipe a besoin
          </h2>
          <p style={{ color: "#64748b", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            De l'import du plan à son archivage, en passant par l'annotation et la comparaison de versions.
          </p>
        </div>

        {/* Grid — 3 colonnes x 2 lignes mais seulement 5 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                background: f.color,
                border: `1px solid ${f.border}`,
                borderRadius: 14,
                padding: "24px 26px",
                transition: "transform 0.2s, box-shadow 0.2s",
                /* 5ème card centrée sur la 2ème ligne */
                ...(i === 4 ? { gridColumn: "2 / 3" } : {}),
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
            >
              
              <h3 style={{ color: "#1d4ed8", fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{f.title}</h3>
              <p style={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
