import apiClient from '../client'
import type {
  SubscriptionPlan,
  Subscription,
  Payment,
  PaymentMethod,
  Coupon,
  CreateSubscriptionData,
  ChangeSubscriptionData,
  PaymentIntentData,
  InvoiceData,
  UsageStats,
  PaginatedResponse,
} from '../../types'

export const paymentsAPI = {
  // Subscription Plans
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/payments/plans/')
    return response.data
  },

  getPlan: async (id: string): Promise<SubscriptionPlan> => {
    const response = await apiClient.get(`/payments/plans/${id}/`)
    return response.data
  },

  comparePlans: async (): Promise<{
    plans: SubscriptionPlan[]
    features: { name: string; name_he: string; plans: Record<string, boolean | string> }[]
  }> => {
    const response = await apiClient.get('/payments/plans/compare/')
    return response.data
  },

  // Subscription
  getSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get('/payments/subscription/')
    return response.data
  },

  createSubscription: async (data: CreateSubscriptionData): Promise<Subscription> => {
    const response = await apiClient.post('/payments/subscription/', data)
    return response.data
  },

  changeSubscription: async (data: ChangeSubscriptionData): Promise<Subscription> => {
    const response = await apiClient.post('/payments/subscription/change/', data)
    return response.data
  },

  cancelSubscription: async (atPeriodEnd: boolean = true): Promise<Subscription> => {
    const response = await apiClient.post('/payments/subscription/cancel/', {
      at_period_end: atPeriodEnd,
    })
    return response.data
  },

  reactivateSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.post('/payments/subscription/reactivate/')
    return response.data
  },

  getUsage: async (): Promise<UsageStats> => {
    const response = await apiClient.get('/payments/subscription/usage/')
    return response.data
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/payments/methods/')
    return response.data
  },

  addPaymentMethod: async (data: {
    payment_method_id: string
    set_default?: boolean
  }): Promise<PaymentMethod> => {
    const response = await apiClient.post('/payments/methods/', data)
    return response.data
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/methods/${id}/`)
  },

  setDefaultPaymentMethod: async (id: string): Promise<PaymentMethod> => {
    const response = await apiClient.post(`/payments/methods/${id}/set_default/`)
    return response.data
  },

  getSetupIntent: async (): Promise<{ client_secret: string }> => {
    const response = await apiClient.post('/payments/methods/setup_intent/')
    return response.data
  },

  // Payments History
  getPayments: async (params?: {
    status?: string
    start_date?: string
    end_date?: string
    page?: number
  }): Promise<PaginatedResponse<Payment>> => {
    const response = await apiClient.get('/payments/history/', { params })
    return response.data
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/payments/history/${id}/`)
    return response.data
  },

  retryPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.post(`/payments/history/${id}/retry/`)
    return response.data
  },

  // Invoices
  getInvoices: async (params?: {
    status?: string
    page?: number
  }): Promise<PaginatedResponse<InvoiceData>> => {
    const response = await apiClient.get('/payments/invoices/', { params })
    return response.data
  },

  downloadInvoice: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/payments/invoices/${id}/download/`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Coupons
  validateCoupon: async (code: string, planId?: string): Promise<Coupon> => {
    const response = await apiClient.post('/payments/coupons/validate/', {
      code,
      plan_id: planId,
    })
    return response.data
  },

  // Payment Processing
  createPaymentIntent: async (data: {
    amount: number
    currency?: string
  }): Promise<PaymentIntentData> => {
    const response = await apiClient.post('/payments/create-intent/', data)
    return response.data
  },
}
