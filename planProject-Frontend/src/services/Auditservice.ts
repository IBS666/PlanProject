import { getToken } from '../utils/tokenUtils'

export interface AuditLog {
  id: number
  userId: number
  userName: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD'
  entityType: 'User' | 'Project' | 'Plan' | 'Location'
  entityName: string | null
  createdAt: string
}

const BASE_URL = 'http://localhost:5279/api'

const headers = () => ({
  Authorization: `Bearer ${getToken()}`,
})

export const auditService = {
  getRecent: async (limit = 10): Promise<AuditLog[]> => {
    const res = await fetch(`${BASE_URL}/audit/recent?limit=${limit}`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur chargement audit')
    return res.json()
  },
}