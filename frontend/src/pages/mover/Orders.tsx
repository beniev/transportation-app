import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMoverOrders, useAvailableOrders, useClaimOrder, useApproveOrder, useCompleteOrder } from '../../api/hooks'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import type { OrderStatus } from '../../types'

const statusColors: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  comparing: 'bg-indigo-100 text-indigo-700',
  quoted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
}

type TabType = 'available' | 'my_orders'
type FilterStatus = 'all' | 'pending' | 'approved' | 'in_progress' | 'completed'

export default function MoverOrders() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [activeTab, setActiveTab] = useState<TabType>('available')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const { data: moverData, isLoading: moverLoading } = useMoverOrders(
    filterStatus !== 'all' ? { status: filterStatus } : undefined
  )
  const { data: availableData, isLoading: availableLoading } = useAvailableOrders()

  const claimOrderMutation = useClaimOrder()
  const approveOrderMutation = useApproveOrder()
  const completeOrderMutation = useCompleteOrder()

  const handleClaim = async (orderId: string) => {
    try {
      await claimOrderMutation.mutateAsync(orderId)
      toast.success(isRTL ? 'ההזמנה נתפסה בהצלחה!' : 'Order claimed successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'))
    }
  }

  const handleApprove = async (orderId: string) => {
    try {
      await approveOrderMutation.mutateAsync(orderId)
      toast.success(isRTL ? 'ההזמנה אושרה' : 'Order approved')
    } catch (error) {
      console.error('Error approving order:', error)
    }
  }

  const handleComplete = async (orderId: string) => {
    try {
      await completeOrderMutation.mutateAsync(orderId)
      toast.success(isRTL ? 'ההזמנה הושלמה' : 'Order completed')
    } catch (error) {
      console.error('Error completing order:', error)
    }
  }

  const moverOrders = moverData?.results || []
  const availableOrders = availableData?.results || []
  const isLoading = activeTab === 'available' ? availableLoading : moverLoading
  const orders = activeTab === 'available' ? availableOrders : moverOrders

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">{t('mover.orders')}</h1>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'הזמנות פתוחות' : 'Available Orders'}
          {availableOrders.length > 0 && (
            <span className="mr-2 bg-white text-green-600 px-2 py-0.5 rounded-full text-sm">
              {availableOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('my_orders')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'my_orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'ההזמנות שלי' : 'My Orders'}
        </button>
      </div>

      {/* Filter Tabs - only for my orders */}
      {activeTab === 'my_orders' && (
        <div className="card mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'in_progress', 'completed'] as FilterStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? t('common.all') : t(`orders.statuses.${status}`)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {activeTab === 'available'
              ? (isRTL ? 'אין הזמנות פתוחות כרגע' : 'No available orders right now')
              : t('common.noResults')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.status')}
                    </th>
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.customer')}
                    </th>
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.origin')}
                    </th>
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.destination')}
                    </th>
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.items')}
                    </th>
                    <th className="text-start py-3 px-4 font-medium text-gray-600">
                      {t('orders.preferredDate')}
                    </th>
                    <th className="text-end py-3 px-4 font-medium text-gray-600">
                      {t('orders.totalPrice')}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[order.status as OrderStatus] || 'bg-gray-100'
                          }`}
                        >
                          {t(`orders.statuses.${order.status}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {order.customer_name && order.customer_name !== order.customer_email && (
                            <p className="font-medium">{order.customer_name}</p>
                          )}
                          <p className={order.customer_name && order.customer_name !== order.customer_email ? 'text-sm text-gray-500' : 'font-medium'}>
                            {order.customer_email || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{order.origin_city}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{order.destination_city}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{order.items_count || 0} {isRTL ? 'פריטים' : 'items'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          {order.scheduled_date
                            ? new Date(order.scheduled_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                            : order.preferred_date
                            ? (order.date_flexibility === 'range' && order.preferred_date_end
                                ? `${new Date(order.preferred_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')} - ${new Date(order.preferred_date_end).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}`
                                : new Date(order.preferred_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US'))
                            : '-'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-end">
                        <span className="font-medium text-green-600">
                          {order.total_price > 0 ? `₪${Number(order.total_price).toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {activeTab === 'available' ? (
                            <>
                              <Link
                                to={`/mover/orders/${order.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {t('common.view')}
                              </Link>
                              <button
                                onClick={() => handleClaim(order.id)}
                                disabled={claimOrderMutation.isPending}
                                className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                              >
                                {claimOrderMutation.isPending ? '...' : (isRTL ? 'קבל הזמנה' : 'Claim')}
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                to={`/mover/orders/${order.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {t('common.view')}
                              </Link>
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleApprove(order.id)}
                                  disabled={approveOrderMutation.isPending}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  {t('orders.approve')}
                                </button>
                              )}
                              {(order.status === 'approved' || order.status === 'scheduled') && (
                                <button
                                  onClick={() => handleComplete(order.id)}
                                  disabled={completeOrderMutation.isPending}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  {t('orders.complete')}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[order.status as OrderStatus] || 'bg-gray-100'
                    }`}
                  >
                    {t(`orders.statuses.${order.status}`)}
                  </span>
                  <span className="font-bold text-green-600">
                    {order.total_price > 0 ? `₪${Number(order.total_price).toLocaleString()}` : '-'}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="font-medium">
                    {order.customer_name && order.customer_name !== order.customer_email
                      ? order.customer_name
                      : order.customer_email}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('orders.origin')}</p>
                    <p>{order.origin_city}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('orders.destination')}</p>
                    <p>{order.destination_city}</p>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span>{order.items_count || 0} {isRTL ? 'פריטים' : 'items'}</span>
                  {(order.scheduled_date || order.preferred_date) && (
                    <span>
                      {order.scheduled_date
                        ? new Date(order.scheduled_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                        : order.date_flexibility === 'range' && order.preferred_date_end
                        ? `${new Date(order.preferred_date!).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')} - ${new Date(order.preferred_date_end).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}`
                        : new Date(order.preferred_date!).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                      }
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  {activeTab === 'available' ? (
                    <>
                      <Link
                        to={`/mover/orders/${order.id}`}
                        className="btn btn-secondary flex-1 text-center text-sm"
                      >
                        {t('common.view')}
                      </Link>
                      <button
                        onClick={() => handleClaim(order.id)}
                        disabled={claimOrderMutation.isPending}
                        className="btn btn-primary flex-1"
                      >
                        {claimOrderMutation.isPending ? <LoadingSpinner /> : (isRTL ? 'קבל הזמנה' : 'Claim Order')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to={`/mover/orders/${order.id}`}
                        className="btn btn-secondary flex-1 text-center text-sm"
                      >
                        {t('common.view')}
                      </Link>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={approveOrderMutation.isPending}
                          className="btn btn-primary flex-1 text-sm"
                        >
                          {t('orders.approve')}
                        </button>
                      )}
                      {(order.status === 'approved' || order.status === 'scheduled') && (
                        <button
                          onClick={() => handleComplete(order.id)}
                          disabled={completeOrderMutation.isPending}
                          className="btn btn-primary flex-1 text-sm"
                        >
                          {t('orders.complete')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination info */}
      {((activeTab === 'available' && availableData?.count) ||
        (activeTab === 'my_orders' && moverData?.count)) && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {t('common.showing')} {orders.length} {t('common.of')}{' '}
          {activeTab === 'available' ? availableData?.count : moverData?.count} {t('common.results')}
        </div>
      )}
    </div>
  )
}
