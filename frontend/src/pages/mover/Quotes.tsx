import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@headlessui/react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { QuoteList, QuoteEditor, QuotePreview } from '../../components/quotes'
import { useOrders } from '../../api/hooks'
import type { Quote } from '../../types'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

export default function QuotesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [showOrderSelector, setShowOrderSelector] = useState(false)

  const { data: ordersData } = useOrders({ status: 'pending' })
  const pendingOrders = ordersData?.results || []

  const handleCreateQuote = (orderId: string) => {
    setSelectedOrderId(orderId)
    setSelectedQuote(null)
    setViewMode('create')
    setShowOrderSelector(false)
  }

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setSelectedOrderId(quote.order)
    setViewMode('edit')
  }

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setViewMode('view')
  }

  const handleSaveQuote = () => {
    setViewMode('list')
    setSelectedQuote(null)
    setSelectedOrderId('')
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedQuote(null)
    setSelectedOrderId('')
  }

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('quotes.title')}</h1>
          <p className="text-gray-600 mt-1">{t('quotes.subtitle')}</p>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={() => setShowOrderSelector(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            {t('quotes.createNew')}
          </button>
        )}

        {viewMode !== 'list' && (
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <XMarkIcon className="h-5 w-5" />
            {t('common.back')}
          </button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <QuoteList onEdit={handleEditQuote} onView={handleViewQuote} />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && selectedOrderId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {viewMode === 'create' ? t('quotes.createQuote') : t('quotes.editQuote')}
          </h2>
          <QuoteEditor
            orderId={selectedOrderId}
            quote={selectedQuote}
            onSave={handleSaveQuote}
            onCancel={handleCancel}
          />
        </div>
      )}

      {viewMode === 'view' && selectedQuote && (
        <QuotePreview quote={selectedQuote} />
      )}

      {/* Order Selector Modal */}
      <Dialog
        open={showOrderSelector}
        onClose={() => setShowOrderSelector(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {t('quotes.selectOrder')}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mt-1">
                {t('quotes.selectOrderDescription')}
              </Dialog.Description>

              <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                {pendingOrders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {t('quotes.noPendingOrders')}
                  </p>
                ) : (
                  pendingOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleCreateQuote(order.id)}
                      className="w-full text-start p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.customer_name || order.customer_email || t('common.customer')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.origin_city} → {order.destination_city}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          ₪{order.total_price?.toLocaleString() || 0}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowOrderSelector(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}
