import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { usePopularItems } from '../../api/hooks'
import LoadingSpinner from '../common/LoadingSpinner'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

interface PopularItemsChartProps {
  days?: number
  limit?: number
}

export default function PopularItemsChart({ days = 30, limit = 10 }: PopularItemsChartProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const endDate = new Date()
  const startDate = subDays(endDate, days)

  const { data, isLoading, error } = usePopularItems({
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
    limit,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{t('common.error')}</div>

  const chartData = data?.items.map((item) => ({
    name: isRTL ? item.name_he : item.name,
    orders: item.order_count,
    quantity: item.total_quantity,
    revenue: item.total_revenue,
  })) || []

  const formatCurrency = (value: number) => `₪${value.toLocaleString()}`

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {t('analytics.popularItems')}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                width={120}
              />
              <Tooltip
                formatter={(value: number) => [value, t('analytics.orders')]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-start font-medium text-gray-600">
                  {t('analytics.item')}
                </th>
                <th className="py-2 text-end font-medium text-gray-600">
                  {t('analytics.orders')}
                </th>
                <th className="py-2 text-end font-medium text-gray-600">
                  {t('analytics.quantity')}
                </th>
                <th className="py-2 text-end font-medium text-gray-600">
                  {t('analytics.revenue')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-900">
                        {isRTL ? item.name_he : item.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-end text-gray-600">{item.order_count}</td>
                  <td className="py-2 text-end text-gray-600">{item.total_quantity}</td>
                  <td className="py-2 text-end font-medium text-gray-900">
                    {formatCurrency(item.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
