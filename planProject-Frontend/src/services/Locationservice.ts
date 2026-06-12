import { getToken } from '../utils/tokenUtils'

const API_BASE = '/api'

export interface Location {
  id: number
  name: string
  type: string
  projectId: number
  parentId: number | null
  children?: Location[]
}

export interface CreateLocationDto {
  name: string
  type: string
  projectId: number
  parentId?: number | null
}

const getAuthHeaders = () => {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const locationService = {
  getByProject: async (projectId: number): Promise<Location[]> => {
    const res = await fetch(`${API_BASE}/location/project/${projectId}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<Location[]>(res)
  },

  getTree: async (projectId: number): Promise<Location[]> => {
    const res = await fetch(`${API_BASE}/location/project/${projectId}/tree`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<Location[]>(res)
  },

  getById: async (locationId: number): Promise<Location> => {
    const res = await fetch(`${API_BASE}/location/${locationId}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<Location>(res)
  },

  getChildren: async (locationId: number): Promise<Location[]> => {
    const res = await fetch(`${API_BASE}/location/${locationId}/children`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<Location[]>(res)
  },

  create: async (data: CreateLocationDto): Promise<Location> => {
    const res = await fetch(`${API_BASE}/location`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Location>(res)
  },

  delete: async (locationId: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/location/${locationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `HTTP ${res.status}`)
    }
  },
}