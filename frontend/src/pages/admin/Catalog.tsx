import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCatalogStats, useAdminCategories, useAdminItemTypes, useAdminSuggestions } from '../../api/hooks/useAdmin'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AddItemForm from './AddItemForm'
import SuggestionsPanel from './SuggestionsPanel'
import type { AdminItemType } from '../../api/endpoints/admin'

const WEIGHT_LABELS: Record<string, { en: string; he: string }> = {
  light: { en: 'Light', he: 'קל' },
  medium: { en: 'Medium', he: 'בינוני' },
  heavy: { en: 'Heavy', he: 'כבד' },
  extra_heavy: { en: 'Extra Heavy', he: 'כבד מאוד' },
}

const WEIGHT_COLORS: Record<string, string> = {
  light: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  heavy: 'bg-orange-100 text-orange-700',
  extra_heavy: 'bg-red-100 text-red-700',
}

type TabType = 'catalog' | 'suggestions'

export default function Catalog() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const [activeTab, setActiveTab] = useState<TabType>('catalog')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: stats, isLoading: statsLoading } = useCatalogStats()
  const { data: categories, isLoading: catsLoading } = useAdminCategories()
  const { data: items, isLoading: itemsLoading, refetch } = useAdminItemTypes(selectedCategory || undefined)
  const { data: pendingSuggestions } = useAdminSuggestions('pending')

  const pendingCount = pendingSuggestions?.length || 0

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter items by search
  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.name_en.toLowerCase().includes(q) ||
      item.name_he.includes(searchQuery) ||
      item.category_name.toLowerCase().includes(q) ||
      item.category_name_he.includes(searchQuery)
    )
  })

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? 'ניהול קטלוג' : 'Catalog Management'}</h1>
        {activeTab === 'catalog' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            {isRTL ? '+ הוסף פריט' : '+ Add Item'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isRTL ? 'קטלוג' : 'Catalog'}
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'suggestions'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isRTL ? 'הצעות פריטים' : 'Suggestions'}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'suggestions' ? (
        <SuggestionsPanel />
      ) : (
        <>
          {/* Stats */}
          {statsLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label={isRTL ? 'פריטים' : 'Items'} value={stats.total_items} color="blue" />
              <StatCard label={isRTL ? 'וריאנטים' : 'Variants'} value={stats.total_variants} color="purple" />
              <StatCard label={isRTL ? 'קטגוריות' : 'Categories'} value={stats.total_categories} color="green" />
              <StatCard label={isRTL ? 'גנריים' : 'Generic'} value={stats.generic_items} color="orange" />
            </div>
          )}

          {/* Search + Category Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'חפש פריט...' : 'Search items...'}
              className="input flex-1"
              dir="auto"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isRTL ? 'הכל' : 'All'}
              </button>
              {!catsLoading && categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isRTL ? cat.name_he : cat.name_en}
                  <span className="opacity-60 mr-1 ml-1">({cat.item_count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items Table */}
          {itemsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {isRTL ? 'שם' : 'Name'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      {isRTL ? 'קטגוריה' : 'Category'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {isRTL ? 'סוג' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">
                      {isRTL ? 'מחיר' : 'Price'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      {isRTL ? 'משקל' : 'Weight'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      {isRTL ? 'תכונות' : 'Flags'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems && filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        isRTL={isRTL}
                        isExpanded={expandedItems.has(item.id)}
                        onToggle={() => toggleExpand(item.id)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        {isRTL ? 'לא נמצאו פריטים' : 'No items found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredItems && (
                <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
                  {isRTL
                    ? `${filteredItems.length} פריטים`
                    : `${filteredItems.length} items`}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Item Modal */}
      <AddItemForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  )
}

function ItemRow({
  item,
  isRTL,
  isExpanded,
  onToggle,
}: {
  item: AdminItemType
  isRTL: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasVariants = item.is_generic && item.variant_count > 0

  return (
    <>
      <tr className={`hover:bg-gray-50 ${item.is_generic ? 'bg-purple-50/30' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasVariants && (
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-gray-600 w-5 text-center"
              >
                {isExpanded ? '▼' : isRTL ? '◀' : '▶'}
              </button>
            )}
            {!hasVariants && <span className="w-5" />}
            <div>
              <div className="font-medium">{isRTL ? item.name_he : item.name_en}</div>
              <div className="text-xs text-gray-500">{isRTL ? item.name_en : item.name_he}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
          {isRTL ? item.category_name_he : item.category_name}
        </td>
        <td className="px-4 py-3">
          {item.is_generic ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {isRTL ? 'גנרי' : 'Generic'}
              {item.variant_count > 0 && (
                <span className="opacity-70">({item.variant_count})</span>
              )}
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {isRTL ? 'פשוט' : 'Simple'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium" dir="ltr">
          {item.default_base_price} &#8362;
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${WEIGHT_COLORS[item.weight_class] || ''}`}>
            {isRTL ? WEIGHT_LABELS[item.weight_class]?.he : WEIGHT_LABELS[item.weight_class]?.en}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex gap-1">
            {item.requires_assembly && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded" title="Assembly">
                {isRTL ? 'הרכבה' : 'Asm'}
              </span>
            )}
            {item.is_fragile && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded" title="Fragile">
                {isRTL ? 'שביר' : 'Frag'}
              </span>
            )}
            {item.requires_special_handling && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded" title="Special">
                {isRTL ? 'מיוחד' : 'Spec'}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Variants (expanded) */}
      {hasVariants && isExpanded && item.variants.map(variant => (
        <tr key={variant.id} className="bg-purple-50/20 border-r-4 border-purple-300">
          <td className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-5" />
              <span className="w-4 text-purple-300">└</span>
              <div>
                <div className="text-sm">{isRTL ? variant.name_he : variant.name_en}</div>
                <div className="text-xs text-gray-400">{isRTL ? variant.name_en : variant.name_he}</div>
              </div>
            </div>
          </td>
          <td className="px-4 py-2 text-sm text-gray-400 hidden md:table-cell">-</td>
          <td className="px-4 py-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-500 rounded-full">
              {isRTL ? 'וריאנט' : 'Variant'}
            </span>
          </td>
          <td className="px-4 py-2 text-sm" dir="ltr">
            {variant.default_base_price} &#8362;
          </td>
          <td className="px-4 py-2 hidden md:table-cell">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${WEIGHT_COLORS[variant.weight_class] || ''}`}>
              {isRTL ? WEIGHT_LABELS[variant.weight_class]?.he : WEIGHT_LABELS[variant.weight_class]?.en}
            </span>
          </td>
          <td className="px-4 py-2 hidden md:table-cell">
            {variant.attribute_values && (
              <div className="text-xs text-gray-500">
                {Object.entries(variant.attribute_values).map(([key, val]) => (
                  <span key={key} className="px-1.5 py-0.5 bg-gray-100 rounded mr-1">
                    {key}: {val}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      ))}
    </>
  )
}
