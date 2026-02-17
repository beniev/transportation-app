import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from '../common/LanguageSwitcher'

export default function AdminLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/admin', label: 'Catalog', labelHe: 'קטלוג', end: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow border-b-2 border-purple-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-purple-600">Admin</span>
              </div>
              <div className="hidden sm:flex sm:gap-8 sm:mr-8 sm:ml-8">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-purple-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
