import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { onboardingAPI } from '../../api/endpoints/onboarding'
import { useAuth } from '../../contexts/AuthContext'

type Step = 0 | 1 | 2 | 3 | 4

export default function MoverOnboarding() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [phone, setPhone] = useState(user?.phone || '')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const status = await onboardingAPI.getStatus()
      if (status.onboarding_completed) {
        navigate('/mover')
        return
      }
      setCurrentStep((status.onboarding_step || 0) as Step)
      setPhoneVerified(status.phone_verified)
    } catch {
      // New mover, start from step 0
    } finally {
      setIsLoading(false)
    }
  }

  const goToStep = async (step: Step) => {
    setCurrentStep(step)
    try {
      await onboardingAPI.updateStep(step)
    } catch { /* ignore */ }
  }

  const handleSendCode = async () => {
    if (!phone) {
      toast.error(isRTL ? 'הכנס מספר טלפון' : 'Enter phone number')
      return
    }
    setIsSending(true)
    try {
      const res = await onboardingAPI.requestPhoneVerification(phone)
      setCodeSent(true)
      toast.success(isRTL ? 'קוד נשלח!' : 'Code sent!')
      if (!res.sms_sent) {
        toast(isRTL ? 'הקוד לא נשלח ב-SMS, נסה שוב מאוחר יותר' : 'SMS not sent, try again later', { icon: '⚠️' })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || (isRTL ? 'שגיאה' : 'Error'))
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyCode = async () => {
    setIsVerifying(true)
    try {
      await onboardingAPI.verifyPhone(verificationCode)
      setPhoneVerified(true)
      toast.success(isRTL ? 'הטלפון אומת!' : 'Phone verified!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || (isRTL ? 'קוד שגוי' : 'Invalid code'))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleComplete = async () => {
    try {
      await onboardingAPI.complete()
      toast.success(isRTL ? 'ההדרכה הושלמה!' : 'Onboarding complete!')
      navigate('/mover')
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const steps = [
    { num: 1, label: isRTL ? 'תמחור' : 'Pricing', icon: '💰' },
    { num: 2, label: isRTL ? 'אזור שירות' : 'Service Area', icon: '📍' },
    { num: 3, label: isRTL ? 'אימות טלפון' : 'Phone Verify', icon: '📱' },
    { num: 4, label: isRTL ? 'סיום' : 'Done', icon: '✅' },
  ]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isRTL ? 'ברוך הבא! בואו נגדיר את החשבון שלך' : 'Welcome! Let\'s set up your account'}
      </h1>
      <p className="text-gray-500 mb-6 text-sm">
        {isRTL
          ? 'השלם את הצעדים הבאים כדי להתחיל לקבל הזמנות'
          : 'Complete these steps to start receiving orders'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center flex-1">
            <div className={`flex flex-col items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                ${currentStep >= step.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.icon}
              </div>
              <span className="text-xs mt-1 text-center">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${
                currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="card p-6">
        {/* Step 1: Pricing */}
        {currentStep <= 1 && (
          <div>
            <h2 className="text-lg font-bold mb-3">
              {isRTL ? '💰 הגדר את התמחור שלך' : '💰 Set Your Pricing'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isRTL
                ? 'הגדר מחירים לפריטים שאתה מעביר. תוכל לעדכן אותם בכל עת.'
                : 'Set prices for items you move. You can update them anytime.'}
            </p>
            <div className="flex gap-3">
              <Link
                to="/mover/pricing"
                className="btn btn-primary"
              >
                {isRTL ? 'עבור לתמחור' : 'Go to Pricing'}
              </Link>
              <button
                onClick={() => goToStep(2)}
                className="btn border border-gray-300 hover:bg-gray-50"
              >
                {isRTL ? 'דלג' : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Service Area */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-3">
              {isRTL ? '📍 הגדר אזור שירות' : '📍 Set Service Area'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isRTL
                ? 'הגדר את המיקום שלך ורדיוס השירות. לקוחות בטווח יוכלו לראות אותך.'
                : 'Set your location and service radius. Customers in range will see you.'}
            </p>
            <div className="flex gap-3">
              <Link
                to="/mover/service-area"
                className="btn btn-primary"
              >
                {isRTL ? 'הגדר אזור' : 'Set Area'}
              </Link>
              <button
                onClick={() => goToStep(3)}
                className="btn border border-gray-300 hover:bg-gray-50"
              >
                {isRTL ? 'דלג' : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Phone Verification */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-3">
              {isRTL ? '📱 אימות טלפון' : '📱 Phone Verification'}
            </h2>
            {phoneVerified ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-600 font-bold">
                  {isRTL ? 'הטלפון אומת!' : 'Phone verified!'}
                </p>
                <button
                  onClick={() => goToStep(4)}
                  className="btn btn-primary mt-4"
                >
                  {isRTL ? 'המשך' : 'Continue'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">
                    {isRTL ? 'מספר טלפון' : 'Phone Number'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05x-xxxxxxx"
                      className="input flex-1"
                      dir="ltr"
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={isSending || !phone}
                      className="btn btn-primary whitespace-nowrap"
                    >
                      {isSending
                        ? (isRTL ? 'שולח...' : 'Sending...')
                        : codeSent
                          ? (isRTL ? 'שלח שוב' : 'Resend')
                          : (isRTL ? 'שלח קוד' : 'Send Code')}
                    </button>
                  </div>
                </div>

                {codeSent && (
                  <div>
                    <label className="label">
                      {isRTL ? 'קוד אימות' : 'Verification Code'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="input flex-1 text-center text-xl tracking-widest"
                        dir="ltr"
                      />
                      <button
                        onClick={handleVerifyCode}
                        disabled={isVerifying || verificationCode.length !== 6}
                        className="btn btn-primary"
                      >
                        {isVerifying ? (isRTL ? 'בודק...' : 'Verifying...') : (isRTL ? 'אמת' : 'Verify')}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => goToStep(4)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {isRTL ? 'דלג, אאמת אחר כך' : 'Skip, verify later'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {currentStep >= 4 && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? 'הכל מוכן!' : 'All Set!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isRTL
                ? 'החשבון שלך בבדיקה. אדמין יאשר אותך בקרוב ותתחיל לקבל הזמנות.'
                : 'Your account is under review. An admin will approve you soon and you\'ll start receiving orders.'}
            </p>
            <button
              onClick={handleComplete}
              className="btn btn-primary text-lg px-8"
            >
              {isRTL ? 'עבור ללוח הבקרה' : 'Go to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
