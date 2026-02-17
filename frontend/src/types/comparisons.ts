/**
 * TypeScript types for the comparison/auto-quote module.
 */

export interface PricingBreakdownItem {
  name: string
  unit_price: string
  assembly_cost: string
  disassembly_cost: string
  special_handling_cost: string
  total: string
}

export interface PricingBreakdown {
  items_breakdown: PricingBreakdownItem[]
  items_subtotal: string
  origin_floor_surcharge: string
  destination_floor_surcharge: string
  distance_surcharge: string
  travel_cost: string
  seasonal_adjustment: string
  day_of_week_adjustment: string
  discount: string
  total: string
  currency: string
}

export type ComparisonEntryStatus = 'calculated' | 'fallback' | 'error' | 'selected' | 'rejected'

export interface ComparisonEntry {
  id: string
  mover: string
  rank: number
  total_price: string
  pricing_breakdown: PricingBreakdown
  mover_company_name: string
  mover_company_name_he: string
  mover_rating: string
  mover_total_reviews: number
  mover_completed_orders: number
  mover_is_verified: boolean
  mover_logo_url: string
  used_custom_pricing: boolean
  status: ComparisonEntryStatus
  created_at: string
}

export type ComparisonStatus = 'generating' | 'ready' | 'selected' | 'expired' | 'failed'

export interface OrderComparison {
  id: string
  order: string
  status: ComparisonStatus
  total_eligible_movers: number
  total_priced_movers: number
  selected_entry: string | null
  expires_at: string | null
  entries: ComparisonEntry[]
  created_at: string
  updated_at: string
}

export interface SelectMoverRequest {
  entry_id: string
}

export interface SelectMoverResponse {
  id: string
  status: string
  mover_name: string
  total_price: string
}
