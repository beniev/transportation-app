"""
Views for the AI integration app.
Provides API endpoints for AI-powered features.
"""
import logging
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.orders.models import Order, OrderItem, AIConversation
from apps.movers.models import MoverPricing, ItemType, ItemTypeSuggestion, ItemCategory
from .services import (
    ItemParserService,
    PriceAnalyzerService,
    ClarificationService,
    ImageAnalyzerService,
    ItemVariantService,
)

logger = logging.getLogger(__name__)


class IsSubscribedToAI(permissions.BasePermission):
    """
    Permission to check if user has AI features access.
    For freemium model, AI is a premium feature.
    """
    message = 'AI features require a premium subscription.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # TODO: Check subscription status
        # For now, allow all authenticated users
        return True


class ParseDescriptionView(APIView):
    """
    Parse a free-text description into structured items.
    POST /api/v1/ai/parse-description/
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscribedToAI]

    def post(self, request):
        description = request.data.get('description', '')
        language = request.data.get('language', 'he')
        mover_id = request.data.get('mover_id')

        if not description:
            return Response(
                {'error': 'Description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parser = ItemParserService()
        result = parser.parse_description(description, language)

        # If mover_id provided, calculate prices
        if mover_id and 'items' in result:
            try:
                price_analyzer = PriceAnalyzerService(mover_id)
                for item in result['items']:
                    item_type_id = item.get('matched_item_type_id')
                    if item_type_id:
                        prices = price_analyzer.calculate_item_price(
                            item_type_id=item_type_id,
                            quantity=item.get('quantity', 1),
                            requires_assembly=item.get('requires_assembly', False),
                            requires_disassembly=item.get('requires_disassembly', False),
                            requires_special_handling=item.get('requires_special_handling', False),
                        )
                        item['estimated_price'] = str(prices['total'])
            except Exception as e:
                logger.error(f"Error calculating prices: {e}")

        return Response(result)


class GenerateClarificationsView(APIView):
    """
    Generate clarifying questions for an order.
    POST /api/v1/ai/clarify/
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscribedToAI]

    def post(self, request):
        order_data = request.data.get('order_data', {})
        parsed_items = request.data.get('items', [])
        language = request.data.get('language', 'he')

        service = ClarificationService()
        questions = service.generate_questions(order_data, parsed_items, language)

        return Response({'questions': questions})


