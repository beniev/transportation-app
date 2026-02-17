import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/endpoints/auth'
import type { User } from '../types/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string, userType?: 'customer' | 'mover') => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

interface RegisterData {
  email: string
  password1: string
  password2: string
  first_name?: string
  last_name?: string
  phone?: string
  user_type: 'mover' | 'customer'
  company_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        const userData = await authAPI.getProfile()
        setUser(userData)
      }
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    localStorage.setItem('accessToken', response.access)
    localStorage.setItem('refreshToken', response.refresh)
    const userData = await authAPI.getProfile()
    setUser(userData)
    navigate(userData.user_type === 'mover' ? '/mover' : '/order')
  }

  const loginWithGoogle = async (credential: string, userType?: 'customer' | 'mover') => {
    const response = await authAPI.googleAuth(credential, userType)
    localStorage.setItem('accessToken', response.access)
    localStorage.setItem('refreshToken', response.refresh)
    const userData = await authAPI.getProfile()
    setUser(userData)
    navigate(userData.user_type === 'mover' ? '/mover' : '/order')
  }

  const register = async (data: RegisterData) => {
    console.log('Register called with data:', data)
    const response = await authAPI.register(data)
    console.log('Register response:', response)
    localStorage.setItem('accessToken', response.access)
    localStorage.setItem('refreshToken', response.refresh)
    const userData = await authAPI.getProfile()
    console.log('Profile data after register:', userData)
    console.log('user_type:', userData.user_type, 'redirecting to:', userData.user_type === 'mover' ? '/mover' : '/order')
    setUser(userData)
    navigate(userData.user_type === 'mover' ? '/mover' : '/order')
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      navigate('/login')
    }
  }

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data })
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
