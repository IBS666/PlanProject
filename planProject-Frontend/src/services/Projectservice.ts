import { getToken } from '../utils/tokenUtils'

const API_URL = 'http://localhost:5279/api'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
})

export interface Project {
  id: number
  name: string
  description: string
  status: string
  createdAt: string
}

export interface CreateProjectDto {
  name: string
  description: string
  status: string
}

export interface UpdateProjectDto {
  name: string
  description: string
  status: string
}

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    const res = await fetch(`${API_URL}/project`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Impossible de charger les projets')
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/project/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('Erreur lors de la suppression')
  },

  update: async (id: number, data: UpdateProjectDto): Promise<void> => {
    const res = await fetch(`${API_URL}/project/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erreur lors de la modification')
  },

  create: async (data: CreateProjectDto): Promise<void> => {
    const res = await fetch(`${API_URL}/project`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Erreur lors de l'ajout du projet")
  },
}