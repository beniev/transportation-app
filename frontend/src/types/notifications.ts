/**
 * TypeScript types for the notifications module.
 */

export interface NotificationType {
  id: string
  code: string
  name: string
  name_he: string
  description: string
  category: NotificationCategory
  default_channels: NotificationChannel[]
  is_user_configurable: boolean
  requires_premium: boolean
}

export type NotificationCategory = 'order' | 'quote' | 'booking' | 'payment' | 'system'

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'

export interface NotificationPreference {
  id: string
  notification_type: string
  notification_type_details?: NotificationType
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
}

export interface Notification {
  id: string
  notification_type: string
  notification_type_details?: NotificationType
  title: string
  title_he: string
  message: string
  message_he: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  action_url: string | null
  action_text: string | null
  related_object_type: string | null
  related_object_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  template_name: string
  status: EmailStatus
  error_message: string | null
  opened_at: string | null
  clicked_at: string | null
  sent_at: string
}

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

export interface SMSLog {
  id: string
  recipient_phone: string
  message: string
  status: SMSStatus
  error_message: string | null
  provider_message_id: string | null
  sent_at: string
}

export type SMSStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface UpdatePreferencesData {
  preferences: {
    notification_type: string
    email_enabled?: boolean
    sms_enabled?: boolean
    push_enabled?: boolean
    in_app_enabled?: boolean
  }[]
}

export interface NotificationStats {
  unread_count: number
  total_count: number
  by_category: {
    category: NotificationCategory
    count: number
    unread: number
  }[]
}
