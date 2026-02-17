"""
URL configuration for the movers app.
"""
from django.urls import path
from .views import (
    ItemCategoryListView,
    ItemCategoryDetailView,
    ItemTypeListView,
    ItemTypeDetailView,
    ItemTypeWithPricingListView,
    MoverPricingListView,
    MoverPricingDetailView,
    MoverPricingCreateView,
    MoverPricingBulkUpdateView,
    PricingFactorsView,
    MoverItemTypesView,
    # Admin views
    AdminCatalogStatsView,
    AdminItemTypeListCreateView,
    AdminItemTypeDetailView,
    AdminCategoryListCreateView,
    AdminAttributeListView,
    # Suggestion views
    AdminSuggestionListView,
    AdminSuggestionDetailView,
    AdminSuggestionApproveView,
    AdminSuggestionRejectView,
)

app_name = 'movers'

urlpatterns = [
    # Item Categories (public)
    path('categories/', ItemCategoryListView.as_view(), name='category_list'),
    path('categories/<uuid:id>/', ItemCategoryDetailView.as_view(), name='category_detail'),

    # Item Types (public)
    path('item-types/', ItemTypeListView.as_view(), name='item_type_list'),
    path('item-types/<uuid:id>/', ItemTypeDetailView.as_view(), name='item_type_detail'),

    # Item Types with Mover Pricing (mover-only)
    path('my-item-types/', ItemTypeWithPricingListView.as_view(), name='my_item_types'),

    # Mover Pricing (mover-only)
    path('pricing/', MoverPricingListView.as_view(), name='pricing_list'),
    path('pricing/create/', MoverPricingCreateView.as_view(), name='pricing_create'),
    path('pricing/bulk/', MoverPricingBulkUpdateView.as_view(), name='pricing_bulk'),
    path('pricing/<uuid:id>/', MoverPricingDetailView.as_view(), name='pricing_detail'),

    # Pricing Factors (mover-only)
    path('pricing-factors/', PricingFactorsView.as_view(), name='pricing_factors'),

    # Public mover item types (for customers)
    path('<uuid:mover_id>/items/', MoverItemTypesView.as_view(), name='mover_items'),

    # Admin catalog management
    path('admin/stats/', AdminCatalogStatsView.as_view(), name='admin_stats'),
    path('admin/item-types/', AdminItemTypeListCreateView.as_view(), name='admin_item_type_list'),
    path('admin/item-types/<uuid:id>/', AdminItemTypeDetailView.as_view(), name='admin_item_type_detail'),
    path('admin/categories/', AdminCategoryListCreateView.as_view(), name='admin_category_list'),
    path('admin/attributes/', AdminAttributeListView.as_view(), name='admin_attribute_list'),

    # Admin suggestions
    path('admin/suggestions/', AdminSuggestionListView.as_view(), name='admin_suggestion_list'),
    path('admin/suggestions/<uuid:id>/', AdminSuggestionDetailView.as_view(), name='admin_suggestion_detail'),
    path('admin/suggestions/<uuid:id>/approve/', AdminSuggestionApproveView.as_view(), name='admin_suggestion_approve'),
    path('admin/suggestions/<uuid:id>/reject/', AdminSuggestionRejectView.as_view(), name='admin_suggestion_reject'),
]
