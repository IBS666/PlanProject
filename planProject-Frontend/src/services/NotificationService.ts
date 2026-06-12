import { getToken } from '../utils/tokenUtils'

const BASE_URL = '/api'

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`
})

export interface UserNotification {
  id: number
  userId: number
  name: string
  type: string | null
  message: string | null
  relatedEntityType: string | null
  relatedEntityId: number | null
  isRead: boolean
  createdAt: string
}

export const notificationService = {
  getMyNotifications: async (): Promise<UserNotification[]> => {
    const res = await fetch(`${BASE_URL}/notification`, {
      headers: authHeaders()
    })
    if (!res.ok) throw new Error('Erreur chargement notifications')
    return res.json()
  },

  markAsRead: async (id: number): Promise<void> => {
    await fetch(`${BASE_URL}/notification/${id}/read`, {
      method: 'PUT',
      headers: authHeaders()
    })
  },

  markAllAsRead: async (): Promise<void> => {
    await fetch(`${BASE_URL}/notification/read-all`, {
      method: 'PUT',
      headers: authHeaders()
    })
  },

  deleteNotification: async (id: number): Promise<void> => {
    await fetch(`${BASE_URL}/notification/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
  }
}