import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories, useCreateCustomItem } from '../../api/hooks/useOrders'
import type { CustomItemData, ParsedItem } from '../../types'

interface CustomItemFormProps {
  isOpen: boolean
  onClose: () => void
  language: string
  initialData?: Partial<ParsedItem>
  suggestedAnswers?: Record<string, string>
  onItemCreated: (item: ParsedItem) => void
}

export function CustomItemForm({
  isOpen,
  onClose,
  language,
  initialData,
  suggestedAnswers: _suggestedAnswers,
  onItemCreated,
}: CustomItemFormProps) {
  useTranslation()
  const isRTL = language === 'he'

  const { data: categories } = useCategories()
  const createCustomItemMutation = useCreateCustomItem()

  const [formData, setFormData] = useState<CustomItemData>({
    name_en: initialData?.name_en || '',
    name_he: initialData?.name_he || '',
    category_id: initialData?.category_id || '',
    weight_class: 'medium',
    requires_assembly: initialData?.requires_assembly || false,
    is_fragile: initialData?.is_fragile || false,
    requires_special_handling: initialData?.requires_special_handling || false,
    estimated_size: 'medium',
  })

  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    field: keyof CustomItemData,
    value: string | boolean | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.name_en.trim() || !formData.name_he.trim()) {
      setError(
        isRTL
          ? 'נא למלא את שם הפריט בעברית ובאנגלית'
          : 'Please fill in the item name in both Hebrew and English'
      )
      return
    }

    if (!formData.category_id) {
      setError(isRTL ? 'נא לבחור קטגוריה' : 'Please select a category')
      return
    }

    try {
      const result = await createCustomItemMutation.mutateAsync(formData)

      if (result.success && result.item) {
        // Convert to ParsedItem format
        const newItem: ParsedItem = {
          matched_item_type_id: result.item.id,
          name_en: result.item.name_en,
          name_he: result.item.name_he,
          quantity: 1,
          requires_disassembly: false,
          requires_assembly: result.item.requires_assembly || false,
          is_fragile: result.item.is_fragile || false,
          requires_special_handling: result.item.requires_special_handling || false,
          confidence: 1.0,
          is_generic: false,
          requires_variant_clarification: false,
          default_base_price: String(result.item.default_base_price),
        }

        onItemCreated(newItem)
        onClose()
      }
    } catch (err) {
      setError(isRTL ? 'שגיאה ביצירת הפריט' : 'Error creating custom item')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 ${isRTL ? 'rtl' : 'ltr'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isRTL ? 'הוספת פריט מותאם אישית' : 'Add Custom Item'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isRTL
              ? 'הפריט לא נמצא בקטלוג. נא למלא את הפרטים הבאים:'
              : 'Item not found in catalog. Please fill in the following details:'}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Item Name in Hebrew */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'שם הפריט בעברית' : 'Item Name (Hebrew)'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <input
                type="text"
                value={formData.name_he}
                onChange={(e) => handleChange('name_he', e.target.value)}
                placeholder={isRTL ? 'לדוגמה: אקווריום גדול' : 'e.g., Large Aquarium'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Item Name in English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'שם הפריט באנגלית' : 'Item Name (English)'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => handleChange('name_en', e.target.value)}
                placeholder="e.g., Large Aquarium"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'קטגוריה' : 'Category'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'בחר קטגוריה' : 'Select category'}</option>
                {(Array.isArray(categories) ? categories : (categories as any)?.results || []).map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {isRTL ? cat.name_he : cat.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'גודל משוער' : 'Estimated Size'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'small', label_he: 'קטן', label_en: 'Small' },
                  { value: 'medium', label_he: 'בינוני', label_en: 'Medium' },
                  { value: 'large', label_he: 'גדול', label_en: 'Large' },
                  { value: 'extra_large', label_he: 'גדול מאוד', label_en: 'XL' },
                ].map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() =>
                      handleChange(
                        'estimated_size',
                        size.value as CustomItemData['estimated_size']
                      )
                    }
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.estimated_size === size.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isRTL ? size.label_he : size.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'משקל' : 'Weight'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'light', label_he: 'קל', label_en: 'Light' },
                  { value: 'medium', label_he: 'בינוני', label_en: 'Medium' },
                  { value: 'heavy', label_he: 'כבד', label_en: 'Heavy' },
                  { value: 'extra_heavy', label_he: 'כבד מאוד', label_en: 'Extra' },
                ].map((weight) => (
                  <button
                    key={weight.value}
                    type="button"
                    onClick={() =>
                      handleChange(
                        'weight_class',
                        weight.value as CustomItemData['weight_class']
                      )
                    }
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.weight_class === weight.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isRTL ? weight.label_he : weight.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_assembly}
                  onChange={(e) => handleChange('requires_assembly', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {isRTL ? 'דורש פירוק/הרכבה' : 'Requires assembly/disassembly'}
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_fragile}
                  onChange={(e) => handleChange('is_fragile', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {isRTL ? 'פריט שביר' : 'Fragile item'}
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_special_handling}
                  onChange={(e) =>
                    handleChange('requires_special_handling', e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {isRTL ? 'דורש טיפול מיוחד' : 'Requires special handling'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isRTL ? 'ביטול' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createCustomItemMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createCustomItemMutation.isPending
              ? isRTL
                ? 'יוצר...'
                : 'Creating...'
              : isRTL
                ? 'הוסף פריט'
                : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomItemForm
