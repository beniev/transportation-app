import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import type { Quote } from '../../types'

interface QuotePreviewProps {
  quote: Quote
  showActions?: boolean
  onDownloadPDF?: () => void
  onSign?: () => void
}

export default function QuotePreview({
  quote,
  showActions = false,
  onDownloadPDF,
  onSign,
}: QuotePreviewProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('quotes.quoteTitle')}</h2>
            <p className="text-blue-100 mt-1">#{quote.quote_number}</p>
          </div>
          <div className="text-end">
            <p className="text-sm text-blue-100">{t('quotes.issueDate')}</p>
            <p className="font-medium">{format(new Date(quote.created_at), 'dd/MM/yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="p-6 space-y-6">
        {/* Order Info */}
        {quote.order_details && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t('quotes.customer')}</p>
                  <p className="font-medium text-gray-900">{quote.order_details.customer_name}</p>
                  <p className="text-sm text-gray-600">{quote.order_details.customer_email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t('quotes.validUntil')}</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(quote.valid_until), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Addresses */}
        {quote.order_details && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">{t('orders.origin')}</p>
                <p className="font-medium text-gray-900">{quote.order_details.origin_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">{t('orders.destination')}</p>
                <p className="font-medium text-gray-900">{quote.order_details.destination_address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('quotes.items')}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">
                    {t('quotes.item')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                    {t('quotes.quantity')}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium text-gray-500">
                    {t('quotes.unitPrice')}
                  </th>
                  <th className="px-4 py-3 text-end text-sm font-medium text-gray-500">
                    {t('quotes.total')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {isRTL ? item.item_type_name_he : item.item_type_name}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {item.requires_assembly && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {t('quotes.assembly')}
                            </span>
                          )}
                          {item.is_fragile && (
                            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                              {t('quotes.fragile')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-end text-gray-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-end font-medium text-gray-900">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('quotes.subtotal')}</span>
              <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('quotes.discount')}</span>
                <span>-{formatCurrency(quote.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {t('quotes.tax')} ({(quote.tax_rate * 100).toFixed(0)}%)
              </span>
              <span className="font-medium">{formatCurrency(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span>{t('quotes.total')}</span>
              <span className="text-blue-600">{formatCurrency(quote.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(quote.notes || quote.notes_he) && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('quotes.notes')}</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {isRTL ? quote.notes_he || quote.notes : quote.notes || quote.notes_he}
            </p>
          </div>
        )}

        {/* Signature Status */}
        {quote.signed_at && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{t('quotes.signed')}</p>
              <p className="text-xs text-green-600">
                {format(new Date(quote.signed_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
            {onDownloadPDF && (
              <button
                onClick={onDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {t('quotes.downloadPDF')}
              </button>
            )}
            {onSign && quote.status === 'sent' && !quote.signed_at && (
              <button
                onClick={onSign}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {t('quotes.acceptAndSign')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
