import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'


export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [emailError, setEmailError] = useState<string>('')
  const [sent, setSent] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const submit = async (): Promise<void> => {
    if (!email.trim()) { setEmailError("L'adresse email est requise"); return }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setEmailError('Adresse email invalide'); return }
    setEmailError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5279/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 404) throw new Error('Aucun compte associé à cet email')
      if (!res.ok) throw new Error('Erreur serveur')
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur serveur'
      setEmailError(message)
    } finally {
      setLoading(false)
    }
  }

  const inp: CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

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
        onClick={() => navigate('/login')}
        style={{position:'fixed',top:28,left:40,zIndex:10,display:'flex',alignItems:'center',gap:8,background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:17,padding:'8px 20px',fontSize:13,fontWeight:600,color:'#64748b',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',transition:'color 0.15s, border-color 0.15s'}}
        onMouseEnter={e => { e.currentTarget.style.color='#1d4ed8'; e.currentTarget.style.borderColor='#bfdbfe' }}
        onMouseLeave={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.borderColor='#e2e8f0' }}
      >
        ← Retour
      </button>

      {/* Card */}
      <div style={{width:'100%',maxWidth:440,background:'#ffffff',borderRadius:20,border:'1px solid #e2e8f0',boxShadow:'0 24px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',padding:'48px 44px'}}>

        {!sent ? (
          <>
            <div style={{textAlign:'center',marginBottom:36}}>
              <div style={{width:52,height:52,borderRadius:14,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='7' cy='17' r='4'/>
                    <path d='M10.7 13.3L21 3'/>
                    <path d='M19 5l2 2'/>
                    <path d='M17 7l2 2'/>
                </svg>
                </div>
              <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px',marginBottom:8}}>
                Mot de passe oublié ?
              </h1>
              <p style={{color:'#64748b',fontSize:14,lineHeight:1.6}}>
                Entrez votre adresse email. Nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>
                  Adresse email
                </label>
                <input
                  type='email'
                  placeholder='exemple@gmail.com'
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  style={{
                    ...inp,
                    border: emailError ? '1px solid #ef4444' : '1px solid #e2e8f0',
                    background: emailError ? '#fff8f8' : '#ffffff',
                  }}
                  onFocus={e => { if (!emailError) e.target.style.borderColor='#1d4ed8' }}
                  onBlur={e => { if (!emailError) e.target.style.borderColor='#e2e8f0' }}
                />
                {emailError && (
                  <p style={{margin:'6px 0 0',fontSize:12,color:'#ef4444',display:'flex',alignItems:'center',gap:4}}>
                    <span>⚠</span> {emailError}
                  </p>
                )}
              </div>

              <button
                onClick={submit}
                style={{width:'100%',padding:'13px',background:loading?'#93c5fd':'#1d4ed8',color:'white',fontWeight:700,fontSize:15,borderRadius:8,border:'none',cursor:loading?'not-allowed':'pointer',boxShadow:'0 4px 14px rgba(29,78,216,0.25)',transition:'background 0.2s'}}
                onMouseEnter={e => { if(!loading) e.currentTarget.style.background='#1e40af' }}
                onMouseLeave={e => { if(!loading) e.currentTarget.style.background='#1d4ed8' }}
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>

              <div style={{textAlign:'center'}}>
                <a
                  href='#'
                  onClick={e => { e.preventDefault(); navigate('/login') }}
                  style={{fontSize:13,color:'#94a3b8',textDecoration:'none',fontWeight:500}}
                  onMouseEnter={e => e.currentTarget.style.color='#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.color='#94a3b8'}
                >
                  Retour à la connexion
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{textAlign:'center'}}>
              <div style={{width:64,height:64,borderRadius:16,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
                <svg width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M20 6L9 17l-5-5'/>
                </svg>
                </div>
              <h1 style={{fontSize:22,fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px',marginBottom:10}}>
                Demande envoyée
              </h1>
              <p style={{color:'#64748b',fontSize:14,lineHeight:1.7,marginBottom:32}}>
                Un email a été transmis à votre administrateur. Vous recevrez un lien de réinitialisation à <span style={{fontWeight:600,color:'#0f172a'}}>{email}</span>.
              </p>
              <button
                onClick={() => navigate('/login')}
                style={{width:'100%',padding:'13px',background:'#1d4ed8',color:'white',fontWeight:700,fontSize:15,borderRadius:8,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(29,78,216,0.25)',transition:'background 0.2s'}}
                onMouseEnter={e => e.currentTarget.style.background='#1e40af'}
                onMouseLeave={e => e.currentTarget.style.background='#1d4ed8'}
              >
                Retour à la connexion
              </button>
            </div>
          </>
        )}

        <div style={{marginTop:28,padding:'14px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10}}>
          <p style={{fontSize:12,color:'#64748b',lineHeight:1.6,margin:0}}>
            Accès interne sécurisé. Si le problème persiste, contactez directement votre administrateur IT.
          </p>
        </div>
      </div>

      
    </div>
  )
}
