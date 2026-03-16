// services/Planservice.ts
import { getToken } from '../utils/tokenUtils'

export interface PlanVersion {
  id: number
  versionNumber: number
  filePath: string
  fileSize: number
  fileType: string
  createdAt: string
}

export interface Plan {
  id: number
  name: string
  status: string
  category: string | null
  currentVersion: number
  locationId: number
  planVersions: PlanVersion[]
}

const BASE_URL = 'http://localhost:5279/api'

const headers = () => ({
  Authorization: `Bearer ${getToken()}`,
})

export const planService = {
  getByLocation: async (locationId: number): Promise<Plan[]> => {
    const res = await fetch(`${BASE_URL}/plan/location/${locationId}`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur chargement plans')
    return res.json()
  },
}