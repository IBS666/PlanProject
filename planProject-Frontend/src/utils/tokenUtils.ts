import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': string
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string
  iss: string
  aud: string
  exp: number
}

export const saveToken = (token: string) => {
  localStorage.setItem('planvault_token', token)
}

export const getToken = (): string | null => {
  return localStorage.getItem('planvault_token')
}

export const removeToken = () => {
  localStorage.removeItem('planvault_token')
}

export const decodeToken = (token: string): JwtPayload => {
  return jwtDecode<JwtPayload>(token)
}

export const getUserRole = (): string | null => {
  const token = getToken()
  if (!token) return null
  try {
    const decoded = decodeToken(token)
    return decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
  } catch {
    return null
  }
}