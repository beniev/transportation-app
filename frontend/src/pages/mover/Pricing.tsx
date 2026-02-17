import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  usePricingFactors,
  useUpdatePricingFactors,
  useMoverItemTypes,
  usePricingCategories,
  useCreateMoverPricing,
  useUpdateMoverPricing,
  useDeleteMoverPricing,
} from '../../api/hooks/usePricing'
import type { PricingFactors, ItemTypeWithPricing } from '../../types/pricing'

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
]

export default function MoverPricing() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [activeTab, setActiveTab] = useState<'factors' | 'items'>('factors')

  const tabs = [
    { key: 'factors' as const, label: t('pricing.tabFactors') },
    { key: 'items' as const, label: t('pricing.tabItems') },
  ]

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">{t('mover.pricing')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'factors' && <PricingFactorsTab />}
      {activeTab === 'items' && <ItemPricingTab />}
    </div>
  )
}

// ===== TAB 1: PRICING FACTORS =====

function PricingFactorsTab() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const { data: factors, isLoading } = usePricingFactors()
  const updateMutation = useUpdatePricingFactors()

  const [form, setForm] = useState<Partial<PricingFactors>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (factors) {
      setForm({
        floor_surcharge_percent: factors.floor_surcharge_percent,
        distance_surcharge_percent: factors.distance_surcharge_percent,
        travel_distance_per_km: factors.travel_distance_per_km,
        minimum_travel_charge: factors.minimum_travel_charge,
        peak_season_multiplier: factors.peak_season_multiplier,
        peak_months: factors.peak_months || [],
        weekend_surcharge_percent: factors.weekend_surcharge_percent,
        friday_surcharge_percent: factors.friday_surcharge_percent,
        early_morning_surcharge_percent: factors.early_morning_surcharge_percent,
        evening_surcharge_percent: factors.evening_surcharge_percent,
        minimum_order_amount: factors.minimum_order_amount,
      })
      setHasChanges(false)
    }
  }, [factors])

  const updateField = (field: string, value: number | number[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const toggleMonth = (month: number) => {
    const current = (form.peak_months || []) as number[]
    const updated = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month].sort((a, b) => a - b)
    updateField('peak_months', updated)
  }

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => {
        toast.success(isRTL ? 'גורמי התמחור נשמרו!' : 'Pricing factors saved!')
        setHasChanges(false)
      },
      onError: () => {
        toast.error(isRTL ? 'שגיאה בשמירה' : 'Error saving')
      },
    })
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Floors Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('pricing.floorsTitle')}</h3>
        <div className="space-y-4">
          <FactorRow
            label={t('pricing.floorSurcharge')}
            value={form.floor_surcharge_percent}
            onChange={(v) => updateField('floor_surcharge_percent', v)}
            suffix="%"
            step={0.5}
          />
          <p className="text-xs text-gray-400">
            {isRTL
              ? 'כשיש מעלית — אין תוספת קומות (אותו מאמץ לכל קומה)'
              : 'When elevator is available — no floor surcharge (same effort for any floor)'}
          </p>
        </div>
      </div>

      {/* Distance Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('pricing.distanceTitle')}</h3>
        <div className="space-y-4">
          <FactorRow
            label={t('pricing.distanceSurcharge')}
            value={form.distance_surcharge_percent}
            onChange={(v) => updateField('distance_surcharge_percent', v)}
            suffix="%"
            step={0.5}
          />
          <FactorRow
            label={t('pricing.travelCostPerKm')}
            value={form.travel_distance_per_km}
            onChange={(v) => updateField('travel_distance_per_km', v)}
            suffix="₪"
          />
          <FactorRow
            label={t('pricing.travelMinCharge')}
            value={form.minimum_travel_charge}
            onChange={(v) => updateField('minimum_travel_charge', v)}
            suffix="₪"
          />
        </div>
      </div>

      {/* Seasonal Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('pricing.seasonalTitle')}</h3>
        <div className="space-y-4">
          <FactorRow
            label={t('pricing.peakSeasonMultiplier')}
            value={form.peak_season_multiplier}
            onChange={(v) => updateField('peak_season_multiplier', v)}
            step={0.05}
            min={1}
            max={3}
            suffix="x"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('pricing.peakMonths')}
            </label>
            <div className="flex flex-wrap gap-2">
              {MONTH_KEYS.map((key, idx) => {
                const monthNum = idx + 1
                const isSelected = ((form.peak_months || []) as number[]).includes(monthNum)
                return (
                  <button
                    key={key}
                    onClick={() => toggleMonth(monthNum)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`pricing.months.${key}`)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Day/Time Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('pricing.dayTimeTitle')}</h3>
        <div className="space-y-4">
          <FactorRow
            label={t('pricing.fridaySurcharge')}
            value={form.friday_surcharge_percent}
            onChange={(v) => updateField('friday_surcharge_percent', v)}
            suffix="%"
          />
          <FactorRow
            label={t('pricing.earlyMorningSurcharge')}
            value={form.early_morning_surcharge_percent}
            onChange={(v) => updateField('early_morning_surcharge_percent', v)}
            suffix="%"
          />
          <FactorRow
            label={t('pricing.eveningSurcharge')}
            value={form.evening_surcharge_percent}
            onChange={(v) => updateField('evening_surcharge_percent', v)}
            suffix="%"
          />
        </div>
      </div>

      {/* Minimum Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('pricing.minimumTitle')}</h3>
        <FactorRow
          label={t('pricing.minimumOrder')}
          value={form.minimum_order_amount}
          onChange={(v) => updateField('minimum_order_amount', v)}
          suffix="₪"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || updateMutation.isPending}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {updateMutation.isPending
          ? (isRTL ? 'שומר...' : 'Saving...')
          : t('common.save')}
      </button>
    </div>
  )
}

// ===== Factor Row Component =====

function FactorRow({
  label,
  value,
  onChange,
  suffix = '',
  step = 1,
  min = 0,
  max,
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  suffix?: string
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div className="flex justify-between items-center">
      <label className="text-sm text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className="input w-28 text-center"
        />
        {suffix && <span className="text-sm text-gray-500 w-6">{suffix}</span>}
      </div>
    </div>
  )
}

// ===== TAB 2: ITEM PRICING =====

function ItemPricingTab() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const { data: categories } = usePricingCategories()
  const { data: items, isLoading } = useMoverItemTypes(selectedCategory || undefined)
  const createPricing = useCreateMoverPricing()
  const updatePricing = useUpdateMoverPricing()
  const deletePricing = useDeleteMoverPricing()

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input"
        >
          <option value="">{t('pricing.allCategories')}</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {isRTL ? cat.name_he : cat.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Items List */}
      {(!items || items.length === 0) ? (
        <p className="text-gray-500 text-center py-12">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemPricingCard
              key={item.id}
              item={item}
              isRTL={isRTL}
              t={t}
              isEditing={editingItemId === item.id}
              onToggleEdit={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
              onSave={(data) => {
                if (item.mover_pricing) {
                  updatePricing.mutate(
                    { id: item.mover_pricing.id, data },
                    {
                      onSuccess: () => {
                        toast.success(isRTL ? 'המחיר עודכן!' : 'Price updated!')
                        setEditingItemId(null)
                      },
                      onError: () => toast.error(isRTL ? 'שגיאה' : 'Error'),
                    }
                  )
                } else {
                  createPricing.mutate(
                    { item_type: item.id, ...data },
                    {
                      onSuccess: () => {
                        toast.success(isRTL ? 'המחיר נשמר!' : 'Price saved!')
                        setEditingItemId(null)
                      },
                      onError: () => toast.error(isRTL ? 'שגיאה' : 'Error'),
                    }
                  )
                }
              }}
              onResetToDefault={() => {
                if (item.mover_pricing) {
                  deletePricing.mutate(item.mover_pricing.id, {
                    onSuccess: () => {
                      toast.success(isRTL ? 'חזר למחיר ברירת מחדל' : 'Reset to default')
                      setEditingItemId(null)
                    },
                    onError: () => toast.error(isRTL ? 'שגיאה' : 'Error'),
                  })
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Item Pricing Card =====

function ItemPricingCard({
  item,
  isRTL,
  t,
  isEditing,
  onToggleEdit,
  onSave,
  onResetToDefault,
}: {
  item: ItemTypeWithPricing
  isRTL: boolean
  t: (key: string) => string
  isEditing: boolean
  onToggleEdit: () => void
  onSave: (data: { base_price: number; assembly_price: number; disassembly_price: number; special_handling_price: number }) => void
  onResetToDefault: () => void
}) {
  const hasCustom = !!item.mover_pricing
  const [editForm, setEditForm] = useState({
    base_price: item.effective_base_price,
    assembly_price: item.effective_assembly_price,
    disassembly_price: item.effective_disassembly_price,
    special_handling_price: item.effective_special_handling_price,
  })

  useEffect(() => {
    setEditForm({
      base_price: item.effective_base_price,
      assembly_price: item.effective_assembly_price,
      disassembly_price: item.effective_disassembly_price,
      special_handling_price: item.effective_special_handling_price,
    })
  }, [item])

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${hasCustom ? 'border-green-200' : 'border-gray-100'} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {isRTL ? item.name_he || item.name_en : item.name_en}
            </span>
            {hasCustom && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {t('pricing.customPrice')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL ? item.category_name_he || item.category_name : item.category_name}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-end">
            <span className={`text-lg font-bold ${hasCustom ? 'text-green-600' : 'text-gray-800'}`}>
              ₪{Number(item.effective_base_price).toFixed(0)}
            </span>
            {hasCustom && (
              <p className="text-xs text-gray-400 line-through">
                ₪{Number(item.default_base_price).toFixed(0)}
              </p>
            )}
          </div>
          <button
            onClick={onToggleEdit}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {isEditing ? t('common.cancel') : t('common.edit')}
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {isEditing && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('pricing.basePrice')}</label>
              <input
                type="number"
                value={editForm.base_price}
                onChange={(e) => setEditForm({ ...editForm, base_price: parseFloat(e.target.value) || 0 })}
                className="input w-full text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('pricing.assemblyPrice')}</label>
              <input
                type="number"
                value={editForm.assembly_price}
                onChange={(e) => setEditForm({ ...editForm, assembly_price: parseFloat(e.target.value) || 0 })}
                className="input w-full text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('pricing.disassemblyPrice')}</label>
              <input
                type="number"
                value={editForm.disassembly_price}
                onChange={(e) => setEditForm({ ...editForm, disassembly_price: parseFloat(e.target.value) || 0 })}
                className="input w-full text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('pricing.specialHandling')}</label>
              <input
                type="number"
                value={editForm.special_handling_price}
                onChange={(e) => setEditForm({ ...editForm, special_handling_price: parseFloat(e.target.value) || 0 })}
                className="input w-full text-sm"
                min={0}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onSave(editForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('common.save')}
            </button>
            {hasCustom && (
              <button
                onClick={onResetToDefault}
                className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
              >
                {t('pricing.resetToDefault')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
