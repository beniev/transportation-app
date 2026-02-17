import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '../endpoints/admin'
import type { CreateItemTypeData, ApproveSuggestionData } from '../endpoints/admin'

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  attributes: () => [...adminKeys.all, 'attributes'] as const,
  itemTypes: (categoryId?: string) => [...adminKeys.all, 'item-types', categoryId] as const,
  itemType: (id: string) => [...adminKeys.all, 'item-type', id] as const,
  suggestions: (statusFilter?: string) => [...adminKeys.all, 'suggestions', statusFilter] as const,
}

export function useCatalogStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminAPI.getCatalogStats,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: adminAPI.getCategories,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAdminAttributes() {
  return useQuery({
    queryKey: adminKeys.attributes(),
    queryFn: adminAPI.getAttributes,
    staleTime: 1000 * 60 * 30,
  })
}

export function useAdminItemTypes(categoryId?: string) {
  return useQuery({
    queryKey: adminKeys.itemTypes(categoryId),
    queryFn: () => adminAPI.getItemTypes(categoryId ? { category: categoryId } : undefined),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateItemType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateItemTypeData) => adminAPI.createItemType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adminAPI.createCategory>[0]) => adminAPI.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

// ===== Suggestion Hooks =====

export function useAdminSuggestions(statusFilter?: string) {
  return useQuery({
    queryKey: adminKeys.suggestions(statusFilter),
    queryFn: () => adminAPI.getSuggestions(statusFilter ? { status: statusFilter } : undefined),
    staleTime: 1000 * 60 * 2,
  })
}

export function useApproveSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveSuggestionData }) =>
      adminAPI.approveSuggestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.suggestions() })
      queryClient.invalidateQueries({ queryKey: adminKeys.itemTypes() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

export function useRejectSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: { admin_notes?: string } }) =>
      adminAPI.rejectSuggestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.suggestions() })
    },
  })
}
