import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'

// Layouts
import MoverLayout from './components/layout/MoverLayout'
import CustomerLayout from './components/layout/CustomerLayout'
import AuthLayout from './components/layout/AuthLayout'
import AdminLayout from './components/layout/AdminLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Mover Pages
import MoverDashboard from './pages/mover/Dashboard'
import MoverOrders from './pages/mover/Orders'
import MoverPricing from './pages/mover/Pricing'
import MoverQuotes from './pages/mover/Quotes'
import MoverCalendar from './pages/mover/Calendar'
import MoverBilling from './pages/mover/Billing'
import MoverAnalytics from './pages/mover/Analytics'
import MoverNotifications from './pages/mover/Notifications'
import MoverServiceArea from './pages/mover/ServiceArea'
import MoverOrderDetail from './pages/mover/OrderDetail'

// Customer Pages
import CreateOrder from './pages/customer/CreateOrder'
import OrderStatus from './pages/customer/OrderStatus'
import EditOrder from './pages/customer/EditOrder'
import CompareMovers from './pages/customer/CompareMovers'

// Admin Pages
import AdminCatalog from './pages/admin/Catalog'
import MoverApprovals from './pages/admin/MoverApprovals'

// Mover Onboarding
import MoverOnboarding from './pages/mover/Onboarding'

// Components
import LoadingSpinner from './components/common/LoadingSpinner'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  const { user, isLoading } = useAuth()
  const { language } = useLanguage()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div dir={language === 'he' ? 'rtl' : 'ltr'} className={language === 'he' ? 'font-hebrew' : 'font-sans'}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to={user ? (user.user_type === 'admin' ? '/admin' : user.user_type === 'mover' ? '/mover' : '/order') : '/login'} />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Mover Onboarding (outside MoverLayout so it has its own page) */}
        <Route path="/mover/onboarding" element={
          <ProtectedRoute allowedTypes={['mover']}>
            <div className="min-h-screen bg-gray-50 p-6">
              <MoverOnboarding />
            </div>
          </ProtectedRoute>
        } />

        {/* Mover Routes */}
        <Route path="/mover" element={
          <ProtectedRoute allowedTypes={['mover']}>
            <MoverLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MoverDashboard />} />
          <Route path="orders" element={<MoverOrders />} />
          <Route path="orders/:id" element={<MoverOrderDetail />} />
          <Route path="pricing" element={<MoverPricing />} />
          <Route path="service-area" element={<MoverServiceArea />} />
          <Route path="quotes" element={<MoverQuotes />} />
          <Route path="calendar" element={<MoverCalendar />} />
          <Route path="billing" element={<MoverBilling />} />
          <Route path="analytics" element={<MoverAnalytics />} />
          <Route path="notifications" element={<MoverNotifications />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/order" element={<CustomerLayout />}>
          <Route index element={<CreateOrder />} />
          <Route path="status/:orderId" element={<OrderStatus />} />
          <Route path="edit/:orderId" element={<EditOrder />} />
          <Route path="compare/:orderId" element={<CompareMovers />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminCatalog />} />
          <Route path="movers" element={<MoverApprovals />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default App
