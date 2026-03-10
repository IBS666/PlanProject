import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section style={{ background: "#1d4ed8", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "white", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 16 }}>
          Prêt à centraliser vos plans ?
        </h2>
        <p style={{ color: "#bfdbfe", fontSize: 17, marginBottom: 36, lineHeight: 1.6 }}>
          Accédez à la plateforme et commencez à importer vos premiers plans dès aujourd'hui.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
           <Link
            to="/login" style={{ padding: "14px 32px", background: "white", color: "#1d4ed8", fontWeight: 700, fontSize: 15, borderRadius: 8, textDecoration: "none" }}>
            <center>Accéder à la plateforme →</center>
          </Link>
        
        </div>
      </div>
    </section>
  )
}