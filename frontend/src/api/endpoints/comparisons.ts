import apiClient from '../client'
import type {
  OrderComparison,
  SelectMoverRequest,
} from '../../types'
import type { Order } from '../../types'

export const comparisonsAPI = {
  getComparison: async (orderId: string): Promise<OrderComparison> => {
    const response = await apiClient.get(`/orders/${orderId}/comparison/`)
    return response.data
  },

  generateComparison: async (orderId: string): Promise<OrderComparison> => {
    const response = await apiClient.post(`/orders/${orderId}/comparison/generate/`)
    return response.data
  },

  selectMover: async (orderId: string, data: SelectMoverRequest): Promise<Order> => {
    const response = await apiClient.post(`/orders/${orderId}/comparison/select/`, data)
    return response.data
  },

  requestManualQuote: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${orderId}/comparison/manual/`)
    return response.data
  },
}
