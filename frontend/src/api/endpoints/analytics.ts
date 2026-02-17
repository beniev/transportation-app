import apiClient from '../client'
import type {
  DashboardSummary,
  RevenueChartData,
  OrderStatistics,
  CustomerStatistics,
  PopularItem,
  DailyAnalytics,
  MonthlyAnalytics,
  ComparisonData,
  DateRangeParams,
  ExportOptions,
  PaginatedResponse,
} from '../../types'

export const analyticsAPI = {
  // Dashboard
  getDashboard: async (params?: DateRangeParams): Promise<DashboardSummary> => {
    const response = await apiClient.get('/analytics/dashboard/', { params })
    return response.data
  },

  // Revenue
  getRevenue: async (params: DateRangeParams & {
    granularity?: 'daily' | 'weekly' | 'monthly'
  }): Promise<{
    period: { start: string; end: string; granularity: string }
    data: RevenueChartData[]
    totals: { revenue: number; orders: number }
  }> => {
    const response = await apiClient.get('/analytics/revenue/', { params })
    return response.data
  },

  // Order Statistics
  getOrderStats: async (params?: DateRangeParams): Promise<OrderStatistics> => {
    const response = await apiClient.get('/analytics/orders/', { params })
    return response.data
  },

  // Customer Statistics
  getCustomerStats: async (params?: DateRangeParams): Promise<CustomerStatistics> => {
    const response = await apiClient.get('/analytics/customers/', { params })
    return response.data
  },

  // Popular Items
  getPopularItems: async (params?: DateRangeParams & {
    limit?: number
  }): Promise<{
    period: { start: string; end: string }
    items: PopularItem[]
  }> => {
    const response = await apiClient.get('/analytics/popular-items/', { params })
    return response.data
  },

  // Daily Analytics
  getDailyAnalytics: async (params?: {
    start_date?: string
    end_date?: string
    page?: number
  }): Promise<PaginatedResponse<DailyAnalytics>> => {
    const response = await apiClient.get('/analytics/daily/', { params })
    return response.data
  },

  // Monthly Analytics
  getMonthlyAnalytics: async (params?: {
    year?: number
    page?: number
  }): Promise<PaginatedResponse<MonthlyAnalytics>> => {
    const response = await apiClient.get('/analytics/monthly/', { params })
    return response.data
  },

  aggregateMonthly: async (year: number, month: number): Promise<MonthlyAnalytics> => {
    const response = await apiClient.post('/analytics/monthly/aggregate/', { year, month })
    return response.data
  },

  // Comparison
  getComparison: async (params?: {
    current_start?: string
    current_end?: string
    previous_start?: string
    previous_end?: string
  }): Promise<ComparisonData> => {
    const response = await apiClient.get('/analytics/compare/', { params })
    return response.data
  },

  // Export
  exportData: async (options: ExportOptions): Promise<Blob> => {
    const response = await apiClient.get('/analytics/export/', {
      params: options,
      responseType: 'blob',
    })
    return response.data
  },

  // Quick Stats (for widgets)
  getQuickStats: async (): Promise<{
    today_orders: number
    today_revenue: number
    pending_quotes: number
    upcoming_bookings: number
  }> => {
    const response = await apiClient.get('/analytics/quick-stats/')
    return response.data
  },
}
