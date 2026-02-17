import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comparisonsAPI } from '../endpoints/comparisons'
import type { SelectMoverRequest } from '../../types'
import { orderKeys } from './useOrders'

export const comparisonKeys = {
  all: ['comparisons'] as const,
  detail: (orderId: string) => [...comparisonKeys.all, orderId] as const,
}

export function useComparison(orderId: string) {
  return useQuery({
    queryKey: comparisonKeys.detail(orderId),
    queryFn: () => comparisonsAPI.getComparison(orderId),
    enabled: !!orderId,
    refetchInterval: (query) => {
      // Poll every 3s while status is 'generating'
      const data = query.state.data
      if (data && data.status === 'generating') {
        return 3000
      }
      return false
    },
  })
}

export function useGenerateComparison() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => comparisonsAPI.generateComparison(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: comparisonKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useSelectMover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: SelectMoverRequest }) =>
      comparisonsAPI.selectMover(orderId, data),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: comparisonKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useRequestManualQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => comparisonsAPI.requestManualQuote(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
