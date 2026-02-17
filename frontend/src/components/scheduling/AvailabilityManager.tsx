import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { TrashIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline'
import {
  useWeeklyAvailability,
  useBulkUpdateAvailability,
  useBlockedDates,
  useCreateBlockedDate,
  useDeleteBlockedDate,
} from '../../api/hooks'
import type { WeeklyAvailability, CreateBlockedDateData } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

const DAYS = [
  { value: 0, label_en: 'Sunday', label_he: 'ראשון' },
  { value: 1, label_en: 'Monday', label_he: 'שני' },
  { value: 2, label_en: 'Tuesday', label_he: 'שלישי' },
  { value: 3, label_en: 'Wednesday', label_he: 'רביעי' },
  { value: 4, label_en: 'Thursday', label_he: 'חמישי' },
  { value: 5, label_en: 'Friday', label_he: 'שישי' },
  { value: 6, label_en: 'Saturday', label_he: 'שבת' },
]

export default function AvailabilityManager() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [showBlockedForm, setShowBlockedForm] = useState(false)

  const { data: availability, isLoading: availabilityLoading } = useWeeklyAvailability()
  const { data: blockedDates, isLoading: blockedLoading } = useBlockedDates()
  const bulkUpdate = useBulkUpdateAvailability()
  const createBlocked = useCreateBlockedDate()
  const deleteBlocked = useDeleteBlockedDate()

  const [editedAvailability, setEditedAvailability] = useState<Partial<WeeklyAvailability>[]>([])

  const blockedForm = useForm<CreateBlockedDateData>({
    defaultValues: {
      date: '',
      is_full_day: true,
      start_time: '08:00',
      end_time: '18:00',
      reason: '',
    },
  })

  const handleAvailabilityChange = (
    dayOfWeek: number,
    field: keyof WeeklyAvailability,
    value: string | boolean | number
  ) => {
    setEditedAvailability((prev) => {
      const existing = prev.find((a) => a.day_of_week === dayOfWeek)
      if (existing) {
        return prev.map((a) =>
          a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a
        )
      }
      return [...prev, { day_of_week: dayOfWeek, [field]: value }]
    })
  }

  const getAvailabilityValue = (
    dayOfWeek: number,
    field: keyof WeeklyAvailability
  ): string | boolean | number | undefined => {
    const edited = editedAvailability.find((a) => a.day_of_week === dayOfWeek)
    if (edited && field in edited) {
      return edited[field] as string | boolean | number
    }
    const original = availability?.find((a) => a.day_of_week === dayOfWeek)
    return original ? (original[field] as string | boolean | number) : undefined
  }

  const saveAvailability = async () => {
    if (editedAvailability.length === 0) return

    await bulkUpdate.mutateAsync(
      editedAvailability.map((a) => ({
        ...a,
        id: availability?.find((orig) => orig.day_of_week === a.day_of_week)?.id,
      }))
    )
    setEditedAvailability([])
  }

  const handleAddBlockedDate = async (data: CreateBlockedDateData) => {
    await createBlocked.mutateAsync(data)
    blockedForm.reset()
    setShowBlockedForm(false)
  }

  const handleDeleteBlockedDate = async (id: string) => {
    if (window.confirm(t('scheduling.confirmDeleteBlocked'))) {
      await deleteBlocked.mutateAsync(id)
    }
  }

  if (availabilityLoading || blockedLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Weekly Availability */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('scheduling.weeklyAvailability')}
          </h3>
          {editedAvailability.length > 0 && (
            <button
              onClick={saveAvailability}
              disabled={bulkUpdate.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkUpdate.isPending ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => {
            const isAvailable = getAvailabilityValue(day.value, 'is_available') as boolean
            return (
              <div
                key={day.value}
                className={`p-4 rounded-lg border ${
                  isAvailable ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 min-w-32">
                    <input
                      type="checkbox"
                      checked={isAvailable ?? true}
                      onChange={(e) =>
                        handleAvailabilityChange(day.value, 'is_available', e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="font-medium text-gray-900">
                      {isRTL ? day.label_he : day.label_en}
                    </span>
                  </label>

                  {isAvailable && (
                    <>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <input
                          type="time"
                          value={(getAvailabilityValue(day.value, 'start_time') as string) || '08:00'}
                          onChange={(e) =>
                            handleAvailabilityChange(day.value, 'start_time', e.target.value)
                          }
                          className="rounded border-gray-300 text-sm"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={(getAvailabilityValue(day.value, 'end_time') as string) || '18:00'}
                          onChange={(e) =>
                            handleAvailabilityChange(day.value, 'end_time', e.target.value)
                          }
                          className="rounded border-gray-300 text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2 ms-auto">
                        <label className="text-sm text-gray-600">
                          {t('scheduling.maxBookings')}:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={(getAvailabilityValue(day.value, 'max_bookings') as number) || 5}
                          onChange={(e) =>
                            handleAvailabilityChange(day.value, 'max_bookings', parseInt(e.target.value))
                          }
                          className="w-16 rounded border-gray-300 text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('scheduling.blockedDates')}
          </h3>
          <button
            onClick={() => setShowBlockedForm(!showBlockedForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t('scheduling.addBlockedDate')}
          </button>
        </div>

        {/* Add Blocked Date Form */}
        {showBlockedForm && (
          <form
            onSubmit={blockedForm.handleSubmit(handleAddBlockedDate)}
            className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scheduling.date')}
                </label>
                <input
                  type="date"
                  {...blockedForm.register('date', { required: true })}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('scheduling.reason')}
                </label>
                <input
                  type="text"
                  {...blockedForm.register('reason')}
                  placeholder={t('scheduling.reasonPlaceholder')}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...blockedForm.register('is_full_day')}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{t('scheduling.fullDay')}</span>
            </label>

            {!blockedForm.watch('is_full_day') && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  {...blockedForm.register('start_time')}
                  className="rounded border-gray-300 text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="time"
                  {...blockedForm.register('end_time')}
                  className="rounded border-gray-300 text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBlockedForm(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createBlocked.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {createBlocked.isPending ? t('common.adding') : t('scheduling.blockDate')}
              </button>
            </div>
          </form>
        )}

        {/* Blocked Dates List */}
        <div className="space-y-2">
          {blockedDates?.map((blocked) => (
            <div
              key={blocked.id}
              className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">
                  {format(new Date(blocked.date), 'dd/MM/yyyy')}
                </span>
                {!blocked.is_full_day && (
                  <span className="text-sm text-gray-600">
                    {blocked.start_time} - {blocked.end_time}
                  </span>
                )}
                {blocked.reason && (
                  <span className="text-sm text-gray-500">- {blocked.reason}</span>
                )}
              </div>
              <button
                onClick={() => handleDeleteBlockedDate(blocked.id)}
                className="p-1 text-red-500 hover:text-red-700"
                disabled={deleteBlocked.isPending}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          {(!blockedDates || blockedDates.length === 0) && !showBlockedForm && (
            <p className="text-center text-gray-500 py-4">
              {t('scheduling.noBlockedDates')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
