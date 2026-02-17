import { useForm, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useQuoteTemplates, useCreateQuote, useUpdateQuote, useItemTypes } from '../../api/hooks'
import type { Quote, CreateQuoteData, CreateQuoteItemData } from '../../types'

interface QuoteEditorProps {
  orderId: string
  quote?: Quote | null
  onSave?: (quote: Quote) => void
  onCancel?: () => void
}

interface QuoteFormData {
  template: string
  valid_until: string
  discount_amount: number
  discount_type: 'percentage' | 'fixed'
  notes: string
  notes_he: string
  items: CreateQuoteItemData[]
}

export default function QuoteEditor({ orderId, quote, onSave, onCancel }: QuoteEditorProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const { data: templates } = useQuoteTemplates()
  const { data: itemTypes } = useItemTypes()
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()

  const defaultValues: QuoteFormData = {
    template: quote?.template || templates?.find((t) => t.is_default)?.id || '',
    valid_until: quote?.valid_until || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discount_amount: quote?.discount_amount || 0,
    discount_type: quote?.discount_type || 'fixed',
    notes: quote?.notes || '',
    notes_he: quote?.notes_he || '',
    items: quote?.items?.map((item) => ({
      item_type: item.item_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      requires_assembly: item.requires_assembly,
      assembly_price: item.assembly_price,
      is_fragile: item.is_fragile,
      special_handling_price: item.special_handling_price,
      notes: item.notes,
    })) || [],
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({ defaultValues })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchItems = watch('items')
  const watchDiscount = watch('discount_amount')
  const watchDiscountType = watch('discount_type')

  const subtotal = watchItems.reduce((sum, item) => {
    const itemTotal = (item.unit_price || 0) * (item.quantity || 0)
    const assemblyTotal = item.requires_assembly ? (item.assembly_price || 0) * (item.quantity || 0) : 0
    const handlingTotal = item.is_fragile ? (item.special_handling_price || 0) * (item.quantity || 0) : 0
    return sum + itemTotal + assemblyTotal + handlingTotal
  }, 0)

  const discountAmount = watchDiscountType === 'percentage'
    ? (subtotal * (watchDiscount || 0)) / 100
    : (watchDiscount || 0)

  const taxRate = 0.17 // 17% VAT
  const taxAmount = (subtotal - discountAmount) * taxRate
  const total = subtotal - discountAmount + taxAmount

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const payload: CreateQuoteData = {
        order: orderId,
        template: data.template || undefined,
        valid_until: data.valid_until,
        discount_amount: data.discount_amount,
        discount_type: data.discount_type,
        notes: data.notes,
        notes_he: data.notes_he,
        items: data.items,
      }

      let result: Quote
      if (quote) {
        result = await updateQuote.mutateAsync({ id: quote.id, data: payload })
      } else {
        result = await createQuote.mutateAsync(payload)
      }
      onSave?.(result)
    } catch (err) {
      console.error('Failed to save quote:', err)
    }
  }

  const addItem = () => {
    append({
      item_type: '',
      quantity: 1,
      unit_price: 0,
      requires_assembly: false,
      assembly_price: 0,
      is_fragile: false,
      special_handling_price: 0,
      notes: '',
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Template & Validity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.template')}
          </label>
          <select
            {...register('template')}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">{t('quotes.noTemplate')}</option>
            {templates?.map((template) => (
              <option key={template.id} value={template.id}>
                {isRTL ? template.name_he : template.name}
                {template.is_default && ` (${t('common.default')})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.validUntil')}
          </label>
          <input
            type="date"
            {...register('valid_until', { required: t('validation.required') })}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.valid_until && (
            <p className="mt-1 text-sm text-red-500">{errors.valid_until.message}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{t('quotes.items')}</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t('quotes.addItem')}
          </button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('quotes.itemType')}
                </label>
                <select
                  {...register(`items.${index}.item_type` as const, { required: true })}
                  className="w-full rounded border-gray-300 text-sm"
                >
                  <option value="">{t('quotes.selectItem')}</option>
                  {itemTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {isRTL ? type.name_he : type.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('quotes.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  {...register(`items.${index}.quantity` as const, {
                    required: true,
                    valueAsNumber: true,
                  })}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('quotes.unitPrice')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`items.${index}.unit_price` as const, {
                    required: true,
                    valueAsNumber: true,
                  })}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register(`items.${index}.requires_assembly` as const)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{t('quotes.requiresAssembly')}</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register(`items.${index}.is_fragile` as const)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{t('quotes.isFragile')}</span>
              </label>

              <button
                type="button"
                onClick={() => remove(index)}
                className="ms-auto p-1 text-red-500 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            {watchItems[index]?.requires_assembly && (
              <div className="w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('quotes.assemblyPrice')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`items.${index}.assembly_price` as const, { valueAsNumber: true })}
                  className="w-full rounded border-gray-300 text-sm"
                />
              </div>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            {t('quotes.noItems')}
          </div>
        )}
      </div>

      {/* Discount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.discount')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              {...register('discount_amount', { valueAsNumber: true })}
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <select
              {...register('discount_type')}
              className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="fixed">₪</option>
              <option value="percentage">%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.notes')} (English)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotes.notes')} (עברית)
          </label>
          <textarea
            {...register('notes_he')}
            rows={3}
            dir="rtl"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('quotes.subtotal')}</span>
          <span className="font-medium">₪{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t('quotes.discount')}</span>
            <span>-₪{discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('quotes.tax')} (17%)</span>
          <span className="font-medium">₪{taxAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
          <span>{t('quotes.total')}</span>
          <span>₪{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
