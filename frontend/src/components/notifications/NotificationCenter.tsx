import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Transition } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  CalendarIcon,
  CreditCardIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '../../api/hooks'
import type { Notification, NotificationCategory } from '../../types'

const categoryIcons: Record<NotificationCategory, React.ElementType> = {
  order: ShoppingCartIcon,
  quote: DocumentTextIcon,
  booking: CalendarIcon,
  payment: CreditCardIcon,
  system: CogIcon,
}

const categoryColors: Record<NotificationCategory, string> = {
  order: 'bg-blue-100 text-blue-600',
  quote: 'bg-purple-100 text-purple-600',
  booking: 'bg-green-100 text-green-600',
  payment: 'bg-amber-100 text-amber-600',
  system: 'bg-gray-100 text-gray-600',
}

export default function NotificationCenter() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data: unreadData } = useUnreadCount()
  const { data: notifications, isLoading } = useNotifications({ page_size: 10 })
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const deleteNotification = useDeleteNotification()

  const unreadCount = unreadData?.count || 0

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  const handleMarkAllRead = () => {
    markAllAsRead.mutate(undefined)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteNotification.mutate(id)
  }

  return (
    <Popover className="relative">
      {({ open: _open }) => (
        <>
          <Popover.Button className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {unreadCount > 0 ? (
              <BellIconSolid className="h-6 w-6" />
            ) : (
              <BellIcon className="h-6 w-6" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className={`absolute z-50 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${
                isRTL ? 'start-0' : 'end-0'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('notifications.title')}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    {t('common.loading')}
                  </div>
                ) : notifications?.results.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    {t('notifications.empty')}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications?.results.map((notification) => {
                      const category = notification.notification_type_details?.category || 'system'
                      const Icon = categoryIcons[category]
                      const colorClass = categoryColors[category]

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.is_read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                                {isRTL
                                  ? notification.title_he || notification.title
                                  : notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {isRTL
                                  ? notification.message_he || notification.message
                                  : notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {notification.action_url && (
                            <div className="mt-2 ms-10">
                              <span className="text-xs text-blue-600 font-medium">
                                {notification.action_text || t('notifications.viewDetails')} →
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <a
                  href="/mover/notifications"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('notifications.viewAll')}
                </a>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
