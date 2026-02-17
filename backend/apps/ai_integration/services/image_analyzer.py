"""
Image analyzer service for analyzing photos of items.
Uses Gemini's vision capabilities to identify items in images.
"""
import logging
from typing import Dict, List, Any, Optional

from .gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class ImageAnalyzerService:
    """
    Service for analyzing images of moving items.
    Can identify items, estimate sizes, and compare with descriptions.
    """

    ANALYSIS_PROMPT = """Analyze this image of items to be moved. Identify:

1. All visible items with:
   - Name (in English and Hebrew)
   - Estimated quantity
   - Category (furniture, electronics, appliances, etc.)
   - Approximate size (small, medium, large, extra large)
   - Condition visible (good, needs care, fragile)
   - Whether it appears to need assembly/disassembly

2. Room context if visible (living room, bedroom, etc.)

3. Any items that need special handling (fragile, heavy, awkward shape)

Return JSON format:
{
    "items_found": [
        {
            "name_en": "item name",
            "name_he": "שם הפריט",
            "quantity": 1,
            "category_en": "furniture",
            "category_he": "רהיטים",
            "size": "large",
            "condition": "good",
            "is_fragile": false,
            "needs_assembly": true,
            "special_notes": "",
            "confidence": 0.9
        }
    ],
    "room_detected": "living room",
    "room_detected_he": "סלון",
    "overall_assessment": "summary of what's visible",
    "concerns": ["any moving concerns noted"]
}
"""

    COMPARISON_PROMPT = """Compare the items visible in this image with the customer's description.

Customer's described items:
{described_items}

Analyze the image and identify:
1. Items in the image that match the description
2. Items in the image NOT mentioned in the description
3. Items mentioned in the description but NOT visible in the image
4. Any quantity discrepancies
5. Size or condition discrepancies

Return JSON format:
{{
    "matches": [
        {{
            "described_item": "item from description",
            "image_item": "matching item in image",
            "confidence": 0.95
        }}
    ],
    "in_image_not_described": [
        {{
            "name_en": "item name",
            "name_he": "שם הפריט",
            "quantity": 1,
            "confidence": 0.8
        }}
    ],
    "described_not_in_image": [
        {{
            "name": "item from description",
            "possible_reason": "may be in another room"
        }}
    ],
    "discrepancies": [
        {{
            "item": "item name",
            "issue": "quantity mismatch",
            "described": "2",
            "observed": "1"
        }}
    ],
    "summary": "overall comparison summary"
}}
"""

    def __init__(self):
        self.client = GeminiClient()

    def analyze_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a single image to identify items.

        Args:
            image_data: Raw image bytes
            mime_type: MIME type of the image

        Returns:
            Analysis results or None if failed
        """
        if not self.client.is_available:
            logger.warning("Gemini not available for image analysis")
            return None

        result = self.client.analyze_image_json(
            image_data=image_data,
            prompt=self.ANALYSIS_PROMPT,
            mime_type=mime_type
        )

        if result:
            return self._validate_analysis(result)

        return None

    def analyze_multiple_images(
        self,
        images: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze multiple images together for a comprehensive view.

        Args:
            images: List of dicts with 'data' (bytes) and 'mime_type'

        Returns:
            Combined analysis results
        """
        if not self.client.is_available:
            return None

        prompt = """Analyze all these images together. They show items to be moved.

For ALL images combined, identify every unique item (don't duplicate items that appear in multiple images).

Return JSON:
{
    "items_found": [
        {
            "name_en": "item name",
            "name_he": "שם הפריט",
            "quantity": 1,
            "category_en": "category",
            "category_he": "קטגוריה",
            "size": "large",
            "is_fragile": false,
            "needs_assembly": false,
            "seen_in_images": [1, 2],
            "confidence": 0.9
        }
    ],
    "rooms_detected": [
        {"name_en": "living room", "name_he": "סלון", "image_index": 1}
    ],
    "total_items_estimate": 15,
    "moving_complexity": "medium",
    "special_considerations": ["list of concerns"]
}
"""

        response = self.client.analyze_multiple_images(images, prompt)

        if response:
            try:
                import json
                text = response.strip()
                if text.startswith('```json'):
                    text = text[7:]
                elif text.startswith('```'):
                    text = text[3:]
                if text.endswith('```'):
                    text = text[:-3]

                return json.loads(text.strip())
            except:
                pass

        return None

    def compare_with_description(
        self,
        image_data: bytes,
        described_items: List[Dict[str, Any]],
        mime_type: str = "image/jpeg"
    ) -> Optional[Dict[str, Any]]:
        """
        Compare image contents with customer's item description.

        Args:
            image_data: Raw image bytes
            described_items: List of items from customer's description
            mime_type: MIME type of the image

        Returns:
            Comparison results
        """
        if not self.client.is_available:
            return None

        # Format described items for the prompt
        items_str = "\n".join([
            f"- {item.get('name', item.get('name_en', 'Unknown'))}: "
            f"quantity {item.get('quantity', 1)}"
            for item in described_items
        ])

        prompt = self.COMPARISON_PROMPT.format(described_items=items_str)

        result = self.client.analyze_image_json(
            image_data=image_data,
            prompt=prompt,
            mime_type=mime_type
        )

        return result

    def compare_all_images_with_description(
        self,
        images: List[Dict[str, Any]],
        described_items: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Compare all images with the full item description.

        Args:
            images: List of images with 'data' and 'mime_type'
            described_items: Items from customer's description

        Returns:
            Comprehensive comparison
        """
        if not self.client.is_available:
            return None

        items_str = "\n".join([
            f"- {item.get('name', item.get('name_en', 'Unknown'))}: "
            f"quantity {item.get('quantity', 1)}, "
            f"room: {item.get('room', 'not specified')}"
            for item in described_items
        ])

        prompt = f"""Compare ALL items visible across all these images with the customer's description:

Customer's described items:
{items_str}

Create a comprehensive comparison report:
1. Which described items are visible in the images
2. Items in images not mentioned by customer
3. Items mentioned but not seen (may be packed or in other rooms)
4. Any quantity or size discrepancies

Return JSON:
{{
    "verification_status": "complete" or "partial" or "concerns",
    "verified_items": [
        {{
            "name": "item name",
            "described_quantity": 2,
            "observed_quantity": 2,
            "status": "verified"
        }}
    ],
    "additional_items": [
        {{
            "name_en": "item not described",
            "name_he": "פריט שלא תואר",
            "quantity": 1,
            "should_add": true
        }}
    ],
    "missing_from_images": [
        {{
            "name": "described but not seen",
            "likely_reason": "possibly packed or in other room"
        }}
    ],
    "recommendations": [
        "any recommendations for the order"
    ],
    "confidence_score": 0.85
}}
"""

        response = self.client.analyze_multiple_images(images, prompt)

        if response:
            try:
                import json
                text = response.strip()
                if text.startswith('```'):
                    text = text.split('\n', 1)[1] if '\n' in text else text[3:]
                if text.endswith('```'):
                    text = text[:-3]
                return json.loads(text.strip())
            except:
                pass

        return None

    def _validate_analysis(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean up analysis result."""
        items = result.get('items_found', [])
        validated_items = []

        for item in items:
            validated_item = {
                'name_en': item.get('name_en', 'Unknown item'),
                'name_he': item.get('name_he', 'פריט לא ידוע'),
                'quantity': item.get('quantity', 1),
                'category_en': item.get('category_en', 'misc'),
                'category_he': item.get('category_he', 'שונות'),
                'size': item.get('size', 'medium'),
                'condition': item.get('condition', 'good'),
                'is_fragile': item.get('is_fragile', False),
                'needs_assembly': item.get('needs_assembly', False),
                'special_notes': item.get('special_notes', ''),
                'confidence': min(1.0, max(0.0, item.get('confidence', 0.5))),
            }
            validated_items.append(validated_item)

        return {
            'items_found': validated_items,
            'room_detected': result.get('room_detected', ''),
            'room_detected_he': result.get('room_detected_he', ''),
            'overall_assessment': result.get('overall_assessment', ''),
            'concerns': result.get('concerns', []),
        }
