import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedTypes?: ('mover' | 'customer' | 'admin')[]
}

export default function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedTypes && user && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
