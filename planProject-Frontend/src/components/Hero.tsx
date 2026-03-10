import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

        {/* Left — text */}
        <div>

          <h1 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
            Gérez, modifiez et<br />
            <span style={{ color: "#1d4ed8" }}>versionnez vos plans</span><br />
            en toute simplicité
          </h1>

          <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            Une plateforme centralisée pour importer, annoter, comparer et archiver tous vos plans techniques — avec historique complet et analyse IA intégrée.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
             <Link
              to="/login" 
                style={{ padding: "13px 28px", background: "#1d4ed8", color: "white", fontWeight: 700, fontSize: 15, borderRadius: 8, textDecoration: "none", boxShadow: "0 4px 14px rgba(29,78,216,0.3)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1e40af")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1d4ed8")}>
              Commencer →
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 40, marginTop: 48 }}>
            
            
          </div>
        </div>

        {/* Right — CAD plan mockup (no topbar, no sidebar) */}
        <div style={{ position: "relative" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.12)", border: "1px solid #e2e8f0", background: "white" }}>

            {/* Plan canvas — full width, CAD style */}
            <div style={{ background: "#ffffff", position: "relative", overflow: "hidden" }}>
              <svg width="100%" height="400" viewBox="0 0 660 400" style={{ display: "block" }}>
                {/* Background */}
                <rect width="660" height="400" fill="#ffffff"/>

                {/* Fine grid */}
                {Array.from({length: 41}).map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 10} x2="660" y2={i * 10} stroke="#f0f0f0" strokeWidth="0.4"/>
                ))}
                {Array.from({length: 67}).map((_, i) => (
                  <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="400" stroke="#f0f0f0" strokeWidth="0.4"/>
                ))}

                {/* OUTER WALLS */}
                <rect x="55" y="30" width="540" height="320" fill="none" stroke="#1a1a1a" strokeWidth="5"/>
                <rect x="59" y="34" width="532" height="312" fill="none" stroke="#ffffff" strokeWidth="2"/>

                {/* INTERIOR WALLS */}
                <line x1="270" y1="30" x2="270" y2="230" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="273" y1="30" x2="273" y2="230" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="415" y1="30" x2="415" y2="185" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="418" y1="30" x2="418" y2="185" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="55" y1="210" x2="270" y2="210" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="55" y1="213" x2="270" y2="213" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="270" y1="185" x2="595" y2="185" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="270" y1="188" x2="595" y2="188" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="270" y1="235" x2="595" y2="235" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="270" y1="238" x2="595" y2="238" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="470" y1="235" x2="470" y2="350" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="473" y1="235" x2="473" y2="350" stroke="#ffffff" strokeWidth="1.5"/>
                <line x1="530" y1="235" x2="530" y2="350" stroke="#1a1a1a" strokeWidth="3.5"/>
                <line x1="533" y1="235" x2="533" y2="350" stroke="#ffffff" strokeWidth="1.5"/>

                {/* DOORS */}
                <line x1="100" y1="210" x2="100" y2="233" stroke="#ffffff" strokeWidth="5"/>
                <path d="M100 210 Q100 233 123 233" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="100" y1="210" x2="123" y2="210" stroke="#ffffff" strokeWidth="4"/>
                <line x1="165" y1="210" x2="165" y2="187" stroke="#ffffff" strokeWidth="5"/>
                <path d="M165 210 Q165 187 142 187" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="142" y1="210" x2="165" y2="210" stroke="#ffffff" strokeWidth="4"/>
                <line x1="305" y1="185" x2="305" y2="162" stroke="#ffffff" strokeWidth="5"/>
                <path d="M305 185 Q305 162 328 162" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="305" y1="185" x2="328" y2="185" stroke="#ffffff" strokeWidth="4"/>
                <line x1="450" y1="185" x2="450" y2="162" stroke="#ffffff" strokeWidth="5"/>
                <path d="M450 185 Q450 162 473 162" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="450" y1="185" x2="473" y2="185" stroke="#ffffff" strokeWidth="4"/>
                <line x1="400" y1="235" x2="400" y2="258" stroke="#ffffff" strokeWidth="5"/>
                <path d="M400 235 Q400 258 423 258" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="400" y1="235" x2="423" y2="235" stroke="#ffffff" strokeWidth="4"/>
                <line x1="492" y1="235" x2="492" y2="252" stroke="#ffffff" strokeWidth="5"/>
                <path d="M492 235 Q492 252 509 252" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
                <line x1="492" y1="235" x2="509" y2="235" stroke="#ffffff" strokeWidth="4"/>

                {/* WINDOWS */}
                <line x1="88" y1="30" x2="220" y2="30" stroke="#ffffff" strokeWidth="5"/>
                <rect x="88" y="27" width="132" height="6" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <line x1="154" y1="27" x2="154" y2="33" stroke="#1a1a1a" strokeWidth="0.8"/>
                <line x1="295" y1="30" x2="385" y2="30" stroke="#ffffff" strokeWidth="5"/>
                <rect x="295" y="27" width="90" height="6" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <line x1="340" y1="27" x2="340" y2="33" stroke="#1a1a1a" strokeWidth="0.8"/>
                <line x1="432" y1="30" x2="530" y2="30" stroke="#ffffff" strokeWidth="5"/>
                <rect x="432" y="27" width="98" height="6" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <line x1="481" y1="27" x2="481" y2="33" stroke="#1a1a1a" strokeWidth="0.8"/>
                <line x1="88" y1="350" x2="240" y2="350" stroke="#ffffff" strokeWidth="5"/>
                <rect x="88" y="347" width="152" height="6" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <line x1="164" y1="347" x2="164" y2="353" stroke="#1a1a1a" strokeWidth="0.8"/>
                <line x1="595" y1="255" x2="595" y2="315" stroke="#ffffff" strokeWidth="5"/>
                <rect x="592" y="255" width="6" height="60" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <line x1="592" y1="285" x2="598" y2="285" stroke="#1a1a1a" strokeWidth="0.8"/>

                {/* ROOM LABELS */}
                <text x="162" y="116" textAnchor="middle" fontSize="12" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">SÉJOUR</text>
                <text x="162" y="131" textAnchor="middle" fontSize="9" fill="#555" fontFamily="'Courier New', monospace">28.5 m²</text>
                <text x="162" y="282" textAnchor="middle" fontSize="12" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">CUISINE</text>
                <text x="162" y="297" textAnchor="middle" fontSize="9" fill="#555" fontFamily="'Courier New', monospace">14.2 m²</text>
                <text x="343" y="102" textAnchor="middle" fontSize="12" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">CHAMBRE 1</text>
                <text x="343" y="117" textAnchor="middle" fontSize="9" fill="#555" fontFamily="'Courier New', monospace">18.0 m²</text>
                <text x="506" y="102" textAnchor="middle" fontSize="12" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">CHAMBRE 2</text>
                <text x="506" y="117" textAnchor="middle" fontSize="9" fill="#555" fontFamily="'Courier New', monospace">16.4 m²</text>
                <text x="432" y="210" textAnchor="middle" fontSize="9" fill="#777" fontFamily="'Courier New', monospace">COULOIR — 4.8 m²</text>
                <text x="420" y="298" textAnchor="middle" fontSize="9.5" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">SALLE DE BAIN</text>
                <text x="420" y="311" textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Courier New', monospace">6.2 m²</text>
                <text x="562" y="290" textAnchor="middle" fontSize="9.5" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">WC</text>
                <text x="562" y="303" textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Courier New', monospace">2.1 m²</text>
                <text x="360" y="305" textAnchor="middle" fontSize="9" fill="#777" fontFamily="'Courier New', monospace">ENTRÉE — 3.6 m²</text>

                {/* FURNITURE */}
                <rect x="68" y="50" width="80" height="35" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="70" y="52" width="76" height="22" rx="2" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <rect x="68" y="50" width="11" height="35" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="137" y="50" width="11" height="35" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="100" y="95" width="45" height="28" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="170" y="55" width="70" height="40" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                {[172,188,204,220].map((x,i) => <rect key={`ct${i}`} x={x} y="46" width="13" height="11" rx="1" fill="none" stroke="#aaa" strokeWidth="0.8"/>)}
                {[172,188,204,220].map((x,i) => <rect key={`cb${i}`} x={x} y="93" width="13" height="11" rx="1" fill="none" stroke="#aaa" strokeWidth="0.8"/>)}
                <rect x="62" y="218" width="100" height="15" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="62" y="218" width="15" height="70" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="112" y="220" width="22" height="12" rx="1" fill="none" stroke="#888" strokeWidth="1"/>
                <circle cx="123" cy="226" r="2.5" fill="none" stroke="#888" strokeWidth="0.8"/>
                <rect x="290" y="38" width="60" height="80" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="290" y="38" width="60" height="16" rx="2" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <line x1="320" y1="54" x2="320" y2="118" stroke="#aaa" strokeWidth="0.6" strokeDasharray="3,2"/>
                <rect x="352" y="42" width="16" height="16" rx="1" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <rect x="435" y="38" width="60" height="80" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="435" y="38" width="60" height="16" rx="2" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <line x1="465" y1="54" x2="465" y2="118" stroke="#aaa" strokeWidth="0.6" strokeDasharray="3,2"/>
                <rect x="370" y="265" width="65" height="34" rx="14" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="376" y="270" width="53" height="24" rx="11" fill="none" stroke="#bbb" strokeWidth="0.7"/>
                <circle cx="432" cy="282" r="3" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <rect x="378" y="250" width="22" height="17" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <circle cx="389" cy="257" r="2.5" fill="none" stroke="#aaa" strokeWidth="0.7"/>
                <rect x="537" y="248" width="26" height="32" rx="4" fill="none" stroke="#aaa" strokeWidth="1"/>
                <ellipse cx="550" cy="272" rx="10" ry="9" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <rect x="537" y="244" width="26" height="9" rx="2" fill="none" stroke="#aaa" strokeWidth="0.8"/>

                {/* ANNOTATIONS */}
                {/* 1. Warning fenêtre — orange */}
                <line x1="154" y1="33" x2="154" y2="58" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="154" cy="33" r="3.5" fill="#f59e0b"/>
                <rect x="100" y="58" width="108" height="38" rx="5" fill="#fffbeb" stroke="#fbbf24" strokeWidth="1.5"/>
                <rect x="100" y="58" width="5" height="38" rx="2" fill="#f59e0b"/>
                <text x="158" y="72" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="bold" fontFamily="'Courier New', monospace">⚠ Fenêtre à agrandir</text>
                <text x="158" y="86" textAnchor="middle" fontSize="8" fill="#92400e" fontFamily="'Courier New', monospace">L=1.20m → L=1.60m</text>

                {/* 2. Commentaire cuisine — bleu */}
                <line x1="162" y1="210" x2="162" y2="248" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="162" cy="248" r="3.5" fill="#3b82f6"/>
                <rect x="72" y="248" width="178" height="38" rx="5" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5"/>
                <rect x="72" y="248" width="5" height="38" rx="2" fill="#3b82f6"/>
                <text x="166" y="262" textAnchor="middle" fontSize="9" fill="#1d4ed8" fontWeight="bold" fontFamily="'Courier New', monospace">💬 Revoir disposition</text>
                <text x="166" y="276" textAnchor="middle" fontSize="8" fill="#2563eb" fontFamily="'Courier New', monospace">Placard prévu côté nord</text>

                {/* 3. Modification couloir — rouge */}
                <line x1="432" y1="235" x2="432" y2="218" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="432" cy="235" r="3.5" fill="#ef4444"/>
                <rect x="358" y="196" width="148" height="25" rx="5" fill="#fff1f2" stroke="#fca5a5" strokeWidth="1.5"/>
                <rect x="358" y="196" width="5" height="25" rx="2" fill="#ef4444"/>
                <text x="437" y="212" textAnchor="middle" fontSize="9" fill="#b91c1c" fontWeight="bold" fontFamily="'Courier New', monospace">✏ Largeur couloir −20cm</text>

                {/* 4. Mesure mur — gris */}
                <line x1="270" y1="112" x2="293" y2="112" stroke="#64748b" strokeWidth="1" strokeDasharray="3,2"/>
                <rect x="293" y="102" width="112" height="22" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2"/>
                <text x="349" y="116" textAnchor="middle" fontSize="8.5" fill="#475569" fontFamily="'Courier New', monospace">📏 Mur — ép. 15 cm</text>

                {/* DIMENSION LINES */}
                <line x1="55" y1="15" x2="595" y2="15" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="55" y1="11" x2="55" y2="19" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="595" y1="11" x2="595" y2="19" stroke="#1d4ed8" strokeWidth="0.8"/>
                <text x="325" y="12" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontFamily="'Courier New', monospace">14 000</text>
                <line x1="615" y1="30" x2="615" y2="350" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="611" y1="30" x2="619" y2="30" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="611" y1="350" x2="619" y2="350" stroke="#1d4ed8" strokeWidth="0.8"/>
                <text x="628" y="195" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontFamily="'Courier New', monospace" transform="rotate(90,628,195)">8 500</text>
                <line x1="55" y1="368" x2="270" y2="368" stroke="#64748b" strokeWidth="0.6"/>
                <line x1="55" y1="364" x2="55" y2="372" stroke="#64748b" strokeWidth="0.6"/>
                <line x1="270" y1="364" x2="270" y2="372" stroke="#64748b" strokeWidth="0.6"/>
                <text x="162" y="366" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">5 500</text>
                <line x1="270" y1="368" x2="595" y2="368" stroke="#64748b" strokeWidth="0.6"/>
                <line x1="595" y1="364" x2="595" y2="372" stroke="#64748b" strokeWidth="0.6"/>
                <text x="432" y="366" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">8 500</text>

                {/* NORTH */}
                <circle cx="38" cy="55" r="14" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <polygon points="38,43 41,56 38,52 35,56" fill="#1a1a1a"/>
                <text x="38" y="74" textAnchor="middle" fontSize="8" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">N</text>

                {/* SCALE BAR */}
                <line x1="60" y1="383" x2="180" y2="383" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="60" y1="379" x2="60" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="120" y1="379" x2="120" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="180" y1="379" x2="180" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <rect x="60" y="381" width="60" height="4" fill="#1a1a1a"/>
                <rect x="120" y="381" width="60" height="4" fill="white" stroke="#1a1a1a" strokeWidth="0.5"/>
                <text x="60" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">0</text>
                <text x="115" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">2.5m</text>
                <text x="173" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">5m</text>

                {/* TITLE BLOCK */}
                <rect x="200" y="378" width="390" height="20" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8"/>
                <line x1="328" y1="378" x2="328" y2="398" stroke="#cbd5e1" strokeWidth="0.8"/>
                <line x1="456" y1="378" x2="456" y2="398" stroke="#cbd5e1" strokeWidth="0.8"/>
                <text x="264" y="391" textAnchor="middle" fontSize="7.5" fill="#334155" fontFamily="'Courier New', monospace" fontWeight="bold">TOUR ALPHA — ARCHI RDC</text>
                <text x="392" y="391" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">Version 3 — Jan 2026</text>
                <text x="523" y="391" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">Échelle 1:50 | Format A2</text>
              </svg>

              {/* Toolbar overlay */}
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {["✏️","💬","📏","🔍","↩️"].map((icon, i) => (
                  <div key={i} style={{ width: 30, height: 30, background: "white", borderRadius: 6, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", cursor: "pointer" }}>{icon}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badge — bottom left */}
          <div style={{ position: "absolute", bottom: -16, left: -16, background: "white", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔄</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Version 3 sauvegardée</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Il y a 2 minutes · par M. Dupont</div>
            </div>
          </div>

          {/* Floating badge — top right */}
          <div style={{ position: "absolute", top: 40, right: -20, background: "white", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Modifications détectées</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8" }}>3 zones</div>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>↑ Analysé par IA</div>
          </div>
        </div>
      </div>
    </section>
  )
}
