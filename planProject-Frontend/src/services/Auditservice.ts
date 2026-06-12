import { getToken } from '../utils/tokenUtils'

const BASE_URL = '/api'
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

export interface AuditLog {
  id: number
  action: string
  entity: string
  entityId: number | null
  description: string | null
  createdAt: string
  userName: string
  userEmail: string
}

export const auditService = {
  async getLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${BASE_URL}/audit`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Erreur chargement audit')
    return res.json()
  }
}