import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { SignQuoteData } from '../../types'

interface SignaturePadProps {
  onSign: (data: SignQuoteData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export default function SignaturePad({ onSign, onCancel, isLoading }: SignaturePadProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Omit<SignQuoteData, 'signature_image'>>({
    defaultValues: {
      signer_name: '',
      signer_email: '',
      signer_phone: '',
    },
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const getSignatureImage = (): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }

  const onSubmit = async (data: Omit<SignQuoteData, 'signature_image'>) => {
    if (!hasSignature) {
      alert(t('quotes.signatureRequired'))
      return
    }

    const signatureImage = getSignatureImage()
    await onSign({
      ...data,
      signature_image: signatureImage,
    })
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('quotes.signQuote')}</h3>
        <p className="text-sm text-gray-600 mt-1">{t('quotes.signatureInstructions')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Signer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('quotes.signerName')} *
            </label>
            <input
              type="text"
              {...register('signer_name', { required: t('validation.required') })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.signer_name && (
              <p className="mt-1 text-sm text-red-500">{errors.signer_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('quotes.signerEmail')} *
            </label>
            <input
              type="email"
              {...register('signer_email', {
                required: t('validation.required'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('validation.invalidEmail'),
                },
              })}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.signer_email && (
              <p className="mt-1 text-sm text-red-500">{errors.signer_email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.signerPhone')}
          </label>
          <input
            type="tel"
            {...register('signer_phone')}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              {t('quotes.signature')} *
            </label>
            <button
              type="button"
              onClick={clearSignature}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('quotes.clearSignature')}
            </button>
          </div>

          <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {!hasSignature && (
            <p className="text-xs text-gray-500 text-center">
              {t('quotes.drawSignatureHere')}
            </p>
          )}
        </div>

        {/* Legal Notice */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            {t('quotes.signatureLegalNotice')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4" />
              {t('common.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !hasSignature}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.processing') : t('quotes.confirmSignature')}
          </button>
        </div>
      </form>
    </div>
  )
}
