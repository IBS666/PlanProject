import { useState } from "react"
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav style={{position: "fixed",top: 0,left: 0,right: 0,zIndex: 100,backdropFilter: "blur(10px)",background: "rgba(255,255,255,0.7)",borderBottom: "1px solid #e2e8f0",
}}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
              <rect x="11" y="2" width="7" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
              <rect x="2" y="13" width="16" height="5" rx="1" stroke="white" strokeWidth="1.5"/>
              <line x1="4" y1="5" x2="7" y2="5" stroke="white" strokeWidth="1"/>
              <line x1="4" y1="7" x2="7" y2="7" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
          <span style={{ color: "#0f172a", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Axia Plan</span>
        </div>

        

        {/* CTA */}
        <Link
        to="/login"
        style={{ padding: "9px 20px", fontSize: 14, fontWeight: 600, color: "white", background: "#1d4ed8", borderRadius: 8, textDecoration: "none" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#1e40af")}
        onMouseLeave={e => (e.currentTarget.style.background = "#1d4ed8")}
        >
        Se connecter
        </Link>
      </div>
    </nav>
  )
}