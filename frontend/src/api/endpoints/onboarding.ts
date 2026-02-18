import apiClient from '../client'

export interface OnboardingStatus {
  onboarding_completed: boolean
  onboarding_step: number
  verification_status: string
  phone_verified: boolean
}

export const onboardingAPI = {
  getStatus: async (): Promise<OnboardingStatus> => {
    const response = await apiClient.get('/auth/onboarding/status/')
    return response.data
  },

  updateStep: async (step: number): Promise<{ onboarding_step: number }> => {
    const response = await apiClient.post('/auth/onboarding/step/', { step })
    return response.data
  },

  complete: async (): Promise<{ message: string; onboarding_completed: boolean }> => {
    const response = await apiClient.post('/auth/onboarding/complete/')
    return response.data
  },

  requestPhoneVerification: async (phone: string) => {
    const response = await apiClient.post('/auth/phone/request-verification/', { phone })
    return response.data
  },

  verifyPhone: async (code: string) => {
    const response = await apiClient.post('/auth/phone/verify/', { code })
    return response.data
  },
}
