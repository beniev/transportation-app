/**
 * TypeScript types for the scheduling module.
 */

export interface WeeklyAvailability {
  id: string
  day_of_week: number
  day_name?: string
  start_time: string
  end_time: string
  is_available: boolean
  max_bookings: number
  created_at: string
  updated_at: string
}

export interface BlockedDate {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
  is_full_day: boolean
  reason: string
  created_at: string
}

export interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  slot_type: 'available' | 'booked' | 'blocked'
  is_available: boolean
  booking?: string
  blocked_date?: string
  notes: string
}

export interface Booking {
  id: string
  order?: string
  order_details?: {
    id: string
    origin_address: string
    destination_address: string
    customer_name: string
    total_price: number
  }
  customer?: string
  customer_details?: {
    id: string
    name: string
    email: string
    phone: string
  }
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  notes: string
  internal_notes: string
  contact_name: string
  contact_phone: string
  contact_email: string
  confirmation_sent: boolean
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

export type BookingStatus = 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface BookingReminder {
  id: string
  booking: string
  reminder_type: 'email' | 'sms' | 'both'
  scheduled_for: string
  sent_at: string | null
  is_sent: boolean
}

export interface CreateBookingData {
  order?: string
  customer?: string
  date: string
  start_time: string
  end_time: string
  notes?: string
  internal_notes?: string
  contact_name: string
  contact_phone: string
  contact_email: string
}

export interface UpdateBookingData extends Partial<CreateBookingData> {
  status?: BookingStatus
}

export interface CreateBlockedDateData {
  date: string
  start_time?: string
  end_time?: string
  is_full_day?: boolean
  reason?: string
}

export interface AvailabilitySlot {
  date: string
  slots: {
    start_time: string
    end_time: string
    available: boolean
  }[]
}

export interface CalendarDay {
  date: string
  bookings: Booking[]
  blocked: boolean
  available: boolean
}
