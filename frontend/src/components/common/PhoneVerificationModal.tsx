import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { authAPI } from '../../api/endpoints/auth'
import { useAuth } from '../../contexts/AuthContext'

interface PhoneVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
}

export default function PhoneVerificationModal({ isOpen, onClose, onVerified }: PhoneVerificationModalProps) {
  const { i18n } = useTranslation()
  const { updateUser } = useAuth()
  const isRTL = i18n.language === 'he'

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [smsSent, setSmsSent] = useState(false)

  if (!isOpen) return null

  const handleSendCode = async () => {
    const cleaned = phone.replace(/\s|-/g, '')
    if (!cleaned || cleaned.length < 9) {
      toast.error(isRTL ? 'יש להזין מספר טלפון תקין' : 'Please enter a valid phone number')
      return
    }

    setIsLoading(true)
    try {
      const result = await authAPI.requestPhoneVerification(cleaned)
      setSmsSent(result.sms_sent !== false)
      setStep('code')
      toast.success(isRTL ? 'קוד אימות נשלח' : 'Verification code sent')
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.phone?.[0] || (isRTL ? 'שגיאה בשליחת קוד' : 'Error sending code')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error(isRTL ? 'יש להזין קוד בן 6 ספרות' : 'Please enter a 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      await authAPI.verifyPhone(code)
      updateUser({ phone_verified: true, phone })
      toast.success(isRTL ? 'הטלפון אומת בהצלחה!' : 'Phone verified successfully!')
      onVerified()
    } catch (error: any) {
      const msg = error.response?.data?.error || (isRTL ? 'קוד שגוי' : 'Invalid code')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsLoading(true)
    try {
      const cleaned = phone.replace(/\s|-/g, '')
      await authAPI.requestPhoneVerification(cleaned)
      toast.success(isRTL ? 'קוד חדש נשלח' : 'New code sent')
    } catch (error: any) {
      const msg = error.response?.data?.error || (isRTL ? 'יש להמתין לפני שליחה נוספת' : 'Please wait before resending')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isRTL ? 'אימות מספר טלפון' : 'Phone Verification'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL
              ? 'יש לאמת מספר טלפון לפני יצירת הזמנה'
              : 'Phone verification is required before creating an order'}
          </p>
        </div>

        {step === 'phone' ? (
          /* Step 1: Enter phone */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'מספר טלפון' : 'Phone Number'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isRTL ? '050-1234567' : '050-1234567'}
                className="input w-full text-lg tracking-wider"
                dir="ltr"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                {isRTL ? 'מספר ישראלי — נשלח SMS עם קוד אימות' : 'Israeli number — an SMS with a verification code will be sent'}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn btn-secondary flex-1">
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={handleSendCode}
                disabled={isLoading || !phone.trim()}
                className="btn btn-primary flex-1"
              >
                {isLoading
                  ? (isRTL ? 'שולח...' : 'Sending...')
                  : (isRTL ? 'שלח קוד' : 'Send Code')}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Enter code */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'קוד אימות' : 'Verification Code'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="input w-full text-center text-2xl tracking-[0.5em] font-mono"
                dir="ltr"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                {isRTL ? `קוד נשלח ל-${phone}` : `Code sent to ${phone}`}
                {!smsSent && (
                  <span className="text-orange-500 block mt-1">
                    {isRTL ? '(SMS לא נשלח — בדוק לוגים)' : '(SMS not sent — check logs)'}
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('phone'); setCode('') }} className="btn btn-secondary flex-1">
                {isRTL ? 'חזור' : 'Back'}
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || code.length !== 6}
                className="btn btn-primary flex-1"
              >
                {isLoading
                  ? (isRTL ? 'מאמת...' : 'Verifying...')
                  : (isRTL ? 'אמת' : 'Verify')}
              </button>
            </div>

            <button
              onClick={handleResend}
              disabled={isLoading}
              className="w-full text-sm text-teal-600 hover:text-teal-800 hover:underline"
            >
              {isRTL ? 'שלח קוד שוב' : 'Resend code'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
