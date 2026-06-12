import { getToken } from '../utils/tokenUtils'

export interface PlanVersion {
  id: number
  versionNumber: number
  filePath: string
  fileSize: number
  fileType: string
  createdAt: string
  comment?: string
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

const BASE_URL = '/api'

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

  addVersion: async (planId: number, file: File, comment?: string) => {
  const fd = new FormData()
  fd.append('File', file)
  if (comment?.trim()) fd.append('Comment', comment)
  const res = await fetch(`${BASE_URL}/plan/${planId}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  })
  if (!res.ok) throw new Error('Erreur ajout version')
  return res.json()
},

deleteVersion: async (versionId: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/plan/versions/${versionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Erreur suppression version')
},
getMyPlansCount: async (): Promise<number> => {
    const res = await fetch(`${BASE_URL}/plan/my-plans-count`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur comptage plans')
    return res.json()
},

getMyVersionsCount: async (): Promise<number> => {
    const res = await fetch(`${BASE_URL}/plan/my-versions-count`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur comptage versions')
    return res.json()
},
getMyPlansByCategory: async (): Promise<Record<string, number>> => {
    const res = await fetch(`${BASE_URL}/plan/my-plans-by-category`, { headers: headers() })
    if (!res.ok) throw new Error('Erreur catégories')
    return res.json()
},

  
}