class AnswerClarificationView(APIView):
    """
    Process answers to clarifying questions.
    POST /api/v1/ai/answer-clarification/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        questions = request.data.get('questions', [])
        answers = request.data.get('answers', {})

        service = ClarificationService()
        updates = service.process_answers(questions, answers)

        return Response({'updates': updates})


class AnalyzePriceView(APIView):
    """
    Calculate complete order price with all factors.
    POST /api/v1/ai/analyze-price/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mover_id = request.data.get('mover_id')
        items = request.data.get('items', [])

        if not mover_id:
            return Response(
                {'error': 'mover_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = PriceAnalyzerService(mover_id)

            result = analyzer.calculate_order_total(
                items=items,
                origin_floor=request.data.get('origin_floor', 0),
                origin_has_elevator=request.data.get('origin_has_elevator', False),
                origin_distance_to_truck=request.data.get('origin_distance_to_truck', 0),
                destination_floor=request.data.get('destination_floor', 0),
                destination_has_elevator=request.data.get('destination_has_elevator', False),
                destination_distance_to_truck=request.data.get('destination_distance_to_truck', 0),
                distance_km=request.data.get('distance_km', 0),
                order_date=request.data.get('order_date'),
            )

            # Convert Decimals to strings for JSON serialization
            for key, value in result.items():
                if hasattr(value, 'quantize'):  # It's a Decimal
                    result[key] = str(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            for k, v in item.items():
                                if hasattr(v, 'quantize'):
                                    item[k] = str(v)

            return Response(result)

        except Exception as e:
            logger.error(f"Error analyzing price: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AnalyzeImagesView(APIView):
    """
    Analyze uploaded images to identify items.
    POST /api/v1/ai/analyze-images/
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscribedToAI]

    def post(self, request):
        images = request.FILES.getlist('images', [])

        if not images:
            return Response(
                {'error': 'At least one image is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        analyzer = ImageAnalyzerService()

        if len(images) == 1:
            # Single image analysis
            image_data = images[0].read()
            mime_type = images[0].content_type or 'image/jpeg'
            result = analyzer.analyze_image(image_data, mime_type)
        else:
            # Multiple images analysis
            image_list = []
            for img in images:
                image_list.append({
                    'data': img.read(),
                    'mime_type': img.content_type or 'image/jpeg'
                })
            result = analyzer.analyze_multiple_images(image_list)

        if result:
            return Response(result)

        return Response(
            {'error': 'Image analysis failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class CompareDescriptionView(APIView):
    """
    Compare uploaded images with text description.
    POST /api/v1/ai/compare-description/
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscribedToAI]

    def post(self, request):
        images = request.FILES.getlist('images', [])
        described_items = request.data.get('items', [])

        if not images:
            return Response(
                {'error': 'At least one image is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not described_items:
            return Response(
                {'error': 'Items list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        analyzer = ImageAnalyzerService()

        if len(images) == 1:
            image_data = images[0].read()
            mime_type = images[0].content_type or 'image/jpeg'
            result = analyzer.compare_with_description(
                image_data, described_items, mime_type
            )
        else:
            image_list = []
            for img in images:
                image_list.append({
                    'data': img.read(),
                    'mime_type': img.content_type or 'image/jpeg'
                })
            result = analyzer.compare_all_images_with_description(
                image_list, described_items
            )

        if result:
            return Response(result)

        return Response(
            {'error': 'Comparison failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ProcessOrderAIView(APIView):
    """
    Full AI processing for an order.
    POST /api/v1/ai/process-order/{order_id}/
    """
    permission_classes = [permissions.IsAuthenticated, IsSubscribedToAI]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)

        # Check permission
        if request.user.is_mover:
            if order.mover.user != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif order.customer != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        # Parse description
        parser = ItemParserService()
        parse_result = parser.parse_description(
            order.original_description,
            order.customer.preferred_language
        )

        # Save parsed items
        for item_data in parse_result.get('items', []):
            OrderItem.objects.create(
                order=order,
                item_type_id=item_data.get('matched_item_type_id'),
                name=item_data.get('name_en', 'Unknown'),
                name_he=item_data.get('name_he', ''),
                quantity=item_data.get('quantity', 1),
                requires_assembly=item_data.get('requires_assembly', False),
                requires_disassembly=item_data.get('requires_disassembly', False),
                is_fragile=item_data.get('is_fragile', False),
                requires_special_handling=item_data.get('requires_special_handling', False),
                room_name=item_data.get('room', ''),
                ai_confidence=item_data.get('confidence', 0.5),
                ai_needs_clarification=bool(item_data.get('needs_clarification')),
            )

        # Save clarification questions
        for q_data in parse_result.get('needs_clarification', []):
            AIConversation.objects.create(
                order=order,
                message_type=AIConversation.MessageType.QUESTION,
                content=q_data.get('question_en', ''),
                content_he=q_data.get('question_he', ''),
                metadata=q_data
            )

        # Calculate price
        analyzer = PriceAnalyzerService(str(order.mover_id))
        price_result = analyzer.calculate_order_total(
            items=parse_result.get('items', []),
            origin_floor=order.origin_floor,
            origin_has_elevator=order.origin_has_elevator,
            origin_distance_to_truck=order.origin_distance_to_truck,
            destination_floor=order.destination_floor,
            destination_has_elevator=order.destination_has_elevator,
            destination_distance_to_truck=order.destination_distance_to_truck,
            distance_km=order.distance_km,
            order_date=order.preferred_date,
        )

        # Update order with calculated prices
        order.items_subtotal = price_result['items_subtotal']
        order.origin_floor_surcharge = price_result['origin_floor_surcharge']
        order.destination_floor_surcharge = price_result['destination_floor_surcharge']
        order.distance_surcharge = price_result['distance_surcharge']
        order.travel_cost = price_result['travel_cost']
        order.seasonal_adjustment = price_result['seasonal_adjustment']
        order.day_of_week_adjustment = price_result['day_of_week_adjustment']
        order.total_price = price_result['total']
        order.ai_processed = True
        order.ai_processing_data = {
            'parse_result': parse_result,
            'price_result': {k: str(v) if hasattr(v, 'quantize') else v for k, v in price_result.items()}
        }
        order.save()

        return Response({
            'success': True,
            'items_count': len(parse_result.get('items', [])),
            'questions_count': len(parse_result.get('needs_clarification', [])),
            'total_price': str(order.total_price),
        })


class ItemVariantQuestionsView(APIView):
    """
    Get clarification questions for a generic item type.
    GET /api/v1/ai/item-variants/{item_type_id}/questions/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, item_type_id):
        language = request.query_params.get('language', 'he')

        service = ItemVariantService()
        questions = service.get_clarification_questions(str(item_type_id), language)

        if not questions:
            # Check if item exists and if it's generic
            try:
                item_type = ItemType.objects.get(id=item_type_id, is_active=True)
                if not item_type.is_generic:
                    return Response({
                        'error': 'Item is not generic and does not require clarification',
                        'is_generic': False,
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ItemType.DoesNotExist:
                return Response(
                    {'error': 'Item type not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response({
            'item_type_id': str(item_type_id),
            'questions': questions,
        })


class ResolveItemVariantView(APIView):
    """
    Resolve a generic item to a specific variant based on answers.
    POST /api/v1/ai/item-variants/resolve/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        generic_type_id = request.data.get('item_type_id')
        answers = request.data.get('answers', {})
        mover_id = request.data.get('mover_id')
        language = request.data.get('language', 'he')

        if not generic_type_id:
            return Response(
                {'error': 'item_type_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not answers:
            return Response(
                {'error': 'answers is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = ItemVariantService()

        # Try to find a matching variant
        variant = service.find_variant(generic_type_id, answers)

        if variant:
            # Get price (mover-specific if available)
            prices = service.get_variant_price(variant['id'], mover_id)
            variant['prices'] = {k: str(v) for k, v in prices.items()}
            return Response({
                'found': True,
                'variant': variant,
            })

        # No exact match - return available variants so user can choose from them
        try:
            generic_type = ItemType.objects.select_related('category').get(
                id=generic_type_id,
                is_active=True
            )

            # Get existing variants to show the user what's available
            available_variants = service.get_variants_for_generic(
                str(generic_type_id), language
            )

            # Estimate a price based on the generic type
            estimated_price = service.estimate_custom_item_price(
                weight_class=generic_type.weight_class,
                is_fragile=generic_type.is_fragile,
                requires_special_handling=generic_type.requires_special_handling,
            )

            return Response({
                'found': False,
                'message': 'No exact variant found.',
                'message_he': 'לא נמצאה התאמה מדויקת. ניתן לבחור מהאפשרויות הקיימות או ליצור פריט מותאם אישית.',
                'message_en': 'No exact match found. You can choose from available options or create a custom item.',
                'generic_type': {
                    'id': str(generic_type.id),
                    'name_en': generic_type.name_en,
                    'name_he': generic_type.name_he,
                    'category_id': str(generic_type.category_id),
                    'category_name_en': generic_type.category.name_en,
                    'category_name_he': generic_type.category.name_he,
                },
                'available_variants': available_variants,
                'suggested_answers': answers,
                'estimated_price': str(estimated_price),
            })

        except ItemType.DoesNotExist:
            return Response(
                {'error': 'Generic item type not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class GetVariantsView(APIView):
    """
    Get all variants for a generic item type.
    GET /api/v1/ai/item-variants/{item_type_id}/variants/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, item_type_id):
        language = request.query_params.get('language', 'he')

        service = ItemVariantService()
        variants = service.get_variants_for_generic(str(item_type_id), language)

        return Response({
            'item_type_id': str(item_type_id),
            'variants': variants,
        })


class GenericItemsListView(APIView):
    """
    Get all generic items, optionally filtered by category.
    GET /api/v1/ai/item-variants/generic/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        category_id = request.query_params.get('category_id')
        language = request.query_params.get('language', 'he')

        service = ItemVariantService()
        items = service.get_generic_items_for_category(category_id, language)

        return Response({
            'items': items,
        })


class CreateCustomItemView(APIView):
    """
    Create a custom item type for items not in the catalog.
    POST /api/v1/ai/item-variants/custom/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        name_en = request.data.get('name_en')
        name_he = request.data.get('name_he')
        category_id = request.data.get('category_id')
        estimated_price = request.data.get('estimated_price')

        if not name_en or not name_he:
            return Response(
                {'error': 'name_en and name_he are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not category_id:
            return Response(
                {'error': 'category_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = ItemVariantService()

        try:
            from decimal import Decimal

            # Estimate price if not provided
            if not estimated_price:
                estimated_price = service.estimate_custom_item_price(
                    weight_class=request.data.get('weight_class', 'medium'),
                    is_fragile=request.data.get('is_fragile', False),
                    requires_special_handling=request.data.get('requires_special_handling', False),
                    estimated_size=request.data.get('estimated_size', 'medium'),
                )
            else:
                estimated_price = Decimal(str(estimated_price))

            weight_class = request.data.get('weight_class', 'medium')
            requires_assembly = request.data.get('requires_assembly', False)
            is_fragile = request.data.get('is_fragile', False)
            requires_special_handling = request.data.get('requires_special_handling', False)
            description_en = request.data.get('description_en', '')
            description_he = request.data.get('description_he', '')

            custom_item = service.create_custom_item(
                name_en=name_en,
                name_he=name_he,
                category_id=category_id,
                estimated_price=estimated_price,
                weight_class=weight_class,
                requires_assembly=requires_assembly,
                is_fragile=is_fragile,
                requires_special_handling=requires_special_handling,
                description_en=description_en,
                description_he=description_he,
            )

            # Auto-create suggestion for admin review
            try:
                # Check if a similar suggestion already exists (same name)
                existing = ItemTypeSuggestion.objects.filter(
                    name_he=name_he,
                    status=ItemTypeSuggestion.Status.PENDING,
                ).first()

                if existing:
                    # Increment occurrence count
                    existing.occurrence_count += 1
                    existing.save(update_fields=['occurrence_count', 'updated_at'])
                    logger.info(f"Incremented suggestion occurrence for '{name_he}' (x{existing.occurrence_count})")
                else:
                    # Create new suggestion
                    suggestion = ItemTypeSuggestion.objects.create(
                        name_en=name_en,
                        name_he=name_he,
                        description_en=description_en,
                        description_he=description_he,
                        category_id=category_id,
                        suggested_price=estimated_price,
                        weight_class=weight_class,
                        requires_assembly=requires_assembly,
                        is_fragile=is_fragile,
                        source=ItemTypeSuggestion.Source.AUTO,
                        suggested_by=getattr(request.user, 'mover_profile', None),
                    )
                    logger.info(f"Auto-created suggestion '{name_he}' for admin review")
            except Exception as e:
                # Don't fail the main request if suggestion creation fails
                logger.warning(f"Failed to create auto-suggestion: {e}")

            return Response({
                'success': True,
                'item': custom_item,
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating custom item: {e}")
            return Response(
                {'error': 'Failed to create custom item'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
