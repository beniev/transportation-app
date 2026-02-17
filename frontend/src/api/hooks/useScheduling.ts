import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingAPI } from '../endpoints/scheduling'
import type {
  WeeklyAvailability,
  CreateBookingData,
  UpdateBookingData,
  CreateBlockedDateData,
} from '../../types'

// Query Keys
export const schedulingKeys = {
  all: ['scheduling'] as const,
  availability: () => [...schedulingKeys.all, 'availability'] as const,
  blockedDates: () => [...schedulingKeys.all, 'blocked-dates'] as const,
  blockedDatesList: (params: Record<string, unknown>) =>
    [...schedulingKeys.blockedDates(), params] as const,
  bookings: () => [...schedulingKeys.all, 'bookings'] as const,
  bookingsList: (params: Record<string, unknown>) => [...schedulingKeys.bookings(), params] as const,
  booking: (id: string) => [...schedulingKeys.bookings(), id] as const,
  slots: (params: Record<string, unknown>) => [...schedulingKeys.all, 'slots', params] as const,
  calendar: (params: { year: number; month: number }) =>
    [...schedulingKeys.all, 'calendar', params] as const,
  publicAvailability: (moverId: string, params: Record<string, unknown>) =>
    ['public-availability', moverId, params] as const,
}

// Availability Hooks
export function useWeeklyAvailability() {
  return useQuery({
    queryKey: schedulingKeys.availability(),
    queryFn: schedulingAPI.getWeeklyAvailability,
  })
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WeeklyAvailability> }) =>
      schedulingAPI.updateWeeklyAvailability(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.availability() })
    },
  })
}

export function useBulkUpdateAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<WeeklyAvailability>[]) =>
      schedulingAPI.bulkUpdateAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.availability() })
    },
  })
}

// Blocked Dates Hooks
export function useBlockedDates(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: schedulingKeys.blockedDatesList(params || {}),
    queryFn: () => schedulingAPI.getBlockedDates(params),
  })
}

export function useCreateBlockedDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBlockedDateData) => schedulingAPI.createBlockedDate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.blockedDates() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all })
    },
  })
}

export function useDeleteBlockedDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.deleteBlockedDate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.blockedDates() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all })
    },
  })
}

// Bookings Hooks
export function useBookings(params?: {
  status?: string
  date?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  return useQuery({
    queryKey: schedulingKeys.bookingsList(params || {}),
    queryFn: () => schedulingAPI.getBookings(params),
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: schedulingKeys.booking(id),
    queryFn: () => schedulingAPI.getBooking(id),
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookingData) => schedulingAPI.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all })
    },
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBookingData }) =>
      schedulingAPI.updateBooking(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.booking(id) })
    },
  })
}

export function useDeleteBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
    },
  })
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.confirmBooking(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.booking(id) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      schedulingAPI.cancelBooking(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.booking(id) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
    },
  })
}

export function useCompleteBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.completeBooking(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.booking(id) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.bookings() })
    },
  })
}

export function useSendBookingReminder() {
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.sendReminder(id),
  })
}

export function useExportBookingIcal() {
  return useMutation({
    mutationFn: (id: string) => schedulingAPI.exportIcal(id),
  })
}

// Time Slots Hook
export function useTimeSlots(params: {
  date?: string
  start_date?: string
  end_date?: string
}) {
  return useQuery({
    queryKey: schedulingKeys.slots(params),
    queryFn: () => schedulingAPI.getTimeSlots(params),
    enabled: !!(params.date || (params.start_date && params.end_date)),
  })
}

// Calendar Hook
export function useCalendarData(year: number, month: number) {
  return useQuery({
    queryKey: schedulingKeys.calendar({ year, month }),
    queryFn: () => schedulingAPI.getCalendarData({ year, month }),
  })
}

// Public Availability Hook
export function usePublicAvailability(
  moverId: string,
  params: { start_date: string; end_date: string }
) {
  return useQuery({
    queryKey: schedulingKeys.publicAvailability(moverId, params),
    queryFn: () => schedulingAPI.getPublicAvailability(moverId, params),
    enabled: !!moverId && !!params.start_date && !!params.end_date,
  })
}

export function useRequestBooking() {
  return useMutation({
    mutationFn: ({ moverId, data }: { moverId: string; data: CreateBookingData }) =>
      schedulingAPI.requestBooking(moverId, data),
  })
}
