/**
 * Central export for all TypeScript types.
 */

export * from './auth'
export * from './orders'
export * from './quotes'
export * from './scheduling'
export * from './payments'
export * from './notifications'
export * from './analytics'
export * from './comparisons'
export * from './pricing'

// Common utility types
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
  code?: string
}

export interface SelectOption {
  value: string
  label: string
  label_he?: string
}

export interface DateRange {
  start: Date
  end: Date
}

export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  field: string
  order: SortOrder
}

export interface FilterConfig {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
  value: unknown
}
