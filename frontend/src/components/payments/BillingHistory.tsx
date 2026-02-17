import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { usePaymentsHistory, useRetryPayment, useDownloadInvoice } from '../../api/hooks'
import type { PaymentStatus } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

const statusConfig: Record<PaymentStatus, { color: string; icon: React.ElementType }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  processing: { color: 'bg-blue-100 text-blue-800', icon: ArrowPathIcon },
  succeeded: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  failed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  refunded: { color: 'bg-gray-100 text-gray-800', icon: ArrowPathIcon },
  cancelled: { color: 'bg-gray-100 text-gray-500', icon: XCircleIcon },
}

export default function BillingHistory() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = usePaymentsHistory({ page })
  const retryPayment = useRetryPayment()
  const downloadInvoice = useDownloadInvoice()

  const handleRetry = async (id: string) => {
    await retryPayment.mutateAsync(id)
  }

  const handleDownloadInvoice = async (id: string, invoiceNumber: string) => {
    try {
      const blob = await downloadInvoice.mutateAsync(id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice_${invoiceNumber}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download invoice:', err)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{t('common.error')}</div>

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className="text-lg font-semibold text-gray-900">{t('payments.billingHistory')}</h3>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('payments.date')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('payments.description')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('payments.amount')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('payments.status')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('payments.invoice')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.results.map((payment) => {
              const status = statusConfig[payment.status]
              const StatusIcon = status.icon
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {payment.paid_at
                      ? format(new Date(payment.paid_at), 'dd/MM/yyyy')
                      : format(new Date(payment.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {payment.description || t('payments.subscription')}
                        </p>
                        {payment.payment_method_type && (
                          <p className="text-xs text-gray-500">
                            {payment.payment_method_type}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ₪{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {t(`payments.status.${payment.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {payment.invoice_number || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {payment.invoice_number && payment.status === 'succeeded' && (
                        <button
                          onClick={() => handleDownloadInvoice(payment.id, payment.invoice_number)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title={t('payments.downloadInvoice')}
                          disabled={downloadInvoice.isPending}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      )}
                      {payment.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(payment.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          disabled={retryPayment.isPending}
                        >
                          {t('payments.retry')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {data?.results.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            {t('payments.noPayments')}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.count > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('common.showing', { count: data.results.length, total: data.count })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.previous}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
