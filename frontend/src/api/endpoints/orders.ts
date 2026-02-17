import apiClient from '../client'
import type {
  Order,
  OrderItem,
  OrderImage,
  ItemCategory,
  ItemType,
  CreateOrderData,
  UpdateOrderData,
  AddOrderItemData,
  AIParseResult,
  PaginatedResponse,
  VariantQuestion,
  VariantResolutionRequest,
  VariantResolutionResponse,
  CustomItemData,
} from '../../types'

export const ordersAPI = {
  // Item Categories & Types
  getCategories: async (): Promise<ItemCategory[]> => {
    const response = await apiClient.get('/movers/categories/')
    return response.data
  },

  getItemTypes: async (categoryId?: string): Promise<ItemType[]> => {
    const params = categoryId ? { category: categoryId } : {}
    const response = await apiClient.get('/movers/item-types/', { params })
    return response.data
  },

  getItemType: async (id: string): Promise<ItemType> => {
    const response = await apiClient.get(`/movers/item-types/${id}/`)
    return response.data
  },

  // Orders
  getOrders: async (params?: {
    status?: string
    customer?: string
    start_date?: string
    end_date?: string
    page?: number
  }): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/orders/', { params })
    return response.data
  },

  getMoverOrders: async (params?: {
    status?: string
    page?: number
  }): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/orders/mover/', { params })
    return response.data
  },

  getAvailableOrders: async (params?: {
    origin_city?: string
    destination_city?: string
    page?: number
  }): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/orders/available/', { params })
    return response.data
  },

  claimOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${orderId}/claim/`)
    return response.data
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}/`)
    return response.data
  },

  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post('/orders/create/', data)
    return response.data
  },

  updateOrder: async (id: string, data: UpdateOrderData): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/`, data)
    return response.data
  },

  deleteOrder: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}/`)
  },

  // Order Status Actions
  submitOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${id}/submit/`)
    return response.data
  },

  approveOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${id}/approve/`)
    return response.data
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${id}/cancel/`, { reason })
    return response.data
  },

  completeOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${id}/complete/`)
    return response.data
  },

  // Order Items
  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    const response = await apiClient.get(`/orders/${orderId}/items/`)
    return response.data
  },

  addOrderItem: async (orderId: string, data: AddOrderItemData): Promise<OrderItem> => {
    const response = await apiClient.post(`/orders/${orderId}/items/`, data)
    return response.data
  },

  updateOrderItem: async (
    orderId: string,
    itemId: string,
    data: Partial<AddOrderItemData>
  ): Promise<OrderItem> => {
    const response = await apiClient.patch(`/orders/${orderId}/items/${itemId}/`, data)
    return response.data
  },

  deleteOrderItem: async (orderId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/orders/${orderId}/items/${itemId}/`)
  },

  // Order Images
  uploadImage: async (orderId: string, file: File, description?: string): Promise<OrderImage> => {
    const formData = new FormData()
    formData.append('image', file)
    if (description) {
      formData.append('description', description)
    }
    const response = await apiClient.post(`/orders/${orderId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteImage: async (orderId: string, imageId: string): Promise<void> => {
    await apiClient.delete(`/orders/${orderId}/images/${imageId}/`)
  },

  analyzeImage: async (orderId: string, imageId: string): Promise<OrderImage> => {
    const response = await apiClient.post(`/orders/${orderId}/images/${imageId}/analyze/`)
    return response.data
  },

  // AI Features
  parseDescription: async (_orderId: string, description: string): Promise<AIParseResult> => {
    const response = await apiClient.post('/ai/parse-description/', {
      description,
      language: 'he'
    })
    return response.data
  },

  answerClarification: async (
    orderId: string,
    conversationId: string,
    answer: string
  ): Promise<AIParseResult> => {
    const response = await apiClient.post(`/orders/${orderId}/clarify/`, {
      conversation_id: conversationId,
      answer,
    })
    return response.data
  },

  recalculatePrice: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${orderId}/recalculate/`)
    return response.data
  },

  // Customer Portal
  getOrderStatus: async (orderId: string, verificationCode: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/status/${orderId}/`, {
      params: { code: verificationCode },
    })
    return response.data
  },

  // Item Variants
  getVariantQuestions: async (
    itemTypeId: string,
    language?: string
  ): Promise<{ item_type_id: string; questions: VariantQuestion[] }> => {
    const response = await apiClient.get(`/ai/item-variants/${itemTypeId}/questions/`, {
      params: { language },
    })
    return response.data
  },

  getVariants: async (
    itemTypeId: string,
    language?: string
  ): Promise<{ item_type_id: string; variants: ItemType[] }> => {
    const response = await apiClient.get(`/ai/item-variants/${itemTypeId}/variants/`, {
      params: { language },
    })
    return response.data
  },

  getGenericItems: async (
    categoryId?: string,
    language?: string
  ): Promise<{ items: ItemType[] }> => {
    const response = await apiClient.get('/ai/item-variants/generic/', {
      params: { category_id: categoryId, language },
    })
    return response.data
  },

  resolveVariant: async (data: VariantResolutionRequest): Promise<VariantResolutionResponse> => {
    const response = await apiClient.post('/ai/item-variants/resolve/', data)
    return response.data
  },

  createCustomItem: async (data: CustomItemData): Promise<{ success: boolean; item: ItemType }> => {
    const response = await apiClient.post('/ai/item-variants/custom/', data)
    return response.data
  },
}
