import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/solid'
import { useSubscriptionPlans, useSubscription, useCreateSubscription, useChangeSubscription } from '../../api/hooks'
import type { SubscriptionPlan, PlanType } from '../../types'
import LoadingSpinner from '../common/LoadingSpinner'

interface SubscriptionPlansProps {
  onSelectPlan?: (plan: SubscriptionPlan) => void
}

const planIcons: Record<PlanType, React.ElementType> = {
  free: StarIcon,
  basic: StarIcon,
  pro: SparklesIcon,
  enterprise: SparklesIcon,
}

const planColors: Record<PlanType, { bg: string; border: string; button: string }> = {
  free: { bg: 'bg-gray-50', border: 'border-gray-200', button: 'bg-gray-600 hover:bg-gray-700' },
  basic: { bg: 'bg-blue-50', border: 'border-blue-200', button: 'bg-blue-600 hover:bg-blue-700' },
  pro: { bg: 'bg-purple-50', border: 'border-purple-300', button: 'bg-purple-600 hover:bg-purple-700' },
  enterprise: { bg: 'bg-amber-50', border: 'border-amber-300', button: 'bg-amber-600 hover:bg-amber-700' },
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans()
  const { data: subscription } = useSubscription()
  const createSubscription = useCreateSubscription()
  const changeSubscription = useChangeSubscription()

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan)
      return
    }

    if (plan.plan_type === 'free') return

    try {
      if (subscription) {
        await changeSubscription.mutateAsync({
          plan_id: plan.id,
          billing_cycle: billingCycle,
        })
      } else {
        await createSubscription.mutateAsync({
          plan_id: plan.id,
          billing_cycle: billingCycle,
        })
      }
    } catch (err) {
      console.error('Failed to select plan:', err)
    }
  }

  if (plansLoading) return <LoadingSpinner />

  const activePlans = plans?.filter((p) => p.is_active).sort((a, b) => a.display_order - b.display_order) || []
  const yearlyDiscount = 20 // 20% discount for yearly

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('payments.monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('payments.yearly')}
            <span className="ms-2 text-xs text-green-600 font-semibold">
              -{yearlyDiscount}%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activePlans.map((plan) => {
          const Icon = planIcons[plan.plan_type]
          const colors = planColors[plan.plan_type]
          const isCurrentPlan = subscription?.plan.id === plan.id
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
          const monthlyPrice = billingCycle === 'yearly'
            ? Math.round(plan.price_yearly / 12)
            : plan.price_monthly

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col ${
                plan.plan_type === 'pro' ? 'ring-2 ring-purple-400 ring-offset-2' : ''
              }`}
            >
              {plan.plan_type === 'pro' && (
                <div className="absolute -top-3 start-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t('payments.popular')}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex p-2 rounded-xl ${colors.bg} mb-3`}>
                  <Icon className="h-8 w-8 text-gray-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isRTL ? plan.name_he : plan.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? plan.description_he : plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    ₪{monthlyPrice}
                  </span>
                  <span className="text-gray-500">/{t('payments.month')}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-gray-500 mt-1">
                    ₪{price} {t('payments.billedYearly')}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6 flex-1">
                {(isRTL ? plan.features_list_he : plan.features_list).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}

                {/* Limits */}
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    {plan.max_orders_per_month
                      ? `${plan.max_orders_per_month} ${t('payments.ordersPerMonth')}`
                      : t('payments.unlimitedOrders')}
                  </span>
                </li>

                {/* Feature flags */}
                {plan.has_ai_parsing && (
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{t('payments.aiParsing')}</span>
                  </li>
                )}
                {plan.has_digital_signatures && (
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{t('payments.digitalSignatures')}</span>
                  </li>
                )}
                {plan.has_sms_notifications && (
                  <li className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{t('payments.smsNotifications')}</span>
                  </li>
                )}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || createSubscription.isPending || changeSubscription.isPending}
                className={`w-full py-3 px-4 rounded-lg text-sm font-semibold text-white ${colors.button} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isCurrentPlan
                  ? t('payments.currentPlan')
                  : plan.plan_type === 'free'
                    ? t('payments.getStarted')
                    : subscription
                      ? t('payments.switchPlan')
                      : t('payments.subscribe')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
