import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import {
  useBookings,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking,
  useExportBookingIcal,
} from '../../api/hooks'
import type { Booking, BookingStatus } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

interface BookingsListProps {
  onSelectBooking?: (booking: Booking) => void
}

const statusConfig: Record<BookingStatus, { color: string; label: string }> = {
  tentative: { color: 'bg-yellow-100 text-yellow-800', label: 'tentative' },
  confirmed: { color: 'bg-green-100 text-green-800', label: 'confirmed' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'in_progress' },
  completed: { color: 'bg-gray-100 text-gray-600', label: 'completed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'cancelled' },
}

export default function BookingsList({ onSelectBooking }: BookingsListProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useBookings({
    status: statusFilter || undefined,
    page,
  })
  const confirmBooking = useConfirmBooking()
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()
  const exportIcal = useExportBookingIcal()

  const handleConfirm = async (id: string) => {
    await confirmBooking.mutateAsync(id)
  }

  const handleCancel = async (id: string) => {
    const reason = prompt(t('scheduling.cancelReason'))
    if (reason !== null) {
      await cancelBooking.mutateAsync({ id, reason })
    }
  }

  const handleComplete = async (id: string) => {
    await completeBooking.mutateAsync(id)
  }

  const handleExportIcal = async (booking: Booking) => {
    try {
      const blob = await exportIcal.mutateAsync(booking.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `booking_${format(new Date(booking.date), 'yyyy-MM-dd')}.ics`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export iCal:', err)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{t('common.error')}</div>

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">{t('scheduling.allStatuses')}</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {t(`scheduling.status.${config.label}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {data?.results.map((booking) => {
          const status = statusConfig[booking.status]
          return (
            <div
              key={booking.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => onSelectBooking?.(booking)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Date & Time */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-900">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">
                        {format(new Date(booking.date), 'EEEE, dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {t(`scheduling.status.${status.label}`)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{booking.contact_name}</span>
                    {booking.contact_phone && (
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="h-4 w-4" />
                        {booking.contact_phone}
                      </span>
                    )}
                  </div>

                  {/* Order Details */}
                  {booking.order_details && (
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {booking.order_details.origin_address} → {booking.order_details.destination_address}
                      </span>
                    </div>
                  )}

                  {booking.notes && (
                    <p className="text-sm text-gray-500 italic">{booking.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {booking.status === 'tentative' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConfirm(booking.id)
                      }}
                      disabled={confirmBooking.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {t('scheduling.confirm')}
                    </button>
                  )}

                  {(booking.status === 'tentative' || booking.status === 'confirmed') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancel(booking.id)
                      }}
                      disabled={cancelBooking.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      {t('scheduling.cancel')}
                    </button>
                  )}

                  {booking.status === 'in_progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleComplete(booking.id)
                      }}
                      disabled={completeBooking.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      {t('scheduling.complete')}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportIcal(booking)
                    }}
                    disabled={exportIcal.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    iCal
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {data?.results.length === 0 && (
          <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            {t('scheduling.noBookings')}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.count > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('common.showing', { count: data.results.length, total: data.count })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.previous}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
