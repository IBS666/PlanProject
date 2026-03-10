const STEPS = [
  { n: "01", icon: "📤", title: "Importez vos plans", desc: "Glissez-déposez vos fichiers PDF, DWG ou images. La plateforme les organise automatiquement par projet et catégorie." },
  { n: "02", icon: "✏️", title: "Annotez et modifiez", desc: "Ouvrez le plan directement dans le navigateur. Dessinez, commentez, surlignez et sauvegardez vos modifications." },
  { n: "03", icon: "🔄", title: "Versionnez automatiquement", desc: "Chaque sauvegarde crée une nouvelle version horodatée avec l'auteur et le commentaire associé." },
  { n: "04", icon: "🤖", title: "Analysez avec l'IA", desc: "Comparez deux versions en un clic. L'IA surligne les zones modifiées et classe les changements automatiquement." },
]

export default function HowItWorks() {
  return (
    <section style={{ background: "white", padding: "100px 24px", borderTop: "1px solid #f1f5f9" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>COMMENT ÇA MARCHE</p>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.1 }}>
            Opérationnel en quelques minutes
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 32, position: "relative" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", position: "relative" }}>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{ position: "absolute", top: 28, left: "60%", right: "-40%", height: 2, background: "linear-gradient(90deg,#bfdbfe,#e2e8f0)", zIndex: 0 }} />
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eff6ff", border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.1em", marginBottom: 8 }}>ÉTAPE {s.n}</div>
                <h3 style={{ color: "#0f172a", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}