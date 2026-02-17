import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pricingAPI } from '../endpoints/pricing'
import type {
  PricingFactors,
  CreateMoverPricingData,
  UpdateMoverPricingData,
} from '../../types/pricing'

// Query key factory
export const pricingKeys = {
  all: ['pricing'] as const,
  factors: () => [...pricingKeys.all, 'factors'] as const,
  items: (categoryId?: string) => [...pricingKeys.all, 'items', categoryId] as const,
  pricing: () => [...pricingKeys.all, 'moverPricing'] as const,
  categories: () => [...pricingKeys.all, 'categories'] as const,
}

// ===== Pricing Factors =====

export function usePricingFactors() {
  return useQuery({
    queryKey: pricingKeys.factors(),
    queryFn: pricingAPI.getPricingFactors,
  })
}

export function useUpdatePricingFactors() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PricingFactors>) => pricingAPI.updatePricingFactors(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.factors() })
    },
  })
}

// ===== Item Types with Pricing =====

export function useMoverItemTypes(categoryId?: string) {
  return useQuery({
    queryKey: pricingKeys.items(categoryId),
    queryFn: () => pricingAPI.getMoverItemTypes(categoryId ? { category: categoryId } : undefined),
  })
}

// ===== Categories =====

export function usePricingCategories() {
  return useQuery({
    queryKey: pricingKeys.categories(),
    queryFn: pricingAPI.getCategories,
  })
}

// ===== Mover Pricing CRUD =====

export function useCreateMoverPricing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMoverPricingData) => pricingAPI.createMoverPricing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.items() })
      queryClient.invalidateQueries({ queryKey: pricingKeys.pricing() })
    },
  })
}

export function useUpdateMoverPricing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMoverPricingData }) =>
      pricingAPI.updateMoverPricing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.items() })
      queryClient.invalidateQueries({ queryKey: pricingKeys.pricing() })
    },
  })
}

export function useDeleteMoverPricing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pricingAPI.deleteMoverPricing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.items() })
      queryClient.invalidateQueries({ queryKey: pricingKeys.pricing() })
    },
  })
}
