import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminCategories, useAdminAttributes, useAdminItemTypes, useCreateItemType } from '../../api/hooks/useAdmin'
import type { CreateItemTypeData } from '../../api/endpoints/admin'
import toast from 'react-hot-toast'

interface AddItemFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type ItemMode = 'simple' | 'generic' | 'variant'

export default function AddItemForm({ isOpen, onClose, onSuccess }: AddItemFormProps) {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data: categories } = useAdminCategories()
  const { data: attributes } = useAdminAttributes()
  const { data: allItems } = useAdminItemTypes()
  const createMutation = useCreateItemType()

  const [mode, setMode] = useState<ItemMode>('simple')
  const [form, setForm] = useState({
    name_en: '',
    name_he: '',
    category: '',
    weight_class: 'medium',
    requires_assembly: false,
    is_fragile: false,
    requires_special_handling: false,
    default_base_price: '',
    parent_type: '',
    attribute_values: {} as Record<string, string>,
  })

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setMode('simple')
      setForm({
        name_en: '',
        name_he: '',
        category: '',
        weight_class: 'medium',
        requires_assembly: false,
        is_fragile: false,
        requires_special_handling: false,
        default_base_price: '',
        parent_type: '',
        attribute_values: {},
      })
    }
  }, [isOpen])

  // Get generic items for variant parent selection
  const genericItems = allItems?.filter(item => item.is_generic) || []

  // When parent_type changes, auto-fill category
  const selectedParent = genericItems.find(g => g.id === form.parent_type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateItemTypeData = {
      name_en: form.name_en,
      name_he: form.name_he,
      category: mode === 'variant' && selectedParent ? selectedParent.category : form.category,
      weight_class: form.weight_class,
      requires_assembly: form.requires_assembly,
      is_fragile: form.is_fragile,
      requires_special_handling: form.requires_special_handling,
      default_base_price: form.default_base_price,
      is_generic: mode === 'generic',
    }

    if (mode === 'variant') {
      data.parent_type = form.parent_type
      data.attribute_values = form.attribute_values
      data.is_generic = false
    }

    try {
      await createMutation.mutateAsync(data)
      toast.success(isRTL ? 'הפריט נוצר בהצלחה!' : 'Item created successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.name_en?.[0] || JSON.stringify(err.response?.data) || 'Error'
      toast.error(msg)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{isRTL ? 'הוספת פריט חדש' : 'Add New Item'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2 mb-6">
            {([
              { key: 'simple', label: isRTL ? 'פריט פשוט' : 'Simple Item' },
              { key: 'generic', label: isRTL ? 'פריט גנרי (עם וריאנטים)' : 'Generic (with variants)' },
              { key: 'variant', label: isRTL ? 'וריאנט של פריט קיים' : 'Variant of existing' },
            ] as { key: ItemMode; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Variant: select parent */}
            {mode === 'variant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'פריט אב' : 'Parent Item'}
                </label>
                <select
                  value={form.parent_type}
                  onChange={(e) => setForm({ ...form, parent_type: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">{isRTL ? 'בחר פריט גנרי...' : 'Select generic item...'}</option>
                  {genericItems.map(g => (
                    <option key={g.id} value={g.id}>
                      {isRTL ? g.name_he : g.name_en} ({isRTL ? g.category_name_he : g.category_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'שם בעברית' : 'Name (Hebrew)'}
                </label>
                <input
                  type="text"
                  value={form.name_he}
                  onChange={(e) => setForm({ ...form, name_he: e.target.value })}
                  className="input w-full"
                  dir="rtl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'שם באנגלית' : 'Name (English)'}
                </label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  className="input w-full"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Category (not for variants - auto from parent) */}
            {mode !== 'variant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'קטגוריה' : 'Category'}
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">{isRTL ? 'בחר קטגוריה...' : 'Select category...'}</option>
                  {(categories || []).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {isRTL ? cat.name_he : cat.name_en}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Variant: attribute values */}
            {mode === 'variant' && selectedParent && attributes && (() => {
              // Find which attributes the parent's variants use
              const parentVariants = selectedParent.variants || []
              const usedAttrCodes = new Set<string>()
              for (const v of parentVariants) {
                if (v.attribute_values) {
                  Object.keys(v.attribute_values).forEach(k => usedAttrCodes.add(k))
                }
              }
              const relevantAttrs = attributes.filter(a => usedAttrCodes.has(a.code))

              if (relevantAttrs.length === 0) return null
              return (
                <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                  <h4 className="font-medium text-purple-800">
                    {isRTL ? 'ערכי תכונות' : 'Attribute Values'}
                  </h4>
                  {relevantAttrs.map(attr => (
                    <div key={attr.code}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isRTL ? attr.name_he : attr.name_en}
                      </label>
                      <select
                        value={form.attribute_values[attr.code] || ''}
                        onChange={(e) => setForm({
                          ...form,
                          attribute_values: { ...form.attribute_values, [attr.code]: e.target.value }
                        })}
                        className="input w-full"
                        required
                      >
                        <option value="">{isRTL ? 'בחר...' : 'Select...'}</option>
                        {attr.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {isRTL ? opt.name_he : opt.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Price + Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'מחיר בסיס (₪)' : 'Base Price (ILS)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.default_base_price}
                  onChange={(e) => setForm({ ...form, default_base_price: e.target.value })}
                  className="input w-full"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'קטגוריית משקל' : 'Weight Class'}
                </label>
                <select
                  value={form.weight_class}
                  onChange={(e) => setForm({ ...form, weight_class: e.target.value })}
                  className="input w-full"
                >
                  <option value="light">{isRTL ? 'קל' : 'Light'}</option>
                  <option value="medium">{isRTL ? 'בינוני' : 'Medium'}</option>
                  <option value="heavy">{isRTL ? 'כבד' : 'Heavy'}</option>
                  <option value="extra_heavy">{isRTL ? 'כבד מאוד' : 'Extra Heavy'}</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requires_assembly}
                  onChange={(e) => setForm({ ...form, requires_assembly: e.target.checked })}
                  className="rounded"
                />
                {isRTL ? 'דורש הרכבה' : 'Requires Assembly'}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_fragile}
                  onChange={(e) => setForm({ ...form, is_fragile: e.target.checked })}
                  className="rounded"
                />
                {isRTL ? 'שביר' : 'Fragile'}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requires_special_handling}
                  onChange={(e) => setForm({ ...form, requires_special_handling: e.target.checked })}
                  className="rounded"
                />
                {isRTL ? 'טיפול מיוחד' : 'Special Handling'}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {createMutation.isPending
                  ? (isRTL ? 'יוצר...' : 'Creating...')
                  : (isRTL ? 'צור פריט' : 'Create Item')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
