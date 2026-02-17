/**
 * TypeScript types for the orders module.
 */

export interface ItemCategory {
  id: string
  name_en: string
  name_he: string
  icon: string
  display_order: number
}

export interface ItemType {
  id: string
  category: string
  category_id?: string
  category_name?: string
  category_name_en?: string
  category_name_he?: string
  name_en: string
  name_he: string
  description_en: string
  description_he: string
  default_base_price: number
  default_assembly_price: number
  default_disassembly_price?: number
  default_special_handling_price: number
  requires_assembly: boolean
  requires_special_handling?: boolean
  is_fragile: boolean
  is_heavy: boolean
  weight_class?: string
  typical_dimensions: string
  image: string | null
  is_active: boolean
  // Variant system fields
  is_generic?: boolean
  is_custom?: boolean
  parent_type_id?: string | null
  attribute_values?: Record<string, string>
}

// Item Attribute types for variant clarification
export interface ItemAttribute {
  id: string
  code: string
  name_en: string
  name_he: string
  input_type: 'select' | 'number' | 'boolean'
  question_en: string
  question_he: string
  display_order: number
  is_active: boolean
}

export interface ItemAttributeOption {
  value: string
  label: string
  label_en: string
  label_he: string
}

export interface VariantQuestion {
  attribute_code: string
  attribute_id: string
  question: string
  question_en: string
  question_he: string
  input_type: 'select' | 'number' | 'boolean'
  is_required: boolean
  options: ItemAttributeOption[]
}

export interface VariantClarification {
  item_index: number
  item_type_id: string
  item_name_en: string
  item_name_he: string
  questions: VariantQuestion[]
}

export interface VariantResolutionRequest {
  item_type_id: string
  answers: Record<string, string>
  mover_id?: string
  language?: string
}

export interface VariantResolutionResponse {
  found: boolean
  variant?: ItemType & {
    prices: {
      base_price: string
      assembly_price: string
      disassembly_price: string
      special_handling_price: string
    }
  }
  message?: string
  message_he?: string
  message_en?: string
  generic_type?: {
    id: string
    name_en: string
    name_he: string
    category_id: string
    category_name_en: string
    category_name_he: string
  }
  available_variants?: Array<{
    id: string
    name: string
    name_en: string
    name_he: string
    default_base_price: string
    attribute_values?: Record<string, string>
  }>
  suggested_answers?: Record<string, string>
  estimated_price?: string
}

export interface Order {
  id: string
  customer: string
  // Flat customer fields from API serializer
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  mover_name?: string
  status: OrderStatus
  origin_address: string
  origin_city: string
  origin_floor: number
  origin_has_elevator: boolean
  origin_distance_to_truck: number
  destination_address: string
  destination_city: string
  destination_floor: number
  destination_has_elevator: boolean
  destination_distance_to_truck: number
  distance_km: number
  moving_date: string | null
  date_flexibility: DateFlexibility
  preferred_date: string | null
  preferred_date_end: string | null
  preferred_date_display: string | null
  preferred_time_slot: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  original_description: string
  free_text_description: string
  special_instructions: string
  customer_notes: string
  mover_notes: string
  ai_processed: boolean
  ai_confidence: number
  ai_suggestions: Record<string, unknown>
  // Pricing fields matching API
  items_subtotal: number
  subtotal: number
  origin_floor_surcharge: number
  destination_floor_surcharge: number
  floor_surcharge: number
  distance_surcharge: number
  travel_cost: number
  seasonal_adjustment: number
  seasonal_surcharge: number
  day_of_week_adjustment: number
  discount: number
  total_price: number
  items_count?: number
  items: OrderItem[]
  images: OrderImage[]
  order_images?: OrderImage[]
  created_at: string
  updated_at: string
}

export type OrderStatus = 'draft' | 'pending' | 'comparing' | 'quoted' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'

export type DateFlexibility = 'specific' | 'range'

export interface OrderItem {
  id: string
  item_type: string
  item_type_name?: string
  item_type_name_he?: string
  quantity: number
  base_price: number
  requires_assembly: boolean
  assembly_price: number
  is_fragile: boolean
  special_handling_price: number
  total_price: number
  room_name: string
  room_floor: number
  notes: string
  ai_identified: boolean
  ai_confidence: number
}

export interface OrderImage {
  id: string
  image: string
  description: string
  ai_analysis: Record<string, unknown>
  analyzed_at: string | null
  created_at: string
}

export interface CreateOrderData {
  origin_address: string
  origin_city: string
  origin_floor?: number
  origin_has_elevator?: boolean
  origin_distance_to_truck?: number
  origin_coordinates?: { lat: number; lng: number }
  destination_address: string
  destination_city: string
  destination_floor?: number
  destination_has_elevator?: boolean
  destination_distance_to_truck?: number
  destination_coordinates?: { lat: number; lng: number }
  moving_date?: string
  moving_date_end?: string
  date_flexibility?: DateFlexibility
  preferred_date?: string
  preferred_date_end?: string
  preferred_time_slot?: string
  free_text_description?: string
  special_instructions?: string
}

export interface UpdateOrderData extends Partial<CreateOrderData> {
  status?: OrderStatus
}

export interface AddOrderItemData {
  item_type?: string | null
  name?: string
  quantity: number
  requires_assembly?: boolean
  is_fragile?: boolean
  room_name?: string
  room_floor?: number
  notes?: string
}

export interface ParsedItem {
  matched_item_type_id: string | null
  name_en: string
  name_he: string
  quantity: number
  category_en?: string
  category_he?: string
  category_id?: string
  room?: string
  requires_disassembly: boolean
  requires_assembly: boolean
  is_fragile: boolean
  requires_special_handling: boolean
  special_notes?: string
  confidence: number
  // Variant system fields
  is_generic?: boolean
  requires_variant_clarification?: boolean
  default_base_price?: string
  estimated_price?: string
}

export interface AIParseResult {
  items: ParsedItem[]
  needs_clarification: {
    item_index: number
    question_en: string
    question_he: string
    reason?: string
  }[]
  variant_clarifications: VariantClarification[]
  summary: {
    total_items?: number
    rooms_mentioned?: string[]
    special_requirements?: string[]
  }
  error?: string
}

// Legacy interface for backward compatibility
export interface AIParseResultLegacy {
  items: {
    item_type: string
    item_name: string
    quantity: number
    confidence: number
    requires_clarification: boolean
    clarification_question?: string
  }[]
  clarifying_questions: string[]
  suggestions: string[]
}

export interface CustomItemData {
  name_en: string
  name_he: string
  category_id: string
  estimated_price?: number
  weight_class?: 'light' | 'medium' | 'heavy' | 'extra_heavy'
  requires_assembly?: boolean
  is_fragile?: boolean
  requires_special_handling?: boolean
  estimated_size?: 'small' | 'medium' | 'large' | 'extra_large'
  description_en?: string
  description_he?: string
}
