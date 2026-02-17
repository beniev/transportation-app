"""
URL configuration for the AI integration app.
"""
from django.urls import path
from .views import (
    ParseDescriptionView,
    GenerateClarificationsView,
    AnswerClarificationView,
    AnalyzePriceView,
    AnalyzeImagesView,
    CompareDescriptionView,
    ProcessOrderAIView,
    ItemVariantQuestionsView,
    ResolveItemVariantView,
    GetVariantsView,
    GenericItemsListView,
    CreateCustomItemView,
)

app_name = 'ai_integration'

urlpatterns = [
    # Text parsing
    path('parse-description/', ParseDescriptionView.as_view(), name='parse_description'),

    # Clarifications
    path('clarify/', GenerateClarificationsView.as_view(), name='generate_clarifications'),
    path('answer-clarification/', AnswerClarificationView.as_view(), name='answer_clarification'),

    # Price analysis
    path('analyze-price/', AnalyzePriceView.as_view(), name='analyze_price'),

    # Image analysis
    path('analyze-images/', AnalyzeImagesView.as_view(), name='analyze_images'),
    path('compare-description/', CompareDescriptionView.as_view(), name='compare_description'),

    # Full order processing
    path('process-order/<uuid:order_id>/', ProcessOrderAIView.as_view(), name='process_order'),

    # Item variants
    path('item-variants/generic/', GenericItemsListView.as_view(), name='generic_items_list'),
    path('item-variants/resolve/', ResolveItemVariantView.as_view(), name='resolve_variant'),
    path('item-variants/custom/', CreateCustomItemView.as_view(), name='create_custom_item'),
    path('item-variants/<uuid:item_type_id>/questions/', ItemVariantQuestionsView.as_view(), name='variant_questions'),
    path('item-variants/<uuid:item_type_id>/variants/', GetVariantsView.as_view(), name='get_variants'),
]
