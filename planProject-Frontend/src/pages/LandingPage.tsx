import { useState, useEffect} from "react";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, PenLine, GitBranch, Bot, LayoutDashboard, Search, Lightbulb, Upload, FileText } from "lucide-react";

/* ─── GLOBAL STYLES ─── */
const GlobalStyle = (): JSX.Element => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --blue:      #2563eb;
      --blue-dark: #1d4ed8;
      --blue-soft: #eff6ff;
      --dark:      #0f172a;
      --slate:     #64748b;
      --border:    #e2e8f0;
      --bg:        #f8fafc;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    /* Mesh gradient principal — Hero — gris élégant */
    .bg-mesh {
      background-color: #f5f5f7;
      background-image:
        radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(180,180,190,0.35) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 90% 10%,  rgba(210,210,220,0.25) 0%, transparent 55%),
        radial-gradient(ellipse 50% 60% at 50% 100%, rgba(160,160,175,0.20) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 80% 80%,  rgba(200,200,210,0.18) 0%, transparent 50%);
    }

    /* Mesh doux pour sections alternées — blanc cassé */
    .bg-mesh-soft {
      background-color: #fafafa;
      background-image:
        radial-gradient(ellipse 70% 50% at 0% 50%,   rgba(190,190,200,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 60% 60% at 100% 30%,  rgba(200,200,210,0.14) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 50% 100%, rgba(175,175,190,0.12) 0%, transparent 60%);
    }

    /* Blob animé décoratif */
    @keyframes float-blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(18px, -22px) scale(1.04); }
      66%       { transform: translate(-12px, 14px) scale(0.97); }
    }
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
      animation: float-blob 10s ease-in-out infinite;
    }

    /* Hero — animation immédiate au chargement */
    @keyframes heroFadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Fade-in on scroll (sections sous le hero) */
    .fade-up {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    .fade-up.visible { opacity: 1; transform: translateY(0); }

    /* Hover lift for cards */
    .lift {
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    .lift:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(37,99,235,0.10);
    }
  `}</style>
);

/* ─── NAVBAR ─── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.92)" : "white",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: `1px solid ${scrolled ? "#e2e8f0" : "#f1f5f9"}`,
      boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.06)" : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#60a5fa)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(29,78,216,0.25)" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
              <rect x="11" y="2" width="7" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
              <rect x="2" y="13" width="16" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
              <line x1="4" y1="5" x2="7" y2="5" stroke="white" strokeWidth="1"/>
              <line x1="4" y1="7" x2="7" y2="7" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
          <span style={{ color: "#0f172a", fontWeight: 800, fontSize: 19, letterSpacing: "-0.5px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Axia Plan</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { label: "Fonctionnalités",   href: "#fonctionnalites" },
            { label: "Analyse IA",        href: "#analyse-ia" },
            { label: "Comment ça marche", href: "#comment-ca-marche" },
          ].map(link => (
            <a key={link.href} href={link.href} style={{
              padding: "8px 14px", fontSize: 13.5, fontWeight: 500, color: "#475569",
              textDecoration: "none", borderRadius: 8, transition: "color 0.2s, background 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#0f172a"; e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "transparent"; }}
            >{link.label}</a>
          ))}
        </div>

        {/* CTA */}
        <Link to="/login" style={{
          padding: "10px 22px", fontSize: 14, fontWeight: 600, color: "white",
          background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
          borderRadius: 9, textDecoration: "none",
          boxShadow: "0 4px 14px rgba(29,78,216,0.28)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Se connecter
        </Link>
      </div>
    </nav>
  );
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="bg-mesh" style={{
      paddingTop: 130, paddingBottom: 90, paddingLeft: 28, paddingRight: 28,
      position: "relative", overflow: "hidden",
    }}>
      {/* Blobs flottants */}
      <div className="blob" style={{ width: 520, height: 520, top: -140, right: -100, background: "rgba(180,180,195,0.28)", animationDelay: "0s" }} />
      <div className="blob" style={{ width: 380, height: 380, bottom: -80, left: -60, background: "rgba(200,200,215,0.22)", animationDelay: "3.5s" }} />
      <div className="blob" style={{ width: 280, height: 280, top: "40%", left: "38%", background: "rgba(160,160,175,0.15)", animationDelay: "7s" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ animation: "heroFadeUp 0.7s ease forwards" }}>
          

          <h1 style={{
            fontSize: "clamp(34px,4.2vw,58px)", fontWeight: 900, color: "#0f172a",
            lineHeight: 1.08, letterSpacing: "-2px", marginBottom: 22,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Gérez, modifiez et<br />
            <span style={{ color: "#1d4ed8" }}>versionnez vos plans</span><br />
            en toute simplicité.
          </h1>

          <p style={{ fontSize: 16.5, color: "#64748b", lineHeight: 1.75, marginBottom: 36, maxWidth: 460 }}>
            Une plateforme centralisée pour importer, annoter, comparer et archiver tous vos plans techniques — avec historique complet et analyse IA intégrée.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/login" style={{
              padding: "13px 28px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              color: "white", fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: "none",
              boxShadow: "0 6px 20px rgba(29,78,216,0.30)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(29,78,216,0.36)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,78,216,0.30)"; }}
            >
              Commencer →
            </Link>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 48 }}>
            
              <div >
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-1px" }}>        </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>     </div>
              </div>
            
          </div>
        </div>

        <div style={{ position: "relative", animation: "heroFadeUp 0.7s ease 0.15s both" }}>
          <div style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 28px 70px rgba(0,0,0,0.13)", border: "1px solid #e2e8f0", background: "white" }}>
            <div style={{ background: "white", position: "relative", overflow: "hidden" }}>
              <svg width="100%" height="400" viewBox="0 0 660 400" style={{ display: "block" }}>
                <rect width="660" height="400" fill="#ffffff"/>
                {Array.from({length:41}).map((_,i)=><line key={`h${i}`} x1="0" y1={i*10} x2="660" y2={i*10} stroke="#f0f0f0" strokeWidth="0.4"/>)}
                {Array.from({length:67}).map((_,i)=><line key={`v${i}`} x1={i*10} y1="0" x2={i*10} y2="400" stroke="#f0f0f0" strokeWidth="0.4"/>)}
                <rect x="55" y="30" width="540" height="320" fill="none" stroke="#1a1a1a" strokeWidth="5"/>
                <rect x="59" y="34" width="532" height="312" fill="none" stroke="#ffffff" strokeWidth="2"/>
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
                <rect x="68" y="50" width="80" height="35" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="70" y="52" width="76" height="22" rx="2" fill="none" stroke="#aaa" strokeWidth="0.8"/>
                <rect x="100" y="95" width="45" height="28" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="170" y="55" width="70" height="40" rx="2" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="62" y="218" width="100" height="15" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="290" y="38" width="60" height="80" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="435" y="38" width="60" height="80" rx="3" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="370" y="265" width="65" height="34" rx="14" fill="none" stroke="#aaa" strokeWidth="1"/>
                <rect x="537" y="248" width="26" height="32" rx="4" fill="none" stroke="#aaa" strokeWidth="1"/>
                <line x1="154" y1="33" x2="154" y2="58" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="154" cy="33" r="3.5" fill="#f59e0b"/>
                <rect x="100" y="58" width="108" height="38" rx="6" fill="#fffbeb" stroke="#fbbf24" strokeWidth="1.5"/>
                <rect x="100" y="58" width="5" height="38" rx="2" fill="#f59e0b"/>
                <text x="158" y="72" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="bold" fontFamily="'Courier New', monospace">⚠ Fenêtre à agrandir</text>
                <text x="158" y="86" textAnchor="middle" fontSize="8" fill="#92400e" fontFamily="'Courier New', monospace">L=1.20m → L=1.60m</text>
                <line x1="162" y1="210" x2="162" y2="248" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="162" cy="248" r="3.5" fill="#3b82f6"/>
                <rect x="72" y="248" width="178" height="38" rx="6" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5"/>
                <rect x="72" y="248" width="5" height="38" rx="2" fill="#3b82f6"/>
                <text x="166" y="262" textAnchor="middle" fontSize="9" fill="#1d4ed8" fontWeight="bold" fontFamily="'Courier New', monospace">💬 Revoir disposition</text>
                <text x="166" y="276" textAnchor="middle" fontSize="8" fill="#2563eb" fontFamily="'Courier New', monospace">Placard prévu côté nord</text>
                <line x1="432" y1="235" x2="432" y2="218" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4,2"/>
                <circle cx="432" cy="235" r="3.5" fill="#ef4444"/>
                <rect x="358" y="196" width="148" height="25" rx="6" fill="#fff1f2" stroke="#fca5a5" strokeWidth="1.5"/>
                <rect x="358" y="196" width="5" height="25" rx="2" fill="#ef4444"/>
                <text x="437" y="212" textAnchor="middle" fontSize="9" fill="#b91c1c" fontWeight="bold" fontFamily="'Courier New', monospace">✏ Largeur couloir −20cm</text>
                <line x1="55" y1="15" x2="595" y2="15" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="55" y1="11" x2="55" y2="19" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="595" y1="11" x2="595" y2="19" stroke="#1d4ed8" strokeWidth="0.8"/>
                <text x="325" y="12" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontFamily="'Courier New', monospace">14 000</text>
                <line x1="615" y1="30" x2="615" y2="350" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="611" y1="30" x2="619" y2="30" stroke="#1d4ed8" strokeWidth="0.8"/>
                <line x1="611" y1="350" x2="619" y2="350" stroke="#1d4ed8" strokeWidth="0.8"/>
                <text x="628" y="195" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontFamily="'Courier New', monospace" transform="rotate(90,628,195)">8 500</text>
                <circle cx="38" cy="55" r="14" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                <polygon points="38,43 41,56 38,52 35,56" fill="#1a1a1a"/>
                <text x="38" y="74" textAnchor="middle" fontSize="8" fill="#1a1a1a" fontFamily="'Courier New', monospace" fontWeight="bold">N</text>
                <line x1="60" y1="383" x2="180" y2="383" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="60" y1="379" x2="60" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="120" y1="379" x2="120" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <line x1="180" y1="379" x2="180" y2="387" stroke="#1a1a1a" strokeWidth="1.5"/>
                <rect x="60" y="381" width="60" height="4" fill="#1a1a1a"/>
                <rect x="120" y="381" width="60" height="4" fill="white" stroke="#1a1a1a" strokeWidth="0.5"/>
                <text x="60" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">0</text>
                <text x="115" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">2.5m</text>
                <text x="173" y="377" fontSize="7" fill="#1a1a1a" fontFamily="'Courier New', monospace">5m</text>
                <rect x="200" y="378" width="390" height="20" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8"/>
                <line x1="328" y1="378" x2="328" y2="398" stroke="#cbd5e1" strokeWidth="0.8"/>
                <line x1="456" y1="378" x2="456" y2="398" stroke="#cbd5e1" strokeWidth="0.8"/>
                <text x="264" y="391" textAnchor="middle" fontSize="7.5" fill="#334155" fontFamily="'Courier New', monospace" fontWeight="bold">TOUR ALPHA — ARCHI RDC</text>
                <text x="392" y="391" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">Version 3 — Jan 2026</text>
                <text x="523" y="391" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="'Courier New', monospace">Échelle 1:50 | Format A2</text>
              </svg>
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {["✏️","💬","📏","🔍","↩️"].map((icon, i) => (
                  <div key={i} style={{ width: 30, height: 30, background: "white", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer" }}>{icon}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: -16, left: -16, background: "white", borderRadius: 14, padding: "12px 16px", boxShadow: "0 10px 32px rgba(0,0,0,0.11)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔄</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Version 3 sauvegardée</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Il y a 2 min · par M. Dupont</div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 40, right: -20, background: "white", borderRadius: 14, padding: "10px 16px", boxShadow: "0 10px 32px rgba(0,0,0,0.11)", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Modifications détectées</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#1d4ed8" }}>3 zones</div>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>↑ Analysé par IA</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
interface Feature {
  title: string;
  desc: string;
  icon?: React.ElementType;
  
}

const FEATURES: Feature[] = [
  { title: "Gestion des projets et plans", desc: "Importez vos plans PDF, DWG ou images et organisez-les par projet et catégorie. Navigation multi-pages avec zoom intégré.",icon: FolderOpen},
  { title: "Annotation et modification", desc: "Interface de dessin directement sur le plan : lignes, formes, commentaires, surlignage.",icon: PenLine},
  { title: "Versioning complet", desc: "Chaque modification crée une nouvelle version. Historique complet avec date, auteur et commentaire.",icon:GitBranch  },
  { title: "Analyse IA automatique", desc: "Détection automatique des différences entre versions.", icon:Bot },
  { title: "Tableau de bord et export", desc: "Vue globale des projets, plans récemment modifiés et dernières versions. Export PDF des rapports et historiques.", icon:LayoutDashboard },
];

function Features() {
  return (
    <section id="fonctionnalites" className="bg-mesh-soft" style={{ padding: "96px 28px", borderTop: "1px solid #eef0ff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 56 }}>
        
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 14 }}>
            Tout ce dont votre équipe a besoin
          </h2>
          <p style={{ color: "#64748b", fontSize: 16, maxWidth: 500, margin: "0 auto", lineHeight: 1.65 }}>
            De l'import du plan à son archivage
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="lift fade-up" style={{
              background: "#f8faff", border: "1px solid #e8effe", borderRadius: 16, padding: "28px 26px",
              transitionDelay: `${i * 0.06}s`,
              ...(i === 4 ? { gridColumn: "2 / 3" } : {}),
            }}>
              <div style={{ fontSize: 26, marginBottom: 14 }}>{f.icon && <f.icon />}</div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1d4ed8", fontSize: 16, fontWeight: 700, marginBottom: 9, lineHeight: 1.3 }}>{f.title}</h3>
              <p style={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── AI SECTION ─── */
interface AIItem {
  icon: React.ElementType | string;
  title: string;
  desc: string;
}

interface AIResult {
  icon: React.ElementType | string;
  label: string;
  detail: string;
  color: string;
  text: string;
}

function AISection() {
  const aiItems: AIItem[] = [
    { icon: Search, title: "Détection des différences", desc: "Surlignage automatique des zones modifiées entre deux versions d'un plan." },
    { icon: FileText, title: "Rapports automatiques", desc: "Génération d’un résumé des modifications détectées entre deux versions d’un plan." },
    { icon: Lightbulb, title: "Suggestions d'actions", desc: "Alertes sur modifications importantes." },
  ];

  const aiResults: AIResult[] = [
    { icon:"🔴", label:"Elément supprimée", detail:"Porte supprimée", color:"#fee2e2", text:"#b91c1c" },
    { icon:"🟢", label:"Elément ajoutée", detail:"Annotation ajoutée", color:"#dcfce7", text:"#15803d" },
    { icon:"🟡", label:"Zone modifiée", detail:"fenêtre — repositionnée", color:"#fef3c7", text:"#92400e" },
  ];
  return (
    <section id="analyse-ia" className="bg-mesh" style={{ padding: "96px 28px", borderTop: "1px solid #e8effe" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div className="fade-up">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 18 }}>
            L'IA analyse vos plans<br />
            <span style={{ color: "#1d4ed8" }}>automatiquement</span>
          </h2>
          <p style={{ color: "#64748b", fontSize: 15.5, lineHeight: 1.75, marginBottom: 36 }}>
            L'IA détecte les différences entre versions, classe les plans et suggère des actions — sans intervention manuelle.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {aiItems.map((item: AIItem, i: number) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 18px", background: "white", borderRadius: 12, border: "1px solid #e8effe" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", border: "1px solid #dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon && <item.icon />}</div>
                <div>
                  <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fade-up" style={{ background: "white", borderRadius: 18, border: "1px solid #e2e8f0", boxShadow: "0 10px 40px rgba(29,78,216,0.08)", overflow: "hidden", transitionDelay: "0.1s" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Analyse IA — Comparaison v2 → v3</span>
            <span style={{ fontSize: 11, background: "#fdf4ff", color: "#7c3aed", padding: "3px 10px", borderRadius: 100, fontWeight: 600 }}>En cours...</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #f1f5f9" }}>
            {["Version 2", "Version 3"].map((label, vi) => (
              <div key={vi} style={{ borderRight: vi === 0 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ padding: "8px 12px", background: "#f8fafc", fontSize: 11, fontWeight: 600, color: "#94a3b8", textAlign: "center" }}>{label}</div>
                <svg width="100%" height="160" viewBox="0 0 200 160">
                  <rect width="200" height="160" fill="#f8fafc"/>
                  {[0,1,2,3,4].map(i=><line key={i} x1="0" y1={i*40} x2="200" y2={i*40} stroke="#e2e8f0" strokeWidth="0.5"/>)}
                  {[0,1,2,3,4,5].map(i=><line key={i} x1={i*40} y1="0" x2={i*40} y2="160" stroke="#e2e8f0" strokeWidth="0.5"/>)}
                  <rect x="15" y="15" width="170" height="130" fill="none" stroke="#334155" strokeWidth="2"/>
                  <rect x="15" y="15" width="85" height="75" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  <rect x="100" y="15" width="85" height="75" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  <rect x="15" y="90" width="170" height="55" fill="none" stroke="#334155" strokeWidth="1.5"/>
                  {vi===1&&<>
                    <rect x="100" y="15" width="85" height="75" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2"/>
                    <rect x="15" y="90" width="85" height="55" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,2"/>
                  </>}
                </svg>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Résultats de l'analyse</div>
            {aiResults.map((r: AIResult, i: number) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:r.color, borderRadius:9 }}>
                <span style={{ fontSize:14 }}>{r.icon && <r.icon />}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:r.text }}>{r.label} — </span>
                  <span style={{ fontSize:12, color:r.text, opacity:0.8 }}>{r.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS — ACCORDÉON ─── */
interface Step {
  n: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  detail: string;
}

function HowItWorks(): JSX.Element {
  const [active, setActive] = useState<number | null>(0);

  const STEPS: Step[] = [
    {
      n: "01", icon: Upload,
      title: "Importez vos plans",
      desc: "Glissez-déposez vos fichiers PDF, DWG ou images.",
      detail: "La plateforme détecte automatiquement le type de fichier et l'organise par projet et catégorie. Formats supportés : PDF, DWG, DXF, PNG, JPG. Jusqu'à 50 Mo par fichier.",
    },
    {
      n: "02", icon: PenLine,
      title: "Annotez et modifiez",
      desc: "Dessinez, commentez et surlignez directement dans le navigateur.",
      detail: "Interface de dessin complète : lignes, formes géométriques, textes, surlignage et commentaires contextuels. Sauvegarde automatique toutes les 30 secondes ou manuelle.",
    },
    {
      n: "03", icon: GitBranch,
      title: "Versionnez automatiquement",
      desc: "Chaque sauvegarde crée une version horodatée avec auteur.",
      detail: "Historique complet et illimité. Chaque version est associée à un auteur, une date et un commentaire optionnel. Restauration en un clic vers n'importe quelle version.",
    },
    {
      n: "04", icon: Bot,
      title: "Analysez avec l'IA",
      desc: "L'IA surligne les zones modifiées et classe les changements.",
      detail: "L'IA' compare deux versions pixel par pixel, détecte les zones ajoutées, modifiées ou supprimées, et génère un rapport structuré avec suggestions d'actions.",
    },
  ];

  return (
    <section id="comment-ca-marche" className="bg-mesh-soft" style={{ padding: "96px 28px", borderTop: "1px solid #e8eaed" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>

        {/* Left */}
        <div style={{ animation: "heroFadeUp 0.7s ease forwards" }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 20 }}>
            Opérationnel en<br />quelques minutes.
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.75, maxWidth: 360 }}>
            Quatre étapes simples pour centraliser, annoter et analyser tous vos plans techniques.
          </p>
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((s, i) => (
              <div key={i} onClick={() => setActive(i === active ? null : i)}
                style={{ display: "flex", alignItems: "center", gap: 12, opacity: active === i ? 1 : 0.35, transition: "opacity 0.3s", cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: active === i ? "#1d4ed8" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s", flexShrink: 0 }}>
                  <s.icon size={13} color={active === i ? "white" : "#94a3b8"} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: active === i ? "#0f172a" : "#64748b" }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — accordéon */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "heroFadeUp 0.7s ease 0.1s both" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              background: active === i ? "white" : "transparent",
              border: `1px solid ${active === i ? "#e2e8f0" : "transparent"}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: active === i ? "0 8px 28px rgba(0,0,0,0.07)" : "none",
              transition: "all 0.3s ease",
            }}>
              <button onClick={() => setActive(i === active ? null : i)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 16,
                padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: active === i ? "#eff6ff" : "#f1f5f9", border: `1px solid ${active === i ? "#bfdbfe" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                  <s.icon size={18} color={active === i ? "#1d4ed8" : "#94a3b8"} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.08em", marginBottom: 3 }}>ÉTAPE {s.n}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{s.title}</div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: active === i ? "#D4D4D4" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d={active === i ? "M2 7L5 4L8 7" : "M2 4L5 7L8 4"} stroke={active === i ? "white" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              <div style={{ maxHeight: active === i ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
                <div style={{ padding: "0 24px 22px 82px" }}>
                  <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.75, margin: 0 }}>{s.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)", padding: "96px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 700, margin: "0 auto", position: "relative" }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(28px,4vw,50px)", fontWeight: 800, color: "white", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 16 }}>
          Prêt à centraliser vos plans ?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, marginBottom: 40, lineHeight: 1.65 }}>
          Accédez à la plateforme et commencez à importer vos premiers plans dès aujourd'hui.
        </p>
        <Link to="/login" style={{
          display: "inline-block", padding: "15px 36px", background: "white", color: "#1d4ed8",
          fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: "none",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(0,0,0,0.22)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.18)"; }}
        >
          Accéder à la plateforme →
        </Link>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer style={{ background: "#0f172a", padding: "56px 28px 28px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="7" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
                  <rect x="11" y="2" width="7" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
                  <rect x="2" y="13" width="16" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "white", fontWeight: 800, fontSize: 17 }}>Axia Plan</span>
            </div>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.75, maxWidth: 220 }}>
              Plateforme interne de gestion, modification et versioning des plans techniques.
            </p>
          </div>
          {[
            { title: "Fonctionnalités", links: ["Gestion des plans","Annotation","Versioning","Comparaison","Export"] },
           { title: "Sécurité", links: ["Accès sécurisé", "Gestion des accès", "Historique des actions"]},
            { title: "Support", links: ["Documentation","Contact équipe IT","Signaler un bug"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 style={{ color: "white", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{col.title}</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(l => (
                  <li key={l}><a href="#" style={{ color: "#475569", fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                    onMouseLeave={e => e.currentTarget.style.color = "#475569"}
                  >{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ color: "#334155", fontSize: 12 }}>© 2026 Axia Plan — Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── MAIN ─── */
export default function LandingPage() {
  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <GlobalStyle />
      <Navbar />
      <Hero />
      <Features />
      <AISection />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
