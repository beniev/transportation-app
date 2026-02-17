import apiClient from '../client'
import type {
  PricingFactors,
  MoverItemPricing,
  ItemTypeWithPricing,
  CreateMoverPricingData,
  UpdateMoverPricingData,
  PricingCategory,
} from '../../types/pricing'

export const pricingAPI = {
  // Pricing Factors (global settings per mover)
  getPricingFactors: async (): Promise<PricingFactors> => {
    const response = await apiClient.get('/movers/pricing-factors/')
    return response.data
  },

  updatePricingFactors: async (data: Partial<PricingFactors>): Promise<PricingFactors> => {
    const response = await apiClient.patch('/movers/pricing-factors/', data)
    return response.data
  },

  // Item types with mover's effective pricing
  getMoverItemTypes: async (params?: { category?: string }): Promise<ItemTypeWithPricing[]> => {
    const response = await apiClient.get('/movers/my-item-types/', { params })
    // Handle paginated or array response
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  // Mover's custom pricing records
  getMoverPricing: async (): Promise<MoverItemPricing[]> => {
    const response = await apiClient.get('/movers/pricing/')
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  createMoverPricing: async (data: CreateMoverPricingData): Promise<MoverItemPricing> => {
    const response = await apiClient.post('/movers/pricing/create/', data)
    return response.data
  },

  updateMoverPricing: async (id: string, data: UpdateMoverPricingData): Promise<MoverItemPricing> => {
    const response = await apiClient.patch(`/movers/pricing/${id}/`, data)
    return response.data
  },

  deleteMoverPricing: async (id: string): Promise<void> => {
    await apiClient.delete(`/movers/pricing/${id}/`)
  },

  // Categories
  getCategories: async (): Promise<PricingCategory[]> => {
    const response = await apiClient.get('/movers/categories/')
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },
}
