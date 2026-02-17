import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  DocumentTextIcon,
  PaperAirplaneIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { useQuotes, useDeleteQuote, useSendQuote, useGeneratePDF } from '../../api/hooks'
import type { Quote, QuoteStatus } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

interface QuoteListProps {
  onEdit?: (quote: Quote) => void
  onView?: (quote: Quote) => void
}

const statusConfig: Record<QuoteStatus, { color: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: DocumentTextIcon, label: 'draft' },
  sent: { color: 'bg-blue-100 text-blue-800', icon: PaperAirplaneIcon, label: 'sent' },
  viewed: { color: 'bg-yellow-100 text-yellow-800', icon: EyeIcon, label: 'viewed' },
  accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'accepted' },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: 'rejected' },
  expired: { color: 'bg-gray-100 text-gray-500', icon: ClockIcon, label: 'expired' },
}

export default function QuoteList({ onEdit, onView }: QuoteListProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuotes({ status: statusFilter || undefined, page })
  const deleteQuote = useDeleteQuote()
  const sendQuote = useSendQuote()
  const generatePDF = useGeneratePDF()

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const blob = await generatePDF.mutateAsync(quote.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quote_${quote.quote_number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    }
  }

  const handleSend = async (quote: Quote) => {
    if (window.confirm(t('quotes.confirmSend'))) {
      await sendQuote.mutateAsync(quote.id)
    }
  }

  const handleDelete = async (quote: Quote) => {
    if (window.confirm(t('quotes.confirmDelete'))) {
      await deleteQuote.mutateAsync(quote.id)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">{t('common.error')}</div>

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">{t('quotes.allStatuses')}</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {t(`quotes.status.${config.label}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Quotes Table */}
      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('quotes.quoteNumber')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('quotes.customer')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('quotes.amount')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('quotes.status')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('quotes.validUntil')}
              </th>
              <th className="px-4 py-3 text-start text-sm font-semibold text-gray-900">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.results.map((quote) => {
              const status = statusConfig[quote.status]
              const StatusIcon = status.icon
              return (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {quote.quote_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {quote.order_details?.customer_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    ₪{quote.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {t(`quotes.status.${status.label}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(new Date(quote.valid_until), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView?.(quote)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title={t('common.view')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {quote.status === 'draft' && (
                        <>
                          <button
                            onClick={() => onEdit?.(quote)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSend(quote)}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title={t('quotes.send')}
                            disabled={sendQuote.isPending}
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDownloadPDF(quote)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title={t('quotes.downloadPDF')}
                        disabled={generatePDF.isPending}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(quote)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title={t('common.delete')}
                          disabled={deleteQuote.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
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
            {t('quotes.noQuotes')}
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
