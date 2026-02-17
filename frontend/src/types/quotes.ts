/**
 * TypeScript types for the quotes module.
 */

export interface QuoteTemplate {
  id: string
  name: string
  name_he: string
  header_text: string
  header_text_he: string
  footer_text: string
  footer_text_he: string
  terms_and_conditions: string
  terms_and_conditions_he: string
  primary_color: string
  secondary_color: string
  font_family: string
  include_company_logo: boolean
  include_item_details: boolean
  include_terms: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  item_type: string
  item_type_name?: string
  item_type_name_he?: string
  quantity: number
  unit_price: number
  total_price: number
  requires_assembly: boolean
  assembly_price: number
  is_fragile: boolean
  special_handling_price: number
  notes: string
}

export interface Quote {
  id: string
  order: string
  order_details?: {
    origin_address: string
    destination_address: string
    customer_name: string
    customer_email: string
    moving_date?: string
  }
  template: string | null
  quote_number: string
  status: QuoteStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  discount_type: 'percentage' | 'fixed'
  total_amount: number
  valid_until: string
  notes: string
  notes_he: string
  internal_notes: string
  items: QuoteItem[]
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  pdf_file: string | null
  public_token: string
  created_at: string
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

export interface Signature {
  id: string
  signer_name: string
  signer_email: string
  signer_phone: string
  signature_image: string
  ip_address: string
  user_agent: string
  signed_at: string
  signed_pdf: string | null
}

export interface CreateQuoteData {
  order: string
  template?: string
  valid_until: string
  notes?: string
  notes_he?: string
  discount_amount?: number
  discount_type?: 'percentage' | 'fixed'
  items: CreateQuoteItemData[]
}

export interface CreateQuoteItemData {
  item_type: string
  quantity: number
  unit_price: number
  requires_assembly?: boolean
  assembly_price?: number
  is_fragile?: boolean
  special_handling_price?: number
  notes?: string
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  status?: QuoteStatus
}

export interface SignQuoteData {
  signer_name: string
  signer_email: string
  signer_phone?: string
  signature_image: string
}
