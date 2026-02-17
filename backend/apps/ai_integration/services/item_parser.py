"""
Item parser service for parsing free-text descriptions into structured items.
Uses Gemini AI to understand and extract items from customer descriptions.
"""
import json
import logging
from typing import Dict, List, Any, Optional
from django.db.models import Q

from apps.movers.models import ItemType, ItemCategory, ItemCategoryAttribute, ItemTypeAttribute
from .gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class ItemParserService:
    """
    Service for parsing free-text descriptions into structured moving items.
    Matches items to known item types where possible.
    """

    SYSTEM_PROMPT = """You are an expert moving items analyzer. Your task is to parse customer descriptions
of items they want to move and extract structured information.

For each item mentioned, identify:
1. The item name (in the language provided and in English)
2. Quantity (default 1 if not specified)
3. Category (furniture, electronics, appliances, etc.)
4. Room location if mentioned
5. Whether it needs assembly/disassembly
6. Whether it's fragile or needs special handling
7. Any special notes

IMPORTANT:
- Support both Hebrew and English input
- Be thorough - don't miss any items
- If quantities are vague (like "a few"), estimate reasonably
- Identify items that need clarification (size, type, etc.)
- Group similar items when appropriate

Always respond in valid JSON format."""

    def __init__(self):
        self.client = GeminiClient()
        self._item_types_cache = None

    def _get_item_types(self) -> Dict[str, Dict]:
        """Load available item types for matching."""
        if self._item_types_cache is None:
            self._item_types_cache = {}
            for item in ItemType.objects.filter(is_active=True).select_related('category'):
                self._item_types_cache[str(item.id)] = {
                    'id': str(item.id),
                    'name_en': item.name_en,
                    'name_he': item.name_he,
                    'category_en': item.category.name_en,
                    'category_he': item.category.name_he,
                    'category_id': str(item.category_id),
                    'requires_assembly': item.requires_assembly,
                    'is_fragile': item.is_fragile,
                    'weight_class': item.weight_class,
                    'is_generic': item.is_generic,
                    'is_custom': item.is_custom,
                    'parent_type_id': str(item.parent_type_id) if item.parent_type_id else None,
                    'attribute_values': item.attribute_values,
                    'default_base_price': str(item.default_base_price),
                }
        return self._item_types_cache

    def parse_description(
        self,
        description: str,
        language: str = 'he'
    ) -> Dict[str, Any]:
        """
        Parse a free-text description into structured items.

        Args:
            description: Customer's description of items to move
            language: Input language ('he' or 'en')

        Returns:
            Dict with 'items' list and 'needs_clarification' list
        """
        if not self.client.is_available:
            logger.warning("Gemini not available, returning empty result")
            return {'items': [], 'needs_clarification': [], 'error': 'AI not available'}

        item_types = self._get_item_types()

        prompt = f"""Analyze the following moving description and extract all items.

Available known item types for matching:
{json.dumps(list(item_types.values()), ensure_ascii=False, indent=2)}

Customer description ({language}):
"{description}"

Extract items and return JSON in this exact format:
{{
    "items": [
        {{
            "matched_item_type_id": "uuid string or null if no match",
            "name_en": "item name in English",
            "name_he": "item name in Hebrew",
            "quantity": 1,
            "category_en": "category in English",
            "category_he": "category in Hebrew",
            "room": "room name if mentioned, empty string otherwise",
            "requires_disassembly": false,
            "requires_assembly": false,
            "is_fragile": false,
            "requires_special_handling": false,
            "special_notes": "",
            "confidence": 0.95
        }}
    ],
    "needs_clarification": [
        {{
            "item_index": 0,
            "question_en": "clarifying question in English",
            "question_he": "clarifying question in Hebrew",
            "reason": "why clarification is needed"
        }}
    ],
    "summary": {{
        "total_items": 0,
        "rooms_mentioned": [],
        "special_requirements": []
    }}
}}

Important:
- Match items to known types when possible using matched_item_type_id
- Confidence score 0-1 indicates how sure you are about the item identification
- Include clarification questions for vague items (size, type, quantity unclear)
- Be thorough and don't miss any items mentioned
"""

        result = self.client.generate_json(prompt, self.SYSTEM_PROMPT)

        if not result:
            logger.error("Failed to parse description with Gemini")
            return {'items': [], 'needs_clarification': [], 'error': 'Parsing failed'}

        # Validate and enhance result
        return self._validate_and_enhance(result, item_types)

    def _validate_and_enhance(
        self,
        result: Dict[str, Any],
        item_types: Dict[str, Dict]
    ) -> Dict[str, Any]:
        """Validate and enhance the parsing result."""
        items = result.get('items', [])
        validated_items = []
        variant_clarifications = []

        for idx, item in enumerate(items):
            # Validate matched item type
            matched_id = item.get('matched_item_type_id')
            if matched_id and matched_id in item_types:
                known_item = item_types[matched_id]
                # Enhance with known item properties if not specified
                if not item.get('name_en'):
                    item['name_en'] = known_item['name_en']
                if not item.get('name_he'):
                    item['name_he'] = known_item['name_he']

                # Check if item is generic and needs variant clarification
                if known_item.get('is_generic'):
                    item['is_generic'] = True
                    item['requires_variant_clarification'] = True
                    item['category_id'] = known_item.get('category_id')

                    # Get clarification questions for this generic item
                    questions = self._get_variant_questions(matched_id, known_item.get('category_id'))
                    if questions:
                        variant_clarifications.append({
                            'item_index': len(validated_items),
                            'item_type_id': matched_id,
                            'item_name_en': known_item['name_en'],
                            'item_name_he': known_item['name_he'],
                            'questions': questions,
                        })
                else:
                    item['is_generic'] = False
                    item['requires_variant_clarification'] = False
                    item['default_base_price'] = known_item.get('default_base_price')
            else:
                item['matched_item_type_id'] = None
                item['is_generic'] = False
                item['requires_variant_clarification'] = False

            # Ensure required fields
            item.setdefault('quantity', 1)
            item.setdefault('room', '')
            item.setdefault('requires_disassembly', False)
            item.setdefault('requires_assembly', False)
            item.setdefault('is_fragile', False)
            item.setdefault('requires_special_handling', False)
            item.setdefault('confidence', 0.5)

            validated_items.append(item)

        return {
            'items': validated_items,
            'needs_clarification': result.get('needs_clarification', []),
            'variant_clarifications': variant_clarifications,
            'summary': result.get('summary', {}),
        }

    def _get_variant_questions(
        self,
        item_type_id: str,
        category_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get variant clarification questions for a generic item.

        First checks for item-type-specific attributes (more accurate),
        then falls back to category-level attributes.
        """
        if not item_type_id:
            return []

        try:
            # First try to get item-type-specific attributes (more accurate)
            item_type_attributes = ItemTypeAttribute.objects.filter(
                item_type_id=item_type_id,
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

                    question = {
                        'attribute_code': attr.code,
                        'attribute_id': str(attr.id),
                        'question_en': attr.question_en,
                        'question_he': attr.question_he,
                        'input_type': attr.input_type,
                        'is_required': item_attr.is_required,
                        'options': [
                            {
                                'value': opt.value,
                                'label_en': opt.name_en,
                                'label_he': opt.name_he,
                            }
                            for opt in options
                        ]
                    }
                    questions.append(question)
                return questions

            # Fall back to category-level attributes (legacy behavior)
            if not category_id:
                return []

            category_attributes = ItemCategoryAttribute.objects.filter(
                category_id=category_id,
                attribute__is_active=True
            ).select_related('attribute').prefetch_related(
                'attribute__options'
            ).order_by('display_order')

            questions = []
            for cat_attr in category_attributes:
                attr = cat_attr.attribute
                options = attr.options.filter(is_active=True).order_by('display_order')

                question = {
                    'attribute_code': attr.code,
                    'attribute_id': str(attr.id),
                    'question_en': attr.question_en,
                    'question_he': attr.question_he,
                    'input_type': attr.input_type,
                    'is_required': cat_attr.is_required,
                    'options': [
                        {
                            'value': opt.value,
                            'label_en': opt.name_en,
                            'label_he': opt.name_he,
                        }
                        for opt in options
                    ]
                }
                questions.append(question)

            return questions
        except Exception as e:
            logger.error(f"Error getting variant questions: {e}")
            return []

    def match_item_to_type(
        self,
        item_name: str,
        language: str = 'he'
    ) -> Optional[Dict[str, Any]]:
        """
        Try to match a single item name to a known item type.

        Args:
            item_name: Name of the item
            language: Language of the item name

        Returns:
            Matched item type info or None
        """
        if not self.client.is_available:
            return None

        item_types = self._get_item_types()

        prompt = f"""Given the item name "{item_name}" ({language}),
find the best matching item from this list:

{json.dumps(list(item_types.values()), ensure_ascii=False, indent=2)}

Return JSON:
{{
    "matched_item_type_id": "uuid or null if no good match",
    "confidence": 0.95,
    "reason": "why this match was chosen"
}}
"""

        result = self.client.generate_json(prompt)

        if result and result.get('matched_item_type_id'):
            matched_id = result['matched_item_type_id']
            if matched_id in item_types:
                return {
                    **item_types[matched_id],
                    'confidence': result.get('confidence', 0.5)
                }

        return None

    def enhance_items_from_images(
        self,
        items: List[Dict],
        image_analysis: Dict
    ) -> List[Dict]:
        """
        Enhance parsed items with information from image analysis.

        Args:
            items: List of parsed items
            image_analysis: Analysis result from ImageAnalyzerService

        Returns:
            Enhanced items list
        """
        if not image_analysis or 'items_found' not in image_analysis:
            return items

        # Compare and merge items from text and images
        # This is a simplified implementation
        image_items = image_analysis.get('items_found', [])

        for img_item in image_items:
            # Check if item exists in text-parsed items
            found = False
            for item in items:
                if self._items_match(item, img_item):
                    # Merge/enhance existing item
                    if img_item.get('size'):
                        item['special_notes'] = f"{item.get('special_notes', '')} Size: {img_item['size']}"
                    found = True
                    break

            if not found:
                # Add item found in image but not in text
                items.append({
                    'name_en': img_item.get('name_en', 'Unknown item'),
                    'name_he': img_item.get('name_he', 'פריט לא ידוע'),
                    'quantity': img_item.get('quantity', 1),
                    'from_image': True,
                    'confidence': img_item.get('confidence', 0.7),
                    'requires_disassembly': False,
                    'requires_assembly': False,
                    'is_fragile': img_item.get('is_fragile', False),
                })

        return items

    def _items_match(self, item1: Dict, item2: Dict) -> bool:
        """Check if two items represent the same thing."""
        name1 = (item1.get('name_en', '') + item1.get('name_he', '')).lower()
        name2 = (item2.get('name_en', '') + item2.get('name_he', '')).lower()

        # Simple word overlap check
        words1 = set(name1.split())
        words2 = set(name2.split())

        if not words1 or not words2:
            return False

        overlap = len(words1 & words2) / min(len(words1), len(words2))
        return overlap > 0.5
