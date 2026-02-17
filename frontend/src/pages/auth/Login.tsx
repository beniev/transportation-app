import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

interface LoginForm {
  email: string
  password: string
}

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
  const { login, loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  useEffect(() => {
    // Load Google Sign-In script
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
      document.body.removeChild(script)
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
    } catch (error: any) {
      console.error('Google login error:', error)
      toast.error(error.response?.data?.error || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      toast.success(t('common.success'))
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">{t('auth.login')}</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('auth.email')}</label>
          <input
            type="email"
            className="input"
            {...register('email', { required: true })}
          />
          {errors.email && <span className="text-red-500 text-sm">{t('common.required')}</span>}
        </div>

        <div>
          <label className="label">{t('auth.password')}</label>
          <input
            type="password"
            className="input"
            {...register('password', { required: true })}
          />
          {errors.password && <span className="text-red-500 text-sm">{t('common.required')}</span>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? t('common.loading') : t('auth.login')}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">או</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          {GOOGLE_CLIENT_ID ? (
            <div id="google-signin-button" className="w-full flex justify-center"></div>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              Google Sign-In not configured
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-primary-600 hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </div>
  )
}
