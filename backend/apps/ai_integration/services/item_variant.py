"""
Item variant service for managing generic items and their specific variants.
Handles clarification questions and variant resolution.
"""
import logging
from typing import Dict, List, Any, Optional
from decimal import Decimal
from django.db.models import Q

from apps.movers.models import (
    ItemType, ItemCategory, ItemAttribute,
    ItemAttributeOption, ItemCategoryAttribute, ItemTypeAttribute, MoverPricing
)

logger = logging.getLogger(__name__)


class ItemVariantService:
    """
    Service for managing item variants and clarification questions.
    Converts generic items (e.g., "wardrobe") to specific variants (e.g., "3-door wardrobe").
    """

    def get_clarification_questions(
        self,
        item_type_id: str,
        language: str = 'he'
    ) -> List[Dict[str, Any]]:
        """
        Get clarification questions for a generic item type.

        Args:
            item_type_id: UUID of the generic item type
            language: Language for questions ('he' or 'en')

        Returns:
            List of questions with options
        """
        try:
            item_type = ItemType.objects.select_related('category').get(
                id=item_type_id,
                is_active=True
            )
        except ItemType.DoesNotExist:
            logger.warning(f"ItemType not found: {item_type_id}")
            return []

        if not item_type.is_generic:
            return []

        # Get all active variants for this generic item to know which option values actually exist
        variants = item_type.variants.filter(is_active=True)
        existing_variant_values = {}
        for variant in variants:
            if variant.attribute_values:
                for attr_code, attr_value in variant.attribute_values.items():
                    if attr_code not in existing_variant_values:
                        existing_variant_values[attr_code] = set()
                    existing_variant_values[attr_code].add(attr_value)

        # First try to get item-type-specific attributes (more accurate)
        item_type_attributes = ItemTypeAttribute.objects.filter(
            item_type=item_type,
            attribute__is_active=True
        ).select_related('attribute').prefetch_related(
            'attribute__options'
        ).order_by('display_order')

        if item_type_attributes.exists():
            # Use item-type-specific attributes
            questions = []
            for item_attr in item_type_attributes:
                attr = item_attr.attribute
                options = attr.options.filter(is_active=True).order_by('display_order')

                # Filter options to only include values that have a matching variant
                valid_values = existing_variant_values.get(attr.code, set())
                filtered_options = [
                    {
                        'value': opt.value,
                        'label': opt.get_name(language),
                        'label_en': opt.name_en,
                        'label_he': opt.name_he,
                    }
                    for opt in options
                    if opt.value in valid_values
                ]

                question = {
                    'attribute_code': attr.code,
                    'attribute_id': str(attr.id),
                    'question': attr.get_question(language),
                    'question_en': attr.question_en,
                    'question_he': attr.question_he,
                    'input_type': attr.input_type,
                    'is_required': item_attr.is_required,
                    'options': filtered_options,
                }
                questions.append(question)
            return questions

        # Fall back to category-level attributes (legacy behavior)
        category_attributes = ItemCategoryAttribute.objects.filter(
            category=item_type.category,
            attribute__is_active=True
        ).select_related('attribute').prefetch_related(
            'attribute__options'
        ).order_by('display_order')

        questions = []
        for cat_attr in category_attributes:
            attr = cat_attr.attribute
            options = attr.options.filter(is_active=True).order_by('display_order')

            # Filter options to only include values that have a matching variant
            valid_values = existing_variant_values.get(attr.code, set())
            filtered_options = [
                {
                    'value': opt.value,
                    'label': opt.get_name(language),
                    'label_en': opt.name_en,
                    'label_he': opt.name_he,
                }
                for opt in options
                if opt.value in valid_values
            ]

            question = {
                'attribute_code': attr.code,
                'attribute_id': str(attr.id),
                'question': attr.get_question(language),
                'question_en': attr.question_en,
                'question_he': attr.question_he,
                'input_type': attr.input_type,
                'is_required': cat_attr.is_required,
                'options': filtered_options,
            }
            questions.append(question)

        return questions

    def find_variant(
        self,
        generic_type_id: str,
        answers: Dict[str, str]
    ) -> Optional[Dict[str, Any]]:
        """
        Find the specific variant based on user answers.

        Args:
            generic_type_id: UUID of the generic item type
            answers: Dict of attribute_code -> value (e.g., {"door_count": "3"})

        Returns:
            Variant info with id, name, price, etc. or None if not found
        """
        try:
            generic_type = ItemType.objects.get(
                id=generic_type_id,
                is_generic=True,
                is_active=True
            )
        except ItemType.DoesNotExist:
            logger.warning(f"Generic ItemType not found: {generic_type_id}")
            return None

        # Look for a variant that matches all the answers
        variants = generic_type.variants.filter(is_active=True)

        for variant in variants:
            attr_values = variant.attribute_values or {}

            # Check if this variant matches all provided answers
            matches = True
            for attr_code, answer_value in answers.items():
                if attr_values.get(attr_code) != answer_value:
                    matches = False
                    break

            if matches:
                return self._serialize_item_type(variant)

        # No exact match found - try to find a close match
        logger.info(f"No exact variant match for {generic_type_id} with answers {answers}")

        # Return None - caller should handle creating a custom item
        return None

    def get_variant_price(
        self,
        variant_id: str,
        mover_id: Optional[str] = None
    ) -> Dict[str, Decimal]:
        """
        Get the price for a variant, using mover's price if available.

        Args:
            variant_id: UUID of the item type (variant)
            mover_id: Optional UUID of the mover

        Returns:
            Dict with base_price, assembly_price, etc.
        """
        try:
            item_type = ItemType.objects.get(id=variant_id, is_active=True)
        except ItemType.DoesNotExist:
            return {
                'base_price': Decimal('0.00'),
                'assembly_price': Decimal('0.00'),
                'disassembly_price': Decimal('0.00'),
                'special_handling_price': Decimal('0.00'),
            }

        # Try to get mover-specific pricing
        if mover_id:
            try:
                mover_price = MoverPricing.objects.get(
                    mover_id=mover_id,
                    item_type=item_type,
                    is_active=True
                )
                return {
                    'base_price': mover_price.base_price,
                    'assembly_price': mover_price.assembly_price,
                    'disassembly_price': mover_price.disassembly_price,
                    'special_handling_price': mover_price.special_handling_price,
                }
            except MoverPricing.DoesNotExist:
                pass

        # Fall back to default pricing
        return {
            'base_price': item_type.default_base_price,
            'assembly_price': item_type.default_assembly_price,
            'disassembly_price': item_type.default_disassembly_price,
            'special_handling_price': item_type.default_special_handling_price,
        }

    def get_generic_items_for_category(
        self,
        category_id: Optional[str] = None,
        language: str = 'he'
    ) -> List[Dict[str, Any]]:
        """
        Get all generic items, optionally filtered by category.

        Args:
            category_id: Optional UUID of the category
            language: Language for names

        Returns:
            List of generic item types
        """
        queryset = ItemType.objects.filter(
            is_generic=True,
            is_active=True
        ).select_related('category')

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return [
            self._serialize_item_type(item, language)
            for item in queryset.order_by('category__display_order', 'display_order')
        ]

    def get_variants_for_generic(
        self,
        generic_type_id: str,
        language: str = 'he'
    ) -> List[Dict[str, Any]]:
        """
        Get all variants for a generic item type.

        Args:
            generic_type_id: UUID of the generic item type
            language: Language for names

        Returns:
            List of variant item types
        """
        try:
            generic_type = ItemType.objects.get(
                id=generic_type_id,
                is_generic=True,
                is_active=True
            )
        except ItemType.DoesNotExist:
            return []

        variants = generic_type.variants.filter(is_active=True).order_by('display_order')

        return [
            self._serialize_item_type(variant, language)
            for variant in variants
        ]

    def create_custom_item(
        self,
        name_en: str,
        name_he: str,
        category_id: str,
        estimated_price: Decimal,
        weight_class: str = 'medium',
        requires_assembly: bool = False,
        is_fragile: bool = False,
        requires_special_handling: bool = False,
        description_en: str = '',
        description_he: str = '',
    ) -> Dict[str, Any]:
        """
        Create a custom item type for items not in the catalog.

        Args:
            name_en: Item name in English
            name_he: Item name in Hebrew
            category_id: UUID of the category
            estimated_price: Estimated base price
            weight_class: Weight class (light, medium, heavy, extra_heavy)
            requires_assembly: Whether assembly is needed
            is_fragile: Whether item is fragile
            requires_special_handling: Whether special handling is needed
            description_en: Description in English
            description_he: Description in Hebrew

        Returns:
            Created item type info
        """
        try:
            category = ItemCategory.objects.get(id=category_id, is_active=True)
        except ItemCategory.DoesNotExist:
            # Use a default "Other" category
            category = ItemCategory.objects.filter(is_active=True).first()
            if not category:
                raise ValueError("No active categories found")

        custom_item = ItemType.objects.create(
            name_en=name_en,
            name_he=name_he,
            description_en=description_en,
            description_he=description_he,
            category=category,
            default_base_price=estimated_price,
            weight_class=weight_class,
            requires_assembly=requires_assembly,
            is_fragile=is_fragile,
            requires_special_handling=requires_special_handling,
            is_custom=True,
            is_generic=False,
        )

        return self._serialize_item_type(custom_item)

    def estimate_custom_item_price(
        self,
        weight_class: str = 'medium',
        is_fragile: bool = False,
        requires_special_handling: bool = False,
        estimated_size: str = 'medium',  # small, medium, large, extra_large
    ) -> Decimal:
        """
        Estimate price for a custom item based on characteristics.

        Args:
            weight_class: Weight class
            is_fragile: Whether item is fragile
            requires_special_handling: Whether special handling is needed
            estimated_size: Estimated size category

        Returns:
            Estimated base price
        """
        # Base prices by size
        size_prices = {
            'small': Decimal('50.00'),
            'medium': Decimal('100.00'),
            'large': Decimal('200.00'),
            'extra_large': Decimal('350.00'),
        }

        # Weight class multipliers
        weight_multipliers = {
            'light': Decimal('0.8'),
            'medium': Decimal('1.0'),
            'heavy': Decimal('1.3'),
            'extra_heavy': Decimal('1.6'),
        }

        base = size_prices.get(estimated_size, Decimal('100.00'))
        multiplier = weight_multipliers.get(weight_class, Decimal('1.0'))

        price = base * multiplier

        # Add for fragile/special handling
        if is_fragile:
            price += Decimal('30.00')
        if requires_special_handling:
            price += Decimal('50.00')

        return price.quantize(Decimal('0.01'))

    def _serialize_item_type(
        self,
        item_type: ItemType,
        language: str = 'he'
    ) -> Dict[str, Any]:
        """Serialize an ItemType to a dict."""
        return {
            'id': str(item_type.id),
            'name': item_type.get_name(language),
            'name_en': item_type.name_en,
            'name_he': item_type.name_he,
            'description': item_type.get_description(language),
            'description_en': item_type.description_en,
            'description_he': item_type.description_he,
            'category_id': str(item_type.category_id),
            'category_name': item_type.category.get_name(language),
            'category_name_en': item_type.category.name_en,
            'category_name_he': item_type.category.name_he,
            'is_generic': item_type.is_generic,
            'is_custom': item_type.is_custom,
            'parent_type_id': str(item_type.parent_type_id) if item_type.parent_type_id else None,
            'attribute_values': item_type.attribute_values,
            'default_base_price': str(item_type.default_base_price),
            'default_assembly_price': str(item_type.default_assembly_price),
            'default_disassembly_price': str(item_type.default_disassembly_price),
            'default_special_handling_price': str(item_type.default_special_handling_price),
            'requires_assembly': item_type.requires_assembly,
            'requires_special_handling': item_type.requires_special_handling,
            'is_fragile': item_type.is_fragile,
            'weight_class': item_type.weight_class,
        }
