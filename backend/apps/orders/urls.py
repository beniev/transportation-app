"""
URL configuration for the orders app.
"""
from django.urls import path
from .views import (
    MoverOrderListView,
    CustomerOrderListView,
    AvailableOrdersView,
    ClaimOrderView,
    OrderCreateView,
    OrderDetailView,
    OrderApproveView,
    OrderRejectView,
    OrderScheduleView,
    OrderCompleteView,
    OrderCancelView,
    SubmitOrderView,
    OrderItemListView,
    OrderItemDetailView,
    OrderImageListView,
    OrderImageDeleteView,
    OrderComparisonView,
    GenerateComparisonView,
    SelectMoverView,
    RequestManualQuoteView,
    CreateReviewView,
    MoverReviewsView,
)

app_name = 'orders'

urlpatterns = [
    # Order Lists
    path('', CustomerOrderListView.as_view(), name='customer_order_list'),
    path('mover/', MoverOrderListView.as_view(), name='mover_order_list'),
    path('available/', AvailableOrdersView.as_view(), name='available_orders'),
    path('<uuid:pk>/claim/', ClaimOrderView.as_view(), name='claim_order'),

    # Order CRUD
    path('create/', OrderCreateView.as_view(), name='order_create'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order_detail'),

    # Order Actions
    path('<uuid:pk>/submit/', SubmitOrderView.as_view(), name='order_submit'),
    path('<uuid:pk>/approve/', OrderApproveView.as_view(), name='order_approve'),
    path('<uuid:pk>/reject/', OrderRejectView.as_view(), name='order_reject'),
    path('<uuid:pk>/schedule/', OrderScheduleView.as_view(), name='order_schedule'),
    path('<uuid:pk>/complete/', OrderCompleteView.as_view(), name='order_complete'),
    path('<uuid:pk>/cancel/', OrderCancelView.as_view(), name='order_cancel'),

    # Order Items
    path('<uuid:order_pk>/items/', OrderItemListView.as_view(), name='order_items'),
    path('<uuid:order_pk>/items/<uuid:item_pk>/', OrderItemDetailView.as_view(), name='order_item_detail'),

    # Order Images
    path('<uuid:order_pk>/images/', OrderImageListView.as_view(), name='order_images'),
    path('<uuid:order_pk>/images/<uuid:image_pk>/', OrderImageDeleteView.as_view(), name='order_image_delete'),

    # Comparisons
    path('<uuid:pk>/comparison/', OrderComparisonView.as_view(), name='order_comparison'),
    path('<uuid:pk>/comparison/generate/', GenerateComparisonView.as_view(), name='generate_comparison'),
    path('<uuid:pk>/comparison/select/', SelectMoverView.as_view(), name='select_mover'),
    path('<uuid:pk>/comparison/manual/', RequestManualQuoteView.as_view(), name='request_manual_quote'),

    # Reviews
    path('<uuid:pk>/review/', CreateReviewView.as_view(), name='order_review'),
    path('mover/<uuid:mover_id>/reviews/', MoverReviewsView.as_view(), name='mover_reviews'),
]
