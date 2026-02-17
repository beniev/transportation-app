import apiClient from '../client'
import type { User, LoginResponse, RegisterData, MoverProfile } from '../../types/auth'

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login/', { email, password })
    return response.data
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/register/', data)
    return response.data
  },

  googleAuth: async (credential: string, userType?: 'customer' | 'mover'): Promise<LoginResponse> => {
    const data: Record<string, string> = { credential }
    if (userType) {
      data.user_type = userType
    }
    const response = await apiClient.post('/auth/google/', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout/')
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/auth/profile/')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/auth/profile/', data)
    return response.data
  },

  requestPhoneVerification: async (phone: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/phone/request-verification/', { phone })
    return response.data
  },

  verifyPhone: async (code: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/phone/verify/', { code })
    return response.data
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/password/change/', {
      old_password: oldPassword,
      new_password: newPassword,
    })
    return response.data
  },

  getMoverProfile: async (): Promise<MoverProfile> => {
    const response = await apiClient.get('/auth/profile/mover/')
    return response.data
  },

  updateMoverProfile: async (data: Partial<MoverProfile>): Promise<MoverProfile> => {
    const response = await apiClient.patch('/auth/profile/mover/', data)
    return response.data
  },
}
