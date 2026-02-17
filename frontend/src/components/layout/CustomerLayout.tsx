import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from '../common/LanguageSwitcher'

export default function CustomerLayout() {
  const { t } = useTranslation()
  const { user, logout, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">Movers</span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {t('auth.logout')}
                  </button>
                </>
              ) : (
                <a href="/login" className="text-sm text-primary-600 hover:text-primary-700">
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
