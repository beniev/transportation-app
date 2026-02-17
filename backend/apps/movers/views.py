"""
Views for the movers app.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import MoverProfile
from .models import ItemCategory, ItemType, ItemAttribute, MoverPricing, PricingFactors, ItemTypeSuggestion
from .serializers import (
    ItemCategorySerializer,
    ItemTypeSerializer,
    MoverPricingSerializer,
    MoverPricingBulkSerializer,
    PricingFactorsSerializer,
    ItemTypeWithMoverPricingSerializer,
    AdminItemTypeSerializer,
    AdminItemCategorySerializer,
    AdminItemAttributeSerializer,
    AdminSuggestionSerializer,
    ApproveSuggestionSerializer,
)


class IsMover(permissions.BasePermission):
    """Permission class for mover-only views."""
    message = 'Only movers can access this resource.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.is_mover and
            hasattr(request.user, 'mover_profile')
        )


class IsAdmin(permissions.BasePermission):
    """Permission class for admin-only views."""
    message = 'Only admins can access this resource.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (request.user.user_type == 'admin' or request.user.is_staff)
        )


# Item Categories

class ItemCategoryListView(generics.ListAPIView):
    """List all active item categories."""
    serializer_class = ItemCategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = ItemCategory.objects.filter(is_active=True, parent__isnull=True)


class ItemCategoryDetailView(generics.RetrieveAPIView):
    """Get item category details."""
    serializer_class = ItemCategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = ItemCategory.objects.filter(is_active=True)
    lookup_field = 'id'


# Item Types

class ItemTypeListView(generics.ListAPIView):
    """List all active item types."""
    serializer_class = ItemTypeSerializer
    permission_classes = [permissions.AllowAny]
    queryset = ItemType.objects.filter(is_active=True).select_related('category')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'weight_class', 'requires_assembly', 'is_fragile']


class ItemTypeDetailView(generics.RetrieveAPIView):
    """Get item type details."""
    serializer_class = ItemTypeSerializer
    permission_classes = [permissions.AllowAny]
    queryset = ItemType.objects.filter(is_active=True)
    lookup_field = 'id'


class ItemTypeWithPricingListView(generics.ListAPIView):
    """
    List all item types with mover-specific pricing.
    For movers to see their prices alongside defaults.
    """
    serializer_class = ItemTypeWithMoverPricingSerializer
    permission_classes = [IsMover]
    queryset = ItemType.objects.filter(is_active=True).select_related('category')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['mover'] = self.request.user.mover_profile
        return context


# Mover Pricing

class MoverPricingListView(generics.ListAPIView):
    """List mover's pricing for all items."""
    serializer_class = MoverPricingSerializer
    permission_classes = [IsMover]

    def get_queryset(self):
        return MoverPricing.objects.filter(
            mover=self.request.user.mover_profile
        ).select_related('item_type', 'item_type__category')


class MoverPricingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete specific mover pricing."""
    serializer_class = MoverPricingSerializer
    permission_classes = [IsMover]
    lookup_field = 'id'

    def get_queryset(self):
        return MoverPricing.objects.filter(mover=self.request.user.mover_profile)


class MoverPricingCreateView(generics.CreateAPIView):
    """Create new mover pricing for an item type."""
    serializer_class = MoverPricingSerializer
    permission_classes = [IsMover]

    def perform_create(self, serializer):
        serializer.save(mover=self.request.user.mover_profile)


class MoverPricingBulkUpdateView(APIView):
    """Bulk update mover pricing."""
    permission_classes = [IsMover]

    def post(self, request):
        serializer = MoverPricingBulkSerializer(
            data=request.data,
            context={'mover': request.user.mover_profile}
        )
        serializer.is_valid(raise_exception=True)
        pricing_list = serializer.save()

        return Response(
            MoverPricingSerializer(pricing_list, many=True).data,
            status=status.HTTP_200_OK
        )


# Pricing Factors

class PricingFactorsView(generics.RetrieveUpdateAPIView):
    """Get and update mover's pricing factors."""
    serializer_class = PricingFactorsSerializer
    permission_classes = [IsMover]

    def get_object(self):
        mover = self.request.user.mover_profile
        factors, created = PricingFactors.objects.get_or_create(mover=mover)
        return factors


# Public views for customers

class MoverItemTypesView(generics.ListAPIView):
    """
    List item types available from a specific mover with their prices.
    Public view for customers.
    """
    serializer_class = ItemTypeWithMoverPricingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mover_id = self.kwargs.get('mover_id')
        # Get item types that the mover has priced
        return ItemType.objects.filter(
            is_active=True,
            mover_prices__mover_id=mover_id,
            mover_prices__is_active=True
        ).select_related('category').distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        mover_id = self.kwargs.get('mover_id')
        try:
            context['mover'] = MoverProfile.objects.get(id=mover_id)
        except MoverProfile.DoesNotExist:
            context['mover'] = None
        return context


# ===== Admin Views =====

