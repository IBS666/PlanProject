import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CSSProperties } from 'react'

const API_URL = 'http://localhost:5279/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [errors, setErrors] = useState<{password?: string; confirm?: string}>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [done, setDone] = useState<boolean>(false)

  const submit = async (): Promise<void> => {
    const newErrors: {password?: string; confirm?: string} = {}
    if (!password.trim()) newErrors.password = 'Le mot de passe est requis'
    else if (password.length < 6) newErrors.password = 'Minimum 6 caractères'
    if (!confirm.trim()) newErrors.confirm = 'Confirmez le mot de passe'
    else if (confirm !== password) newErrors.confirm = 'Les mots de passe ne correspondent pas'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      if (!res.ok) throw new Error('Token invalide ou expiré')
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur serveur'
      setErrors({ password: message })
    } finally {
      setLoading(false)
    }
  }

  const inp = (hasError: boolean): CSSProperties => ({
    width: '100%', padding: '12px 14px', fontSize: 14,
    border: hasError ? '1px solid #ef4444' : '1px solid #e2e8f0',
    borderRadius: 8, outline: 'none', color: '#0f172a',
    background: hasError ? '#fff8f8' : '#ffffff',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
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
      <div style={{width:'100%',maxWidth:440,background:'#ffffff',borderRadius:20,border:'1px solid #e2e8f0',boxShadow:'0 24px 60px rgba(0,0,0,0.08)',padding:'48px 44px'}}>

        {!done ? (
          <>
            <div style={{textAlign:'center',marginBottom:36}}>
              <div style={{width:52,height:52,borderRadius:14,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>
                </svg>
              </div>
              <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px',marginBottom:6}}>
                Nouveau mot de passe
              </h1>
              <p style={{color:'#64748b',fontSize:14}}>Choisissez un nouveau mot de passe sécurisé.</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Nouveau mot de passe</label>
                <input type='password' placeholder='••••••••' value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})) }}
                  style={inp(!!errors.password)}
                  onFocus={e => { if (!errors.password) e.target.style.borderColor='#1d4ed8' }}
                  onBlur={e => { if (!errors.password) e.target.style.borderColor='#e2e8f0' }}
                />
                {errors.password && <p style={{margin:'6px 0 0',fontSize:12,color:'#ef4444',display:'flex',alignItems:'center',gap:4}}><span>⚠</span> {errors.password}</p>}
              </div>

              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6}}>Confirmer le mot de passe</label>
                <input type='password' placeholder='••••••••' value={confirm}
                  onChange={e => { setConfirm(e.target.value); setErrors(p => ({...p, confirm: undefined})) }}
                  style={inp(!!errors.confirm)}
                  onFocus={e => { if (!errors.confirm) e.target.style.borderColor='#1d4ed8' }}
                  onBlur={e => { if (!errors.confirm) e.target.style.borderColor='#e2e8f0' }}
                />
                {errors.confirm && <p style={{margin:'6px 0 0',fontSize:12,color:'#ef4444',display:'flex',alignItems:'center',gap:4}}><span>⚠</span> {errors.confirm}</p>}
              </div>

              <button onClick={submit}
                style={{width:'100%',padding:'13px',background:loading?'#93c5fd':'#1d4ed8',color:'white',fontWeight:700,fontSize:15,borderRadius:8,border:'none',cursor:loading?'not-allowed':'pointer',marginTop:6,boxShadow:'0 4px 14px rgba(29,78,216,0.25)',transition:'background 0.2s'}}
                onMouseEnter={e => { if(!loading) e.currentTarget.style.background='#1e40af' }}
                onMouseLeave={e => { if(!loading) e.currentTarget.style.background='#1d4ed8' }}
              >
                {loading ? 'Enregistrement...' : 'Réinitialiser'}
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:16,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
              <svg width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M20 6L9 17l-5-5'/>
              </svg>
            </div>
            <h1 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:10}}>Mot de passe modifié !</h1>
            <p style={{color:'#64748b',fontSize:14,lineHeight:1.7,marginBottom:32}}>Votre mot de passe a été réinitialisé avec succès.</p>
            <button onClick={() => navigate('/login')}
              style={{width:'100%',padding:'13px',background:'#1d4ed8',color:'white',fontWeight:700,fontSize:15,borderRadius:8,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(29,78,216,0.25)'}}
              onMouseEnter={e => e.currentTarget.style.background='#1e40af'}
              onMouseLeave={e => e.currentTarget.style.background='#1d4ed8'}
            >
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}