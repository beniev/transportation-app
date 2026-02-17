import { useTranslation } from 'react-i18next'
import { Tab } from '@headlessui/react'
import {
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { SubscriptionPlans, BillingHistory, UsageStats } from '../../components/payments'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function BillingPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const tabs = [
    { name: t('payments.overview'), icon: ChartBarIcon },
    { name: t('payments.plans'), icon: SparklesIcon },
    { name: t('payments.history'), icon: ClockIcon },
  ]

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
        <p className="text-gray-600 mt-1">{t('payments.subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6 max-w-md">
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
          {/* Overview / Usage Stats */}
          <Tab.Panel>
            <UsageStats />
          </Tab.Panel>

          {/* Subscription Plans */}
          <Tab.Panel>
            <SubscriptionPlans />
          </Tab.Panel>

          {/* Billing History */}
          <Tab.Panel>
            <BillingHistory />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
