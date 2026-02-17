import apiClient from '../client'

export interface AdminItemType {
  id: string
  name_en: string
  name_he: string
  description_en: string
  description_he: string
  category: string
  category_name: string
  category_name_he: string
  icon: string
  default_base_price: string
  default_assembly_price: string
  default_disassembly_price: string
  default_special_handling_price: string
  requires_assembly: boolean
  requires_special_handling: boolean
  is_fragile: boolean
  weight_class: string
  average_dimensions: Record<string, number> | null
  display_order: number
  is_active: boolean
  parent_type: string | null
  attribute_values: Record<string, string> | null
  is_generic: boolean
  is_custom: boolean
  variants: AdminItemTypeVariant[]
  variant_count: number
}

export interface AdminItemTypeVariant {
  id: string
  name_en: string
  name_he: string
  attribute_values: Record<string, string> | null
  default_base_price: string
  weight_class: string
  is_active: boolean
}

export interface AdminCategory {
  id: string
  name_en: string
  name_he: string
  description_en: string
  description_he: string
  icon: string
  parent: string | null
  display_order: number
  is_active: boolean
  item_count: number
  generic_count: number
  variant_count: number
}

export interface AdminAttribute {
  id: string
  code: string
  name_en: string
  name_he: string
  input_type: string
  question_en: string
  question_he: string
  display_order: number
  options: {
    id: string
    value: string
    name_en: string
    name_he: string
    display_order: number
  }[]
}

export interface AdminSuggestion {
  id: string
  name_en: string
  name_he: string
  description_en: string
  description_he: string
  category: string
  category_name: string
  category_name_he: string
  suggested_price: string
  weight_class: string
  requires_assembly: boolean
  is_fragile: boolean
  status: 'pending' | 'approved' | 'rejected'
  source: 'mover' | 'auto'
  occurrence_count: number
  suggested_by: string | null
  suggested_by_name: string | null
  admin_notes: string
  created_item: string | null
  created_at: string
  updated_at: string
}

export interface ApproveSuggestionData {
  default_base_price?: string
  weight_class?: string
  admin_notes?: string
}

export interface CatalogStats {
  total_items: number
  total_variants: number
  total_categories: number
  generic_items: number
}

export interface CreateItemTypeData {
  name_en: string
  name_he: string
  category: string
  is_generic?: boolean
  is_custom?: boolean
  parent_type?: string | null
  attribute_values?: Record<string, string> | null
  weight_class: string
  requires_assembly: boolean
  requires_special_handling?: boolean
  is_fragile: boolean
  default_base_price: string
  default_assembly_price?: string
  default_disassembly_price?: string
  default_special_handling_price?: string
}

export const adminAPI = {
  getCatalogStats: async (): Promise<CatalogStats> => {
    const response = await apiClient.get('/movers/admin/stats/')
    return response.data
  },

  getItemTypes: async (params?: { category?: string; is_generic?: boolean }): Promise<AdminItemType[]> => {
    const response = await apiClient.get('/movers/admin/item-types/', { params })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  getItemType: async (id: string): Promise<AdminItemType> => {
    const response = await apiClient.get(`/movers/admin/item-types/${id}/`)
    return response.data
  },

  createItemType: async (data: CreateItemTypeData): Promise<AdminItemType> => {
    const response = await apiClient.post('/movers/admin/item-types/', data)
    return response.data
  },

  updateItemType: async (id: string, data: Partial<CreateItemTypeData>): Promise<AdminItemType> => {
    const response = await apiClient.patch(`/movers/admin/item-types/${id}/`, data)
    return response.data
  },

  deleteItemType: async (id: string): Promise<void> => {
    await apiClient.delete(`/movers/admin/item-types/${id}/`)
  },

  getCategories: async (): Promise<AdminCategory[]> => {
    const response = await apiClient.get('/movers/admin/categories/')
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  createCategory: async (data: Partial<AdminCategory>): Promise<AdminCategory> => {
    const response = await apiClient.post('/movers/admin/categories/', data)
    return response.data
  },

  getAttributes: async (): Promise<AdminAttribute[]> => {
    const response = await apiClient.get('/movers/admin/attributes/')
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  // Suggestions
  getSuggestions: async (params?: { status?: string }): Promise<AdminSuggestion[]> => {
    const response = await apiClient.get('/movers/admin/suggestions/', { params })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  approveSuggestion: async (id: string, data?: ApproveSuggestionData): Promise<{ detail: string; item_id: string; suggestion: AdminSuggestion }> => {
    const response = await apiClient.post(`/movers/admin/suggestions/${id}/approve/`, data || {})
    return response.data
  },

  rejectSuggestion: async (id: string, data?: { admin_notes?: string }): Promise<{ detail: string; suggestion: AdminSuggestion }> => {
    const response = await apiClient.post(`/movers/admin/suggestions/${id}/reject/`, data || {})
    return response.data
  },
}
