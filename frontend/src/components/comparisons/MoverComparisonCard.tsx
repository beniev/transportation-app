import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ComparisonEntry } from '../../types'

interface MoverComparisonCardProps {
  entry: ComparisonEntry
  isBestPrice: boolean
  onSelect: (entryId: string) => void
  isSelecting: boolean
}

export default function MoverComparisonCard({
  entry,
  isBestPrice,
  onSelect,
  isSelecting,
}: MoverComparisonCardProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [showBreakdown, setShowBreakdown] = useState(false)

  const companyName = isRTL && entry.mover_company_name_he
    ? entry.mover_company_name_he
    : entry.mover_company_name

  const rating = parseFloat(entry.mover_rating)
  const breakdown = entry.pricing_breakdown

  return (
    <div
      className={`card relative transition-shadow hover:shadow-md ${
        isBestPrice ? 'border-2 border-green-500 bg-green-50' : ''
      }`}
    >
      {isBestPrice && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          {t('comparison.bestPrice')}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Mover Info */}
        <div className="flex items-center gap-3 flex-1">
          {/* Logo or Initial */}
          {entry.mover_logo_url ? (
            <img
              src={entry.mover_logo_url}
              alt={companyName}
              className="w-12 h-12 rounded-full object-cover border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
              {companyName.charAt(0)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{companyName}</h3>
              {entry.mover_is_verified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {t('comparison.verified')}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-sm ${
                      star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({entry.mover_total_reviews})
              </span>
            </div>

            {/* Stats */}
            <div className="text-xs text-gray-500 mt-1">
              {entry.mover_completed_orders} {t('comparison.completedOrders')}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-end">
          <div className="text-2xl font-bold text-green-600">
            ₪{Number(entry.total_price).toLocaleString()}
          </div>
          {!entry.used_custom_pricing && (
            <div className="text-xs text-orange-600 mt-1">
              {t('comparison.estimatedPrice')}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="text-sm text-blue-600 hover:text-blue-800 mt-3"
      >
        {showBreakdown ? t('comparison.hideBreakdown') : t('comparison.showBreakdown')}
      </button>

      {/* Price Breakdown */}
      {showBreakdown && breakdown && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
          {/* Items */}
          {breakdown.items_breakdown?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-gray-600">
              <span>{item.name}</span>
              <span>₪{Number(item.total).toLocaleString()}</span>
            </div>
          ))}

          {Number(breakdown.origin_floor_surcharge) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.floorSurcharge')} ({isRTL ? 'מקור' : 'Origin'})</span>
              <span>₪{Number(breakdown.origin_floor_surcharge).toLocaleString()}</span>
            </div>
          )}

          {Number(breakdown.destination_floor_surcharge) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.floorSurcharge')} ({isRTL ? 'יעד' : 'Dest'})</span>
              <span>₪{Number(breakdown.destination_floor_surcharge).toLocaleString()}</span>
            </div>
          )}

          {Number(breakdown.travel_cost) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('comparison.travelCost')}</span>
              <span>₪{Number(breakdown.travel_cost).toLocaleString()}</span>
            </div>
          )}

          {Number(breakdown.seasonal_adjustment) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.seasonalSurcharge')}</span>
              <span>₪{Number(breakdown.seasonal_adjustment).toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between font-bold border-t pt-2">
            <span>{t('orders.totalPrice')}</span>
            <span className="text-green-600">₪{Number(entry.total_price).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Select Button */}
      <button
        onClick={() => onSelect(entry.id)}
        disabled={isSelecting}
        className={`w-full mt-4 py-2.5 rounded-lg font-medium transition-colors ${
          isBestPrice
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } disabled:opacity-50`}
      >
        {isSelecting ? t('common.loading') : t('comparison.selectMover')}
      </button>
    </div>
  )
}
