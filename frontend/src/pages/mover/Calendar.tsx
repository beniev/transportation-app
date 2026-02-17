import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab } from '@headlessui/react'
import { CalendarDaysIcon, ClockIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { Calendar, AvailabilityManager, BookingsList } from '../../components/scheduling'
import type { Booking } from '../../types'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking)
    // Could open a modal or navigate to booking details
  }

  const tabs = [
    { name: t('calendar.calendar'), icon: CalendarDaysIcon },
    { name: t('calendar.bookings'), icon: ListBulletIcon },
    { name: t('calendar.availability'), icon: ClockIcon },
  ]

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
        <p className="text-gray-600 mt-1">{t('calendar.subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6 max-w-md">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-600 hover:bg-white/[0.5] hover:text-gray-800'
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* Calendar View */}
          <Tab.Panel>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                  onSelectBooking={handleBookingSelect}
                />
              </div>
              <div className="space-y-4">
                {selectedDate && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {selectedDate.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('calendar.selectedDateInfo')}
                    </p>
                  </div>
                )}

                {selectedBooking && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('calendar.bookingDetails')}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-500">{t('calendar.contact')}:</span>{' '}
                        {selectedBooking.contact_name}
                      </p>
                      <p>
                        <span className="text-gray-500">{t('calendar.time')}:</span>{' '}
                        {selectedBooking.start_time} - {selectedBooking.end_time}
                      </p>
                      <p>
                        <span className="text-gray-500">{t('calendar.status')}:</span>{' '}
                        {t(`scheduling.status.${selectedBooking.status}`)}
                      </p>
                      {selectedBooking.notes && (
                        <p>
                          <span className="text-gray-500">{t('calendar.notes')}:</span>{' '}
                          {selectedBooking.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>

          {/* Bookings List */}
          <Tab.Panel>
            <BookingsList onSelectBooking={handleBookingSelect} />
          </Tab.Panel>

          {/* Availability Settings */}
          <Tab.Panel>
            <AvailabilityManager />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
