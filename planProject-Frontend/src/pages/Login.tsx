import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest } from '../services/authService'
import { saveToken, decodeToken } from '../utils/tokenUtils'



export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPwd, setShowPwd] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) newErrors.email = "L'adresse email est requise"
    else if (!/^[^@]+@[^@]+.[^@]+$/.test(email)) newErrors.email = 'Adresse email invalide'
    if (!password.trim()) newErrors.password = 'Le mot de passe est requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submit = async (): Promise<void> => {
    if (!validate()) return
    setLoading(true)
    try {
      const data = await loginRequest({ email, password })
      saveToken(data.token)
      const decoded = decodeToken(data.token)
      const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

      console.log('Role détecté:', role)

      if (role === 'Admin') navigate('/admin')
      else if (role === 'Chef') navigate('/chef/dashboard')
      else navigate('/ingenieur/dashboard')

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setErrors({ password: message })
    } finally {
      setLoading(false)
    }
  }

  const inp = (hasError: boolean): CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    fontSize: 14,
    border: hasError ? '1px solid #ef4444' : '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    color: '#0f172a',
    background: hasError ? '#fff8f8' : '#ffffff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      backgroundColor: '#f5f5f7',
      backgroundImage: `
        radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(180,180,190,0.35) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 90% 10%,  rgba(210,210,220,0.25) 0%, transparent 55%),
        radial-gradient(ellipse 50% 60% at 50% 100%, rgba(160,160,175,0.20) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 80% 80%,  rgba(200,200,210,0.18) 0%, transparent 50%)
      `,
    }}>

     

      {/* Retour */}
      <button
        onClick={() => navigate('/')}
        style={{ position: 'fixed', top: 28, left: 40, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 17, padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'color 0.15s, border-color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.borderColor = '#bfdbfe' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0' }}
      >
        ← Retour
      </button>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 24px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', padding: '48px 44px' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width='26' height='26' viewBox='0 0 20 20' fill='none'>
              <rect x='2' y='2' width='7' height='9' rx='1' stroke='white' strokeWidth='1.5'/>
              <rect x='11' y='2' width='7' height='5' rx='1' stroke='white' strokeWidth='1.5'/>
              <rect x='2' y='13' width='16' height='5' rx='1' stroke='white' strokeWidth='1.5'/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>Connexion</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Connectez-vous pour accéder à votre espace</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Adresse email</label>
            <input
              type='email'
              placeholder='exemple@gmail.com'
              value={email}
              onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
              style={inp(!!errors.email)}
              onFocus={e => { if (!errors.email) e.target.style.borderColor = '#1d4ed8' }}
              onBlur={e => { if (!errors.email) e.target.style.borderColor = '#e2e8f0' }}
            />
            {errors.email && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⚠</span> {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder='Entrer votre mot de passe'
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })) }}
                style={{ ...inp(!!errors.password), padding: '12px 44px 12px 14px' }}
                onFocus={e => { if (!errors.password) e.target.style.borderColor = '#1d4ed8' }}
                onBlur={e => { if (!errors.password) e.target.style.borderColor = '#e2e8f0' }}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15, padding: 0, lineHeight: 1 }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⚠</span> {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            style={{ width: '100%', padding: '13px', background: loading ? '#93c5fd' : '#1d4ed8', color: 'white', fontWeight: 700, fontSize: 15, borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 6, boxShadow: '0 4px 14px rgba(29,78,216,0.25)', transition: 'background 0.2s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e40af' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8' }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 2 }}>
            <a
              href='#'
              onClick={e => { e.preventDefault(); navigate('/forgot-password') }}
              style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        <div style={{ marginTop: 28, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Accès interne sécurisé. Contactez l'administrateur pour tout problème de connexion.
          </p>
        </div>
      </div>

    </div>
  )
}
