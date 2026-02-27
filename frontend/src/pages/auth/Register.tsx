import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Register() {
  const { t, i18n } = useTranslation()
  const { loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [userType, setUserType] = useState<'mover' | 'customer'>('customer')
  const userTypeRef = useRef<'mover' | 'customer'>('customer')
  const [googleLoaded, setGoogleLoaded] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured')
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleLoaded(true)
    }
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        document.body.removeChild(existingScript)
      }
    }
  }, [])

  useEffect(() => {
    if (googleLoaded && window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      })

      const buttonDiv = document.getElementById('google-signup-button')
      if (buttonDiv) {
        buttonDiv.innerHTML = ''
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          width: 320,
          locale: i18n.language,
        })
      }
    }
  }, [googleLoaded, i18n.language, userType])

  const handleGoogleCallback = async (response: GoogleCredentialResponse) => {
    const currentUserType = userTypeRef.current
    setIsLoading(true)
    try {
      await loginWithGoogle(response.credential, currentUserType)
      toast.success(t('common.success'))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      console.error('Google signup error:', error)
      toast.error(err.response?.data?.error || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">{t('auth.register')}</h2>
      <p className="text-gray-500 text-center mb-6 text-sm">
        {i18n.language === 'he' ? 'בחר סוג חשבון והירשם עם גוגל' : 'Choose account type and sign up with Google'}
      </p>

      {/* User Type Selection */}
      <div className="flex gap-4 mb-8">
        <button
          type="button"
          onClick={() => { setUserType('customer'); userTypeRef.current = 'customer' }}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            userType === 'customer'
              ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
              : 'border-gray-300 hover:border-gray-400 text-gray-600'
          }`}
        >
          <div className="text-lg mb-0.5">
            {i18n.language === 'he' ? 'לקוח' : 'Customer'}
          </div>
          <div className="text-xs opacity-75">
            {i18n.language === 'he' ? 'מחפש מוביל' : 'Looking for a mover'}
          </div>
        </button>
        <button
          type="button"
          onClick={() => { setUserType('mover'); userTypeRef.current = 'mover' }}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
            userType === 'mover'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
              : 'border-gray-300 hover:border-gray-400 text-gray-600'
          }`}
        >
          <div className="text-lg mb-0.5">
            {i18n.language === 'he' ? 'מוביל' : 'Mover'}
          </div>
          <div className="text-xs opacity-75">
            {i18n.language === 'he' ? 'מציע שירותי הובלה' : 'Offering moving services'}
          </div>
        </button>
      </div>

      {/* Google Sign Up */}
      <div className="flex flex-col items-center gap-4">
        {GOOGLE_CLIENT_ID ? (
          <div id="google-signup-button" className="w-full flex justify-center"></div>
        ) : (
          <p className="text-sm text-gray-500 text-center">
            Google Sign-Up not configured
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-gray-600">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-teal-600 hover:text-teal-700 hover:underline font-medium">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  )
}
