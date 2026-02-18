import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

interface RegisterForm {
  email: string
  password1: string
  password2: string
  first_name: string
  last_name: string
  phone: string
  user_type: 'mover' | 'customer'
  company_name?: string
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

export default function Register() {
  const { t, i18n } = useTranslation()
  const { register: registerUser, loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [userType, setUserType] = useState<'mover' | 'customer'>('customer')
  const userTypeRef = useRef<'mover' | 'customer'>('customer')
  const [googleLoaded, setGoogleLoaded] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>({
    defaultValues: { user_type: 'customer' }
  })

  const password = watch('password1')

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
        // Clear previous button
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
    console.log('Google callback - userType:', currentUserType)
    setIsLoading(true)
    try {
      await loginWithGoogle(response.credential, currentUserType)
      toast.success(t('common.success'))
    } catch (error: any) {
      console.error('Google signup error:', error)
      toast.error(error.response?.data?.error || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await registerUser({ ...data, user_type: userType })
      toast.success(t('common.success'))
    } catch (error: any) {
      const errorMsg = error.response?.data?.email?.[0] ||
                       error.response?.data?.password1?.[0] ||
                       t('common.error')
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">{t('auth.register')}</h2>

      {/* User Type Selection */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => { setUserType('customer'); userTypeRef.current = 'customer' }}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
            userType === 'customer'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {t('auth.asCustomer')}
        </button>
        <button
          type="button"
          onClick={() => { setUserType('mover'); userTypeRef.current = 'mover' }}
          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
            userType === 'mover'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {t('auth.asMover')}
        </button>
      </div>

      {/* Google Sign Up */}
      <div className="mb-6">
        {GOOGLE_CLIENT_ID ? (
          <div id="google-signup-button" className="w-full flex justify-center"></div>
        ) : (
          <p className="text-sm text-gray-500 text-center">
            Google Sign-Up not configured
          </p>
        )}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            {i18n.language === 'he' ? 'או הרשמה עם אימייל' : 'or register with email'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('auth.firstName')}</label>
            <input type="text" className="input" {...register('first_name')} />
          </div>
          <div>
            <label className="label">{t('auth.lastName')}</label>
            <input type="text" className="input" {...register('last_name')} />
          </div>
        </div>

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
          <label className="label">{t('auth.phone')}</label>
          <input type="tel" className="input" {...register('phone')} />
        </div>

        {userType === 'mover' && (
          <div>
            <label className="label">{t('auth.companyName')}</label>
            <input
              type="text"
              className="input"
              {...register('company_name', { required: userType === 'mover' })}
            />
          </div>
        )}

        <div>
          <label className="label">{t('auth.password')}</label>
          <input
            type="password"
            className="input"
            {...register('password1', { required: true, minLength: 8 })}
          />
          {errors.password1 && <span className="text-red-500 text-sm">{t('common.required')}</span>}
        </div>

        <div>
          <label className="label">{t('auth.confirmPassword')}</label>
          <input
            type="password"
            className="input"
            {...register('password2', {
              required: true,
              validate: value => value === password || 'Passwords do not match'
            })}
          />
          {errors.password2 && <span className="text-red-500 text-sm">{errors.password2.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? t('common.loading') : t('auth.register')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  )
}