class AdminCatalogStatsView(APIView):
    """Get catalog statistics for admin dashboard."""
    permission_classes = [IsAdmin]

    def get(self, request):
        total_items = ItemType.objects.filter(is_active=True, parent_type__isnull=True).count()
        total_variants = ItemType.objects.filter(is_active=True, parent_type__isnull=False).count()
        total_categories = ItemCategory.objects.filter(is_active=True).count()
        generic_items = ItemType.objects.filter(is_active=True, is_generic=True).count()

        return Response({
            'total_items': total_items,
            'total_variants': total_variants,
            'total_categories': total_categories,
            'generic_items': generic_items,
        })


class AdminItemTypeListCreateView(generics.ListCreateAPIView):
    """Admin: list all items (with variants) or create new item."""
    serializer_class = AdminItemTypeSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_generic', 'weight_class', 'is_active']

    def get_queryset(self):
        # Only top-level items (not variants) unless specifically requesting variants
        show_variants = self.request.query_params.get('show_variants', 'false')
        qs = ItemType.objects.select_related('category').order_by('category__display_order', 'display_order', 'name_en')
        if show_variants.lower() != 'true':
            qs = qs.filter(parent_type__isnull=True)
        return qs


class AdminItemTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: get, update, or delete a specific item type."""
    serializer_class = AdminItemTypeSerializer
    permission_classes = [IsAdmin]
    queryset = ItemType.objects.select_related('category')
    lookup_field = 'id'


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """Admin: list all categories or create new."""
    serializer_class = AdminItemCategorySerializer
    permission_classes = [IsAdmin]
    queryset = ItemCategory.objects.order_by('display_order', 'name_en')


class AdminAttributeListView(generics.ListAPIView):
    """Admin: list all attributes with their options."""
    serializer_class = AdminItemAttributeSerializer
    permission_classes = [IsAdmin]
    queryset = ItemAttribute.objects.filter(is_active=True).order_by('display_order')


# ===== Suggestion Views =====

class AdminSuggestionListView(generics.ListAPIView):
    """Admin: list item type suggestions, optionally filtered by status."""
    serializer_class = AdminSuggestionSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = ItemTypeSuggestion.objects.select_related('category', 'suggested_by').order_by('-occurrence_count', '-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminSuggestionDetailView(generics.RetrieveUpdateAPIView):
    """Admin: get or update a specific suggestion (e.g., add admin notes)."""
    serializer_class = AdminSuggestionSerializer
    permission_classes = [IsAdmin]
    queryset = ItemTypeSuggestion.objects.select_related('category', 'suggested_by')
    lookup_field = 'id'


class AdminSuggestionApproveView(APIView):
    """
    Admin: approve a suggestion and auto-create an ItemType from it.
    POST /movers/admin/suggestions/<id>/approve/
    Body (optional): { default_base_price, weight_class, admin_notes }
    """
    permission_classes = [IsAdmin]

    def post(self, request, id):
        try:
            suggestion = ItemTypeSuggestion.objects.select_related('category').get(id=id)
        except ItemTypeSuggestion.DoesNotExist:
            return Response({'detail': 'Suggestion not found.'}, status=status.HTTP_404_NOT_FOUND)

        if suggestion.status != ItemTypeSuggestion.Status.PENDING:
            return Response(
                {'detail': f'Suggestion is already {suggestion.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveSuggestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create the new ItemType from the suggestion
        item = ItemType.objects.create(
            name_en=suggestion.name_en,
            name_he=suggestion.name_he,
            description_en=suggestion.description_en,
            description_he=suggestion.description_he,
            category=suggestion.category,
            default_base_price=data.get('default_base_price', suggestion.suggested_price),
            weight_class=data.get('weight_class', suggestion.weight_class),
            requires_assembly=suggestion.requires_assembly,
            is_fragile=suggestion.is_fragile,
            is_custom=False,
            is_active=True,
        )

        # Mark suggestion as approved and link the new item
        suggestion.status = ItemTypeSuggestion.Status.APPROVED
        suggestion.admin_notes = data.get('admin_notes', '')
        suggestion.created_item = item
        suggestion.save(update_fields=['status', 'admin_notes', 'created_item', 'updated_at'])

        return Response({
            'detail': 'Suggestion approved and item created.',
            'item_id': str(item.id),
            'item_name': item.name_en,
            'suggestion': AdminSuggestionSerializer(suggestion).data,
        }, status=status.HTTP_200_OK)


class AdminSuggestionRejectView(APIView):
    """
    Admin: reject a suggestion.
    POST /movers/admin/suggestions/<id>/reject/
    Body (optional): { admin_notes }
    """
    permission_classes = [IsAdmin]

    def post(self, request, id):
        try:
            suggestion = ItemTypeSuggestion.objects.get(id=id)
        except ItemTypeSuggestion.DoesNotExist:
            return Response({'detail': 'Suggestion not found.'}, status=status.HTTP_404_NOT_FOUND)

        if suggestion.status != ItemTypeSuggestion.Status.PENDING:
            return Response(
                {'detail': f'Suggestion is already {suggestion.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suggestion.status = ItemTypeSuggestion.Status.REJECTED
        suggestion.admin_notes = request.data.get('admin_notes', '')
        suggestion.save(update_fields=['status', 'admin_notes', 'updated_at'])

        return Response({
            'detail': 'Suggestion rejected.',
            'suggestion': AdminSuggestionSerializer(suggestion).data,
        }, status=status.HTTP_200_OK)
