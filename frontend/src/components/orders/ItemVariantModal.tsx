import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useResolveVariant } from '../../api/hooks/useOrders'
import type { VariantQuestion, VariantResolutionResponse, ParsedItem } from '../../types'

interface AvailableVariant {
  id: string
  name: string
  name_en: string
  name_he: string
  default_base_price: string
  attribute_values?: Record<string, string>
}

interface ItemVariantModalProps {
  isOpen: boolean
  onClose: () => void
  item: ParsedItem
  questions: VariantQuestion[]
  language: string
  onResolved: (resolvedItem: ParsedItem, variant: VariantResolutionResponse) => void
  onCreateCustom: (item: ParsedItem, answers: Record<string, string>) => void
  // Progress tracking props
  currentIndex?: number
  totalItems?: number
  currentInstanceIndex?: number
  totalInstances?: number
  itemName?: string
}

export function ItemVariantModal({
  isOpen,
  onClose,
  item,
  questions,
  language,
  onResolved,
  onCreateCustom,
  currentIndex = 0,
  totalItems = 1,
  currentInstanceIndex,
  totalInstances,
  itemName,
}: ItemVariantModalProps) {
  useTranslation()
  const isRTL = language === 'he'

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  // State for showing "no match" view with available variants
  const [noMatchData, setNoMatchData] = useState<{
    message: string
    availableVariants: AvailableVariant[]
  } | null>(null)

  const resolveVariantMutation = useResolveVariant()

  // Reset answers when modal opens with new item
  useEffect(() => {
    if (isOpen) {
      setAnswers({})
      setError(null)
      setNoMatchData(null)
    }
  }, [isOpen, item.matched_item_type_id, currentIndex])

  const handleAnswerChange = (attributeCode: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [attributeCode]: value,
    }))
  }

  const handleSelectVariant = (variant: AvailableVariant) => {
    // Build a fake resolution response to pass back to the parent
    const resolutionResponse: VariantResolutionResponse = {
      found: true,
      variant: {
        id: variant.id,
        name_en: variant.name_en,
        name_he: variant.name_he,
        default_base_price: parseFloat(variant.default_base_price),
        attribute_values: variant.attribute_values,
        prices: {
          base_price: variant.default_base_price,
          assembly_price: '0.00',
          disassembly_price: '0.00',
          special_handling_price: '0.00',
        },
      } as VariantResolutionResponse['variant'],
    }
    onResolved(item, resolutionResponse)
  }

  const handleSubmit = async () => {
    // Validate required fields
    const missingRequired = questions
      .filter((q) => q.is_required && !answers[q.attribute_code])
      .map((q) => (isRTL ? q.question_he : q.question_en))

    if (missingRequired.length > 0) {
      setError(
        isRTL
          ? `נא לענות על השאלות הבאות: ${missingRequired.join(', ')}`
          : `Please answer the following questions: ${missingRequired.join(', ')}`
      )
      return
    }

    if (!item.matched_item_type_id) {
      setError(isRTL ? 'שגיאה: פריט לא תקין' : 'Error: Invalid item')
      return
    }

    try {
      const result = await resolveVariantMutation.mutateAsync({
        item_type_id: item.matched_item_type_id,
        answers,
        language,
      })

      if (result.found && result.variant) {
        onResolved(item, result)
      } else {
        // No exact variant found - show available variants instead of jumping to custom item
        const availableVariants = result.available_variants || []
        if (availableVariants.length > 0) {
          setNoMatchData({
            message: isRTL
              ? (result.message_he || 'לא נמצאה התאמה מדויקת. ניתן לבחור מהאפשרויות הקיימות:')
              : (result.message_en || 'No exact match found. Please choose from available options:'),
            availableVariants,
          })
        } else {
          // Truly no variants exist - go to custom item
          onCreateCustom(item, answers)
        }
      }
    } catch (err) {
      setError(isRTL ? 'שגיאה בחיפוש הפריט' : 'Error resolving item variant')
    }
  }

  if (!isOpen) return null

  const displayName = itemName || (isRTL ? item.name_he : item.name_en)
  const progressPercent = totalItems > 0 ? Math.round(((currentIndex) / totalItems) * 100) : 0
  const completedCount = currentIndex
  const remainingCount = totalItems - currentIndex

  // Build the item label with instance number if there are multiple
  let itemLabel = displayName
  if (totalInstances && totalInstances > 1 && currentInstanceIndex !== undefined) {
    itemLabel = `${displayName} ${currentInstanceIndex + 1}/${totalInstances}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-md mx-4 ${isRTL ? 'rtl' : 'ltr'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>
              {isRTL
                ? `פריט ${currentIndex + 1} מתוך ${totalItems}`
                : `Item ${currentIndex + 1} of ${totalItems}`}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {isRTL
                ? `${completedCount} הושלמו`
                : `${completedCount} completed`}
            </span>
            <span>
              {isRTL
                ? `${remainingCount} נותרו`
                : `${remainingCount} remaining`}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {noMatchData
              ? (isRTL ? 'בחירת פריט' : 'Select Item')
              : (isRTL ? 'הבהרה לגבי פריט' : 'Item Clarification')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {noMatchData
              ? noMatchData.message
              : (
                <>
                  {isRTL
                    ? `נא לספק פרטים נוספים על: `
                    : `Please provide more details about: `}
                  <span className="font-semibold text-blue-600">{itemLabel}</span>
                </>
              )}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {noMatchData ? (
            /* No match view - show available variants to pick from */
            <div className="space-y-2">
              {noMatchData.availableVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleSelectVariant(variant)}
                  className="w-full flex justify-between items-center px-4 py-3 text-sm rounded-md border border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <span className="font-medium text-gray-800">
                    {isRTL ? variant.name_he : variant.name_en}
                  </span>
                  <span className="text-gray-500">
                    ₪{parseFloat(variant.default_base_price).toFixed(0)}
                  </span>
                </button>
              ))}

              {/* Option to create custom item as last resort */}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <button
                  type="button"
                  onClick={() => onCreateCustom(item, answers)}
                  className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  {isRTL ? 'הפריט שלי לא ברשימה - הוספת פריט מותאם אישית' : 'My item is not listed - add custom item'}
                </button>
              </div>
            </div>
          ) : (
            /* Normal questions view */
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.attribute_code}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? question.question_he : question.question_en}
                    {question.is_required && <span className="text-red-500 mr-1">*</span>}
                  </label>

                  {question.input_type === 'select' && (
                    <div className="grid grid-cols-2 gap-2">
                      {question.options.map((option) => {
                        const isSelected = answers[question.attribute_code] === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleAnswerChange(question.attribute_code, option.value)}
                            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {isRTL ? option.label_he : option.label_en}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {question.input_type === 'number' && (
                    <input
                      type="number"
                      min="1"
                      value={answers[question.attribute_code] || ''}
                      onChange={(e) =>
                        handleAnswerChange(question.attribute_code, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {question.input_type === 'boolean' && (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(question.attribute_code, 'true')}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          answers[question.attribute_code] === 'true'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isRTL ? 'כן' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(question.attribute_code, 'false')}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          answers[question.attribute_code] === 'false'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isRTL ? 'לא' : 'No'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          {noMatchData ? (
            /* In no-match view, show back button to go back to questions */
            <button
              type="button"
              onClick={() => setNoMatchData(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isRTL ? 'חזרה' : 'Back'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isRTL ? 'דלג' : 'Skip'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={resolveVariantMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolveVariantMutation.isPending
                  ? isRTL
                    ? 'מחפש...'
                    : 'Searching...'
                  : currentIndex < totalItems - 1
                    ? isRTL
                      ? 'הבא'
                      : 'Next'
                    : isRTL
                      ? 'סיום'
                      : 'Finish'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ItemVariantModal
