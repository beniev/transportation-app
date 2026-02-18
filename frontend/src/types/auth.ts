export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  user_type: 'mover' | 'customer' | 'admin'
  preferred_language: 'he' | 'en'
  email_verified: boolean
  phone_verified: boolean
  date_joined: string
}

export interface MoverProfile {
  id: string
  user: User
  company_name: string
  company_name_he: string
  license_number: string
  address: string
  city: string
  service_areas: string[]
  base_latitude: number | null
  base_longitude: number | null
  service_radius_km: number
  logo: string | null
  description: string
  facebook_url: string
  is_verified: boolean
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejection_reason: string
  verified_at: string | null
  rating: number
  total_reviews: number
  completed_orders: number
  is_active: boolean
  onboarding_completed: boolean
  onboarding_step: number
}

export interface CustomerProfile {
  id: string
  user: User
  is_verified: boolean
  total_orders: number
  default_address: string
  default_city: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user?: User
}

export interface RegisterData {
  email: string
  password1: string
  password2: string
  first_name?: string
  last_name?: string
  phone?: string
  user_type: 'mover' | 'customer'
  preferred_language?: 'he' | 'en'
  company_name?: string
}
