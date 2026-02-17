/**
 * TypeScript types for the payments module.
 */

export interface SubscriptionPlan {
  id: string
  name: string
  name_he: string
  plan_type: PlanType
  description: string
  description_he: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_orders_per_month: number | null
  max_quotes_per_month: number | null
  has_ai_parsing: boolean
  has_ai_images: boolean
  has_digital_signatures: boolean
  has_sms_notifications: boolean
  has_advanced_analytics: boolean
  has_priority_support: boolean
  has_custom_branding: boolean
  has_api_access: boolean
  features_list: string[]
  features_list_he: string[]
  is_active: boolean
  display_order: number
  created_at: string
}

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise'

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  billing_cycle: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancelled_at: string | null
  cancel_at_period_end: boolean
  orders_used_this_month: number
  quotes_used_this_month: number
  created_at: string
  updated_at: string
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'

export interface Payment {
  id: string
  subscription?: string
  amount: number
  currency: string
  status: PaymentStatus
  payment_type: 'subscription' | 'one_time' | 'refund'
  payment_method_type: string
  transaction_id: string
  gateway: string
  gateway_response: Record<string, unknown>
  description: string
  invoice_number: string
  receipt_url: string | null
  paid_at: string | null
  created_at: string
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'

export interface PaymentMethod {
  id: string
  method_type: 'credit_card' | 'debit_card' | 'bank_transfer'
  card_brand: string
  card_last4: string
  card_exp_month: number
  card_exp_year: number
  holder_name: string
  is_default: boolean
  gateway: string
  gateway_payment_method_id: string
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  applies_to_plan?: string
  applies_to_billing_cycle?: 'monthly' | 'yearly'
  valid_from: string
  valid_until: string | null
  max_redemptions: number | null
  times_redeemed: number
  is_active: boolean
}

export interface CreateSubscriptionData {
  plan_id: string
  billing_cycle: 'monthly' | 'yearly'
  payment_method_id?: string
  coupon_code?: string
}

export interface ChangeSubscriptionData {
  plan_id: string
  billing_cycle?: 'monthly' | 'yearly'
}

export interface PaymentIntentData {
  amount: number
  currency: string
  client_secret: string
}

export interface InvoiceData {
  id: string
  number: string
  subscription: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  due_date: string
  paid_at: string | null
  pdf_url: string | null
  created_at: string
}

export interface UsageStats {
  orders_used: number
  orders_limit: number | null
  quotes_used: number
  quotes_limit: number | null
  ai_parsing_available: boolean
  ai_images_available: boolean
  digital_signatures_available: boolean
  sms_available: boolean
}
