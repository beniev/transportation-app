import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCreateOrder, useParseDescription, useAddOrderItem } from '../../api/hooks'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AddressAutocomplete from '../../components/common/AddressAutocomplete'
import ItemVariantModal from '../../components/orders/ItemVariantModal'
import CustomItemForm from '../../components/orders/CustomItemForm'
import type { CreateOrderData, ParsedItem, VariantClarification, VariantResolutionResponse } from '../../types'

// Local interface for backward compatibility with local component state
interface LocalParsedItem {
  item_type: string
  item_name: string
  name_en?: string
  name_he?: string
  quantity: number
  confidence: number
  requires_clarification: boolean
  clarification_question?: string
  is_generic?: boolean
  requires_variant_clarification?: boolean
  default_base_price?: string
  // Enhanced fields
  requires_disassembly?: boolean
  requires_assembly?: boolean
  is_fragile?: boolean
  requires_special_handling?: boolean
  special_notes?: string
  room?: string
}

// Local parse result that uses LocalParsedItem instead of ParsedItem
interface LocalParseResult {
  items: LocalParsedItem[]
  clarifying_questions: any[]
  clarification_questions?: { item_index: number; question_he: string; question_en: string; type: string }[]
  suggestions?: any[]
  variant_clarifications: VariantClarification[]
  needs_clarification?: any[]
  summary?: {
    total_items?: number
    rooms_mentioned?: string[]
    special_requirements?: string[]
  }
  error?: string
}

