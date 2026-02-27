import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI } from '../../api/endpoints/auth'

export default function MoverRegistrationComplete() {
  const { i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const isHe = i18n.language === 'he'

  const [companyName, setCompanyName] = useState(user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : '')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'info' | 'verify'>('info')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [_codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Redirect if already completed
  useEffect(() => {
    if (user?.phone_verified) {
      navigate('/mover')
    }
  }, [user, navigate])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '')
    if (cleanPhone.length < 9) {
      toast.error(isHe ? 'מספר טלפון לא תקין' : 'Invalid phone number')
      return
    }

    setIsSending(true)
    try {
      const res = await authAPI.requestPhoneVerification(phone.trim())
      setCodeSent(true)
      setStep('verify')
      setCountdown(60)
      if (res.sms_sent) {
        toast.success(isHe ? 'קוד אימות נשלח' : 'Verification code sent')
      } else {
        toast(isHe ? 'הקוד נוצר אך ה-SMS לא נשלח. בדוק את הגדרות SMS.' : 'Code created but SMS not sent. Check SMS config.', { icon: '⚠️' })
      }
      setTimeout(() => codeInputRef.current?.focus(), 100)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; phone?: string[] } } }
      const msg = err.response?.data?.error || err.response?.data?.phone?.[0] || (isHe ? 'שגיאה בשליחת הקוד' : 'Failed to send code')
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error(isHe ? 'הקוד צריך להיות 6 ספרות' : 'Code must be 6 digits')
      return
    }

    setIsVerifying(true)
    try {
      await authAPI.verifyPhone(verificationCode)
      toast.success(isHe ? 'הטלפון אומת בהצלחה' : 'Phone verified!')
      // Now complete the registration
      await handleCompleteRegistration()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || (isHe ? 'קוד לא תקין' : 'Invalid code'))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCompleteRegistration = async () => {
    setIsCompleting(true)
    try {
      await authAPI.completeMoverRegistration({
        company_name: companyName.trim(),
        phone: phone.trim(),
      })
      updateUser({ phone: phone.trim(), phone_verified: true })
      toast.success(isHe ? 'ההרשמה הושלמה!' : 'Registration complete!')
      navigate('/mover/onboarding')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; phone?: string[] } } }
      const msg = err.response?.data?.error || err.response?.data?.phone?.[0] || (isHe ? 'שגיאה בהשלמת ההרשמה' : 'Failed to complete registration')
      toast.error(msg)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">Tovil</h1>
          <p className="text-gray-600 mt-2">
            {isHe ? 'השלמת הרשמה למוביל' : 'Complete Mover Registration'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Progress */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'info' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'
            }`}>
              {step === 'verify' ? '✓' : '1'}
            </div>
            <div className={`w-12 h-0.5 ${step === 'verify' ? 'bg-teal-500' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'verify' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
          </div>

          {step === 'info' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isHe ? 'שם החברה / העסק' : 'Company Name'}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={isHe ? 'לדוגמה: הובלות ישראל' : 'e.g. Israel Movers'}
                  className="input w-full"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isHe ? 'מספר טלפון נייד' : 'Mobile Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-1234567"
                  className="input w-full"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isHe ? 'נשלח קוד אימות ב-SMS' : "We'll send a verification code via SMS"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={!companyName.trim() || !phone.trim() || isSending}
                className="w-full py-3 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending
                  ? (isHe ? 'שולח...' : 'Sending...')
                  : (isHe ? 'שלח קוד אימות' : 'Send Verification Code')
                }
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {isHe ? 'קוד אימות נשלח ל-' : 'Verification code sent to '}
                  <span className="font-medium" dir="ltr">{phone}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                  {isHe ? 'הזן קוד אימות' : 'Enter Verification Code'}
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setVerificationCode(val)
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="input w-full text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isVerifying || isCompleting}
                className="w-full py-3 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying || isCompleting
                  ? (isHe ? 'מאמת...' : 'Verifying...')
                  : (isHe ? 'אמת והשלם הרשמה' : 'Verify & Complete')
                }
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('info'); setVerificationCode(''); setCodeSent(false) }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isHe ? 'שנה מספר' : 'Change number'}
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isSending}
                  className="text-teal-600 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {countdown > 0
                    ? `${isHe ? 'שלח שוב' : 'Resend'} (${countdown}s)`
                    : (isHe ? 'שלח שוב' : 'Resend code')
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
