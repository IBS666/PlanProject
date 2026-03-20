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

export interface LocationWithPlans {
  locationId: number
  hasPlans: boolean
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

  getTotalCount: async (): Promise<number> => {
    const res = await fetch(`${BASE_URL}/plan/count`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur chargement total plans')
    return res.json()
  },

  getRecent: async (limit = 5): Promise<Plan[]> => {
    const res = await fetch(`${BASE_URL}/plan/recent?limit=${limit}`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur chargement plans récents')
    return res.json()
  },

  getLocationsWithPlans: async (): Promise<LocationWithPlans[]> => {
    const res = await fetch(`${BASE_URL}/plan/location-with-plans`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur chargement locations avec plans')
    return res.json()
  },
}