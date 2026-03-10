const API_URL = 'http://localhost:5279/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
}

export const loginRequest = async (payload: LoginPayload): Promise<AuthResponse> => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 401) throw new Error('Identifiants incorrects')
  if (!res.ok) throw new Error('Erreur serveur')
  return res.json()
}

export const forgotPasswordRequest = async (email: string): Promise<string> => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (res.status === 404) throw new Error('Aucun compte associé à cet email')
  if (!res.ok) throw new Error('Erreur serveur')
  const text = await res.text()
  // Le backend retourne : "Reset password link sent to email (token: XXX)"
  const match = text.match(/token: (.+)\)/)
  return match ? match[1] : ''
}

