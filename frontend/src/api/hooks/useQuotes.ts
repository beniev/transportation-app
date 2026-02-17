import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotesAPI } from '../endpoints/quotes'
import type {
  QuoteTemplate,
  CreateQuoteData,
  UpdateQuoteData,
  CreateQuoteItemData,
  SignQuoteData,
} from '../../types'

// Query Keys
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...quoteKeys.lists(), filters] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
  templates: ['quote-templates'] as const,
  template: (id: string) => [...quoteKeys.templates, id] as const,
  public: (token: string) => ['public-quote', token] as const,
}

// Templates Hooks
export function useQuoteTemplates() {
  return useQuery({
    queryKey: quoteKeys.templates,
    queryFn: quotesAPI.getTemplates,
  })
}

export function useQuoteTemplate(id: string) {
  return useQuery({
    queryKey: quoteKeys.template(id),
    queryFn: () => quotesAPI.getTemplate(id),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<QuoteTemplate>) => quotesAPI.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.templates })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuoteTemplate> }) =>
      quotesAPI.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.templates })
      queryClient.invalidateQueries({ queryKey: quoteKeys.template(id) })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesAPI.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.templates })
    },
  })
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesAPI.setDefaultTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.templates })
    },
  })
}

// Quotes Hooks
export function useQuotes(filters?: { status?: string; order?: string; page?: number }) {
  return useQuery({
    queryKey: quoteKeys.list(filters || {}),
    queryFn: () => quotesAPI.getQuotes(filters),
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: () => quotesAPI.getQuote(id),
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateQuoteData) => quotesAPI.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
    },
  })
}

export function useUpdateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteData }) =>
      quotesAPI.updateQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) })
    },
  })
}

export function useDeleteQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesAPI.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
    },
  })
}

export function useGeneratePDF() {
  return useMutation({
    mutationFn: (id: string) => quotesAPI.generatePDF(id),
  })
}

export function useSendQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesAPI.sendQuote(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
    },
  })
}

export function useCreateQuoteFromOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, templateId }: { orderId: string; templateId?: string }) =>
      quotesAPI.createFromOrder(orderId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() })
    },
  })
}

// Quote Items Hooks
export function useAddQuoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: CreateQuoteItemData }) =>
      quotesAPI.addQuoteItem(quoteId, data),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) })
    },
  })
}

export function useUpdateQuoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      quoteId,
      itemId,
      data,
    }: {
      quoteId: string
      itemId: string
      data: Partial<CreateQuoteItemData>
    }) => quotesAPI.updateQuoteItem(quoteId, itemId, data),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) })
    },
  })
}

export function useDeleteQuoteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ quoteId, itemId }: { quoteId: string; itemId: string }) =>
      quotesAPI.deleteQuoteItem(quoteId, itemId),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) })
    },
  })
}

// Public Quote Hooks
export function usePublicQuote(token: string) {
  return useQuery({
    queryKey: quoteKeys.public(token),
    queryFn: () => quotesAPI.getPublicQuote(token),
    enabled: !!token,
  })
}

export function useSignQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: SignQuoteData }) =>
      quotesAPI.signQuote(token, data),
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.public(token) })
    },
  })
}
