import { useTranslation } from 'react-i18next'
import StarRating from './StarRating'
import type { Review } from '../../api/endpoints/reviews'

interface ReviewListProps {
  reviews: Review[]
}

export default function ReviewList({ reviews }: ReviewListProps) {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  if (reviews.length === 0) {
    return (
      <p className="text-gray-400 text-center py-4 text-sm">
        {isRTL ? 'אין ביקורות עדיין' : 'No reviews yet'}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} readOnly size="sm" />
              <span className="text-sm font-medium">{review.customer_name}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
            </span>
          </div>
          {review.text && (
            <p className="text-sm text-gray-600 mt-1">{review.text}</p>
          )}
        </div>
      ))}
    </div>
  )
}
