import apiClient from '../client'
import type {
  NotificationType,
  NotificationPreference,
  Notification,
  UpdatePreferencesData,
  NotificationStats,
  PaginatedResponse,
} from '../../types'

export const notificationsAPI = {
  // Notification Types
  getNotificationTypes: async (): Promise<NotificationType[]> => {
    const response = await apiClient.get('/notifications/types/')
    return response.data
  },

  // Preferences
  getPreferences: async (): Promise<NotificationPreference[]> => {
    const response = await apiClient.get('/notifications/preferences/')
    return response.data
  },

  updatePreferences: async (data: UpdatePreferencesData): Promise<NotificationPreference[]> => {
    const response = await apiClient.put('/notifications/preferences/', data)
    return response.data
  },

  updatePreference: async (
    typeId: string,
    data: Partial<NotificationPreference>
  ): Promise<NotificationPreference> => {
    const response = await apiClient.patch(`/notifications/preferences/${typeId}/`, data)
    return response.data
  },

  // Notifications
  getNotifications: async (params?: {
    category?: string
    is_read?: boolean
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get('/notifications/', { params })
    return response.data
  },

  getNotification: async (id: string): Promise<Notification> => {
    const response = await apiClient.get(`/notifications/${id}/`)
    return response.data
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.post(`/notifications/${id}/mark_read/`)
    return response.data
  },

  markAllAsRead: async (category?: string): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/notifications/mark_all_read/', { category })
    return response.data
  },

  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}/`)
  },

  deleteAllRead: async (): Promise<{ message: string; count: number }> => {
    const response = await apiClient.delete('/notifications/delete_read/')
    return response.data
  },

  // Stats
  getStats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get('/notifications/stats/')
    return response.data
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread_count/')
    return response.data
  },

  // Test Notifications (dev only)
  sendTestEmail: async (templateName: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/notifications/test/email/', {
      template: templateName,
    })
    return response.data
  },

  sendTestSMS: async (message: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/notifications/test/sms/', { message })
    return response.data
  },
}
