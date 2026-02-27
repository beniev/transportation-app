import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from '../common/LanguageSwitcher'

export default function CustomerLayout() {
  const { t } = useTranslation()
  const { user, logout, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold text-teal-700">Tovil</span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t('auth.logout')}
                  </button>
                </>
              ) : (
                <a href="/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
                  {t('auth.login')}
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
