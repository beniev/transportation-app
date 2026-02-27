import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleConfig) => void
          renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void
          prompt: () => void
        }
      }
    }
  }
}

interface GoogleConfig {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number
  locale?: string
}

interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const { t, i18n } = useTranslation()
  const { loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
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

      const buttonDiv = document.getElementById('google-signin-button')
      if (buttonDiv) {
        buttonDiv.innerHTML = ''
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          locale: i18n.language,
        })
      }
    }
  }, [googleLoaded, i18n.language])

  const handleGoogleCallback = async (response: GoogleCredentialResponse) => {
    setIsLoading(true)
    try {
      await loginWithGoogle(response.credential)
      toast.success(t('common.success'))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      console.error('Google login error:', error)
      toast.error(err.response?.data?.error || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{t('auth.login')}</h2>
      <p className="text-gray-500 mb-8 text-sm">
        {i18n.language === 'he' ? 'התחבר עם חשבון גוגל' : 'Sign in with your Google account'}
      </p>

      <div className="flex flex-col items-center gap-4">
        {GOOGLE_CLIENT_ID ? (
          <div id="google-signin-button" className="w-full flex justify-center"></div>
        ) : (
          <p className="text-sm text-gray-500">
            Google Sign-In not configured
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        )}
      </div>

      <p className="mt-8 text-sm text-gray-600">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-teal-600 hover:text-teal-700 hover:underline font-medium">
          {t('auth.register')}
        </Link>
      </p>
    </div>
  )
}
