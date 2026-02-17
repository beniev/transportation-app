import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns'
import {
  BellIcon,
  Cog6ToothIcon,
  CheckIcon,
  TrashIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { NotificationPreferences } from '../../components/notifications'
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllReadNotifications,
} from '../../api/hooks'
import type { NotificationCategory } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const CATEGORIES: (NotificationCategory | 'all')[] = ['all', 'order', 'quote', 'booking', 'payment', 'system']

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useNotifications({
    category: category === 'all' ? undefined : category,
    page,
    page_size: 20,
  })
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const deleteNotification = useDeleteNotification()
  const deleteAllRead = useDeleteAllReadNotifications()

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id)
  }

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id)
  }

  const tabs = [
    { name: t('notifications.all'), icon: BellIcon },
    { name: t('notifications.settings'), icon: Cog6ToothIcon },
  ]

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
        <p className="text-gray-600 mt-1">{t('notifications.subtitle')}</p>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6 max-w-sm">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-600 hover:bg-white/[0.5] hover:text-gray-800'
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* All Notifications */}
          <Tab.Panel>
            <div className="space-y-4">
              {/* Filters & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <div className="flex gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategory(cat)
                          setPage(1)
                        }}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          category === cat
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {t(`notifications.categories.${cat}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markAllAsRead.mutate(category === 'all' ? undefined : category)}
                    disabled={markAllAsRead.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {t('notifications.markAllRead')}
                  </button>
                  <button
                    onClick={() => deleteAllRead.mutate()}
                    disabled={deleteAllRead.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('notifications.deleteRead')}
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              {isLoading ? (
                <LoadingSpinner />
              ) : data?.results.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
                  <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  {t('notifications.empty')}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
                  {data?.results.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm ${
                                notification.is_read
                                  ? 'text-gray-600'
                                  : 'text-gray-900 font-medium'
                              }`}
                            >
                              {isRTL
                                ? notification.title_he || notification.title
                                : notification.title}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {isRTL
                              ? notification.message_he || notification.message
                              : notification.message}
                          </p>
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              {notification.action_text || t('notifications.viewDetails')} →
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title={t('notifications.markRead')}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data && data.count > 20 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t('common.showing', { count: data.results.length, total: data.count })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!data.previous}
                      className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
                    >
                      {t('common.previous')}
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.next}
                      className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
                    >
                      {t('common.next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Notification Settings */}
          <Tab.Panel>
            <NotificationPreferences />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
