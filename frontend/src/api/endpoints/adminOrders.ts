import apiClient from '../client'
import type { Order } from '../../types/orders'

export interface AdminOrderListItem {
  id: string
  status: string
  customer_name: string
  customer_email: string
  mover_name: string | null
  origin_city: string
  destination_city: string
  date_flexibility: string
  preferred_date: string | null
  preferred_date_end: string | null
  preferred_date_display: string | null
  preferred_time_slot: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  total_price: number
  items_count: number
  created_at: string
}

export interface AdminOrdersResponse {
  count: number
  next: string | null
  previous: string | null
  results: AdminOrderListItem[]
}

export const adminOrdersAPI = {
  list: async (params?: {
    status?: string
    search?: string
    page?: number
  }): Promise<AdminOrdersResponse> => {
    const response = await apiClient.get('/orders/admin/', { params })
    // Handle both paginated and non-paginated responses
    if (response.data.results) {
      return response.data
    }
    return {
      count: response.data.length,
      next: null,
      previous: null,
      results: response.data,
    }
  },

  detail: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/admin/${id}/`)
    return response.data
  },
}
