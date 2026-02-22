import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  useOrder,
  useUpdateOrder,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useAddOrderItem,
} from '../../api/hooks'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AddressAutocomplete from '../../components/common/AddressAutocomplete'
import type { OrderItem } from '../../types'

interface EditFormData {
  origin_address: string
  origin_city: string
  origin_floor: number
  origin_has_elevator: boolean
  origin_coordinates: { lat: number; lng: number } | null
  destination_address: string
  destination_city: string
  destination_floor: number
  destination_has_elevator: boolean
  destination_coordinates: { lat: number; lng: number } | null
  date_flexibility: 'specific' | 'range'
  preferred_date: string
  preferred_date_end: string
  preferred_time_slot: string
  customer_notes: string
}

interface ItemEditData {
  name: string
  quantity: number
  requires_assembly: boolean
  requires_disassembly: boolean
  is_fragile: boolean
  requires_special_handling: boolean
  description: string
  room_name: string
}

const emptyItemForm: ItemEditData = {
  name: '',
  quantity: 1,
  requires_assembly: false,
  requires_disassembly: false,
  is_fragile: false,
  requires_special_handling: false,
  description: '',
  room_name: '',
}

export default function EditOrder() {
  const { t, i18n } = useTranslation()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'he'

  const { data: order, isLoading, error } = useOrder(orderId || '')
  const updateOrderMutation = useUpdateOrder()
  const updateItemMutation = useUpdateOrderItem()
  const deleteItemMutation = useDeleteOrderItem()
  const addItemMutation = useAddOrderItem()

  const [formData, setFormData] = useState<EditFormData | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<ItemEditData>(emptyItemForm)
  const [showAddItem, setShowAddItem] = useState(false)
  const [addItemForm, setAddItemForm] = useState<ItemEditData>(emptyItemForm)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when order loads
  useEffect(() => {
    if (order && !formData) {
      setFormData({
        origin_address: order.origin_address || '',
        origin_city: order.origin_city || '',
        origin_floor: order.origin_floor || 0,
        origin_has_elevator: order.origin_has_elevator || false,
        origin_coordinates: order.origin_coordinates && 'lat' in order.origin_coordinates
          ? { lat: order.origin_coordinates.lat, lng: order.origin_coordinates.lng }
          : null,
        destination_address: order.destination_address || '',
        destination_city: order.destination_city || '',
        destination_floor: order.destination_floor || 0,
        destination_has_elevator: order.destination_has_elevator || false,
        destination_coordinates: order.destination_coordinates && 'lat' in order.destination_coordinates
          ? { lat: order.destination_coordinates.lat, lng: order.destination_coordinates.lng }
          : null,
        date_flexibility: (order.date_flexibility as 'specific' | 'range') || 'specific',
        preferred_date: order.preferred_date || '',
        preferred_date_end: order.preferred_date_end || '',
        preferred_time_slot: order.preferred_time_slot || '',
        customer_notes: order.customer_notes || '',
      })
    }
  }, [order])

  // Guard: redirect if not editable
  useEffect(() => {
    if (order && order.status !== 'draft' && order.status !== 'pending') {
      toast.error(isRTL ? 'לא ניתן לערוך הזמנה זו' : 'This order cannot be edited')
      navigate(`/order/status/${orderId}`)
    }
  }, [order])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !order || !formData) {
    return (
      <div className="card text-center py-8">
        <p className="text-red-500">{t('orders.notFound')}</p>
        <Link to="/order" className="btn btn-primary mt-4">
          {t('orders.newOrder')}
        </Link>
      </div>
    )
  }

  const canEdit = order.status === 'draft' || order.status === 'pending'
  if (!canEdit) return null

  // --- Save order details ---
  const handleSave = async () => {
    if (!orderId || !formData) return
    setIsSaving(true)
    try {
      const updateData: Record<string, any> = {
        origin_address: formData.origin_address,
        origin_city: formData.origin_city,
        origin_floor: formData.origin_floor,
        origin_has_elevator: formData.origin_has_elevator,
        destination_address: formData.destination_address,
        destination_city: formData.destination_city,
        destination_floor: formData.destination_floor,
        destination_has_elevator: formData.destination_has_elevator,
        date_flexibility: formData.date_flexibility,
        preferred_date: formData.preferred_date || null,
        preferred_time_slot: formData.preferred_time_slot,
        customer_notes: formData.customer_notes,
      }

      if (formData.origin_coordinates) {
        updateData.origin_coordinates = formData.origin_coordinates
      }
      if (formData.destination_coordinates) {
        updateData.destination_coordinates = formData.destination_coordinates
      }
      if (formData.date_flexibility === 'range') {
        updateData.preferred_date_end = formData.preferred_date_end || null
      }

      await updateOrderMutation.mutateAsync({ id: orderId, data: updateData })
      toast.success(t('orders.orderUpdated'))
      navigate(`/order/status/${orderId}`)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0]
      toast.error(msg || t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }

  // --- Item editing ---
  const startEditItem = (item: OrderItem) => {
    setEditingItemId(item.id)
    setItemForm({
      name: item.name_he || item.name || '',
      quantity: item.quantity,
      requires_assembly: item.requires_assembly || false,
      requires_disassembly: item.requires_disassembly || false,
      is_fragile: item.is_fragile || false,
      requires_special_handling: item.requires_special_handling || false,
      description: item.description || '',
      room_name: item.room_name || '',
    })
  }

  const handleSaveItem = async (itemId: string) => {
    if (!orderId) return
    try {
      await updateItemMutation.mutateAsync({
        orderId,
        itemId,
        data: {
          name: itemForm.name,
          quantity: itemForm.quantity,
          requires_assembly: itemForm.requires_assembly,
          requires_disassembly: itemForm.requires_disassembly,
          is_fragile: itemForm.is_fragile,
          requires_special_handling: itemForm.requires_special_handling,
          description: itemForm.description,
          room_name: itemForm.room_name,
        },
      })
      setEditingItemId(null)
      toast.success(isRTL ? 'הפריט עודכן' : 'Item updated')
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!orderId) return
    try {
      await deleteItemMutation.mutateAsync({ orderId, itemId })
      toast.success(isRTL ? 'הפריט הוסר' : 'Item removed')
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleAddItem = async () => {
    if (!orderId || !addItemForm.name.trim()) return
    try {
      await addItemMutation.mutateAsync({
        orderId,
        data: {
          name: addItemForm.name,
          quantity: addItemForm.quantity,
          requires_assembly: addItemForm.requires_assembly,
          requires_disassembly: addItemForm.requires_disassembly,
          is_fragile: addItemForm.is_fragile,
          requires_special_handling: addItemForm.requires_special_handling,
          description: addItemForm.description,
          room_name: addItemForm.room_name,
        },
      })
      setShowAddItem(false)
      setAddItemForm(emptyItemForm)
      toast.success(isRTL ? 'הפריט נוסף' : 'Item added')
    } catch {
      toast.error(t('common.error'))
    }
  }

  // --- Render helpers ---
  const renderItemForm = (
    form: ItemEditData,
    setForm: (f: ItemEditData) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string,
  ) => (
    <div className="space-y-3 p-3 bg-white rounded-lg border border-blue-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">{t('orders.itemName')}</label>
          <input
            type="text"
            className="input w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">{t('orders.quantity')}</label>
          <input
            type="number"
            min={1}
            className="input w-full"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'requires_assembly' as const, label: isRTL ? '🔩 הרכבה' : '🔩 Assembly', color: 'purple' },
          { key: 'requires_disassembly' as const, label: isRTL ? '🔧 פירוק' : '🔧 Disassembly', color: 'purple' },
          { key: 'is_fragile' as const, label: isRTL ? '⚠️ שביר' : '⚠️ Fragile', color: 'red' },
          { key: 'requires_special_handling' as const, label: isRTL ? '🏗️ טיפול מיוחד' : '🏗️ Special', color: 'yellow' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setForm({ ...form, [key]: !form[key] })}
            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
              form[key]
                ? `bg-${color}-100 text-${color}-700 border-${color}-300`
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-gray-500">{isRTL ? 'הערות' : 'Notes'}</label>
        <input
          type="text"
          className="input w-full text-sm"
          placeholder={isRTL ? 'הערות על הפריט...' : 'Notes about this item...'}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
          {t('common.cancel')}
        </button>
        <button type="button" onClick={onSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          {saveLabel}
        </button>
      </div>
    </div>
  )

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('orders.editingOrder')}</h1>
        <Link
          to={`/order/status/${orderId}`}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← {t('common.back')}
        </Link>
      </div>

      {/* Addresses */}
      <div className="card mb-6">
        <h2 className="text-lg font-medium mb-4">{t('orders.addresses')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Origin */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">{t('orders.origin')}</h3>
            <AddressAutocomplete
              value={formData.origin_address}
              onChange={(val) => setFormData({ ...formData, origin_address: val })}
              onPlaceSelect={(place) => {
                setFormData({
                  ...formData,
                  origin_address: place.address,
                  origin_city: place.city,
                  origin_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : null,
                })
              }}
              placeholder={t('orders.addressPlaceholder')}
              isRTL={isRTL}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">{t('orders.floor')}</label>
                <input
                  type="number"
                  className="input w-full"
                  value={formData.origin_floor}
                  onChange={(e) => setFormData({ ...formData, origin_floor: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    checked={formData.origin_has_elevator}
                    onChange={(e) => setFormData({ ...formData, origin_has_elevator: e.target.checked })}
                  />
                  <span className="text-sm">{t('orders.hasElevator')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">{t('orders.destination')}</h3>
            <AddressAutocomplete
              value={formData.destination_address}
              onChange={(val) => setFormData({ ...formData, destination_address: val })}
              onPlaceSelect={(place) => {
                setFormData({
                  ...formData,
                  destination_address: place.address,
                  destination_city: place.city,
                  destination_coordinates: place.lat && place.lng ? { lat: place.lat, lng: place.lng } : null,
                })
              }}
              placeholder={t('orders.addressPlaceholder')}
              isRTL={isRTL}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">{t('orders.floor')}</label>
                <input
                  type="number"
                  className="input w-full"
                  value={formData.destination_floor}
                  onChange={(e) => setFormData({ ...formData, destination_floor: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    checked={formData.destination_has_elevator}
                    onChange={(e) => setFormData({ ...formData, destination_has_elevator: e.target.checked })}
                  />
                  <span className="text-sm">{t('orders.hasElevator')}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="card mb-6">
        <h2 className="text-lg font-medium mb-4">{t('orders.preferredDate')}</h2>

        {/* Date flexibility toggle */}
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, date_flexibility: 'specific' })}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              formData.date_flexibility === 'specific'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {t('orders.specificDate')}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, date_flexibility: 'range' })}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              formData.date_flexibility === 'range'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {t('orders.dateRange')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">
              {formData.date_flexibility === 'range' ? t('orders.fromDate') : t('orders.preferredDate')}
            </label>
            <input
              type="date"
              className="input w-full"
              value={formData.preferred_date}
              onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
            />
          </div>
          {formData.date_flexibility === 'range' && (
            <div>
              <label className="text-xs text-gray-500">{t('orders.toDate')}</label>
              <input
                type="date"
                className="input w-full"
                value={formData.preferred_date_end}
                onChange={(e) => setFormData({ ...formData, preferred_date_end: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Time slot */}
        <div className="mt-4">
          <label className="text-xs text-gray-500">{t('orders.timeSlot')}</label>
          <select
            className="input w-full"
            value={formData.preferred_time_slot}
            onChange={(e) => setFormData({ ...formData, preferred_time_slot: e.target.value })}
          >
            <option value="">{t('orders.flexible')}</option>
            <option value="morning">{t('orders.morning')}</option>
            <option value="afternoon">{t('orders.afternoon')}</option>
            <option value="evening">{t('orders.evening')}</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t('orders.items')}</h2>
          <button
            type="button"
            onClick={() => { setShowAddItem(true); setAddItemForm(emptyItemForm) }}
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + {t('orders.addItem')}
          </button>
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div className="mb-4">
            {renderItemForm(
              addItemForm,
              setAddItemForm,
              handleAddItem,
              () => setShowAddItem(false),
              t('orders.addItem'),
            )}
          </div>
        )}

        {/* Item List */}
        <div className="space-y-3">
          {order.items && order.items.length > 0 ? (
            order.items.map((item: OrderItem) => (
              <div key={item.id}>
                {editingItemId === item.id ? (
                  renderItemForm(
                    itemForm,
                    setItemForm,
                    () => handleSaveItem(item.id),
                    () => setEditingItemId(null),
                    t('common.save'),
                  )
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.name_he || item.name || item.item_type_name || 'פריט'}
                        </span>
                        <span className="text-gray-500">x{item.quantity}</span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.requires_assembly && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            🔩 {t('orders.assembly')}
                          </span>
                        )}
                        {item.requires_disassembly && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            🔧 {t('orders.disassembly')}
                          </span>
                        )}
                        {item.is_fragile && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            ⚠️ {t('orders.fragile')}
                          </span>
                        )}
                        {item.requires_special_handling && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            🏗️ {t('orders.specialHandling')}
                          </span>
                        )}
                        {item.room_name && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            📍 {item.room_name}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 italic">💬 {item.description}</p>
                      )}
                    </div>

                    {/* Item price */}
                    <div className="flex items-center gap-2">
                      {item.total_price > 0 && (
                        <span className="text-sm font-medium text-gray-600">₪{item.total_price}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditItem(item)}
                        className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('common.edit')}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('common.delete')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">{t('orders.noItems')}</p>
          )}
        </div>
      </div>

      {/* Customer Notes */}
      <div className="card mb-6">
        <h2 className="text-lg font-medium mb-3">{t('orders.customerNotes')}</h2>
        <textarea
          className="input w-full"
          rows={3}
          placeholder={t('orders.notesPlaceholder')}
          value={formData.customer_notes}
          onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Link
          to={`/order/status/${orderId}`}
          className="btn flex-1 text-center border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg py-3"
        >
          {t('common.cancel')}
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary flex-1 py-3 text-center rounded-lg"
        >
          {isSaving ? t('orders.saving') : t('orders.saveChanges')}
        </button>
      </div>
    </div>
  )
}
