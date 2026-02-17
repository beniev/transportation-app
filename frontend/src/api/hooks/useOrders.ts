import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersAPI } from '../endpoints/orders'
import type {
  CreateOrderData,
  UpdateOrderData,
  AddOrderItemData,
  VariantResolutionRequest,
  CustomItemData,
} from '../../types'

// Query Keys
export const orderKeys = {
  all: ['orders'] as const,
  categories: () => ['categories'] as const,
  itemTypes: (categoryId?: string) => ['item-types', categoryId] as const,
  itemType: (id: string) => ['item-type', id] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  // Variant-related keys
  variantQuestions: (itemTypeId: string) => ['variant-questions', itemTypeId] as const,
  variants: (itemTypeId: string) => ['variants', itemTypeId] as const,
  genericItems: (categoryId?: string) => ['generic-items', categoryId] as const,
}

// Categories & Item Types Hooks
export function useCategories() {
  return useQuery({
    queryKey: orderKeys.categories(),
    queryFn: ordersAPI.getCategories,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useItemTypes(categoryId?: string) {
  return useQuery({
    queryKey: orderKeys.itemTypes(categoryId),
    queryFn: () => ordersAPI.getItemTypes(categoryId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useItemType(id: string) {
  return useQuery({
    queryKey: orderKeys.itemType(id),
    queryFn: () => ordersAPI.getItemType(id),
    enabled: !!id,
  })
}

// Orders Hooks
export function useOrders(params?: {
  status?: string
  customer?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  return useQuery({
    queryKey: orderKeys.list(params || {}),
    queryFn: () => ordersAPI.getOrders(params),
  })
}

export function useMoverOrders(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['mover-orders', params],
    queryFn: () => ordersAPI.getMoverOrders(params),
  })
}

export function useAvailableOrders(params?: { origin_city?: string; destination_city?: string; page?: number }) {
  return useQuery({
    queryKey: ['available-orders', params],
    queryFn: () => ordersAPI.getAvailableOrders(params),
  })
}

export function useClaimOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => ordersAPI.claimOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-orders'] })
      queryClient.invalidateQueries({ queryKey: ['mover-orders'] })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersAPI.getOrder(id),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrderData) => ordersAPI.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderData }) =>
      ordersAPI.updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersAPI.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

// Order Status Actions
export function useSubmitOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersAPI.submitOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useApproveOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersAPI.approveOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ordersAPI.cancelOrder(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

export function useCompleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersAPI.completeOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}

// Order Items Hooks
export function useAddOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: AddOrderItemData }) =>
      ordersAPI.addOrderItem(orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: string
      itemId: string
      data: Partial<AddOrderItemData>
    }) => ordersAPI.updateOrderItem(orderId, itemId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useDeleteOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      ordersAPI.deleteOrderItem(orderId, itemId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

// Order Images Hooks
export function useUploadImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      file,
      description,
    }: {
      orderId: string
      file: File
      description?: string
    }) => ordersAPI.uploadImage(orderId, file, description),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useDeleteImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, imageId }: { orderId: string; imageId: string }) =>
      ordersAPI.deleteImage(orderId, imageId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

export function useAnalyzeImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, imageId }: { orderId: string; imageId: string }) =>
      ordersAPI.analyzeImage(orderId, imageId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

// AI Features Hooks
export function useParseDescription() {
  return useMutation({
    mutationFn: ({ orderId, description }: { orderId: string; description: string }) =>
      ordersAPI.parseDescription(orderId, description),
  })
}

export function useAnswerClarification() {
  return useMutation({
    mutationFn: ({
      orderId,
      conversationId,
      answer,
    }: {
      orderId: string
      conversationId: string
      answer: string
    }) => ordersAPI.answerClarification(orderId, conversationId, answer),
  })
}

export function useRecalculatePrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => ordersAPI.recalculatePrice(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

// Item Variant Hooks
export function useVariantQuestions(itemTypeId: string, language?: string) {
  return useQuery({
    queryKey: orderKeys.variantQuestions(itemTypeId),
    queryFn: () => ordersAPI.getVariantQuestions(itemTypeId, language),
    enabled: !!itemTypeId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useVariants(itemTypeId: string, language?: string) {
  return useQuery({
    queryKey: orderKeys.variants(itemTypeId),
    queryFn: () => ordersAPI.getVariants(itemTypeId, language),
    enabled: !!itemTypeId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useGenericItems(categoryId?: string, language?: string) {
  return useQuery({
    queryKey: orderKeys.genericItems(categoryId),
    queryFn: () => ordersAPI.getGenericItems(categoryId, language),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useResolveVariant() {
  return useMutation({
    mutationFn: (data: VariantResolutionRequest) => ordersAPI.resolveVariant(data),
  })
}

export function useCreateCustomItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CustomItemData) => ordersAPI.createCustomItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.itemTypes() })
    },
  })
}
