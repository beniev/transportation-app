import { useQuery, useMutation } from '@tanstack/react-query'
import { analyticsAPI } from '../endpoints/analytics'
import type { DateRangeParams, ExportOptions } from '../../types'

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (params?: DateRangeParams) => [...analyticsKeys.all, 'dashboard', params] as const,
  revenue: (params: Record<string, unknown>) => [...analyticsKeys.all, 'revenue', params] as const,
  orderStats: (params?: DateRangeParams) => [...analyticsKeys.all, 'order-stats', params] as const,
  customerStats: (params?: DateRangeParams) =>
    [...analyticsKeys.all, 'customer-stats', params] as const,
  popularItems: (params?: Record<string, unknown>) =>
    [...analyticsKeys.all, 'popular-items', params] as const,
  daily: (params?: Record<string, unknown>) => [...analyticsKeys.all, 'daily', params] as const,
  monthly: (params?: Record<string, unknown>) => [...analyticsKeys.all, 'monthly', params] as const,
  comparison: (params?: Record<string, unknown>) =>
    [...analyticsKeys.all, 'comparison', params] as const,
  quickStats: () => [...analyticsKeys.all, 'quick-stats'] as const,
}

// Dashboard Hook
export function useDashboard(params?: DateRangeParams) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(params),
    queryFn: () => analyticsAPI.getDashboard(params),
  })
}

// Revenue Hook
export function useRevenue(
  params: DateRangeParams & { granularity?: 'daily' | 'weekly' | 'monthly' }
) {
  return useQuery({
    queryKey: analyticsKeys.revenue(params as unknown as Record<string, unknown>),
    queryFn: () => analyticsAPI.getRevenue(params),
    enabled: !!(params.start_date && params.end_date) || !!params.days,
  })
}

// Order Statistics Hook
export function useOrderStats(params?: DateRangeParams) {
  return useQuery({
    queryKey: analyticsKeys.orderStats(params),
    queryFn: () => analyticsAPI.getOrderStats(params),
  })
}

// Customer Statistics Hook
export function useCustomerStats(params?: DateRangeParams) {
  return useQuery({
    queryKey: analyticsKeys.customerStats(params),
    queryFn: () => analyticsAPI.getCustomerStats(params),
  })
}

// Popular Items Hook
export function usePopularItems(params?: DateRangeParams & { limit?: number }) {
  return useQuery({
    queryKey: analyticsKeys.popularItems(params as unknown as Record<string, unknown>),
    queryFn: () => analyticsAPI.getPopularItems(params),
  })
}

// Daily Analytics Hook
export function useDailyAnalytics(params?: {
  start_date?: string
  end_date?: string
  page?: number
}) {
  return useQuery({
    queryKey: analyticsKeys.daily(params),
    queryFn: () => analyticsAPI.getDailyAnalytics(params),
  })
}

// Monthly Analytics Hook
export function useMonthlyAnalytics(params?: { year?: number; page?: number }) {
  return useQuery({
    queryKey: analyticsKeys.monthly(params),
    queryFn: () => analyticsAPI.getMonthlyAnalytics(params),
  })
}

// Aggregate Monthly Hook
export function useAggregateMonthly() {
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      analyticsAPI.aggregateMonthly(year, month),
  })
}

// Comparison Hook
export function useComparison(params?: {
  current_start?: string
  current_end?: string
  previous_start?: string
  previous_end?: string
}) {
  return useQuery({
    queryKey: analyticsKeys.comparison(params),
    queryFn: () => analyticsAPI.getComparison(params),
  })
}

// Export Hook
export function useExportAnalytics() {
  return useMutation({
    mutationFn: (options: ExportOptions) => analyticsAPI.exportData(options),
  })
}

// Quick Stats Hook
export function useQuickStats() {
  return useQuery({
    queryKey: analyticsKeys.quickStats(),
    queryFn: analyticsAPI.getQuickStats,
    refetchInterval: 60000, // Refetch every minute
  })
}
