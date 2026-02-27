import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { authAPI } from '../../api/endpoints/auth'
import { ordersAPI } from '../../api/endpoints/orders'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AddressAutocomplete from '../../components/common/AddressAutocomplete'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'
import ItemVariantModal from '../../components/orders/ItemVariantModal'
import CustomItemForm from '../../components/orders/CustomItemForm'
import PhoneVerificationModal from '../../components/common/PhoneVerificationModal'
import type { CreateOrderData, ParsedItem, VariantClarification, VariantResolutionResponse } from '../../types'

interface MoverInfo {
  id: string
  company_name: string
  company_name_he: string
  description: string
  description_he: string
  rating: number
  total_reviews: number
  completed_orders: number
  logo: string | null
  city: string
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Local parsed item interface (same as CreateOrder)
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
  requires_disassembly?: boolean
  requires_assembly?: boolean
  is_fragile?: boolean
  requires_special_handling?: boolean
  special_notes?: string
  room?: string
}

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

export default function DirectMoverOrder() {
  const { code } = useParams<{ code: string }>()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, loginWithGoogle } = useAuth()
  const isRTL = i18n.language === 'he'

  // Phone verification
  const [showPhoneVerification, setShowPhoneVerification] = useState(false)

  // Mover info
  const [moverInfo, setMoverInfo] = useState<MoverInfo | null>(null)
  const [moverLoading, setMoverLoading] = useState(true)
  const [moverError, setMoverError] = useState(false)

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Order form state (same as CreateOrder)
  const [step, setStep] = useState(1)
  const [description, setDescription] = useState('')
  const [parseResult, setParseResult] = useState<LocalParseResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
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

  // Item editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', quantity: 1,
    requires_disassembly: false, requires_assembly: false,
    is_fragile: false, requires_special_handling: false,
    special_notes: '', room: '',
  })

  // Variant clarification state
  const [variantClarifications, setVariantClarifications] = useState<VariantClarification[]>([])
  const [originalClarifications, setOriginalClarifications] = useState<VariantClarification[]>([])
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState<number | null>(null)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)
  const [customItemInitialData, setCustomItemInitialData] = useState<Partial<ParsedItem> | null>(null)
  const [customItemAnswers, setCustomItemAnswers] = useState<Record<string, string>>({})
  const [originalClarificationCount, setOriginalClarificationCount] = useState(0)
  const [completedClarificationCount, setCompletedClarificationCount] = useState(0)
  const clarificationsInitializedRef = useRef(false)

  // Pending submission (saved when user needs to auth first)
  const pendingSubmitRef = useRef(false)

  // Fetch mover info
  useEffect(() => {
    if (!code) return
    setMoverLoading(true)
    authAPI.getMoverByCode(code)
      .then((info) => {
        setMoverInfo(info)
        setMoverLoading(false)
      })
      .catch(() => {
        setMoverError(true)
        setMoverLoading(false)
      })
  }, [code])

  // Load Google Sign-In script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      setGoogleLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Render Google button when auth modal opens
  useEffect(() => {
    if (showAuthModal && googleLoaded && window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      })
      const buttonDiv = document.getElementById('direct-google-signin')
      if (buttonDiv) {
        buttonDiv.innerHTML = ''
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          locale: i18n.language,
        })
      }
    }
  }, [showAuthModal, googleLoaded, i18n.language])

  // After auth, auto-submit if pending
  useEffect(() => {
    if (isAuthenticated && pendingSubmitRef.current) {
      pendingSubmitRef.current = false
      setShowAuthModal(false)
      handleConfirmItems()
    }
  }, [isAuthenticated])

  // Variant clarifications init
  useEffect(() => {
    if (parseResult?.variant_clarifications &&
        parseResult.variant_clarifications.length > 0 &&
        !clarificationsInitializedRef.current) {
      clarificationsInitializedRef.current = true
      const sortedClarifications = [...parseResult.variant_clarifications].sort((a, b) => {
        if (a.item_type_id < b.item_type_id) return -1
        if (a.item_type_id > b.item_type_id) return 1
        return a.item_index - b.item_index
      })
      setVariantClarifications(sortedClarifications)
      setOriginalClarifications(sortedClarifications)
      setOriginalClarificationCount(sortedClarifications.length)
      setCompletedClarificationCount(0)
      setCurrentClarificationIndex(0)
    }
  }, [parseResult])

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

  const handleGoogleCallback = async (response: { credential: string }) => {
    setAuthLoading(true)
    try {
      await loginWithGoogle(response.credential, 'customer')
      toast.success(isRTL ? 'התחברת בהצלחה!' : 'Logged in successfully!')
      // pendingSubmitRef effect will handle auto-submit
    } catch (error: any) {
      console.error('Google login error:', error)
      toast.error(error.response?.data?.error || (isRTL ? 'שגיאה בהתחברות' : 'Login error'))
    } finally {
      setAuthLoading(false)
    }
  }

  // Consolidate duplicate items
  const consolidateItems = (items: LocalParsedItem[]): LocalParsedItem[] => {
    const consolidated = new Map<string, LocalParsedItem>()
    for (const item of items) {
      const key = item.item_type || item.item_name.toLowerCase().trim()
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!
        existing.quantity += item.quantity
        existing.confidence = Math.max(existing.confidence, item.confidence)
      } else {
        consolidated.set(key, { ...item })
      }
    }
    return Array.from(consolidated.values())
  }

  const handleAddressSubmit = () => {
    if (orderData.origin_address && orderData.destination_address) {
      setStep(2)
    }
  }

  const handleDescriptionSubmit = async () => {
    if (!description.trim()) return
    setIsParsing(true)
    try {
      const result = await ordersAPI.parseDescription('', description)
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

      const hasVariantClarifications = result.variant_clarifications && result.variant_clarifications.length > 0
      const finalItems = hasVariantClarifications ? mappedItems : consolidateItems(mappedItems)

      setParseResult({
        items: finalItems,
        clarifying_questions: result.needs_clarification || [],
        clarification_questions: result.clarification_questions || [],
        suggestions: (result as any).suggestions || [],
        variant_clarifications: result.variant_clarifications || [],
        summary: result.summary || {},
      })
    } catch {
      toast.error(isRTL ? 'ניתוח AI נכשל, ניתן להוסיף פריטים ידנית' : 'AI parsing failed, you can add items manually')
      setParseResult({
        items: [],
        clarifying_questions: [],
        suggestions: [],
        variant_clarifications: [],
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirmItems = async () => {
    if (!parseResult || parseResult.items.length === 0) {
      toast.error(isRTL ? 'אין פריטים לאישור' : 'No items to confirm')
      return
    }

    // Check auth - if not authenticated, show auth modal
    if (!isAuthenticated) {
      pendingSubmitRef.current = true
      setShowAuthModal(true)
      return
    }

    // Check phone verification
    if (user && !user.phone_verified) {
      setShowPhoneVerification(true)
      return
    }

    setIsSubmitting(true)
    try {
      // Create order with direct_mover_code
      const { moving_date, moving_date_end, date_flexibility, ...restData } = orderData
      const order = await ordersAPI.createOrder({
        ...restData,
        preferred_date: moving_date || undefined,
        preferred_date_end: date_flexibility === 'range' ? (moving_date_end || undefined) : undefined,
        date_flexibility: date_flexibility || 'specific',
        free_text_description: description,
        direct_mover_code: code,
      })

      if (!order.id) {
        toast.error(isRTL ? 'שגיאה: לא התקבל מזהה הזמנה' : 'Error: no order ID returned')
        return
      }

      // Add items
      for (const item of parseResult.items) {
        await ordersAPI.addOrderItem(order.id, {
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
        })
      }

      toast.success(isRTL ? 'ההזמנה נשלחה בהצלחה!' : 'Order submitted successfully!')
      setTimeout(() => navigate(`/order/status/${order.id}`), 500)
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error.response?.data?.detail || error.response?.data?.error || (isRTL ? 'שגיאה ביצירת ההזמנה' : 'Error creating order'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Item editing handlers (same as CreateOrder)
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
      item_type: '', item_name: 'פריט חדש', quantity: 1,
      confidence: 1, requires_clarification: false, is_generic: false,
    }
    setParseResult({ ...parseResult, items: [...parseResult.items, newItem] } as LocalParseResult)
    setEditForm({ name: newItem.item_name, quantity: 1, requires_disassembly: false, requires_assembly: false, is_fragile: false, requires_special_handling: false, special_notes: '', room: '' })
    setEditingIndex(parseResult.items.length)
  }

  // Variant resolution handlers
  const handleVariantResolved = (_originalItem: ParsedItem, resolution: VariantResolutionResponse) => {
    if (!parseResult || !resolution.variant) return
    const clarification = variantClarifications[currentClarificationIndex!]
    const itemIndex = clarification.item_index
    const resolvedVariantId = resolution.variant!.id
    const resolvedName = isRTL ? resolution.variant!.name_he : resolution.variant!.name_en
    const remainingClarifications = variantClarifications.filter((_, idx) => idx !== currentClarificationIndex)
    const existingItemIndex = parseResult.items.findIndex(
      (item: any, idx: number) => idx !== itemIndex && item.item_type === resolvedVariantId
    )
    let updatedItems: any[]
    if (existingItemIndex !== -1) {
      updatedItems = parseResult.items.map((item: any, idx: number) => {
        if (idx === existingItemIndex) return { ...item, quantity: (item.quantity || 1) + 1 }
        return item
      }).filter((_: any, idx: number) => idx !== itemIndex)
    } else {
      updatedItems = parseResult.items.map((item: any, idx: number) => {
        if (idx === itemIndex) return { ...item, item_name: resolvedName, item_type: resolvedVariantId, is_generic: false, requires_variant_clarification: false }
        return item
      })
    }
    setVariantClarifications(remainingClarifications)
    setCompletedClarificationCount(prev => prev + 1)
    if (remainingClarifications.length > 0) {
      setParseResult({ ...parseResult, items: updatedItems, variant_clarifications: remainingClarifications } as LocalParseResult)
      setCurrentClarificationIndex(0)
    } else {
      setParseResult({ ...parseResult, items: consolidateItems(updatedItems), variant_clarifications: [] } as LocalParseResult)
      setCurrentClarificationIndex(null)
    }
  }

  const handleCreateCustomItem = (item: ParsedItem, answers: Record<string, string>) => {
    setCustomItemInitialData(item)
    setCustomItemAnswers(answers)
    setCurrentClarificationIndex(null)
    setShowCustomItemForm(true)
  }

  const handleCustomItemCreated = (newItem: ParsedItem) => {
    if (!parseResult) return
    const clarification = variantClarifications.find(c => c.item_type_id === customItemInitialData?.matched_item_type_id)
    if (clarification) {
      const updatedItems = parseResult.items.map((item, idx) => {
        if (idx === clarification.item_index) {
          return { item_type: newItem.matched_item_type_id || '', item_name: isRTL ? newItem.name_he : newItem.name_en, quantity: item.quantity || 1, confidence: 1.0, requires_clarification: false, is_generic: false } as any
        }
        return item
      })
      setParseResult({ ...parseResult, items: updatedItems } as LocalParseResult)
    }
    const remainingClarifications = variantClarifications.filter(c => c.item_type_id !== customItemInitialData?.matched_item_type_id)
    setVariantClarifications(remainingClarifications)
    setShowCustomItemForm(false)
    setCustomItemInitialData(null)
    setCustomItemAnswers({})
  }

  const itemNeedsClarification = (_item: any, index: number): boolean => {
    return variantClarifications.some((c) => c.item_index === index)
  }

  // Loading state
  if (moverLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  // Mover not found
  if (moverError || !moverInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold mb-2">
            {isRTL ? 'הלינק לא זמין' : 'Link not available'}
          </h1>
          <p className="text-gray-500">
            {isRTL ? 'הלינק שניסית לפתוח אינו פעיל או שאינו קיים.' : 'The link you tried to open is inactive or does not exist.'}
          </p>
        </div>
      </div>
    )
  }

  const moverDisplayName = isRTL ? (moverInfo.company_name_he || moverInfo.company_name) : moverInfo.company_name

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {moverInfo.logo ? (
              <img src={moverInfo.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg gradient-teal flex items-center justify-center">
                <span className="text-white font-bold text-lg">{moverDisplayName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900">{moverDisplayName}</h1>
              {moverInfo.city && (
                <p className="text-xs text-gray-500">{moverInfo.city}</p>
              )}
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Mover Info Card */}
        <div className="card mb-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
          <h2 className="text-lg font-bold text-teal-800 mb-1">
            {isRTL ? `הזמנת הובלה עם ${moverDisplayName}` : `Order a move with ${moverDisplayName}`}
          </h2>
          {(isRTL ? moverInfo.description_he : moverInfo.description) && (
            <p className="text-sm text-teal-700 mb-3">
              {isRTL ? moverInfo.description_he : moverInfo.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            {moverInfo.rating > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                <span className="font-medium">{moverInfo.rating.toFixed(1)}</span>
                <span className="text-gray-500">({moverInfo.total_reviews})</span>
              </div>
            )}
            {moverInfo.completed_orders > 0 && (
              <div className="text-gray-600">
                {isRTL ? `${moverInfo.completed_orders} הובלות` : `${moverInfo.completed_orders} moves completed`}
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-teal-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Addresses */}
        {step === 1 && (
          <div className="card">
            <h2 className="text-xl font-medium mb-4">{t('orders.addresses')}</h2>
            <div className="space-y-6">
              {/* Origin */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">{t('orders.origin')}</h3>
                <AddressAutocomplete
                  value={orderData.origin_address}
                  onChange={(val) => { setOrderData({ ...orderData, origin_address: val }); setOriginExact(false) }}
                  onPlaceSelect={(place) => {
                    setOrderData({ ...orderData, origin_address: place.address, origin_city: place.city, origin_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : undefined })
                    setOriginExact(place.isExact)
                  }}
                  placeholder={t('orders.addressPlaceholder')}
                  className="input w-full"
                  isRTL={isRTL}
                />
                <input type="text" value={orderData.origin_city} onChange={(e) => setOrderData({ ...orderData, origin_city: e.target.value })} placeholder={t('orders.city')} className="input w-full" />
                <div className="flex gap-4">
                  <input type="number" value={orderData.origin_floor} onChange={(e) => setOrderData({ ...orderData, origin_floor: parseInt(e.target.value) || 0 })} placeholder={t('orders.floor')} className="input w-24" />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={orderData.origin_has_elevator} onChange={(e) => setOrderData({ ...orderData, origin_has_elevator: e.target.checked })} className="rounded" />
                    {t('orders.hasElevator')}
                  </label>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">{t('orders.destination')}</h3>
                <AddressAutocomplete
                  value={orderData.destination_address}
                  onChange={(val) => { setOrderData({ ...orderData, destination_address: val }); setDestinationExact(false) }}
                  onPlaceSelect={(place) => {
                    setOrderData({ ...orderData, destination_address: place.address, destination_city: place.city, destination_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : undefined })
                    setDestinationExact(place.isExact)
                  }}
                  placeholder={t('orders.addressPlaceholder')}
                  className="input w-full"
                  isRTL={isRTL}
                />
                <input type="text" value={orderData.destination_city} onChange={(e) => setOrderData({ ...orderData, destination_city: e.target.value })} placeholder={t('orders.city')} className="input w-full" />
                <div className="flex gap-4">
                  <input type="number" value={orderData.destination_floor} onChange={(e) => setOrderData({ ...orderData, destination_floor: parseInt(e.target.value) || 0 })} placeholder={t('orders.floor')} className="input w-24" />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={orderData.destination_has_elevator} onChange={(e) => setOrderData({ ...orderData, destination_has_elevator: e.target.checked })} className="rounded" />
                    {t('orders.hasElevator')}
                  </label>
                </div>
              </div>

              {/* Date */}
              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-700 mb-3">{t('orders.preferredDate')}</h3>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setOrderData({ ...orderData, date_flexibility: 'specific', moving_date_end: '' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${orderData.date_flexibility !== 'range' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                    {isRTL ? '📅 תאריך מסוים' : '📅 Specific Date'}
                  </button>
                  <button type="button" onClick={() => setOrderData({ ...orderData, date_flexibility: 'range' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${orderData.date_flexibility === 'range' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                    {isRTL ? '📆 טווח תאריכים' : '📆 Date Range'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      {orderData.date_flexibility === 'range' ? (isRTL ? 'מתאריך' : 'From') : (isRTL ? 'תאריך' : 'Date')}
                    </label>
                    <input type="date" value={orderData.moving_date || ''} min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setOrderData({ ...orderData, moving_date: e.target.value })} className="input w-full" />
                  </div>
                  {orderData.date_flexibility === 'range' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isRTL ? 'עד תאריך' : 'To'}</label>
                      <input type="date" value={orderData.moving_date_end || ''} min={orderData.moving_date || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setOrderData({ ...orderData, moving_date_end: e.target.value })} className="input w-full" />
                    </div>
                  )}
                </div>
              </div>
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
            <button onClick={handleAddressSubmit} disabled={!originExact || !destinationExact} className="btn btn-primary w-full mt-6">
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
            {isParsing ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner />
                <span className="mr-2">{t('orders.analyzing')}</span>
              </div>
            ) : (
              <div className="flex gap-4 mt-4">
                <button onClick={() => setStep(1)} className="btn btn-secondary">{t('common.back')}</button>
                <button onClick={handleDescriptionSubmit} disabled={!description.trim()} className="btn btn-primary flex-1">
                  {t('orders.parseItems')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2b: Review items */}
        {step === 2 && parseResult && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">{t('orders.reviewItems')}</h2>
              <button onClick={handleAddItem} className="btn btn-secondary text-sm">+ {isRTL ? 'הוסף פריט' : 'Add item'}</button>
            </div>

            {parseResult.items.length > 0 ? (
              <div className="space-y-3">
                {parseResult.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    {editingIndex === index ? (
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input flex-1" autoFocus />
                          <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })} className="input w-20" min={1} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'requires_disassembly' as const, label: '🔧 פירוק', labelEn: '🔧 Disassembly' },
                            { key: 'requires_assembly' as const, label: '🔩 הרכבה', labelEn: '🔩 Assembly' },
                            { key: 'is_fragile' as const, label: '⚠️ שביר', labelEn: '⚠️ Fragile' },
                            { key: 'requires_special_handling' as const, label: '🏗️ טיפול מיוחד', labelEn: '🏗️ Special' },
                          ].map(({ key, label, labelEn }) => (
                            <button key={key} type="button" onClick={() => setEditForm({ ...editForm, [key]: !editForm[key] })}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${editForm[key] ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                              {isRTL ? label : labelEn}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="btn btn-primary text-sm px-3">{isRTL ? 'שמור' : 'Save'}</button>
                          <button onClick={() => setEditingIndex(null)} className="btn btn-secondary text-sm px-3">{isRTL ? 'בטל' : 'Cancel'}</button>
                        </div>
                      </div>
                    ) : (
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
                          {(item.requires_disassembly || item.requires_assembly || item.is_fragile || item.requires_special_handling) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.requires_disassembly && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">🔧 {isRTL ? 'פירוק' : 'Disassembly'}</span>}
                              {item.requires_assembly && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">🔩 {isRTL ? 'הרכבה' : 'Assembly'}</span>}
                              {item.is_fragile && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">⚠️ {isRTL ? 'שביר' : 'Fragile'}</span>}
                              {item.requires_special_handling && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">🏗️ {isRTL ? 'טיפול מיוחד' : 'Special'}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {itemNeedsClarification(item, index) ? (
                            <button onClick={() => {
                              const clarIdx = variantClarifications.findIndex(c => c.item_index === index)
                              if (clarIdx !== -1) setCurrentClarificationIndex(clarIdx)
                            }} className="text-sm px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">
                              {isRTL ? 'הבהר' : 'Clarify'}
                            </button>
                          ) : (
                            <span className={`text-sm px-2 py-1 rounded ${item.confidence > 0.8 ? 'bg-green-100 text-green-700' : item.confidence > 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {Math.round(item.confidence * 100)}%
                            </span>
                          )}
                          <button onClick={() => handleEditItem(index)} className="text-teal-600 hover:text-teal-800 p-1">✏️</button>
                          <button onClick={() => handleDeleteItem(index)} className="text-red-600 hover:text-red-800 p-1">🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('orders.noItemsFound')}</p>
                <button onClick={handleAddItem} className="btn btn-primary mt-4">
                  {isRTL ? 'הוסף פריט ידנית' : 'Add item manually'}
                </button>
              </div>
            )}

            {variantClarifications.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-medium text-orange-800 mb-2">
                  {isRTL ? 'פריטים הדורשים הבהרה' : 'Items Requiring Clarification'}
                </h3>
                <p className="text-sm text-orange-700">
                  {isRTL ? 'יש פריטים שדורשים פרטים נוספים. לחץ על "הבהר" ליד כל פריט.' : 'Some items need additional details. Click "Clarify" next to each item.'}
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button onClick={() => { setParseResult(null); setDescription('') }} className="btn btn-secondary">{t('common.back')}</button>
              <button
                onClick={handleConfirmItems}
                disabled={isSubmitting || parseResult.items.length === 0 || variantClarifications.length > 0}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? <LoadingSpinner /> : variantClarifications.length > 0
                  ? (isRTL ? `נותרו ${variantClarifications.length} פריטים להבהרה` : `${variantClarifications.length} items need clarification`)
                  : (isRTL ? `שלח הזמנה ל${moverDisplayName}` : `Send order to ${moverDisplayName}`)
                }
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-2 text-center">
              {isRTL ? 'התחבר כדי לשלוח הזמנה' : 'Sign in to submit order'}
            </h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              {isRTL ? 'נדרשת התחברות עם Google לשליחת ההזמנה' : 'Google sign-in is required to submit the order'}
            </p>

            <div className="flex justify-center">
              {GOOGLE_CLIENT_ID ? (
                <div id="direct-google-signin"></div>
              ) : (
                <p className="text-sm text-gray-500">Google Sign-In not configured</p>
              )}
            </div>

            {authLoading && (
              <div className="flex justify-center mt-4">
                <LoadingSpinner />
              </div>
            )}

            <button
              onClick={() => { setShowAuthModal(false); pendingSubmitRef.current = false }}
              className="w-full mt-6 text-sm text-gray-500 hover:text-gray-700"
            >
              {isRTL ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Variant Clarification Modal */}
      {currentClarificationIndex !== null && variantClarifications[currentClarificationIndex] && (() => {
        const currentClarification = variantClarifications[currentClarificationIndex]
        const sameTypeInOriginal = originalClarifications.filter(c => c.item_type_id === currentClarification.item_type_id)
        const totalInstances = sameTypeInOriginal.length
        const instanceIndex = sameTypeInOriginal.findIndex(c => c.item_index === currentClarification.item_index)
        return (
          <ItemVariantModal
            isOpen={true}
            onClose={() => setCurrentClarificationIndex(null)}
            item={{
              matched_item_type_id: currentClarification.item_type_id,
              name_en: currentClarification.item_name_en,
              name_he: currentClarification.item_name_he,
              quantity: 1, requires_disassembly: false, requires_assembly: false,
              is_fragile: false, requires_special_handling: false, confidence: 0.8,
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
        onClose={() => { setShowCustomItemForm(false); setCustomItemInitialData(null) }}
        language={i18n.language}
        initialData={customItemInitialData || undefined}
        suggestedAnswers={customItemAnswers}
        onItemCreated={handleCustomItemCreated}
      />

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneVerification}
        onClose={() => setShowPhoneVerification(false)}
        onVerified={() => {
          setShowPhoneVerification(false)
          toast.success(isRTL ? 'הטלפון אומת! לחץ שוב לשליחת ההזמנה' : 'Phone verified! Click again to submit the order')
        }}
      />
    </div>
  )
}
