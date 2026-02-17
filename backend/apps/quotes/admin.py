"""
Admin configuration for the quotes app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import QuoteTemplate, Quote, QuoteItem, Signature


@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'mover', 'is_default', 'is_active',
        'color_preview', 'created_at'
    ]
    list_filter = ['is_default', 'is_active', 'created_at']
    search_fields = ['name', 'mover__company_name']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        (None, {
            'fields': ('mover', 'name', 'is_default', 'is_active')
        }),
        ('Header Content', {
            'fields': ('header_text', 'header_text_he')
        }),
        ('Footer Content', {
            'fields': ('footer_text', 'footer_text_he')
        }),
        ('Terms and Conditions', {
            'fields': ('terms_and_conditions', 'terms_and_conditions_he'),
            'classes': ('collapse',)
        }),
        ('Styling', {
            'fields': (
                'primary_color', 'secondary_color', 'logo_position',
                'show_company_details', 'show_item_breakdown', 'show_pricing_factors'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def color_preview(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 5px 10px; color: white; '
            'border-radius: 3px; margin-right: 5px;">{}</span>'
            '<span style="background-color: {}; padding: 5px 10px; color: white; '
            'border-radius: 3px;">{}</span>',
            obj.primary_color, obj.primary_color,
            obj.secondary_color, obj.secondary_color
        )
    color_preview.short_description = 'Colors'


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0
    fields = ['name', 'quantity', 'unit_price', 'total_price', 'display_order']
    readonly_fields = ['total_price']


class SignatureInline(admin.StackedInline):
    model = Signature
    extra = 0
    readonly_fields = [
        'signature_data', 'signer_name', 'signer_email',
        'signed_at', 'verification_code', 'ip_address', 'user_agent'
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = [
        'quote_number', 'order', 'version', 'status',
        'total_amount', 'valid_until', 'sent_at', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'sent_at']
    search_fields = ['quote_number', 'order__id']
    readonly_fields = [
        'quote_number', 'version', 'created_at', 'updated_at',
        'sent_at', 'viewed_at', 'pdf_generated_at'
    ]
    inlines = [QuoteItemInline, SignatureInline]

    fieldsets = (
        (None, {
            'fields': ('quote_number', 'order', 'template', 'version', 'status')
        }),
        ('Validity', {
            'fields': ('validity_days', 'valid_until')
        }),
        ('Content Snapshots', {
            'fields': ('items_data', 'pricing_data'),
            'classes': ('collapse',)
        }),
        ('Custom Content', {
            'fields': (
                'custom_notes', 'custom_notes_he',
                'discount_description', 'discount_amount'
            )
        }),
        ('Amounts', {
            'fields': ('subtotal', 'total_amount')
        }),
        ('Sending', {
            'fields': ('sent_at', 'sent_to_email', 'viewed_at')
        }),
        ('PDF', {
            'fields': ('pdf_file', 'pdf_generated_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('order', 'template')


@admin.register(QuoteItem)
class QuoteItemAdmin(admin.ModelAdmin):
    list_display = [
        'quote', 'name', 'quantity', 'unit_price', 'total_price', 'display_order'
    ]
    list_filter = ['created_at']
    search_fields = ['name', 'quote__quote_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Signature)
class SignatureAdmin(admin.ModelAdmin):
    list_display = [
        'quote', 'signer_name', 'signer_email',
        'signed_at', 'verification_code'
    ]
    list_filter = ['signed_at']
    search_fields = [
        'signer_name', 'signer_email', 'verification_code',
        'quote__quote_number'
    ]
    readonly_fields = [
        'quote', 'signature_data', 'signer_name', 'signer_email',
        'signer_phone', 'signer_id_number', 'signed_at',
        'ip_address', 'user_agent', 'verification_code',
        'created_at', 'updated_at'
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
