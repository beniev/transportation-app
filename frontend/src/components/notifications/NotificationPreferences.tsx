import { useTranslation } from 'react-i18next'
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import {
  useNotificationTypes,
  useNotificationPreferences,
  useUpdatePreference,
  useSubscription,
} from '../../api/hooks'
import type { NotificationCategory } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

const categoryLabels: Record<NotificationCategory, { en: string; he: string }> = {
  order: { en: 'Orders', he: 'הזמנות' },
  quote: { en: 'Quotes', he: 'הצעות מחיר' },
  booking: { en: 'Bookings', he: 'הזמנות לו"ז' },
  payment: { en: 'Payments', he: 'תשלומים' },
  system: { en: 'System', he: 'מערכת' },
}

export default function NotificationPreferences() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data: types, isLoading: typesLoading } = useNotificationTypes()
  const { data: preferences, isLoading: prefsLoading } = useNotificationPreferences()
  const { data: subscription } = useSubscription()
  const updatePreference = useUpdatePreference()

  const hasSMS = subscription?.plan.has_sms_notifications || false

  if (typesLoading || prefsLoading) return <LoadingSpinner />

  // Group types by category
  const groupedTypes = types?.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = []
    }
    acc[type.category].push(type)
    return acc
  }, {} as Record<NotificationCategory, typeof types>)

  const getPreference = (typeCode: string) => {
    return preferences?.find((p) => p.notification_type === typeCode)
  }

  const handleToggle = (typeId: string, field: string, value: boolean) => {
    updatePreference.mutate({
      typeId,
      data: { [field]: value },
    })
  }

  const channels = [
    {
      key: 'email_enabled',
      label: t('notifications.email'),
      icon: EnvelopeIcon,
      available: true,
    },
    {
      key: 'sms_enabled',
      label: t('notifications.sms'),
      icon: DevicePhoneMobileIcon,
      available: hasSMS,
    },
    {
      key: 'push_enabled',
      label: t('notifications.push'),
      icon: BellAlertIcon,
      available: true,
    },
    {
      key: 'in_app_enabled',
      label: t('notifications.inApp'),
      icon: ComputerDesktopIcon,
      available: true,
    },
  ]

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t('notifications.preferences')}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {t('notifications.preferencesDescription')}
        </p>
      </div>

      {!hasSMS && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            {t('notifications.smsUpgrade')}
          </p>
        </div>
      )}

      {/* Channel Headers */}
      <div className="hidden md:flex items-center gap-4 pb-2 border-b border-gray-200">
        <div className="flex-1"></div>
        {channels.map((channel) => (
          <div
            key={channel.key}
            className={`w-20 text-center ${!channel.available ? 'opacity-50' : ''}`}
          >
            <channel.icon className="h-5 w-5 mx-auto text-gray-500" />
            <span className="text-xs text-gray-600">{channel.label}</span>
          </div>
        ))}
      </div>

      {/* Preferences by Category */}
      {Object.entries(groupedTypes || {}).map(([category, categoryTypes]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isRTL
              ? categoryLabels[category as NotificationCategory]?.he
              : categoryLabels[category as NotificationCategory]?.en}
          </h3>

          <div className="space-y-3">
            {categoryTypes?.filter((type) => type.is_user_configurable).map((type) => {
              const pref = getPreference(type.code)

              return (
                <div
                  key={type.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {isRTL ? type.name_he : type.name}
                    </p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                    {type.requires_premium && !hasSMS && (
                      <span className="inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {t('notifications.premiumFeature')}
                      </span>
                    )}
                  </div>

                  {/* Channel Toggles */}
                  <div className="flex items-center gap-4">
                    {channels.map((channel) => {
                      const isEnabled = pref?.[channel.key as keyof typeof pref] as boolean
                      const isAvailable = channel.available && (!type.requires_premium || hasSMS)

                      return (
                        <div key={channel.key} className="md:w-20 flex md:justify-center">
                          <label className="flex items-center gap-2 md:block md:text-center">
                            <span className="md:hidden text-sm text-gray-600">
                              {channel.label}
                            </span>
                            <div
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                !isAvailable
                                  ? 'bg-gray-200 cursor-not-allowed'
                                  : isEnabled
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled || false}
                                onChange={(e) =>
                                  handleToggle(type.id, channel.key, e.target.checked)
                                }
                                disabled={!isAvailable || updatePreference.isPending}
                                className="sr-only"
                              />
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
