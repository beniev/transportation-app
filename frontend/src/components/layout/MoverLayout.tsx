import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from '../common/LanguageSwitcher'
import { NotificationCenter } from '../notifications'

export default function MoverLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/mover', label: t('mover.dashboard'), end: true },
    { path: '/mover/orders', label: t('mover.orders') },
    { path: '/mover/quotes', label: t('mover.quotes') },
    { path: '/mover/calendar', label: t('mover.calendar') },
    { path: '/mover/pricing', label: t('mover.pricing') },
    { path: '/mover/service-area', label: t('mover.serviceArea') },
    { path: '/mover/analytics', label: t('mover.analytics') },
    { path: '/mover/billing', label: t('mover.billing') },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-primary-600">Movers</span>
              </div>
              <div className="hidden sm:flex sm:gap-8 sm:mr-8">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
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
              <NotificationCenter />
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