export default function CreateOrder() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'he'

  const [step, setStep] = useState(1)
  const [description, setDescription] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<LocalParseResult | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', quantity: 1,
    requires_disassembly: false, requires_assembly: false,
    is_fragile: false, requires_special_handling: false,
    special_notes: '', room: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderData, setOrderData] = useState<CreateOrderData>({
    origin_address: '',
    origin_city: '',
    origin_floor: 0,
    origin_has_elevator: false,
    destination_address: '',
    destination_city: '',
    destination_floor: 0,
    destination_has_elevator: false,
    free_text_description: '',
    moving_date: '',
    moving_date_end: '',
    date_flexibility: 'specific',
    preferred_time_slot: '',
  })
  const [originExact, setOriginExact] = useState(false)
  const [destinationExact, setDestinationExact] = useState(false)

  // Variant clarification state
  const [variantClarifications, setVariantClarifications] = useState<VariantClarification[]>([])
  const [originalClarifications, setOriginalClarifications] = useState<VariantClarification[]>([])
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState<number | null>(null)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)
  const [customItemInitialData, setCustomItemInitialData] = useState<Partial<ParsedItem> | null>(null)
  const [customItemAnswers, setCustomItemAnswers] = useState<Record<string, string>>({})
  const [originalClarificationCount, setOriginalClarificationCount] = useState(0)
  const [completedClarificationCount, setCompletedClarificationCount] = useState(0)

  // Track if we've initialized clarifications for the current parse
  const clarificationsInitializedRef = useRef(false)

  // Check for items needing clarification when parse result changes
  // Only initialize once per parse to prevent loops when updating items
  useEffect(() => {
    if (parseResult?.variant_clarifications &&
        parseResult.variant_clarifications.length > 0 &&
        !clarificationsInitializedRef.current) {
      clarificationsInitializedRef.current = true

      // Sort clarifications so same item types are grouped together
      const sortedClarifications = [...parseResult.variant_clarifications].sort((a, b) => {
        // Group by item_type_id first
        if (a.item_type_id < b.item_type_id) return -1
        if (a.item_type_id > b.item_type_id) return 1
        // Then by item_index within same type
        return a.item_index - b.item_index
      })

      setVariantClarifications(sortedClarifications)
      setOriginalClarifications(sortedClarifications) // Keep original for instance counting
      setOriginalClarificationCount(sortedClarifications.length)
      setCompletedClarificationCount(0)
      // Automatically open first clarification modal
      setCurrentClarificationIndex(0)
    }
  }, [parseResult])

  // Reset the initialization flag when parseResult becomes null (new order)
  useEffect(() => {
    if (!parseResult) {
      clarificationsInitializedRef.current = false
      setVariantClarifications([])
      setOriginalClarifications([])
      setCurrentClarificationIndex(null)
      setOriginalClarificationCount(0)
      setCompletedClarificationCount(0)
    }
  }, [parseResult])

  const createOrderMutation = useCreateOrder()
  const parseDescriptionMutation = useParseDescription()
  const addOrderItemMutation = useAddOrderItem()


  // Consolidate duplicate items by item_type (variant ID) or name
  const consolidateItems = (items: LocalParsedItem[]): LocalParsedItem[] => {
    const consolidated = new Map<string, LocalParsedItem>()

    for (const item of items) {
      // Use item_type (variant ID) as primary key if available, otherwise use name
      const key = item.item_type || item.item_name.toLowerCase().trim()
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!
        existing.quantity += item.quantity
        // Keep the higher confidence
        existing.confidence = Math.max(existing.confidence, item.confidence)
      } else {
        consolidated.set(key, { ...item })
      }
    }

    return Array.from(consolidated.values())
  }

  // Handle variant resolution
  const handleVariantResolved = (_originalItem: ParsedItem, resolution: VariantResolutionResponse) => {
    if (!parseResult || !resolution.variant) return

    const clarification = variantClarifications[currentClarificationIndex!]
    const itemIndex = clarification.item_index
    const resolvedVariantId = resolution.variant!.id
    const resolvedName = isRTL ? resolution.variant!.name_he : resolution.variant!.name_en

    // Calculate remaining clarifications FIRST (before updating state)
    const remainingClarifications = variantClarifications.filter(
      (_, idx) => idx !== currentClarificationIndex
    )

    // Check if there's already an item with the same variant ID
    const existingItemIndex = (parseResult as any).items?.findIndex(
      (item: any, idx: number) => idx !== itemIndex && item.item_type === resolvedVariantId
    )

    let updatedItems: any[]

    if (existingItemIndex !== -1 && existingItemIndex !== undefined) {
      // Merge with existing item - increase quantity and remove the current item
      updatedItems = (parseResult as any).items?.map((item: any, idx: number) => {
        if (idx === existingItemIndex) {
          return {
            ...item,
            quantity: (item.quantity || 1) + 1,
          }
        }
        return item
      }).filter((_: any, idx: number) => idx !== itemIndex)
    } else {
      // Update the current item with resolved variant
      updatedItems = (parseResult as any).items?.map((item: any, idx: number) => {
        if (idx === itemIndex) {
          return {
            ...item,
            item_name: resolvedName,
            item_type: resolvedVariantId,
            is_generic: false,
            requires_variant_clarification: false,
          }
        }
        return item
      })
    }

    // Update local state
    setVariantClarifications(remainingClarifications)
    setCompletedClarificationCount(prev => prev + 1)

    // Move to next clarification or close modal
    if (remainingClarifications.length > 0) {
      // More clarifications to go - keep items separate
      setParseResult({
        ...parseResult,
        items: updatedItems,
        variant_clarifications: remainingClarifications,
      } as LocalParseResult)
      setCurrentClarificationIndex(0)
    } else {
      // All clarifications done - consolidate items now
      const consolidatedFinal = consolidateItems(updatedItems)
      setParseResult({
        ...parseResult,
        items: consolidatedFinal,
        variant_clarifications: [],
      } as LocalParseResult)
      setCurrentClarificationIndex(null)
    }
  }

  // Handle custom item creation request (when no variant found)
  const handleCreateCustomItem = (item: ParsedItem, answers: Record<string, string>) => {
    setCustomItemInitialData(item)
    setCustomItemAnswers(answers)
    setCurrentClarificationIndex(null)
    setShowCustomItemForm(true)
  }

  // Handle custom item created
  const handleCustomItemCreated = (newItem: ParsedItem) => {
    if (!parseResult) return

    // Find the item that was being clarified and replace it
    const clarification = variantClarifications.find(
      (c) => c.item_type_id === customItemInitialData?.matched_item_type_id
    )

    if (clarification) {
      const updatedItems = parseResult.items.map((item, idx) => {
        if (idx === clarification.item_index) {
          return {
            item_type: newItem.matched_item_type_id || '',
            item_name: isRTL ? newItem.name_he : newItem.name_en,
            quantity: item.quantity || 1,
            confidence: 1.0,
            requires_clarification: false,
            is_generic: false,
          } as any
        }
        return item
      })

      setParseResult({
        ...parseResult,
        items: updatedItems,
      } as LocalParseResult)
    } else {
      // Add as new item
      const newLocalItem = {
        item_type: newItem.matched_item_type_id || '',
        item_name: isRTL ? newItem.name_he : newItem.name_en,
        quantity: 1,
        confidence: 1.0,
        requires_clarification: false,
        is_generic: false,
      } as any

      setParseResult({
        ...parseResult,
        items: [...parseResult.items, newLocalItem],
      } as LocalParseResult)
    }

    // Remove from clarifications
    const remainingClarifications = variantClarifications.filter(
      (c) => c.item_type_id !== customItemInitialData?.matched_item_type_id
    )
    setVariantClarifications(remainingClarifications)
    setShowCustomItemForm(false)
    setCustomItemInitialData(null)
    setCustomItemAnswers({})
  }

  // Close variant modal
  const handleCloseVariantModal = () => {
    setCurrentClarificationIndex(null)
  }

  const handleDescriptionSubmit = async () => {
    try {
      console.log('Creating order with data:', orderData)
      const { moving_date, moving_date_end, date_flexibility, ...restData } = orderData
      const order = await createOrderMutation.mutateAsync({
        ...restData,
        preferred_date: moving_date || undefined,
        preferred_date_end: date_flexibility === 'range' ? (moving_date_end || undefined) : undefined,
        date_flexibility: date_flexibility || 'specific',
        free_text_description: description,
      })
      console.log('Order created:', order)
      console.log('Order ID from response:', order.id)
      if (!order.id) {
        console.error('Order created but no ID returned!')
        toast.error('שגיאה: לא התקבל מזהה הזמנה')
        return
      }
      setOrderId(order.id)
      console.log('setOrderId called with:', order.id)

      try {
        console.log('Parsing description...')
        const result = await parseDescriptionMutation.mutateAsync({
          orderId: order.id,
          description,
        })
        console.log('Parse result:', result)

        // Map items - DON'T consolidate yet if there are variant clarifications
        // Consolidation breaks the item_index references in clarifications
        console.log('Raw API result:', result)
        const mappedItems: LocalParsedItem[] = (result.items || []).map((item: any) => ({
          item_type: item.matched_item_type_id || '',
          item_name: item.name_he || item.name_en || '',
          name_en: item.name_en || '',
          name_he: item.name_he || '',
          quantity: item.quantity || 1,
          confidence: item.confidence || 0.8,
          requires_clarification: item.needs_clarification || false,
          clarification_question: item.clarification_question,
          is_generic: item.is_generic || false,
          requires_variant_clarification: item.requires_variant_clarification || false,
          default_base_price: item.default_base_price,
          requires_disassembly: item.requires_disassembly || false,
          requires_assembly: item.requires_assembly || false,
          is_fragile: item.is_fragile || false,
          requires_special_handling: item.requires_special_handling || false,
          special_notes: item.special_notes || '',
          room: item.room || '',
        }))
        console.log('Mapped items:', mappedItems)

        // Only consolidate if there are NO variant clarifications
        // Otherwise, keep items separate to preserve index references
        const hasVariantClarifications = result.variant_clarifications && result.variant_clarifications.length > 0
        const finalItems = hasVariantClarifications ? mappedItems : consolidateItems(mappedItems)
        console.log('Final items (consolidated:', !hasVariantClarifications, '):', finalItems)

        const newParseResult: LocalParseResult = {
          items: finalItems,
          clarifying_questions: result.needs_clarification || [],
          clarification_questions: result.clarification_questions || [],
          suggestions: (result as any).suggestions || [],
          variant_clarifications: result.variant_clarifications || [],
          summary: result.summary || {},
        }
        console.log('Setting parseResult to:', newParseResult)
        setParseResult(newParseResult)
      } catch (parseError: any) {
        console.error('AI parsing failed:', parseError)
        toast.error('ניתוח AI נכשל, ניתן להוסיף פריטים ידנית')
        setParseResult({
          items: [],
          clarifying_questions: [],
          suggestions: [],
          variant_clarifications: [],
        })
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.error ||
                          error.message ||
                          t('common.error')
      toast.error(errorMessage)
    }
  }

  const handleAddressSubmit = () => {
    if (orderData.origin_address && orderData.destination_address) {
      setStep(2)
    }
  }

  const handleConfirmItems = async () => {
    console.log('handleConfirmItems called')
    console.log('orderId:', orderId)
    console.log('parseResult:', parseResult)
    console.log('parseResult.items:', parseResult?.items)

    if (!orderId) {
      toast.error('חסר מזהה הזמנה')
      return
    }
    if (!parseResult) {
      toast.error('אין תוצאות ניתוח')
      return
    }
    if (!parseResult.items || parseResult.items.length === 0) {
      toast.error('אין פריטים לאישור')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Adding items to order:', orderId)
      for (const item of parseResult.items) {
        console.log('Adding item:', item)
        await addOrderItemMutation.mutateAsync({
          orderId,
          data: {
            name: item.item_name || 'פריט',
            quantity: item.quantity,
            item_type: item.item_type || undefined,
            requires_assembly: item.requires_assembly || false,
            requires_disassembly: item.requires_disassembly || false,
            is_fragile: item.is_fragile || false,
            requires_special_handling: item.requires_special_handling || false,
            description: item.special_notes || '',
            room_name: item.room || '',
            ai_confidence: item.confidence || 0,
          },
        })
      }
      toast.success(isRTL ? 'הפריטים נוספו בהצלחה!' : 'Items added successfully!')

      // Navigate to order status page
      const targetUrl = `/order/status/${orderId}`
      console.log('Navigating to:', targetUrl)

      // Use setTimeout to ensure toast is shown before navigation
      setTimeout(() => {
        try {
          navigate(targetUrl)
        } catch (navError) {
          console.error('Navigation error:', navError)
          // Fallback: use window.location
          window.location.href = targetUrl
        }
      }, 500)

    } catch (error: any) {
      console.error('Error adding items:', error)
      const errorMsg = error.response?.data?.detail ||
                       error.response?.data?.name?.[0] ||
                       JSON.stringify(error.response?.data) ||
                       t('common.error')
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditItem = (index: number) => {
    if (!parseResult) return
    const item = parseResult.items[index]
    setEditForm({
      name: item.item_name, quantity: item.quantity,
      requires_disassembly: item.requires_disassembly || false,
      requires_assembly: item.requires_assembly || false,
      is_fragile: item.is_fragile || false,
      requires_special_handling: item.requires_special_handling || false,
      special_notes: item.special_notes || '',
      room: item.room || '',
    })
    setEditingIndex(index)
  }

  const handleSaveEdit = () => {
    if (!parseResult || editingIndex === null) return

    const updatedItems = [...parseResult.items]
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      item_name: editForm.name,
      quantity: editForm.quantity,
      requires_disassembly: editForm.requires_disassembly,
      requires_assembly: editForm.requires_assembly,
      is_fragile: editForm.is_fragile,
      requires_special_handling: editForm.requires_special_handling,
      special_notes: editForm.special_notes,
      room: editForm.room,
    }

    setParseResult({ ...parseResult, items: updatedItems })
    setEditingIndex(null)
  }

  const handleDeleteItem = (index: number) => {
    if (!parseResult) return
    const updatedItems = parseResult.items.filter((_, i) => i !== index)
    setParseResult({ ...parseResult, items: updatedItems })
  }

  const handleAddItem = () => {
    if (!parseResult) return
    const newItem: LocalParsedItem = {
      item_type: '',
      item_name: 'פריט חדש',
      quantity: 1,
      confidence: 1,
      requires_clarification: false,
      is_generic: false,
      requires_disassembly: false,
      requires_assembly: false,
      is_fragile: false,
      requires_special_handling: false,
      special_notes: '',
      room: '',
    }
    setParseResult({ ...parseResult, items: [...parseResult.items, newItem] } as LocalParseResult)
    // Immediately edit the new item
    setEditForm({
      name: newItem.item_name, quantity: newItem.quantity,
      requires_disassembly: false, requires_assembly: false,
      is_fragile: false, requires_special_handling: false,
      special_notes: '', room: '',
    })
    setEditingIndex(parseResult.items.length)
  }

  // Check if an item needs variant clarification
  const itemNeedsClarification = (_item: any, index: number): boolean => {
    return variantClarifications.some((c) => c.item_index === index)
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">{t('orders.newOrder')}</h1>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Addresses */}
      {step === 1 && (
        <div className="card">
          <h2 className="text-xl font-medium mb-4">{t('orders.addresses')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">{t('orders.origin')}</h3>
              <AddressAutocomplete
                value={orderData.origin_address}
                onChange={(val) => {
                  setOrderData({ ...orderData, origin_address: val })
                  setOriginExact(false)
                }}
                onPlaceSelect={(place) => {
                  setOrderData({
                    ...orderData,
                    origin_address: place.address,
                    origin_city: place.city,
                    origin_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : undefined,
                  })
                  setOriginExact(place.isExact)
                }}
                placeholder={t('orders.addressPlaceholder')}
                className="input w-full"
                isRTL={isRTL}
              />
              <input
                type="text"
                value={orderData.origin_city}
                onChange={(e) => setOrderData({ ...orderData, origin_city: e.target.value })}
                placeholder={t('orders.city')}
                className="input w-full"
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  value={orderData.origin_floor}
                  onChange={(e) => setOrderData({ ...orderData, origin_floor: parseInt(e.target.value) || 0 })}
                  placeholder={t('orders.floor')}
                  className="input w-24"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={orderData.origin_has_elevator}
                    onChange={(e) => setOrderData({ ...orderData, origin_has_elevator: e.target.checked })}
                    className="rounded"
                  />
                  {t('orders.hasElevator')}
                </label>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">{t('orders.destination')}</h3>
              <AddressAutocomplete
                value={orderData.destination_address}
                onChange={(val) => {
                  setOrderData({ ...orderData, destination_address: val })
                  setDestinationExact(false)
                }}
                onPlaceSelect={(place) => {
                  setOrderData({
                    ...orderData,
                    destination_address: place.address,
                    destination_city: place.city,
                    destination_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : undefined,
                  })
                  setDestinationExact(place.isExact)
                }}
                placeholder={t('orders.addressPlaceholder')}
                className="input w-full"
                isRTL={isRTL}
              />
              <input
                type="text"
                value={orderData.destination_city}
                onChange={(e) => setOrderData({ ...orderData, destination_city: e.target.value })}
                placeholder={t('orders.city')}
                className="input w-full"
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  value={orderData.destination_floor}
                  onChange={(e) => setOrderData({ ...orderData, destination_floor: parseInt(e.target.value) || 0 })}
                  placeholder={t('orders.floor')}
                  className="input w-24"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={orderData.destination_has_elevator}
                    onChange={(e) => setOrderData({ ...orderData, destination_has_elevator: e.target.checked })}
                    className="rounded"
                  />
                  {t('orders.hasElevator')}
                </label>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-medium text-gray-700 mb-4">{t('orders.preferredDate')}</h3>

            {/* Date Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOrderData({ ...orderData, date_flexibility: 'specific', moving_date_end: '' })}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  orderData.date_flexibility !== 'range'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isRTL ? '📅 תאריך מסוים' : '📅 Specific Date'}
              </button>
              <button
                type="button"
                onClick={() => setOrderData({ ...orderData, date_flexibility: 'range' })}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  orderData.date_flexibility === 'range'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isRTL ? '📆 טווח תאריכים' : '📆 Date Range'}
              </button>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {orderData.date_flexibility === 'range'
                    ? (isRTL ? 'מתאריך' : 'From date')
                    : (isRTL ? 'תאריך' : 'Date')}
                </label>
                <input
                  type="date"
                  value={orderData.moving_date || ''}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setOrderData({ ...orderData, moving_date: e.target.value })}
                  className="input w-full"
                />
              </div>

              {orderData.date_flexibility === 'range' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {isRTL ? 'עד תאריך' : 'To date'}
                  </label>
                  <input
                    type="date"
                    value={orderData.moving_date_end || ''}
                    min={orderData.moving_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setOrderData({ ...orderData, moving_date_end: e.target.value })}
                    className="input w-full"
                  />
                </div>
              )}

              <div className={orderData.date_flexibility === 'range' ? 'md:col-span-2' : ''}>
                <label className="block text-sm text-gray-600 mb-1">
                  {isRTL ? 'שעה מועדפת' : 'Preferred time'}
                </label>
                <select
                  value={orderData.preferred_time_slot || ''}
                  onChange={(e) => setOrderData({ ...orderData, preferred_time_slot: e.target.value })}
                  className="input w-full"
                >
                  <option value="">{isRTL ? 'גמיש' : 'Flexible'}</option>
                  <option value="morning">{isRTL ? 'בוקר (08:00-12:00)' : 'Morning (08:00-12:00)'}</option>
                  <option value="afternoon">{isRTL ? 'צהריים (12:00-16:00)' : 'Afternoon (12:00-16:00)'}</option>
                  <option value="evening">{isRTL ? 'ערב (16:00-20:00)' : 'Evening (16:00-20:00)'}</option>
                </select>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-gray-400 mt-2">
              {orderData.date_flexibility === 'range'
                ? (isRTL ? 'בחר טווח תאריכים — המערכת תמצא מוביל זמין באחד הימים' : 'Select a date range — the system will find a mover available on any day')
                : (isRTL ? 'בחר תאריך מדויק להובלה' : 'Select a specific date for your move')}
            </p>
          </div>

          {(!originExact || !destinationExact) && (orderData.origin_address || orderData.destination_address) && (
            <p className="text-sm text-red-500 mt-4 text-center" dir="rtl">
              {!originExact && !destinationExact
                ? 'יש לבחור כתובות מדויקות עם מספר בית מהרשימה הנפתחת'
                : !originExact
                ? 'יש לבחור כתובת מוצא מדויקת עם מספר בית מהרשימה הנפתחת'
                : 'יש לבחור כתובת יעד מדויקת עם מספר בית מהרשימה הנפתחת'}
            </p>
          )}
          <button
            onClick={handleAddressSubmit}
            disabled={!originExact || !destinationExact}
            className="btn btn-primary w-full mt-6"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Step 2: Description */}
      {step === 2 && !parseResult && (
        <div className="card">
          <h2 className="text-xl font-medium mb-4">{t('orders.describeItems')}</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('orders.descriptionPlaceholder')}
            className="input min-h-[150px] w-full"
            dir="auto"
          />

          {createOrderMutation.isPending || parseDescriptionMutation.isPending ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
              <span className="mr-2">{t('orders.analyzing')}</span>
            </div>
          ) : (
            <div className="flex gap-4 mt-4">
              <button onClick={() => setStep(1)} className="btn btn-secondary">
                {t('common.back')}
              </button>
              <button
                onClick={handleDescriptionSubmit}
                disabled={!description.trim()}
                className="btn btn-primary flex-1"
              >
                {t('orders.parseItems')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2b: Review parsed items */}
      {step === 2 && parseResult && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">{t('orders.reviewItems')}</h2>
            <button
              onClick={handleAddItem}
              className="btn btn-secondary text-sm"
            >
              + הוסף פריט
            </button>
          </div>

          {parseResult.items.length > 0 ? (
            <div className="space-y-3">
              {parseResult.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  {editingIndex === index ? (
                    // Edit mode — full item editing
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input flex-1"
                          placeholder={isRTL ? 'שם הפריט' : 'Item name'}
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                          className="input w-20"
                          min={1}
                        />
                      </div>
                      {/* Toggle flags */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'requires_disassembly' as const, label: '🔧 פירוק', labelEn: '🔧 Disassembly' },
                          { key: 'requires_assembly' as const, label: '🔩 הרכבה', labelEn: '🔩 Assembly' },
                          { key: 'is_fragile' as const, label: '⚠️ שביר', labelEn: '⚠️ Fragile' },
                          { key: 'requires_special_handling' as const, label: '🏗️ טיפול מיוחד', labelEn: '🏗️ Special' },
                        ].map(({ key, label, labelEn }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, [key]: !editForm[key] })}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              editForm[key]
                                ? 'bg-blue-100 border-blue-400 text-blue-800'
                                : 'bg-gray-50 border-gray-300 text-gray-500'
                            }`}
                          >
                            {isRTL ? label : labelEn}
                          </button>
                        ))}
                      </div>
                      {/* Room + notes */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editForm.room}
                          onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                          className="input w-32 text-sm"
                          placeholder={isRTL ? '📍 חדר' : '📍 Room'}
                        />
                        <input
                          type="text"
                          value={editForm.special_notes}
                          onChange={(e) => setEditForm({ ...editForm, special_notes: e.target.value })}
                          className="input flex-1 text-sm"
                          placeholder={isRTL ? '💬 הערות (משקל, מידות, מותג...)' : '💬 Notes (weight, dimensions, brand...)'}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="btn btn-primary text-sm px-3">
                          {isRTL ? 'שמור' : 'Save'}
                        </button>
                        <button onClick={() => setEditingIndex(null)} className="btn btn-secondary text-sm px-3">
                          {isRTL ? 'בטל' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode — show tags + notes
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                          {itemNeedsClarification(item, index) && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                              {isRTL ? 'דורש הבהרה' : 'Needs clarification'}
                            </span>
                          )}
                        </div>
                        {/* Item detail tags */}
                        {(item.requires_disassembly || item.requires_assembly || item.is_fragile || item.requires_special_handling || item.room) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.requires_disassembly && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">🔧 {isRTL ? 'פירוק' : 'Disassembly'}</span>
                            )}
                            {item.requires_assembly && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">🔩 {isRTL ? 'הרכבה' : 'Assembly'}</span>
                            )}
                            {item.is_fragile && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">⚠️ {isRTL ? 'שביר' : 'Fragile'}</span>
                            )}
                            {item.requires_special_handling && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">🏗️ {isRTL ? 'טיפול מיוחד' : 'Special handling'}</span>
                            )}
                            {item.room && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">📍 {item.room}</span>
                            )}
                          </div>
                        )}
                        {/* Special notes */}
                        {item.special_notes && (
                          <p className="text-xs text-gray-500 mt-1">💬 {item.special_notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {itemNeedsClarification(item, index) ? (
                          <button
                            onClick={() => {
                              const clarIdx = variantClarifications.findIndex(
                                (c) => c.item_index === index
                              )
                              if (clarIdx !== -1) {
                                setCurrentClarificationIndex(clarIdx)
                              }
                            }}
                            className="text-sm px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                          >
                            {isRTL ? 'הבהר' : 'Clarify'}
                          </button>
                        ) : (
                          <span
                            className={`text-sm px-2 py-1 rounded ${
                              item.confidence > 0.8
                                ? 'bg-green-100 text-green-700'
                                : item.confidence > 0.5
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {Math.round(item.confidence * 100)}%
                          </span>
                        )}
                        <button
                          onClick={() => handleEditItem(index)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title={isRTL ? 'ערוך' : 'Edit'}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title={isRTL ? 'מחק' : 'Delete'}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t('orders.noItemsFound')}</p>
              <button
                onClick={handleAddItem}
                className="btn btn-primary mt-4"
              >
                הוסף פריט ידנית
              </button>
            </div>
          )}

          {variantClarifications.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-medium text-orange-800 mb-2">
                {isRTL ? 'פריטים הדורשים הבהרה' : 'Items Requiring Clarification'}
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                {isRTL
                  ? 'יש פריטים שדורשים פרטים נוספים לקבלת מחיר מדויק. לחץ על "הבהר" ליד כל פריט.'
                  : 'Some items need additional details for accurate pricing. Click "Clarify" next to each item.'}
              </p>
              <ul className="list-disc list-inside text-orange-700 text-sm">
                {variantClarifications.map((c, i) => (
                  <li key={i}>{isRTL ? c.item_name_he : c.item_name_en}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI clarification questions for specific items */}
          {parseResult.clarification_questions && parseResult.clarification_questions.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">
                {isRTL ? '❓ שאלות להשלמת פרטים' : '❓ Questions for Better Pricing'}
              </h3>
              <div className="space-y-2">
                {parseResult.clarification_questions.map((q, i) => {
                  const item = parseResult.items[q.item_index]
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 font-medium shrink-0">
                        {item ? item.item_name : `#${q.item_index + 1}`}:
                      </span>
                      <span className="text-blue-700">{isRTL ? q.question_he : q.question_en}</span>
                      <button
                        onClick={() => handleEditItem(q.item_index)}
                        className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 shrink-0"
                      >
                        {isRTL ? 'ערוך' : 'Edit'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* General clarification questions */}
          {parseResult.clarifying_questions.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">{t('orders.clarifyingQuestions')}</h3>
              <ul className="list-disc list-inside text-yellow-700">
                {parseResult.clarifying_questions.map((q, i) => (
                  <li key={i}>{typeof q === 'string' ? q : q.question_he || q.question_en}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary: special requirements */}
          {parseResult.summary?.special_requirements && parseResult.summary.special_requirements.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">
                {isRTL ? '⚡ דרישות מיוחדות שזוהו' : '⚡ Special Requirements Detected'}
              </h3>
              <ul className="list-disc list-inside text-amber-700 text-sm">
                {parseResult.summary.special_requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => {
                setParseResult(null)
                setDescription('')
              }}
              className="btn btn-secondary"
            >
              {t('common.back')}
            </button>
            <button
              onClick={handleConfirmItems}
              disabled={isSubmitting || parseResult.items.length === 0 || variantClarifications.length > 0}
              className="btn btn-primary flex-1"
              title={variantClarifications.length > 0 ? (isRTL ? 'יש פריטים שדורשים הבהרה לפני אישור' : 'Some items need clarification before confirming') : ''}
            >
              {isSubmitting ? <LoadingSpinner /> : variantClarifications.length > 0
                ? (isRTL ? `נותרו ${variantClarifications.length} פריטים להבהרה` : `${variantClarifications.length} items need clarification`)
                : t('orders.confirmItems')
              }
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation placeholder */}
      {step === 3 && (
        <div className="card text-center py-8">
          <LoadingSpinner />
          <p className="mt-4">{t('orders.creatingOrder')}</p>
        </div>
      )}

      {/* Variant Clarification Modal */}
      {currentClarificationIndex !== null && variantClarifications[currentClarificationIndex] && (() => {
        const currentClarification = variantClarifications[currentClarificationIndex]

        // Use ORIGINAL list for instance counting (e.g., "ארון 2/3" for the 2nd of 3 wardrobes)
        const sameTypeInOriginal = originalClarifications.filter(
          c => c.item_type_id === currentClarification.item_type_id
        )
        const totalInstances = sameTypeInOriginal.length

        // Find which instance this is (1st, 2nd, 3rd wardrobe, etc.)
        const instanceIndex = sameTypeInOriginal.findIndex(
          c => c.item_index === currentClarification.item_index
        )

        return (
          <ItemVariantModal
            isOpen={true}
            onClose={handleCloseVariantModal}
            item={{
              matched_item_type_id: currentClarification.item_type_id,
              name_en: currentClarification.item_name_en,
              name_he: currentClarification.item_name_he,
              quantity: 1,
              requires_disassembly: false,
              requires_assembly: false,
              is_fragile: false,
              requires_special_handling: false,
              confidence: 0.8,
            }}
            questions={currentClarification.questions}
            language={i18n.language}
            onResolved={handleVariantResolved}
            onCreateCustom={handleCreateCustomItem}
            currentIndex={completedClarificationCount}
            totalItems={originalClarificationCount}
            currentInstanceIndex={instanceIndex}
            totalInstances={totalInstances}
            itemName={isRTL ? currentClarification.item_name_he : currentClarification.item_name_en}
          />
        )
      })()}

      {/* Custom Item Form Modal */}
      <CustomItemForm
        isOpen={showCustomItemForm}
        onClose={() => {
          setShowCustomItemForm(false)
          setCustomItemInitialData(null)
        }}
        language={i18n.language}
        initialData={customItemInitialData || undefined}
        suggestedAnswers={customItemAnswers}
        onItemCreated={handleCustomItemCreated}
      />
    </div>
  )
}
