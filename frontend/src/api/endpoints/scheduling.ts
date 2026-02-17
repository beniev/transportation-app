import apiClient from '../client'
import type {
  WeeklyAvailability,
  BlockedDate,
  Booking,
  TimeSlot,
  CreateBookingData,
  UpdateBookingData,
  CreateBlockedDateData,
  AvailabilitySlot,
  PaginatedResponse,
} from '../../types'

export const schedulingAPI = {
  // Weekly Availability
  getWeeklyAvailability: async (): Promise<WeeklyAvailability[]> => {
    const response = await apiClient.get('/scheduling/availability/')
    return response.data
  },

  updateWeeklyAvailability: async (
    id: string,
    data: Partial<WeeklyAvailability>
  ): Promise<WeeklyAvailability> => {
    const response = await apiClient.patch(`/scheduling/availability/${id}/`, data)
    return response.data
  },

  bulkUpdateAvailability: async (
    data: Partial<WeeklyAvailability>[]
  ): Promise<WeeklyAvailability[]> => {
    const response = await apiClient.post('/scheduling/availability/bulk_update/', {
      availability: data,
    })
    return response.data
  },

  // Blocked Dates
  getBlockedDates: async (params?: {
    start_date?: string
    end_date?: string
  }): Promise<BlockedDate[]> => {
    const response = await apiClient.get('/scheduling/blocked-dates/', { params })
    return response.data
  },

  createBlockedDate: async (data: CreateBlockedDateData): Promise<BlockedDate> => {
    const response = await apiClient.post('/scheduling/blocked-dates/', data)
    return response.data
  },

  deleteBlockedDate: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduling/blocked-dates/${id}/`)
  },

  // Bookings
  getBookings: async (params?: {
    status?: string
    date?: string
    start_date?: string
    end_date?: string
    page?: number
  }): Promise<PaginatedResponse<Booking>> => {
    const response = await apiClient.get('/scheduling/bookings/', { params })
    return response.data
  },

  getBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.get(`/scheduling/bookings/${id}/`)
    return response.data
  },

  createBooking: async (data: CreateBookingData): Promise<Booking> => {
    const response = await apiClient.post('/scheduling/bookings/', data)
    return response.data
  },

  updateBooking: async (id: string, data: UpdateBookingData): Promise<Booking> => {
    const response = await apiClient.patch(`/scheduling/bookings/${id}/`, data)
    return response.data
  },

  deleteBooking: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduling/bookings/${id}/`)
  },

  confirmBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/scheduling/bookings/${id}/confirm/`)
    return response.data
  },

  cancelBooking: async (id: string, reason?: string): Promise<Booking> => {
    const response = await apiClient.post(`/scheduling/bookings/${id}/cancel/`, { reason })
    return response.data
  },

  completeBooking: async (id: string): Promise<Booking> => {
    const response = await apiClient.post(`/scheduling/bookings/${id}/complete/`)
    return response.data
  },

  sendReminder: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/scheduling/bookings/${id}/send_reminder/`)
    return response.data
  },

  exportIcal: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/scheduling/bookings/${id}/export_ical/`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Time Slots
  getTimeSlots: async (params: {
    date?: string
    start_date?: string
    end_date?: string
  }): Promise<TimeSlot[]> => {
    const response = await apiClient.get('/scheduling/slots/', { params })
    return response.data
  },

  // Calendar View
  getCalendarData: async (params: {
    year: number
    month: number
  }): Promise<{
    bookings: Booking[]
    blocked_dates: BlockedDate[]
    availability: WeeklyAvailability[]
  }> => {
    const response = await apiClient.get('/scheduling/calendar/', { params })
    return response.data
  },

  // Public Availability (for customers)
  getPublicAvailability: async (
    moverId: string,
    params: {
      start_date: string
      end_date: string
    }
  ): Promise<AvailabilitySlot[]> => {
    const response = await apiClient.get(`/scheduling/public/${moverId}/availability/`, { params })
    return response.data
  },

  requestBooking: async (
    moverId: string,
    data: CreateBookingData
  ): Promise<Booking> => {
    const response = await apiClient.post(`/scheduling/public/${moverId}/book/`, data)
    return response.data
  },
}
