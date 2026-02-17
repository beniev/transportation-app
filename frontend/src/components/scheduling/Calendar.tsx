import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useCalendarData } from '../../api/hooks'
import type { Booking, BlockedDate } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

interface CalendarProps {
  onSelectDate?: (date: Date) => void
  onSelectBooking?: (booking: Booking) => void
  selectedDate?: Date | null
}

export default function Calendar({ onSelectDate, onSelectBooking, selectedDate }: CalendarProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  const { data, isLoading } = useCalendarData(year, month)

  // Generate days for the calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    // Add padding days at the start (for Sunday-based week)
    const startDayOfWeek = start.getDay()
    const paddingStart = Array.from({ length: startDayOfWeek }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() - (startDayOfWeek - i))
      return { date, isCurrentMonth: false }
    })

    // Add padding days at the end
    const endDayOfWeek = end.getDay()
    const paddingEnd = Array.from({ length: 6 - endDayOfWeek }, (_, i) => {
      const date = new Date(end)
      date.setDate(date.getDate() + (i + 1))
      return { date, isCurrentMonth: false }
    })

    return [
      ...paddingStart,
      ...days.map((date) => ({ date, isCurrentMonth: true })),
      ...paddingEnd,
    ]
  }, [currentMonth])

  const getBookingsForDate = (date: Date): Booking[] => {
    if (!data?.bookings) return []
    const dateStr = format(date, 'yyyy-MM-dd')
    return data.bookings.filter((b) => b.date === dateStr)
  }

  const isDateBlocked = (date: Date): BlockedDate | undefined => {
    if (!data?.blocked_dates) return undefined
    const dateStr = format(date, 'yyyy-MM-dd')
    return data.blocked_dates.find((b) => b.date === dateStr)
  }

  const weekDays = isRTL
    ? ['ש', 'ו', 'ה', 'ד', 'ג', 'ב', 'א'].reverse()
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            {t('calendar.today')}
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const bookings = getBookingsForDate(date)
          const blocked = isDateBlocked(date)
          const isSelected = selectedDate && isSameDay(date, selectedDate)

          return (
            <div
              key={index}
              onClick={() => onSelectDate?.(date)}
              className={`
                min-h-24 p-1 border-b border-e border-gray-100 cursor-pointer
                hover:bg-gray-50 transition-colors
                ${!isCurrentMonth ? 'bg-gray-50' : ''}
                ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}
                ${blocked ? 'bg-red-50' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                    ${isToday(date) ? 'bg-blue-600 text-white' : ''}
                  `}
                >
                  {format(date, 'd')}
                </span>
                {blocked && (
                  <span className="text-xs text-red-500 truncate max-w-16">
                    {blocked.reason || t('calendar.blocked')}
                  </span>
                )}
              </div>

              {/* Bookings */}
              <div className="space-y-1">
                {bookings.slice(0, 3).map((booking) => (
                  <button
                    key={booking.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectBooking?.(booking)
                    }}
                    className={`
                      w-full text-start text-xs px-1.5 py-0.5 rounded truncate
                      ${booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'tentative'
                          ? 'bg-yellow-100 text-yellow-800'
                          : booking.status === 'completed'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-100 text-blue-800'
                      }
                    `}
                  >
                    {booking.start_time.slice(0, 5)} {booking.contact_name}
                  </button>
                ))}
                {bookings.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{bookings.length - 3} {t('calendar.more')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-gray-200 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-gray-600">{t('calendar.confirmed')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span className="text-gray-600">{t('calendar.tentative')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          <span className="text-gray-600">{t('calendar.blocked')}</span>
        </div>
      </div>
    </div>
  )
}
