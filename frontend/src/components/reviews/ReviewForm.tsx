import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import StarRating from './StarRating'
import { reviewsAPI } from '../../api/endpoints/reviews'

interface ReviewFormProps {
  orderId: string
  onSubmitted?: () => void
}

export default function ReviewForm({ orderId, onSubmitted }: ReviewFormProps) {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error(isRTL ? 'בחר דירוג' : 'Please select a rating')
      return
    }
    setIsSubmitting(true)
    try {
      await reviewsAPI.create(orderId, rating, text)
      toast.success(isRTL ? 'הביקורת נשלחה!' : 'Review submitted!')
      onSubmitted?.()
    } catch (err: any) {
      const msg = err.response?.data?.error || (isRTL ? 'שגיאה' : 'Error')
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border">
      <h3 className="font-bold mb-3">
        {isRTL ? 'דרג את המוביל' : 'Rate the Mover'}
      </h3>

      <div className="mb-3">
        <StarRating rating={rating} onRate={setRating} size="lg" />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isRTL ? 'כתוב ביקורת (אופציונלי)' : 'Write a review (optional)'}
        className="w-full input min-h-[80px] resize-none mb-3"
        rows={3}
      />

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="btn btn-primary w-full"
      >
        {isSubmitting
          ? (isRTL ? 'שולח...' : 'Submitting...')
          : (isRTL ? 'שלח ביקורת' : 'Submit Review')}
      </button>
    </form>
  )
}
