import apiClient from '../client'

export interface Review {
  id: string
  order: string
  customer: string
  customer_name: string
  mover: string
  rating: number
  text: string
  created_at: string
}

export const reviewsAPI = {
  create: async (orderId: string, rating: number, text: string = ''): Promise<Review> => {
    const response = await apiClient.post(`/orders/${orderId}/review/`, { rating, text })
    return response.data
  },

  getForOrder: async (orderId: string): Promise<Review> => {
    const response = await apiClient.get(`/orders/${orderId}/review/`)
    return response.data
  },

  listForMover: async (moverId: string): Promise<Review[]> => {
    const response = await apiClient.get(`/orders/mover/${moverId}/reviews/`)
    return response.data
  },
}
