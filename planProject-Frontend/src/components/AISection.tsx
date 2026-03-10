export default function AISection() {
  return (
    <section style={{ background: "#f8faff", padding: "100px 24px", borderTop: "1px solid #e2e8f0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

        {/* Left - text */}
        <div>
        
          <h2 style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 20 }}>
            L'IA analyse vos plans<br />
            <span style={{ color: "#1d4ed8" }}>automatiquement</span>
          </h2>
          <p style={{ color: "#64748b", fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
            Le microservice IA (Python / FastAPI) détecte les différences entre versions, classe les plans et suggère des actions — sans intervention manuelle.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔍", title: "Détection des différences", desc: "Surlignage automatique des zones modifiées entre deux versions d'un plan." },
              { icon: "🗂️", title: "Classification automatique", desc: "Tri des plans par type, projet et zone modifiée selon leur contenu." },
              { icon: "💡", title: "Suggestions d'actions", desc: "Alertes sur modifications importantes et proposition de fusion de plans." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fdf4ff", border: "1px solid #e9d5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - visual */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Analyse IA — Comparaison v2 → v3</span>
            <span style={{ fontSize: 11, background: "#fdf4ff", color: "#7c3aed", padding: "3px 10px", borderRadius: 100, fontWeight: 600 }}>En cours...</span>
          </div>

          {/* Plan comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #f1f5f9" }}>
            {["Version 2", "Version 3"].map((label, vi) => (
              <div key={vi} style={{ borderRight: vi === 0 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ padding: "8px 12px", background: "#f8fafc", fontSize: 11, fontWeight: 600, color: "#94a3b8", textAlign: "center" }}>{label}</div>
                <svg width="100%" height="160" viewBox="0 0 200 160">
                  <rect width="200" height="160" fill="#f8fafc"/>
                  {[0,1,2,3,4].map(i => <line key={i} x1="0" y1={i*40} x2="200" y2={i*40} stroke="#e2e8f0" strokeWidth="0.5"/>)}
                  {[0,1,2,3,4,5].map(i => <line key={i} x1={i*40} y1="0" x2={i*40} y2="160" stroke="#e2e8f0" strokeWidth="0.5"/>)}
                  <rect x="15" y="15" width="170" height="130" fill="none" stroke="#334155" strokeWidth="2"/>
                  <rect x="15" y="15" width="85" height="75" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  <rect x="100" y="15" width="85" height="75" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  <rect x="15" y="90" width="170" height="55" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  {vi === 1 && <>
                    <rect x="100" y="15" width="85" height="75" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2"/>
                    <rect x="15" y="90" width="85" height="55" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,2"/>
                  </>}
                </svg>
              </div>
            ))}
          </div>

          {/* AI results */}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Résultats de l'analyse</div>
            {[
              { icon: "🔴", label: "Zone modifiée", detail: "Cuisine — surface +4m²", color: "#fee2e2", text: "#b91c1c" },
              { icon: "🟢", label: "Zone ajoutée", detail: "Dégagement — nouveau", color: "#dcfce7", text: "#15803d" },
              { icon: "🟡", label: "Annotation déplacée", detail: "Note fenêtre — repositionnée", color: "#fef3c7", text: "#92400e" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: r.color, borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: r.text }}>{r.label} — </span>
                  <span style={{ fontSize: 12, color: r.text, opacity: 0.8 }}>{r.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}