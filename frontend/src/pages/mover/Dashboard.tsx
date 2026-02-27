import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMoverOrders, useAvailableOrders } from '../../api/hooks'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { onboardingAPI, type OnboardingStatus } from '../../api/endpoints/onboarding'
import { authAPI } from '../../api/endpoints/auth'
import type { OrderStatus } from '../../types'

const statusColors: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  comparing: 'bg-indigo-100 text-indigo-700',
  quoted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function MoverDashboard() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const navigate = useNavigate()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [directLink, setDirectLink] = useState<{ enabled: boolean; code: string | null; url: string | null } | null>(null)
  const [directLinkLoading, setDirectLinkLoading] = useState(false)

  useEffect(() => {
    onboardingAPI.getStatus().then((status) => {
      setOnboardingStatus(status)
      if (!status.onboarding_completed) {
        navigate('/mover/onboarding')
      }
    }).catch(() => { /* ignore */ })

    // Fetch direct link settings
    authAPI.getDirectLinkSettings()
      .then(setDirectLink)
      .catch(() => { /* ignore */ })
  }, [])

  const { data: allOrders, isLoading: loadingAll } = useMoverOrders()
  const { data: availableOrders, isLoading: loadingAvailable } = useAvailableOrders()

  const orders = allOrders?.results || []
  const available = availableOrders?.results || []

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'quoted').length
  const activeCount = orders.filter(o => o.status === 'approved' || o.status === 'in_progress' || o.status === 'scheduled').length
  const completedCount = orders.filter(o => o.status === 'completed').length

  const revenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  // Recent orders: show latest 5 non-completed
  const recentOrders = orders
    .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
    .slice(0, 5)

  const isLoading = loadingAll || loadingAvailable

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-4">{t('mover.dashboard')}</h1>

      {/* Verification Status Banner */}
      {onboardingStatus && onboardingStatus.verification_status === 'pending' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-medium text-yellow-800">
                {isRTL ? 'החשבון שלך בהמתנה לאישור' : 'Your account is pending approval'}
              </p>
              <p className="text-sm text-yellow-700">
                {isRTL
                  ? 'אדמין יבדוק ויאשר את החשבון שלך בקרוב. בינתיים תוכל להגדיר את התמחור ואזור השירות.'
                  : 'An admin will review and approve your account soon. Meanwhile you can set up your pricing and service area.'}
              </p>
            </div>
          </div>
        </div>
      )}
      {onboardingStatus && onboardingStatus.verification_status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium text-red-800">
                {isRTL ? 'הבקשה שלך נדחתה' : 'Your application was rejected'}
              </p>
              <p className="text-sm text-red-700">
                {isRTL ? 'צור קשר עם התמיכה לפרטים נוספים.' : 'Contact support for more details.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/mover/orders" className="card hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">{isRTL ? 'הזמנות פתוחות' : 'Available Orders'}</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {isLoading ? '...' : available.length}
          </p>
        </Link>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">{t('mover.pendingOrders')}</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {isLoading ? '...' : pendingCount}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">{isRTL ? 'בביצוע' : 'Active'}</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {isLoading ? '...' : activeCount}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">{t('mover.completedOrders')}</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {isLoading ? '...' : completedCount}
          </p>
        </div>
      </div>

      {/* Revenue */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">{t('mover.revenue')}</h3>
          <span className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : `₪${revenue.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Direct Order Link */}
      {directLink && (
        <div className="card mb-8 border border-teal-200 bg-teal-50/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-800">
                {isRTL ? '🔗 לינק הזמנה ישיר' : '🔗 Direct Order Link'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {isRTL ? 'שתף את הלינק עם לקוחות לקבלת הזמנות ישירות' : 'Share this link with customers for direct orders'}
              </p>
            </div>
            <button
              onClick={async () => {
                setDirectLinkLoading(true)
                try {
                  const updated = await authAPI.updateDirectLinkSettings({ enabled: !directLink.enabled })
                  setDirectLink(updated)
                  toast.success(isRTL
                    ? (updated.enabled ? 'הלינק הופעל!' : 'הלינק הושבת')
                    : (updated.enabled ? 'Link enabled!' : 'Link disabled'))
                } catch {
                  toast.error(isRTL ? 'שגיאה' : 'Error')
                } finally {
                  setDirectLinkLoading(false)
                }
              }}
              disabled={directLinkLoading}
              className={`relative w-12 h-6 rounded-full transition-colors ${directLink.enabled ? 'bg-teal-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${directLink.enabled ? (isRTL ? 'start-0.5' : 'start-[26px]') : (isRTL ? 'start-[26px]' : 'start-0.5')}`} />
            </button>
          </div>
          {directLink.enabled && directLink.url && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border">
              <input
                type="text"
                readOnly
                value={directLink.url}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                dir="ltr"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(directLink.url!)
                  toast.success(isRTL ? 'הלינק הועתק!' : 'Link copied!')
                }}
                className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors shrink-0"
              >
                {isRTL ? '📋 העתק' : '📋 Copy'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Two columns: Recent Orders + Available Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{isRTL ? 'הזמנות אחרונות' : 'Recent Orders'}</h2>
            <Link to="/mover/orders" className="text-sm text-blue-600 hover:text-blue-800">
              {isRTL ? 'הכל →' : 'View all →'}
            </Link>
          </div>
          <div className="card">
            {isLoading ? (
              <div className="flex justify-center py-6"><LoadingSpinner /></div>
            ) : recentOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">
                {isRTL ? 'אין הזמנות פעילות' : 'No active orders'}
              </p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    to={`/mover/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {order.customer_name && order.customer_name !== order.customer_email
                          ? order.customer_name
                          : order.customer_email}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.origin_city} → {order.destination_city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ms-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status as OrderStatus] || 'bg-gray-100'
                        }`}
                      >
                        {t(`orders.statuses.${order.status}`)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{isRTL ? 'הזמנות פתוחות' : 'Available Orders'}</h2>
            <Link to="/mover/orders" className="text-sm text-blue-600 hover:text-blue-800">
              {isRTL ? 'הכל →' : 'View all →'}
            </Link>
          </div>
          <div className="card">
            {isLoading ? (
              <div className="flex justify-center py-6"><LoadingSpinner /></div>
            ) : available.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">
                {isRTL ? 'אין הזמנות פתוחות כרגע' : 'No available orders right now'}
              </p>
            ) : (
              <div className="divide-y">
                {available.slice(0, 5).map((order: any) => (
                  <Link
                    key={order.id}
                    to={`/mover/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{order.origin_city}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="font-medium">{order.destination_city}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.items_count || 0} {isRTL ? 'פריטים' : 'items'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600 ms-3">
                      {order.total_price > 0 ? `₪${Number(order.total_price).toLocaleString()}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
