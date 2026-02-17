import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { useRevenue } from '../../api/hooks'
import LoadingSpinner from '../common/LoadingSpinner'

type ChartType = 'line' | 'bar'
type Granularity = 'daily' | 'weekly' | 'monthly'

interface RevenueChartProps {
  days?: number
}

export default function RevenueChart({ days = 30 }: RevenueChartProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [chartType, setChartType] = useState<ChartType>('line')
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const endDate = new Date()
  const startDate = subDays(endDate, days)

  const { data, isLoading, error } = useRevenue({
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
    granularity,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{t('common.error')}</div>

  const chartData = data?.data.map((item) => ({
    ...item,
    date: item.date,
    formattedDate: granularity === 'monthly'
      ? format(new Date(item.date), 'MMM yyyy')
      : format(new Date(item.date), 'dd/MM'),
  })) || []

  const formatCurrency = (value: number) => `₪${value.toLocaleString()}`

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('analytics.revenueChart')}</h3>

        <div className="flex items-center gap-4">
          {/* Granularity */}
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="text-sm rounded-lg border-gray-300"
          >
            <option value="daily">{t('analytics.daily')}</option>
            <option value="weekly">{t('analytics.weekly')}</option>
            <option value="monthly">{t('analytics.monthly')}</option>
          </select>

          {/* Chart Type */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm ${
                chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              {t('analytics.line')}
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-sm ${
                chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              {t('analytics.bar')}
            </button>
          </div>
        </div>
      </div>

      {/* Totals */}
      {data?.totals && (
        <div className="flex gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500">{t('analytics.totalRevenue')}</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totals.revenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('analytics.totalOrders')}</p>
            <p className="text-2xl font-bold text-blue-600">{data.totals.orders}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), t('analytics.revenue')]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name={t('analytics.revenue')}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                name={t('analytics.orders')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                yAxisId="right"
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? t('analytics.revenue') : t('analytics.orders'),
                ]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar
                dataKey="revenue"
                name={t('analytics.revenue')}
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
