import apiClient from '../client'
import type {
  Quote,
  QuoteTemplate,
  QuoteItem,
  Signature,
  CreateQuoteData,
  UpdateQuoteData,
  CreateQuoteItemData,
  SignQuoteData,
  PaginatedResponse,
} from '../../types'

export const quotesAPI = {
  // Templates
  getTemplates: async (): Promise<QuoteTemplate[]> => {
    const response = await apiClient.get('/quotes/templates/')
    return response.data
  },

  getTemplate: async (id: string): Promise<QuoteTemplate> => {
    const response = await apiClient.get(`/quotes/templates/${id}/`)
    return response.data
  },

  createTemplate: async (data: Partial<QuoteTemplate>): Promise<QuoteTemplate> => {
    const response = await apiClient.post('/quotes/templates/', data)
    return response.data
  },

  updateTemplate: async (id: string, data: Partial<QuoteTemplate>): Promise<QuoteTemplate> => {
    const response = await apiClient.patch(`/quotes/templates/${id}/`, data)
    return response.data
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/quotes/templates/${id}/`)
  },

  setDefaultTemplate: async (id: string): Promise<QuoteTemplate> => {
    const response = await apiClient.post(`/quotes/templates/${id}/set_default/`)
    return response.data
  },

  // Quotes
  getQuotes: async (params?: {
    status?: string
    order?: string
    page?: number
  }): Promise<PaginatedResponse<Quote>> => {
    const response = await apiClient.get('/quotes/quotes/', { params })
    return response.data
  },

  getQuote: async (id: string): Promise<Quote> => {
    const response = await apiClient.get(`/quotes/quotes/${id}/`)
    return response.data
  },

  createQuote: async (data: CreateQuoteData): Promise<Quote> => {
    const response = await apiClient.post('/quotes/quotes/', data)
    return response.data
  },

  updateQuote: async (id: string, data: UpdateQuoteData): Promise<Quote> => {
    const response = await apiClient.patch(`/quotes/quotes/${id}/`, data)
    return response.data
  },

  deleteQuote: async (id: string): Promise<void> => {
    await apiClient.delete(`/quotes/quotes/${id}/`)
  },

  generatePDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.post(`/quotes/quotes/${id}/generate_pdf/`, null, {
      responseType: 'blob',
    })
    return response.data
  },

  sendQuote: async (id: string): Promise<Quote> => {
    const response = await apiClient.post(`/quotes/quotes/${id}/send/`)
    return response.data
  },

  createFromOrder: async (orderId: string, templateId?: string): Promise<Quote> => {
    const response = await apiClient.post('/quotes/quotes/from_order/', {
      order_id: orderId,
      template_id: templateId,
    })
    return response.data
  },

  // Quote Items
  getQuoteItems: async (quoteId: string): Promise<QuoteItem[]> => {
    const response = await apiClient.get(`/quotes/quotes/${quoteId}/items/`)
    return response.data
  },

  addQuoteItem: async (quoteId: string, data: CreateQuoteItemData): Promise<QuoteItem> => {
    const response = await apiClient.post(`/quotes/quotes/${quoteId}/items/`, data)
    return response.data
  },

  updateQuoteItem: async (
    quoteId: string,
    itemId: string,
    data: Partial<CreateQuoteItemData>
  ): Promise<QuoteItem> => {
    const response = await apiClient.patch(`/quotes/quotes/${quoteId}/items/${itemId}/`, data)
    return response.data
  },

  deleteQuoteItem: async (quoteId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/quotes/quotes/${quoteId}/items/${itemId}/`)
  },

  // Public Quote (for customers)
  getPublicQuote: async (token: string): Promise<Quote> => {
    const response = await apiClient.get(`/quotes/public/${token}/`)
    return response.data
  },

  signQuote: async (token: string, data: SignQuoteData): Promise<{ message: string; signature: Signature }> => {
    const response = await apiClient.post(`/quotes/public/${token}/sign/`, data)
    return response.data
  },

  downloadPublicPDF: async (token: string): Promise<Blob> => {
    const response = await apiClient.get(`/quotes/public/${token}/pdf/`, {
      responseType: 'blob',
    })
    return response.data
  },
}
