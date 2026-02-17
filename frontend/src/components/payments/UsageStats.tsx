import { useTranslation } from 'react-i18next'
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  PhotoIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { useUsageStats, useSubscription } from '../../api/hooks'
import LoadingSpinner from '../common/LoadingSpinner'

export default function UsageStats() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data: usage, isLoading: usageLoading } = useUsageStats()
  const { data: subscription, isLoading: subLoading } = useSubscription()

  if (usageLoading || subLoading) return <LoadingSpinner />
  if (!usage) return null

  const usageItems = [
    {
      label: t('payments.ordersUsed'),
      used: usage.orders_used,
      limit: usage.orders_limit,
      icon: ClipboardDocumentListIcon,
      color: 'blue',
    },
    {
      label: t('payments.quotesUsed'),
      used: usage.quotes_used,
      limit: usage.quotes_limit,
      icon: DocumentTextIcon,
      color: 'green',
    },
  ]

  const featureItems = [
    {
      label: t('payments.aiParsing'),
      available: usage.ai_parsing_available,
      icon: SparklesIcon,
    },
    {
      label: t('payments.aiImages'),
      available: usage.ai_images_available,
      icon: PhotoIcon,
    },
    {
      label: t('payments.digitalSignatures'),
      available: usage.digital_signatures_available,
      icon: PencilSquareIcon,
    },
    {
      label: t('payments.smsNotifications'),
      available: usage.sms_available,
      icon: ChatBubbleLeftRightIcon,
    },
  ]

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Current Plan */}
      {subscription && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">{t('payments.currentPlan')}</p>
              <h3 className="text-2xl font-bold">
                {isRTL ? subscription.plan.name_he : subscription.plan.name}
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                {subscription.billing_cycle === 'yearly'
                  ? t('payments.billedYearly')
                  : t('payments.billedMonthly')}
              </p>
            </div>
            <div className="text-end">
              <p className="text-blue-100 text-sm">{t('payments.nextBilling')}</p>
              <p className="font-semibold">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Meters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {t('payments.thisMonthUsage')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {usageItems.map((item) => {
            const percentage = item.limit ? Math.min((item.used / item.limit) * 100, 100) : 0
            const isUnlimited = !item.limit
            const isNearLimit = !isUnlimited && percentage >= 80

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.used}
                    {!isUnlimited && ` / ${item.limit}`}
                    {isUnlimited && ` (${t('payments.unlimited')})`}
                  </span>
                </div>

                {!isUnlimited && (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearLimit ? 'bg-red-500' : `bg-${item.color}-500`
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}

                {isNearLimit && (
                  <p className="text-xs text-red-600">{t('payments.nearLimit')}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {t('payments.features')}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featureItems.map((feature) => (
            <div
              key={feature.label}
              className={`flex items-center gap-2 p-3 rounded-lg ${
                feature.available
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <feature.icon
                className={`h-5 w-5 ${
                  feature.available ? 'text-green-600' : 'text-gray-400'
                }`}
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    feature.available ? 'text-green-800' : 'text-gray-500'
                  }`}
                >
                  {feature.label}
                </p>
                <p className="text-xs text-gray-500">
                  {feature.available ? t('payments.enabled') : t('payments.disabled')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
