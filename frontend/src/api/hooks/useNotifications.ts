import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { notificationsAPI } from '../endpoints/notifications'
import type { UpdatePreferencesData, NotificationPreference } from '../../types'

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  types: () => [...notificationKeys.all, 'types'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...notificationKeys.lists(), params] as const,
  detail: (id: string) => [...notificationKeys.all, id] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// Notification Types Hook
export function useNotificationTypes() {
  return useQuery({
    queryKey: notificationKeys.types(),
    queryFn: notificationsAPI.getNotificationTypes,
  })
}

// Preferences Hooks
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: notificationsAPI.getPreferences,
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePreferencesData) => notificationsAPI.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}

export function useUpdatePreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ typeId, data }: { typeId: string; data: Partial<NotificationPreference> }) =>
      notificationsAPI.updatePreference(typeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}

// Notifications Hooks
export function useNotifications(params?: {
  category?: string
  is_read?: boolean
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: notificationKeys.list(params || {}),
    queryFn: () => notificationsAPI.getNotifications(params),
  })
}

export function useInfiniteNotifications(params?: {
  category?: string
  is_read?: boolean
  page_size?: number
}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list({ ...params, infinite: true }),
    queryFn: ({ pageParam = 1 }) =>
      notificationsAPI.getNotifications({ ...params, page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
  })
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsAPI.getNotification(id),
    enabled: !!id,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category?: string) => notificationsAPI.markAllAsRead(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsAPI.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

export function useDeleteAllReadNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsAPI.deleteAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
    },
  })
}

// Stats Hooks
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: notificationsAPI.getStats,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsAPI.getUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
