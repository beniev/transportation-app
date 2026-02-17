import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useOrder, useClaimOrder, useApproveOrder, useCompleteOrder } from '../../api/hooks'
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

export default function MoverOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const navigate = useNavigate()

  const { data: order, isLoading, error } = useOrder(id || '')
  const claimMutation = useClaimOrder()
  const approveMutation = useApproveOrder()
  const completeMutation = useCompleteOrder()

  const handleClaim = async () => {
    if (!id) return
    try {
      await claimMutation.mutateAsync(id)
      toast.success(isRTL ? 'ההזמנה נתפסה בהצלחה!' : 'Order claimed successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'))
    }
  }

  const handleApprove = async () => {
    if (!id) return
    try {
      await approveMutation.mutateAsync(id)
      toast.success(isRTL ? 'ההזמנה אושרה' : 'Order approved')
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleComplete = async () => {
    if (!id) return
    try {
      await completeMutation.mutateAsync(id)
      toast.success(isRTL ? 'ההזמנה הושלמה' : 'Order completed')
    } catch {
      toast.error(t('common.error'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t('orders.notFound')}</p>
        <Link to="/mover/orders" className="text-blue-600 hover:text-blue-800">
          {isRTL ? 'חזרה להזמנות' : 'Back to orders'}
        </Link>
      </div>
    )
  }

  const items = order.items || []

  return (
    <div className="max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/mover/orders')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← {isRTL ? 'חזרה להזמנות' : 'Back to orders'}
          </button>
          <h1 className="text-2xl font-bold">{t('orders.orderDetails')}</h1>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            statusColors[order.status as OrderStatus] || 'bg-gray-100'
          }`}
        >
          {t(`orders.statuses.${order.status}`)}
        </span>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">{t('orders.customer')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {order.customer_name && order.customer_name !== order.customer_email && (
            <div>
              <p className="text-gray-500">{isRTL ? 'שם' : 'Name'}</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
          )}
          {order.customer_email && (
            <div>
              <p className="text-gray-500">{isRTL ? 'אימייל' : 'Email'}</p>
              <p className="font-medium" dir="ltr">{order.customer_email}</p>
            </div>
          )}
          {order.customer_phone && (
            <div>
              <p className="text-gray-500">{isRTL ? 'טלפון' : 'Phone'}</p>
              <p className="font-medium" dir="ltr">{order.customer_phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Origin */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-700">
            {t('orders.origin')}
          </h2>
          <div className="space-y-2 text-sm">
            <p>{order.origin_address || order.origin_city}</p>
            {order.origin_city && order.origin_address && (
              <p className="text-gray-500">{order.origin_city}</p>
            )}
            <div className="flex gap-4 pt-2 text-gray-600">
              <span>{t('orders.floor')}: {order.origin_floor}</span>
              <span>
                {order.origin_has_elevator
                  ? (isRTL ? '✅ מעלית' : '✅ Elevator')
                  : (isRTL ? '❌ ללא מעלית' : '❌ No elevator')}
              </span>
            </div>
            {order.origin_distance_to_truck > 0 && (
              <p className="text-gray-500">
                {isRTL ? 'מרחק למשאית:' : 'Distance to truck:'} {order.origin_distance_to_truck}m
              </p>
            )}
          </div>
        </div>

        {/* Destination */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3 text-green-700">
            {t('orders.destination')}
          </h2>
          <div className="space-y-2 text-sm">
            <p>{order.destination_address || order.destination_city}</p>
            {order.destination_city && order.destination_address && (
              <p className="text-gray-500">{order.destination_city}</p>
            )}
            <div className="flex gap-4 pt-2 text-gray-600">
              <span>{t('orders.floor')}: {order.destination_floor}</span>
              <span>
                {order.destination_has_elevator
                  ? (isRTL ? '✅ מעלית' : '✅ Elevator')
                  : (isRTL ? '❌ ללא מעלית' : '❌ No elevator')}
              </span>
            </div>
            {order.destination_distance_to_truck > 0 && (
              <p className="text-gray-500">
                {isRTL ? 'מרחק למשאית:' : 'Distance to truck:'} {order.destination_distance_to_truck}m
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date & Distance */}
      {(order.preferred_date || order.moving_date || order.distance_km > 0) && (
        <div className="bg-white rounded-xl shadow p-6 mb-4">
          <div className="flex flex-wrap gap-6 text-sm">
            {(order.preferred_date || order.moving_date) && (
              <div>
                <p className="text-gray-500">{t('orders.preferredDate')}</p>
                <p className="font-medium">
                  {order.date_flexibility === 'range' && order.preferred_date_end
                    ? `${new Date(order.preferred_date!).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')} - ${new Date(order.preferred_date_end).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}`
                    : new Date(order.preferred_date || order.moving_date!).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                  }
                </p>
                {order.date_flexibility === 'range' && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full mt-1 inline-block">
                    {isRTL ? 'טווח גמיש' : 'Flexible range'}
                  </span>
                )}
              </div>
            )}
            {order.preferred_time_slot && (
              <div>
                <p className="text-gray-500">{isRTL ? 'שעה מועדפת' : 'Preferred time'}</p>
                <p className="font-medium">{order.preferred_time_slot}</p>
              </div>
            )}
            {order.distance_km > 0 && (
              <div>
                <p className="text-gray-500">{isRTL ? 'מרחק' : 'Distance'}</p>
                <p className="font-medium">{Number(order.distance_km).toFixed(1)} {isRTL ? 'ק"מ' : 'km'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">
          {t('orders.items')} ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('orders.noItems')}</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">
                    {isRTL ? (item.item_type_name_he || item.item_type_name) : item.item_type_name}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500 mt-1">
                    <span>x{item.quantity}</span>
                    {item.requires_assembly && (
                      <span className="text-blue-600">{t('orders.assembly')}</span>
                    )}
                    {item.is_fragile && (
                      <span className="text-red-600">{t('orders.fragile')}</span>
                    )}
                    {item.room_name && (
                      <span>{item.room_name}</span>
                    )}
                    {item.notes && (
                      <span className="text-gray-400">{item.notes}</span>
                    )}
                  </div>
                </div>
                {item.total_price > 0 && (
                  <span className="font-medium text-green-600">
                    ₪{Number(item.total_price).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description & Notes */}
      {(order.original_description || order.customer_notes || order.special_instructions || order.free_text_description) && (
        <div className="bg-white rounded-xl shadow p-6 mb-4">
          {(order.original_description || order.free_text_description) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                {isRTL ? 'תיאור חופשי' : 'Description'}
              </h3>
              <p className="text-sm bg-gray-50 rounded-lg p-3">{order.original_description || order.free_text_description}</p>
            </div>
          )}
          {(order.customer_notes || order.special_instructions) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                {t('orders.specialInstructions')}
              </h3>
              <p className="text-sm bg-amber-50 rounded-lg p-3">{order.customer_notes || order.special_instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Price Breakdown */}
      {order.total_price > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-3">{t('orders.priceBreakdown')}</h2>
          <div className="space-y-2 text-sm">
            {(order.items_subtotal || order.subtotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.subtotal')}</span>
                <span>₪{Number(order.items_subtotal || order.subtotal).toLocaleString()}</span>
              </div>
            )}
            {(order.origin_floor_surcharge > 0 || order.destination_floor_surcharge > 0) && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.floorSurcharge')}</span>
                <span>₪{Number((order.origin_floor_surcharge || 0) + (order.destination_floor_surcharge || 0)).toLocaleString()}</span>
              </div>
            )}
            {order.distance_surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.distanceSurcharge')}</span>
                <span>₪{Number(order.distance_surcharge).toLocaleString()}</span>
              </div>
            )}
            {order.travel_cost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{isRTL ? 'עלות נסיעה' : 'Travel cost'}</span>
                <span>₪{Number(order.travel_cost).toLocaleString()}</span>
              </div>
            )}
            {(order.seasonal_adjustment || order.seasonal_surcharge) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.seasonalSurcharge')}</span>
                <span>₪{Number(order.seasonal_adjustment || order.seasonal_surcharge).toLocaleString()}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{isRTL ? 'הנחה' : 'Discount'}</span>
                <span>-₪{Number(order.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t font-bold text-lg">
              <span>{t('orders.totalPrice')}</span>
              <span className="text-green-600">₪{Number(order.total_price).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8">
        {order.status === 'pending' && !order.customer && (
          <button
            onClick={handleClaim}
            disabled={claimMutation.isPending}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {claimMutation.isPending
              ? '...'
              : (isRTL ? 'קבל הזמנה' : 'Claim Order')}
          </button>
        )}
        {order.status === 'pending' && (
          <button
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {approveMutation.isPending
              ? '...'
              : t('orders.approve')}
          </button>
        )}
        {(order.status === 'approved' || order.status === 'scheduled') && (
          <button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {completeMutation.isPending
              ? '...'
              : t('orders.complete')}
          </button>
        )}
      </div>
    </div>
  )
}
