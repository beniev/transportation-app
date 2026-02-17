import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsAPI } from '../endpoints/payments'
import type { CreateSubscriptionData, ChangeSubscriptionData } from '../../types'

// Query Keys
export const paymentKeys = {
  all: ['payments'] as const,
  plans: () => [...paymentKeys.all, 'plans'] as const,
  plan: (id: string) => [...paymentKeys.plans(), id] as const,
  plansComparison: () => [...paymentKeys.plans(), 'comparison'] as const,
  subscription: () => [...paymentKeys.all, 'subscription'] as const,
  usage: () => [...paymentKeys.subscription(), 'usage'] as const,
  methods: () => [...paymentKeys.all, 'methods'] as const,
  history: () => [...paymentKeys.all, 'history'] as const,
  historyList: (params: Record<string, unknown>) => [...paymentKeys.history(), params] as const,
  payment: (id: string) => [...paymentKeys.history(), id] as const,
  invoices: () => [...paymentKeys.all, 'invoices'] as const,
  invoicesList: (params: Record<string, unknown>) => [...paymentKeys.invoices(), params] as const,
}

// Plans Hooks
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: paymentKeys.plans(),
    queryFn: paymentsAPI.getPlans,
  })
}

export function useSubscriptionPlan(id: string) {
  return useQuery({
    queryKey: paymentKeys.plan(id),
    queryFn: () => paymentsAPI.getPlan(id),
    enabled: !!id,
  })
}

export function usePlansComparison() {
  return useQuery({
    queryKey: paymentKeys.plansComparison(),
    queryFn: paymentsAPI.comparePlans,
  })
}

// Subscription Hooks
export function useSubscription() {
  return useQuery({
    queryKey: paymentKeys.subscription(),
    queryFn: paymentsAPI.getSubscription,
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSubscriptionData) => paymentsAPI.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.usage() })
    },
  })
}

export function useChangeSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ChangeSubscriptionData) => paymentsAPI.changeSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.usage() })
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (atPeriodEnd?: boolean) => paymentsAPI.cancelSubscription(atPeriodEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.subscription() })
    },
  })
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => paymentsAPI.reactivateSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.subscription() })
    },
  })
}

export function useUsageStats() {
  return useQuery({
    queryKey: paymentKeys.usage(),
    queryFn: paymentsAPI.getUsage,
  })
}

// Payment Methods Hooks
export function usePaymentMethods() {
  return useQuery({
    queryKey: paymentKeys.methods(),
    queryFn: paymentsAPI.getPaymentMethods,
  })
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { payment_method_id: string; set_default?: boolean }) =>
      paymentsAPI.addPaymentMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.methods() })
    },
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsAPI.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.methods() })
    },
  })
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsAPI.setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.methods() })
    },
  })
}

export function useSetupIntent() {
  return useMutation({
    mutationFn: () => paymentsAPI.getSetupIntent(),
  })
}

// Payments History Hooks
export function usePaymentsHistory(params?: {
  status?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  return useQuery({
    queryKey: paymentKeys.historyList(params || {}),
    queryFn: () => paymentsAPI.getPayments(params),
  })
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.payment(id),
    queryFn: () => paymentsAPI.getPayment(id),
    enabled: !!id,
  })
}

export function useRetryPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsAPI.retryPayment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.payment(id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.history() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.subscription() })
    },
  })
}

// Invoices Hooks
export function useInvoices(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: paymentKeys.invoicesList(params || {}),
    queryFn: () => paymentsAPI.getInvoices(params),
  })
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: (id: string) => paymentsAPI.downloadInvoice(id),
  })
}

// Coupon Hooks
export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({ code, planId }: { code: string; planId?: string }) =>
      paymentsAPI.validateCoupon(code, planId),
  })
}

// Payment Intent Hook
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (data: { amount: number; currency?: string }) =>
      paymentsAPI.createPaymentIntent(data),
  })
}
