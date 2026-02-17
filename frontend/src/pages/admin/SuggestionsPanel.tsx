import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminSuggestions, useApproveSuggestion, useRejectSuggestion } from '../../api/hooks/useAdmin'
import type { AdminSuggestion } from '../../api/endpoints/admin'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

const WEIGHT_LABELS: Record<string, { en: string; he: string }> = {
  light: { en: 'Light', he: 'קל' },
  medium: { en: 'Medium', he: 'בינוני' },
  heavy: { en: 'Heavy', he: 'כבד' },
  extra_heavy: { en: 'Extra Heavy', he: 'כבד מאוד' },
}

const WEIGHT_COLORS: Record<string, string> = {
  light: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  heavy: 'bg-orange-100 text-orange-700',
  extra_heavy: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function SuggestionsPanel() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: suggestions, isLoading } = useAdminSuggestions(statusFilter || undefined)
  const approveMutation = useApproveSuggestion()
  const rejectMutation = useRejectSuggestion()

  const handleApprove = async (suggestion: AdminSuggestion, overridePrice?: string, notes?: string) => {
    try {
      const data: Record<string, string> = {}
      if (overridePrice) data.default_base_price = overridePrice
      if (notes) data.admin_notes = notes
      await approveMutation.mutateAsync({ id: suggestion.id, data })
      toast.success(isRTL ? 'ההצעה אושרה והפריט נוצר!' : 'Suggestion approved & item created!')
      setExpandedId(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error approving suggestion')
    }
  }

  const handleReject = async (suggestion: AdminSuggestion, notes?: string) => {
    try {
      await rejectMutation.mutateAsync({ id: suggestion.id, data: { admin_notes: notes } })
      toast.success(isRTL ? 'ההצעה נדחתה' : 'Suggestion rejected')
      setExpandedId(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error rejecting suggestion')
    }
  }

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'pending', label: isRTL ? 'ממתינים' : 'Pending', labelEn: 'Pending' },
          { key: 'approved', label: isRTL ? 'אושרו' : 'Approved', labelEn: 'Approved' },
          { key: 'rejected', label: isRTL ? 'נדחו' : 'Rejected', labelEn: 'Rejected' },
          { key: '', label: isRTL ? 'הכל' : 'All', labelEn: 'All' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : !suggestions || suggestions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {isRTL
            ? statusFilter === 'pending'
              ? 'אין הצעות ממתינות'
              : 'אין הצעות'
            : statusFilter === 'pending'
              ? 'No pending suggestions'
              : 'No suggestions found'}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isRTL={isRTL}
              isExpanded={expandedId === suggestion.id}
              onToggle={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  isRTL,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  suggestion: AdminSuggestion
  isRTL: boolean
  isExpanded: boolean
  onToggle: () => void
  onApprove: (s: AdminSuggestion, price?: string, notes?: string) => void
  onReject: (s: AdminSuggestion, notes?: string) => void
  isApproving: boolean
  isRejecting: boolean
}) {
  const [overridePrice, setOverridePrice] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const isPending = suggestion.status === 'pending'

  return (
    <div className={`bg-white rounded-lg shadow border-r-4 ${
      suggestion.status === 'pending' ? 'border-amber-400' :
      suggestion.status === 'approved' ? 'border-green-400' : 'border-red-400'
    }`}>
      {/* Header row - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Occurrence badge */}
          {suggestion.occurrence_count > 1 && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
              x{suggestion.occurrence_count}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{isRTL ? suggestion.name_he : suggestion.name_en}</span>
              <span className="text-sm text-gray-500">
                ({isRTL ? suggestion.name_en : suggestion.name_he})
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>{isRTL ? suggestion.category_name_he : suggestion.category_name}</span>
              <span>·</span>
              <span>{suggestion.suggested_price} ₪</span>
              <span>·</span>
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${WEIGHT_COLORS[suggestion.weight_class] || ''}`}>
                {isRTL ? WEIGHT_LABELS[suggestion.weight_class]?.he : WEIGHT_LABELS[suggestion.weight_class]?.en}
              </span>
              {suggestion.source === 'auto' && (
                <>
                  <span>·</span>
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {isRTL ? 'אוטומטי' : 'Auto'}
                  </span>
                </>
              )}
              {suggestion.suggested_by_name && (
                <>
                  <span>·</span>
                  <span className="text-xs">{suggestion.suggested_by_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[suggestion.status] || ''}`}>
            {suggestion.status === 'pending' ? (isRTL ? 'ממתין' : 'Pending') :
             suggestion.status === 'approved' ? (isRTL ? 'אושר' : 'Approved') :
             (isRTL ? 'נדחה' : 'Rejected')}
          </span>
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t p-4 bg-gray-50/50">
          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'מחיר מוצע' : 'Suggested Price'}</div>
              <div className="font-medium" dir="ltr">{suggestion.suggested_price} ₪</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'משקל' : 'Weight'}</div>
              <div className="font-medium">
                {isRTL ? WEIGHT_LABELS[suggestion.weight_class]?.he : WEIGHT_LABELS[suggestion.weight_class]?.en}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'תכונות' : 'Properties'}</div>
              <div className="flex gap-1">
                {suggestion.requires_assembly && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    {isRTL ? 'הרכבה' : 'Assembly'}
                  </span>
                )}
                {suggestion.is_fragile && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                    {isRTL ? 'שביר' : 'Fragile'}
                  </span>
                )}
                {!suggestion.requires_assembly && !suggestion.is_fragile && (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'פעמים שנבקש' : 'Times Requested'}</div>
              <div className="font-medium">{suggestion.occurrence_count}</div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-gray-400 mb-4">
            {isRTL ? 'נוצר ב:' : 'Created:'} {new Date(suggestion.created_at).toLocaleString()}
            {suggestion.source === 'mover' && suggestion.suggested_by_name && (
              <span> · {isRTL ? 'הוצע ע"י' : 'By'}: {suggestion.suggested_by_name}</span>
            )}
          </div>

          {/* Admin notes display for non-pending */}
          {suggestion.admin_notes && !isPending && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'הערות מנהל' : 'Admin Notes'}</div>
              <div className="text-sm">{suggestion.admin_notes}</div>
            </div>
          )}

          {/* Action area - only for pending */}
          {isPending && (
            <div className="border-t pt-4 space-y-3">
              {/* Override price */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    {isRTL ? 'מחיר (אופציונלי - לשינוי)' : 'Override Price (optional)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    placeholder={suggestion.suggested_price}
                    className="input w-full"
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    {isRTL ? 'הערות מנהל' : 'Admin Notes'}
                  </label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={isRTL ? 'הערות...' : 'Notes...'}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => onApprove(
                    suggestion,
                    overridePrice || undefined,
                    adminNotes || undefined,
                  )}
                  disabled={isApproving}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isApproving
                    ? (isRTL ? 'מאשר...' : 'Approving...')
                    : (isRTL ? '✓ אשר והוסף לקטלוג' : '✓ Approve & Add to Catalog')}
                </button>
                <button
                  onClick={() => onReject(suggestion, adminNotes || undefined)}
                  disabled={isRejecting}
                  className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  {isRejecting
                    ? (isRTL ? 'דוחה...' : 'Rejecting...')
                    : (isRTL ? '✗ דחה' : '✗ Reject')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
