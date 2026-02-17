"""
Clarification service for generating smart questions about orders.
Uses AI to identify what information is needed for accurate pricing.
"""
import logging
from typing import Dict, List, Any, Optional

from .gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class ClarificationService:
    """
    Service for generating and processing clarifying questions.
    Identifies what information is needed for accurate pricing.
    """

    QUESTION_CATEGORIES = [
        'floor_level',       # Which floor for origin/destination
        'elevator',          # Elevator availability
        'building_access',   # Distance from truck to building
        'assembly',          # Items needing assembly/disassembly
        'fragile',           # Fragile item identification
        'special_handling',  # Heavy/oversized items
        'item_size',         # Size clarification for items
        'item_quantity',     # Quantity clarification
        'room_location',     # Room locations for items
    ]

    SYSTEM_PROMPT = """You are an expert moving consultant. Your task is to identify what
additional information is needed to provide an accurate moving quote.

Consider factors that affect pricing:
1. Floor levels (higher floors = more work)
2. Elevator availability (affects floor surcharge)
3. Distance from truck to building entrance
4. Items needing assembly or disassembly
5. Fragile items needing special handling
6. Heavy or oversized items
7. Number of rooms and their layout

Generate clear, friendly questions in both Hebrew and English.
Keep questions concise and focused on pricing-relevant information."""

    def __init__(self):
        self.client = GeminiClient()

    def generate_questions(
        self,
        order_data: Dict[str, Any],
        parsed_items: List[Dict],
        language: str = 'he'
    ) -> List[Dict[str, Any]]:
        """
        Generate clarifying questions based on order data.

        Args:
            order_data: Current order information
            parsed_items: Items parsed from description
            language: Preferred language for questions

        Returns:
            List of questions with options
        """
        if not self.client.is_available:
            return self._generate_default_questions(order_data)

        prompt = f"""Analyze this moving order and generate clarifying questions
that would affect pricing. Only ask essential questions.

Current order data:
{order_data}

Parsed items:
{parsed_items}

Generate questions in JSON format:
{{
    "questions": [
        {{
            "category": "floor_level",
            "target": "origin",
            "question_en": "What floor is your current apartment on?",
            "question_he": "באיזו קומה הדירה הנוכחית שלך?",
            "affects_price": true,
            "options": [
                {{"value": 0, "label_en": "Ground floor", "label_he": "קומת קרקע"}},
                {{"value": 1, "label_en": "1st floor", "label_he": "קומה 1"}},
                {{"value": 2, "label_en": "2nd floor", "label_he": "קומה 2"}},
                {{"value": 3, "label_en": "3rd floor", "label_he": "קומה 3"}},
                {{"value": 4, "label_en": "4th floor or higher", "label_he": "קומה 4 ומעלה"}}
            ],
            "input_type": "select"
        }}
    ]
}}

Question categories: {self.QUESTION_CATEGORIES}
Input types: select, boolean, number, text

Focus on:
1. Floor levels if not specified
2. Elevator availability
3. Assembly/disassembly needs for furniture
4. Any unclear item specifications
"""

        result = self.client.generate_json(prompt, self.SYSTEM_PROMPT)

        if result and 'questions' in result:
            return self._validate_questions(result['questions'])

        return self._generate_default_questions(order_data)

    def _validate_questions(
        self,
        questions: List[Dict]
    ) -> List[Dict]:
        """Validate and clean up generated questions."""
        validated = []

        for q in questions:
            # Ensure required fields
            if not q.get('question_en') or not q.get('question_he'):
                continue

            validated_q = {
                'category': q.get('category', 'general'),
                'target': q.get('target', ''),
                'question_en': q['question_en'],
                'question_he': q['question_he'],
                'affects_price': q.get('affects_price', True),
                'input_type': q.get('input_type', 'select'),
                'options': q.get('options', []),
                'related_item': q.get('related_item'),
            }

            validated.append(validated_q)

        return validated

    def _generate_default_questions(
        self,
        order_data: Dict
    ) -> List[Dict]:
        """Generate default questions when AI is not available."""
        questions = []

        # Check if floor info is missing
        if not order_data.get('origin_floor'):
            questions.append({
                'category': 'floor_level',
                'target': 'origin',
                'question_en': 'What floor is your current apartment on?',
                'question_he': 'באיזו קומה הדירה הנוכחית שלך?',
                'affects_price': True,
                'input_type': 'number',
                'options': [],
            })

        if not order_data.get('destination_floor'):
            questions.append({
                'category': 'floor_level',
                'target': 'destination',
                'question_en': 'What floor is the new apartment on?',
                'question_he': 'באיזו קומה הדירה החדשה?',
                'affects_price': True,
                'input_type': 'number',
                'options': [],
            })

        # Elevator questions
        if 'origin_has_elevator' not in order_data:
            questions.append({
                'category': 'elevator',
                'target': 'origin',
                'question_en': 'Is there an elevator at the current address?',
                'question_he': 'האם יש מעלית בכתובת הנוכחית?',
                'affects_price': True,
                'input_type': 'boolean',
                'options': [],
            })

        if 'destination_has_elevator' not in order_data:
            questions.append({
                'category': 'elevator',
                'target': 'destination',
                'question_en': 'Is there an elevator at the new address?',
                'question_he': 'האם יש מעלית בכתובת החדשה?',
                'affects_price': True,
                'input_type': 'boolean',
                'options': [],
            })

        return questions

    def process_answers(
        self,
        questions: List[Dict],
        answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process answers to clarifying questions and return updates.

        Args:
            questions: Original questions
            answers: Dict mapping question indices to answers

        Returns:
            Dict with updates to apply to order
        """
        updates = {}

        for i, question in enumerate(questions):
            answer = answers.get(str(i))
            if answer is None:
                continue

            category = question.get('category')
            target = question.get('target')

            if category == 'floor_level':
                if target == 'origin':
                    updates['origin_floor'] = int(answer)
                elif target == 'destination':
                    updates['destination_floor'] = int(answer)

            elif category == 'elevator':
                if target == 'origin':
                    updates['origin_has_elevator'] = bool(answer)
                elif target == 'destination':
                    updates['destination_has_elevator'] = bool(answer)

            elif category == 'building_access':
                if target == 'origin':
                    updates['origin_distance_to_truck'] = int(answer)
                elif target == 'destination':
                    updates['destination_distance_to_truck'] = int(answer)

            # Item-specific updates would be handled separately
            elif category in ['assembly', 'fragile', 'special_handling']:
                if 'item_updates' not in updates:
                    updates['item_updates'] = []
                updates['item_updates'].append({
                    'related_item': question.get('related_item'),
                    'category': category,
                    'value': answer
                })

        return updates

    def generate_item_questions(
        self,
        item: Dict[str, Any],
        language: str = 'he'
    ) -> List[Dict[str, Any]]:
        """
        Generate clarifying questions for a specific item.

        Args:
            item: Item data
            language: Preferred language

        Returns:
            List of questions about this item
        """
        if not self.client.is_available:
            return []

        prompt = f"""This item from a moving order needs clarification:

Item: {item}

Generate questions to clarify:
1. Size/dimensions if unclear
2. Assembly/disassembly needs
3. Whether it's fragile
4. Any special handling requirements

Return JSON with questions array, same format as before.
Only ask relevant questions for this specific item.
"""

        result = self.client.generate_json(prompt, self.SYSTEM_PROMPT)

        if result and 'questions' in result:
            questions = self._validate_questions(result['questions'])
            # Mark all questions as related to this item
            for q in questions:
                q['related_item'] = item.get('id') or item.get('name')
            return questions

        return []
