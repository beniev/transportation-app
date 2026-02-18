import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrder } from '../../api/hooks'
import { useSubmitOrder } from '../../api/hooks/useOrders'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ReviewForm from '../../components/reviews/ReviewForm'
import StarRating from '../../components/reviews/StarRating'
import { reviewsAPI, type Review } from '../../api/endpoints/reviews'
import type { OrderStatus as OrderStatusType } from '../../types'

const statusColors: Record<OrderStatusType, string> = {
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

const statusSteps: OrderStatusType[] = ['draft', 'pending', 'comparing', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed']

export default function OrderStatus() {
  const { t, i18n } = useTranslation()
  const { orderId } = useParams()
  const isRTL = i18n.language === 'he'

  const { data: order, isLoading, error, refetch } = useOrder(orderId || '')
  const submitOrderMutation = useSubmitOrder()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    if (order?.status === 'completed' && orderId) {
      setReviewLoading(true)
      reviewsAPI.getForOrder(orderId)
        .then((review) => setExistingReview(review))
        .catch(() => { /* No review yet */ })
        .finally(() => setReviewLoading(false))
    }
  }, [order?.status, orderId])

  const handleSubmitOrder = async () => {
    if (!orderId) return
    setSubmitError(null)
    try {
      await submitOrderMutation.mutateAsync(orderId)
    } catch (err: any) {
      setSubmitError(
        isRTL
          ? 'שגיאה בשליחת ההזמנה. נסה שוב.'
          : 'Error submitting order. Please try again.'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="card text-center py-8">
        <p className="text-red-500">{t('orders.notFound')}</p>
        <Link to="/order" className="btn btn-primary mt-4">
          {t('orders.newOrder')}
        </Link>
      </div>
    )
  }

  const currentStepIndex = statusSteps.indexOf(order.status)
  const isDraft = order.status === 'draft'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Draft Order - Ready to Submit */}
      {isDraft && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-blue-800 mb-2">
            {isRTL ? 'ההזמנה מוכנה לשליחה!' : 'Order Ready to Submit!'}
          </h1>
          <p className="text-blue-700 mb-4">
            {isRTL
              ? 'בדוק את הפרטים למטה ולחץ "שלח למובילים" כדי לקבל הצעות מחיר.'
              : 'Review the details below and click "Send to Movers" to receive price quotes.'}
          </p>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmitOrder}
            disabled={submitOrderMutation.isPending}
            className="inline-flex items-center px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {submitOrderMutation.isPending
              ? (isRTL ? '⏳ שולח...' : '⏳ Submitting...')
              : (isRTL ? '🚚 שלח למובילים' : '🚚 Send to Movers')}
          </button>
        </div>
      )}

      {/* Order Submitted Successfully */}
      {order.status === 'pending' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">
            {isRTL ? 'ההזמנה נשלחה בהצלחה!' : 'Order Submitted Successfully!'}
          </h1>
          <p className="text-green-700">
            {isRTL
              ? 'ההזמנה שלך נשלחה למובילים באזור. תקבל הצעות מחיר בקרוב.'
              : 'Your order has been sent to movers in your area. You will receive quotes soon.'}
          </p>
        </div>
      )}

      {!isDraft && (
        <h1 className="text-2xl font-bold mb-6">{t('orders.orderDetails')}</h1>
      )}

      {/* Status Badge */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500">{t('orders.orderNumber')}</span>
          <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">{t('orders.status')}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
            {t(`orders.statuses.${order.status}`)}
          </span>
        </div>
        {order.created_at && (
          <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
            <span>{isRTL ? 'נוצר בתאריך' : 'Created'}</span>
            <span>{new Date(order.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}</span>
          </div>
        )}
      </div>

      {/* What's Next - for draft orders */}
      {isDraft && (
        <div className="card mb-6 bg-amber-50 border border-amber-200">
          <h2 className="text-lg font-medium mb-3 text-amber-800">
            {isRTL ? 'איך זה עובד?' : "How It Works"}
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-amber-700">
            <li>{isRTL ? 'בדוק את הפרטים למטה ולחץ "שלח למובילים"' : 'Review details below and click "Send to Movers"'}</li>
            <li>{isRTL ? 'המערכת תחשב הצעות מחיר מכמה מובילים' : 'System will calculate price quotes from multiple movers'}</li>
            <li>{isRTL ? 'השווה מחירים ובחר את ההצעה המתאימה לך' : 'Compare prices and choose the best quote'}</li>
            <li>{isRTL ? 'תאם תאריך ושעה להובלה' : 'Schedule your moving date and time'}</li>
          </ol>
        </div>
      )}

      {/* Compare Prices CTA */}
      {(order.status === 'comparing' || order.status === 'pending') && (
        <div className="card mb-6 bg-indigo-50 border border-indigo-200 text-center">
          <div className="text-3xl mb-2">💰</div>
          <h2 className="text-lg font-medium text-indigo-800 mb-2">
            {isRTL ? 'השוואת מחירים מוכנה!' : 'Price Comparison Ready!'}
          </h2>
          <p className="text-indigo-700 mb-4">
            {isRTL
              ? 'קיבלנו הצעות מחיר ממובילים באזור שלך. השווה ובחר את המוביל המתאים.'
              : 'We received price quotes from movers in your area. Compare and select the best one.'}
          </p>
          <Link
            to={`/order/compare/${order.id}`}
            className="btn btn-primary inline-block"
          >
            {isRTL ? 'השווה מחירים' : 'Compare Prices'}
          </Link>
        </div>
      )}

      {/* Progress Steps */}
      {order.status !== 'cancelled' && order.status !== 'rejected' && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">{t('orders.progress')}</h2>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {statusSteps.slice(0, -1).map((status, index) => (
              <div key={status} className="flex items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    index <= currentStepIndex
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                {index < statusSteps.length - 2 && (
                  <div
                    className={`w-6 md:w-12 h-1 mx-1 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {statusSteps.slice(0, -1).map((status) => (
              <span key={status} className="text-center w-12 md:w-16 flex-shrink-0">
                {t(`orders.statuses.${status}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-2">{t('orders.origin')}</h3>
          <p className="text-lg">{order.origin_address}</p>
          <p className="text-gray-500">{order.origin_city}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>{t('orders.floor')}: {order.origin_floor}</span>
            {order.origin_has_elevator && <span>✓ {t('orders.hasElevator')}</span>}
          </div>
        </div>
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-2">{t('orders.destination')}</h3>
          <p className="text-lg">{order.destination_address}</p>
          <p className="text-gray-500">{order.destination_city}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>{t('orders.floor')}: {order.destination_floor}</span>
            {order.destination_has_elevator && <span>✓ {t('orders.hasElevator')}</span>}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-6">
        <h2 className="text-lg font-medium mb-4">{t('orders.items')}</h2>
        {order.items && order.items.length > 0 ? (
          <div className="space-y-3">
            {order.items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">
                    {item.name_he || item.name || item.item_type_name || 'פריט'}
                  </span>
                  <span className="text-gray-500 mx-2">x{item.quantity}</span>
                  {item.requires_assembly && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {t('orders.assembly')}
                    </span>
                  )}
                  {item.is_fragile && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded mx-1">
                      {t('orders.fragile')}
                    </span>
                  )}
                </div>
                {item.total_price > 0 && (
                  <span className="font-medium">₪{item.total_price}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">{t('orders.noItems')}</p>
        )}
      </div>

      {/* Original Description */}
      {order.original_description && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-2">
            {isRTL ? 'תיאור מקורי' : 'Original Description'}
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{order.original_description}</p>
        </div>
      )}

      {/* Price Breakdown - only show if there's a price */}
      {(order.total_price > 0 || order.items_subtotal > 0) && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">{t('orders.priceBreakdown')}</h2>
          <div className="space-y-2">
            {order.items_subtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.subtotal')}</span>
                <span>₪{Number(order.items_subtotal).toLocaleString()}</span>
              </div>
            )}
            {order.origin_floor_surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.floorSurcharge')} ({isRTL ? 'מקור' : 'Origin'})</span>
                <span>₪{Number(order.origin_floor_surcharge).toLocaleString()}</span>
              </div>
            )}
            {order.destination_floor_surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.floorSurcharge')} ({isRTL ? 'יעד' : 'Dest'})</span>
                <span>₪{Number(order.destination_floor_surcharge).toLocaleString()}</span>
              </div>
            )}
            {order.distance_surcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.distanceSurcharge')}</span>
                <span>₪{Number(order.distance_surcharge).toLocaleString()}</span>
              </div>
            )}
            {order.total_price > 0 && (
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('orders.totalPrice')}</span>
                  <span className="text-green-600">₪{Number(order.total_price).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No price yet message */}
      {order.total_price === 0 && order.items_subtotal === 0 && (
        <div className="card mb-6 bg-yellow-50 border border-yellow-200">
          <div className="text-center py-4">
            <span className="text-2xl">💰</span>
            <p className="text-yellow-800 mt-2">
              {isRTL
                ? 'הצעות מחיר יתקבלו מהמובילים בקרוב'
                : 'Price quotes will be received from movers soon'}
            </p>
          </div>
        </div>
      )}

      {/* Moving Date */}
      {/* Preferred Date (before scheduling) */}
      {order.preferred_date && !order.scheduled_date && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-2">{t('orders.preferredDate')}</h2>
          <p className="text-lg">
            {order.date_flexibility === 'range' && order.preferred_date_end
              ? `${new Date(order.preferred_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })} - ${new Date(order.preferred_date_end).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}`
              : new Date(order.preferred_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })
            }
          </p>
          {order.date_flexibility === 'range' && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full mt-1 inline-block">
              {isRTL ? 'טווח גמיש' : 'Flexible range'}
            </span>
          )}
          {order.preferred_time_slot && (
            <p className="text-gray-500 mt-1">
              {order.preferred_time_slot === 'morning' ? (isRTL ? 'בוקר (08:00-12:00)' : 'Morning (08:00-12:00)')
                : order.preferred_time_slot === 'afternoon' ? (isRTL ? 'צהריים (12:00-16:00)' : 'Afternoon (12:00-16:00)')
                : order.preferred_time_slot === 'evening' ? (isRTL ? 'ערב (16:00-20:00)' : 'Evening (16:00-20:00)')
                : order.preferred_time_slot}
            </p>
          )}
        </div>
      )}

      {/* Scheduled Date (after mover confirms) */}
      {order.scheduled_date && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-2">{t('orders.scheduledDate')}</h2>
          <p className="text-lg">
            {new Date(order.scheduled_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {order.scheduled_time && (
            <p className="text-gray-500">{order.scheduled_time}</p>
          )}
        </div>
      )}

      {/* Review Section - for completed orders */}
      {order.status === 'completed' && (
        <div className="card mb-6">
          {reviewLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : existingReview ? (
            <div>
              <h2 className="text-lg font-medium mb-2">
                {isRTL ? 'הביקורת שלך' : 'Your Review'}
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <StarRating rating={existingReview.rating} readOnly size="md" />
                <span className="text-sm text-gray-500">
                  {new Date(existingReview.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                </span>
              </div>
              {existingReview.text && (
                <p className="text-gray-700">{existingReview.text}</p>
              )}
            </div>
          ) : (
            <ReviewForm
              orderId={order.id}
              onSubmitted={() => {
                if (orderId) {
                  reviewsAPI.getForOrder(orderId).then(setExistingReview).catch(() => {})
                }
              }}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <Link to="/order" className="btn btn-primary flex-1 text-center">
          {isRTL ? 'הזמנה חדשה' : 'New Order'}
        </Link>
      </div>
    </div>
  )
}
