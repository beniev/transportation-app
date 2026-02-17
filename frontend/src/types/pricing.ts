/**
 * TypeScript types for the mover pricing module.
 */

export interface PricingFactors {
  id: string
  // Floor surcharges
  floor_surcharge_percent: number
  ground_floor_number: number
  elevator_discount_percent: number
  // Distance from truck to building (% of items subtotal per 10m)
  distance_surcharge_percent: number
  // Travel between locations
  travel_distance_per_km: number
  minimum_travel_charge: number
  // Seasonal
  peak_season_multiplier: number
  peak_months: number[]
  // Day/time surcharges
  weekend_surcharge_percent: number
  friday_surcharge_percent: number
  early_morning_surcharge_percent: number
  evening_surcharge_percent: number
  // Minimum
  minimum_order_amount: number
  // Timestamps
  created_at: string
  updated_at: string
}

export interface MoverItemPricing {
  id: string
  item_type: string
  item_type_name: string
  item_type_name_he: string
  category_name: string
  category_name_he: string
  base_price: number
  assembly_price: number
  disassembly_price: number
  special_handling_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ItemTypeWithPricing {
  id: string
  name_en: string
  name_he: string
  category: string
  category_name: string
  category_name_he?: string
  description_en: string
  description_he: string
  default_base_price: number
  default_assembly_price: number
  default_disassembly_price: number
  default_special_handling_price: number
  weight_class: string
  is_fragile: boolean
  is_heavy: boolean
  is_active: boolean
  image: string | null
  // Mover-specific pricing overlay
  mover_pricing: MoverItemPricing | null
  effective_base_price: number
  effective_assembly_price: number
  effective_disassembly_price: number
  effective_special_handling_price: number
}

export interface CreateMoverPricingData {
  item_type: string
  base_price: number
  assembly_price: number
  disassembly_price: number
  special_handling_price: number
  is_active?: boolean
}

export interface UpdateMoverPricingData {
  base_price?: number
  assembly_price?: number
  disassembly_price?: number
  special_handling_price?: number
  is_active?: boolean
}

export interface PricingCategory {
  id: string
  name_en: string
  name_he: string
  icon: string
  display_order: number
}
