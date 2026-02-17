import { useTranslation } from 'react-i18next'
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useDashboard } from '../../api/hooks'
import LoadingSpinner from '../common/LoadingSpinner'

interface DashboardStatsProps {
  days?: number
}

export default function DashboardStats({ days = 30 }: DashboardStatsProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data, isLoading, error } = useDashboard({ days })

  if (isLoading) return <LoadingSpinner />
  if (error || !data) return <div className="text-red-500">{t('common.error')}</div>

  const stats = [
    {
      name: t('analytics.totalRevenue'),
      value: `₪${data.revenue.total.toLocaleString()}`,
      subtext: `₪${data.revenue.average_per_day.toLocaleString()} ${t('analytics.perDay')}`,
      icon: CurrencyDollarIcon,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      name: t('analytics.totalOrders'),
      value: data.orders.total.toString(),
      subtext: `${data.orders.completion_rate}% ${t('analytics.completed')}`,
      icon: ShoppingCartIcon,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      name: t('analytics.quotesAccepted'),
      value: data.quotes.accepted.toString(),
      subtext: `${data.quotes.acceptance_rate}% ${t('analytics.acceptanceRate')}`,
      icon: DocumentTextIcon,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      name: t('analytics.aiUsage'),
      value: data.ai_usage.toString(),
      subtext: t('analytics.aiRequests'),
      icon: UsersIcon,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`${stat.color} rounded-lg p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs opacity-60 mt-1">{stat.subtext}</p>
              </div>
              <div className={`${stat.iconBg} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('analytics.ordersBreakdown')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.pending')}</span>
              <span className="font-medium">{data.orders.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.completed')}</span>
              <span className="font-medium text-green-600">{data.orders.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.cancelled')}</span>
              <span className="font-medium text-red-600">{data.orders.cancelled}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('analytics.quotesBreakdown')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.sent')}</span>
              <span className="font-medium">{data.quotes.sent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.accepted')}</span>
              <span className="font-medium text-green-600">{data.quotes.accepted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.pending')}</span>
              <span className="font-medium text-yellow-600">{data.quotes.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('analytics.rejected')}</span>
              <span className="font-medium text-red-600">{data.quotes.rejected}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
