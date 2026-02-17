"""
Admin configuration for the movers app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ItemCategory, ItemType, MoverPricing, PricingFactors,
    ItemAttribute, ItemAttributeOption, ItemCategoryAttribute,
    ItemTypeAttribute, ItemTypeSuggestion
)


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    """Admin configuration for ItemCategory model."""
    list_display = ['name_en', 'name_he', 'parent', 'display_order', 'is_active']
    list_filter = ['is_active', 'parent']
    search_fields = ['name_en', 'name_he']
    ordering = ['display_order', 'name_en']


class ItemAttributeOptionInline(admin.TabularInline):
    """Inline admin for ItemAttributeOption."""
    model = ItemAttributeOption
    extra = 1
    fields = ['value', 'name_en', 'name_he', 'display_order', 'is_active']


@admin.register(ItemAttribute)
class ItemAttributeAdmin(admin.ModelAdmin):
    """Admin configuration for ItemAttribute model."""
    list_display = ['code', 'name_en', 'name_he', 'input_type', 'question_en', 'display_order', 'is_active']
    list_filter = ['input_type', 'is_active']
    search_fields = ['code', 'name_en', 'name_he', 'question_en', 'question_he']
    ordering = ['display_order', 'code']
    inlines = [ItemAttributeOptionInline]


@admin.register(ItemAttributeOption)
class ItemAttributeOptionAdmin(admin.ModelAdmin):
    """Admin configuration for ItemAttributeOption model."""
    list_display = ['attribute', 'value', 'name_en', 'name_he', 'display_order', 'is_active']
    list_filter = ['attribute', 'is_active']
    search_fields = ['value', 'name_en', 'name_he']
    ordering = ['attribute', 'display_order', 'value']


@admin.register(ItemCategoryAttribute)
class ItemCategoryAttributeAdmin(admin.ModelAdmin):
    """Admin configuration for ItemCategoryAttribute model."""
    list_display = ['category', 'attribute', 'is_required', 'display_order']
    list_filter = ['category', 'attribute', 'is_required']
    search_fields = ['category__name_en', 'attribute__code']
    ordering = ['category', 'display_order']


class ItemTypeAttributeInline(admin.TabularInline):
    """Inline admin for ItemTypeAttribute."""
    model = ItemTypeAttribute
    extra = 1
    fields = ['attribute', 'is_required', 'display_order']
    raw_id_fields = ['attribute']


@admin.register(ItemTypeAttribute)
class ItemTypeAttributeAdmin(admin.ModelAdmin):
    """Admin configuration for ItemTypeAttribute model."""
    list_display = ['item_type', 'attribute', 'is_required', 'display_order']
    list_filter = ['item_type__category', 'attribute', 'is_required']
    search_fields = ['item_type__name_en', 'attribute__code']
    ordering = ['item_type', 'display_order']
    raw_id_fields = ['item_type', 'attribute']


@admin.register(ItemType)
class ItemTypeAdmin(admin.ModelAdmin):
    """Admin configuration for ItemType model."""
    list_display = [
        'name_en', 'category', 'default_base_price', 'weight_class',
        'is_generic', 'is_custom', 'parent_type', 'requires_assembly', 'is_fragile', 'is_active'
    ]
    list_filter = [
        'category', 'weight_class', 'is_generic', 'is_custom',
        'requires_assembly', 'is_fragile', 'is_active'
    ]
    search_fields = ['name_en', 'name_he']
    ordering = ['category', 'display_order', 'name_en']
    raw_id_fields = ['parent_type']
    inlines = [ItemTypeAttributeInline]

    fieldsets = (
        (None, {
            'fields': ('name_en', 'name_he', 'description_en', 'description_he', 'category', 'icon')
        }),
        ('Variant Settings', {
            'fields': ('is_generic', 'is_custom', 'parent_type', 'attribute_values'),
            'classes': ('collapse',),
        }),
        ('Pricing', {
            'fields': (
                'default_base_price', 'default_assembly_price',
                'default_disassembly_price', 'default_special_handling_price'
            ),
        }),
        ('Characteristics', {
            'fields': (
                'requires_assembly', 'requires_special_handling',
                'is_fragile', 'weight_class', 'average_dimensions'
            ),
        }),
        ('Display', {
            'fields': ('display_order', 'is_active'),
        }),
    )


@admin.register(MoverPricing)
class MoverPricingAdmin(admin.ModelAdmin):
    """Admin configuration for MoverPricing model."""
    list_display = ['mover', 'item_type', 'base_price', 'assembly_price', 'is_active']
    list_filter = ['mover', 'item_type__category', 'is_active']
    search_fields = ['mover__company_name', 'item_type__name_en']
    ordering = ['mover', 'item_type']


@admin.register(PricingFactors)
class PricingFactorsAdmin(admin.ModelAdmin):
    """Admin configuration for PricingFactors model."""
    list_display = [
        'mover', 'floor_surcharge_percent', 'elevator_discount_percent',
        'peak_season_multiplier', 'minimum_order_amount'
    ]
    search_fields = ['mover__company_name']


@admin.register(ItemTypeSuggestion)
class ItemTypeSuggestionAdmin(admin.ModelAdmin):
    """Admin configuration for ItemTypeSuggestion model with approval workflow."""
    list_display = [
        'name_en', 'name_he', 'category', 'suggested_by', 'suggested_price',
        'status', 'status_badge', 'created_at'
    ]
    list_filter = ['status', 'category', 'weight_class', 'requires_assembly', 'is_fragile']
    search_fields = ['name_en', 'name_he', 'suggested_by__company_name']
    ordering = ['-created_at']
    readonly_fields = ['suggested_by', 'created_at', 'updated_at', 'created_item']
    actions = ['approve_suggestions', 'reject_suggestions']

    fieldsets = (
        ('Suggestion Details', {
            'fields': ('suggested_by', 'name_en', 'name_he', 'description_en', 'description_he', 'category')
        }),
        ('Item Characteristics', {
            'fields': ('suggested_price', 'weight_class', 'requires_assembly', 'is_fragile'),
        }),
        ('Status', {
            'fields': ('status', 'admin_notes', 'created_item'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        """Display status as a colored badge."""
        colors = {
            'pending': '#ffc107',    # Yellow
            'approved': '#28a745',   # Green
            'rejected': '#dc3545',   # Red
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def approve_suggestions(self, request, queryset):
        """Bulk approve selected suggestions."""
        approved_count = 0
        for suggestion in queryset.filter(status='pending'):
            # Create the ItemType from the suggestion
            item_type = ItemType.objects.create(
                name_en=suggestion.name_en,
                name_he=suggestion.name_he,
                description_en=suggestion.description_en,
                description_he=suggestion.description_he,
                category=suggestion.category,
                default_base_price=suggestion.suggested_price,
                weight_class=suggestion.weight_class,
                requires_assembly=suggestion.requires_assembly,
                is_fragile=suggestion.is_fragile,
                is_custom=False,
                is_generic=False,
            )
            suggestion.status = 'approved'
            suggestion.created_item = item_type
            suggestion.save()
            approved_count += 1

        self.message_user(request, f'{approved_count} suggestion(s) approved and added to catalog.')
    approve_suggestions.short_description = 'Approve selected suggestions'

    def reject_suggestions(self, request, queryset):
        """Bulk reject selected suggestions."""
        updated = queryset.filter(status='pending').update(status='rejected')
        self.message_user(request, f'{updated} suggestion(s) rejected.')
