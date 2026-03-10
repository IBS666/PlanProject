import { getToken } from '../utils/tokenUtils'

const API_URL = 'http://localhost:5279/api'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
})

export interface User {
  id: number
  name: string
  email: string
  role: string | { name: string }
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Impossible de charger les utilisateurs')
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('Erreur lors de la suppression')
  },

  update: async (id: number, data: { name: string; email: string }): Promise<void> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Erreur lors de la modification')
  },

  updateRole: async (id: number, role: string): Promise<void> => {
    const res = await fetch(`${API_URL}/users/${id}/role`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    })
    if (!res.ok) throw new Error('Erreur lors de la modification du rôle')
  },

  create: async (data: { name: string; email: string; password: string; role: string }): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Erreur lors de l'ajout")
  },
}
