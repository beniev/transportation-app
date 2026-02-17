import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { useOrder } from '../../api/hooks'
import {
  useComparison,
  useSelectMover,
  useRequestManualQuote,
} from '../../api/hooks/useComparisons'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import MoverComparisonCard from '../../components/comparisons/MoverComparisonCard'

export default function CompareMovers() {
  const { t, i18n } = useTranslation()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'he'

  const { data: order, isLoading: orderLoading } = useOrder(orderId || '')
  const { data: comparison, isLoading: comparisonLoading } = useComparison(orderId || '')
  const selectMoverMutation = useSelectMover()
  const manualQuoteMutation = useRequestManualQuote()

  const isLoading = orderLoading || comparisonLoading

  const handleSelectMover = async (entryId: string) => {
    if (!orderId) return

    try {
      await selectMoverMutation.mutateAsync({ orderId, data: { entry_id: entryId } })
      toast.success(isRTL ? 'המוביל נבחר בהצלחה!' : 'Mover selected successfully!')
      navigate(`/order/status/${orderId}`)
    } catch {
      toast.error(isRTL ? 'שגיאה בבחירת המוביל' : 'Error selecting mover')
    }
  }

  const handleManualQuote = async () => {
    if (!orderId) return

    try {
      await manualQuoteMutation.mutateAsync(orderId)
      toast.success(
        isRTL
          ? 'ההזמנה נשלחה לקבלת הצעות ידניות'
          : 'Order sent for manual quotes'
      )
      navigate(`/order/status/${orderId}`)
    } catch {
      toast.error(isRTL ? 'שגיאה בבקשה' : 'Error requesting manual quote')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!order || !comparison) {
    return (
      <div className="card text-center py-8">
        <p className="text-red-500">{t('orders.notFound')}</p>
      </div>
    )
  }

  const entries = comparison.entries || []
  const isGenerating = comparison.status === 'generating'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <h1 className="text-2xl font-bold mb-2">{t('comparison.title')}</h1>
      <p className="text-gray-500 mb-6">{t('comparison.subtitle')}</p>

      {/* Order Summary */}
      <div className="card mb-6 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('orders.origin')}:</span>{' '}
            <span className="font-medium">{order.origin_city}</span>
          </div>
          <div>
            <span className="text-gray-500">{t('orders.destination')}:</span>{' '}
            <span className="font-medium">{order.destination_city}</span>
          </div>
          {order.items && (
            <div>
              <span className="text-gray-500">{t('orders.items')}:</span>{' '}
              <span className="font-medium">{order.items.length}</span>
            </div>
          )}
          {order.preferred_date && (
            <div>
              <span className="text-gray-500">{t('orders.preferredDate')}:</span>{' '}
              <span className="font-medium">
                {new Date(order.preferred_date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="card text-center py-8 mb-6">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">{t('comparison.generating')}</p>
        </div>
      )}

      {/* Results */}
      {!isGenerating && entries.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {t('comparison.resultsCount', { count: entries.length })}
          </p>

          <div className="space-y-4">
            {entries.map((entry) => (
              <MoverComparisonCard
                key={entry.id}
                entry={entry}
                isBestPrice={entry.rank === 1}
                onSelect={handleSelectMover}
                isSelecting={selectMoverMutation.isPending}
              />
            ))}
          </div>
        </>
      )}

      {/* No movers */}
      {!isGenerating && entries.length === 0 && (
        <div className="card text-center py-8 mb-6">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-medium mb-2">{t('comparison.noMovers')}</h2>
          <p className="text-gray-500 mb-4">{t('comparison.noMoversDescription')}</p>
        </div>
      )}

      {/* Manual Quote Option */}
      <div className="card mt-6 bg-blue-50 border border-blue-200">
        <p className="text-blue-800 mb-3">{t('comparison.manualQuotePrompt')}</p>
        <button
          onClick={handleManualQuote}
          disabled={manualQuoteMutation.isPending}
          className="btn btn-secondary"
        >
          {manualQuoteMutation.isPending
            ? t('common.loading')
            : t('comparison.requestManualQuote')}
        </button>
      </div>
    </div>
  )
}
