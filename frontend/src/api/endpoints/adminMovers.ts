import apiClient from '../client'

export interface AdminMoverProfile {
  id: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
  }
  email: string
  phone: string
  full_name: string
  company_name: string
  company_name_he: string
  license_number: string
  tax_id: string
  address: string
  city: string
  website: string
  facebook_url: string
  description: string
  description_he: string
  logo: string | null
  is_verified: boolean
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejection_reason: string
  verified_at: string | null
  rating: number
  total_reviews: number
  completed_orders: number
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export const adminMoversAPI = {
  list: async (statusFilter?: string): Promise<AdminMoverProfile[]> => {
    const params = statusFilter ? { status: statusFilter } : {}
    const response = await apiClient.get('/auth/admin/movers/', { params })
    return response.data
  },

  detail: async (id: string): Promise<AdminMoverProfile> => {
    const response = await apiClient.get(`/auth/admin/movers/${id}/`)
    return response.data
  },

  approve: async (id: string): Promise<AdminMoverProfile> => {
    const response = await apiClient.post(`/auth/admin/movers/${id}/approve/`)
    return response.data
  },

  reject: async (id: string, reason: string): Promise<AdminMoverProfile> => {
    const response = await apiClient.post(`/auth/admin/movers/${id}/reject/`, {
      rejection_reason: reason,
    })
    return response.data
  },

  suspend: async (id: string, reason: string): Promise<AdminMoverProfile> => {
    const response = await apiClient.post(`/auth/admin/movers/${id}/suspend/`, {
      rejection_reason: reason,
    })
    return response.data
  },
}
