import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DashboardStats,
  RevenueChart,
  PopularItemsChart,
  ExportReports,
} from '../../components/analytics'

const PERIOD_OPTIONS = [
  { value: 7, label: '7' },
  { value: 30, label: '30' },
  { value: 90, label: '90' },
  { value: 365, label: '365' },
]

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [period, setPeriod] = useState(30)

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-600 mt-1">{t('analytics.subtitle')}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t('analytics.period')}:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label} {t('analytics.days')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats days={period} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart days={period} />
        <PopularItemsChart days={period} />
      </div>

      {/* Export Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExportReports />

        {/* Quick Tips */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('analytics.tips.title')}
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span className="text-sm text-gray-700">{t('analytics.tips.tip1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span className="text-sm text-gray-700">{t('analytics.tips.tip2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span className="text-sm text-gray-700">{t('analytics.tips.tip3')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
