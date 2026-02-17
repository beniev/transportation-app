"""
Management command to seed the item catalog with attributes, options, and variants.
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.movers.models import (
    ItemCategory, ItemType, ItemAttribute, ItemAttributeOption,
    ItemCategoryAttribute, ItemTypeAttribute
)


class Command(BaseCommand):
    help = 'Seeds the item catalog with attributes, options, and variants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing catalog data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing catalog data...')
            ItemAttributeOption.objects.all().delete()
            ItemTypeAttribute.objects.all().delete()
            ItemCategoryAttribute.objects.all().delete()
            ItemAttribute.objects.all().delete()
            ItemType.objects.filter(is_custom=False).delete()
            ItemCategory.objects.all().delete()

        self.stdout.write('Seeding item catalog...')

        # Create attributes
        attributes = self._create_attributes()

        # Create categories with their attributes
        categories = self._create_categories(attributes)

        # Create items
        self._create_items(categories, attributes)

        self.stdout.write(self.style.SUCCESS('Item catalog seeded successfully!'))

    def _create_attributes(self):
        """Create all item attributes."""
        self.stdout.write('Creating attributes...')

        attributes_data = [
            {
                'code': 'door_count',
                'name_en': 'Door Count',
                'name_he': 'מספר דלתות',
                'input_type': 'select',
                'question_en': 'How many doors?',
                'question_he': 'כמה דלתות?',
                'options': [
                    ('2', '2 doors', '2 דלתות'),
                    ('3', '3 doors', '3 דלתות'),
                    ('4', '4 doors', '4 דלתות'),
                    ('5', '5 doors', '5 דלתות'),
                    ('6', '6 doors', '6 דלתות'),
                ]
            },
            {
                'code': 'bed_size',
                'name_en': 'Bed Size',
                'name_he': 'גודל מיטה',
                'input_type': 'select',
                'question_en': 'What is the bed size?',
                'question_he': 'מה גודל המיטה?',
                'options': [
                    ('single', 'Single (80-90cm)', 'יחיד (80-90 ס"מ)'),
                    ('single_plus', 'Single Plus (120cm)', 'וחצי (120 ס"מ)'),
                    ('double', 'Double (140cm)', 'זוגית רגילה (140 ס"מ)'),
                    ('queen', 'Queen (160cm)', 'זוגית רחבה (160 ס"מ)'),
                    ('king', 'King (180-200cm)', 'קינג (180-200 ס"מ)'),
                ]
            },
            {
                'code': 'sofa_type',
                'name_en': 'Sofa Type',
                'name_he': 'סוג ספה',
                'input_type': 'select',
                'question_en': 'What type of sofa?',
                'question_he': 'איזה סוג ספה?',
                'options': [
                    ('2_seater', '2-seater', 'דו מושבית'),
                    ('3_seater', '3-seater', 'תלת מושבית'),
                    ('corner_small', 'Small L-shaped', 'פינתית קטנה'),
                    ('corner_large', 'Large L-shaped', 'פינתית גדולה'),
                    ('modular', 'Modular/Sectional', 'מודולרית'),
                ]
            },
            {
                'code': 'table_seats',
                'name_en': 'Number of Seats',
                'name_he': 'מספר מקומות ישיבה',
                'input_type': 'select',
                'question_en': 'How many seats?',
                'question_he': 'לכמה סועדים?',
                'options': [
                    ('4', 'Up to 4', 'עד 4'),
                    ('6', '5-6', '5-6'),
                    ('8', '7-8', '7-8'),
                    ('10', '9-10', '9-10'),
                    ('12+', '12 or more', '12 ומעלה'),
                ]
            },
            {
                'code': 'fridge_size',
                'name_en': 'Refrigerator Size',
                'name_he': 'גודל מקרר',
                'input_type': 'select',
                'question_en': 'What size refrigerator?',
                'question_he': 'מה גודל המקרר?',
                'options': [
                    ('mini', 'Mini bar (up to 100L)', 'מיני בר (עד 100 ליטר)'),
                    ('small', 'Small (up to 300L)', 'קטן (עד 300 ליטר)'),
                    ('medium', 'Medium (300-500L)', 'בינוני (300-500 ליטר)'),
                    ('large', 'Large (500-700L)', 'גדול (500-700 ליטר)'),
                    ('side_by_side', 'Side-by-side / French door', 'דלת ליד דלת / צרפתי'),
                ]
            },
            {
                'code': 'drawer_count',
                'name_en': 'Drawer Count',
                'name_he': 'מספר מגירות',
                'input_type': 'select',
                'question_en': 'How many drawers?',
                'question_he': 'כמה מגירות?',
                'options': [
                    ('1', '1 drawer', 'מגירה אחת'),
                    ('2', '2 drawers', '2 מגירות'),
                    ('3', '3 drawers', '3 מגירות'),
                    ('4', '4 drawers', '4 מגירות'),
                    ('5', '5 drawers', '5 מגירות'),
                    ('6+', '6 or more', '6 ומעלה'),
                ]
            },
            {
                'code': 'size_category',
                'name_en': 'Size',
                'name_he': 'גודל',
                'input_type': 'select',
                'question_en': 'What size?',
                'question_he': 'מה הגודל?',
                'options': [
                    ('small', 'Small', 'קטן'),
                    ('medium', 'Medium', 'בינוני'),
                    ('large', 'Large', 'גדול'),
                    ('xl', 'Extra Large', 'גדול במיוחד'),
                ]
            },
            {
                'code': 'tv_size',
                'name_en': 'Screen Size',
                'name_he': 'גודל מסך',
                'input_type': 'select',
                'question_en': 'What is the screen size?',
                'question_he': 'מה גודל המסך?',
                'options': [
                    ('small', 'Up to 42"', 'עד 42 אינץ\''),
                    ('medium', '43-55"', '43-55 אינץ\''),
                    ('large', '56-70"', '56-70 אינץ\''),
                    ('xl', '75" and above', '75 אינץ\' ומעלה'),
                ]
            },
            {
                'code': 'washer_type',
                'name_en': 'Loading Type',
                'name_he': 'סוג טעינה',
                'input_type': 'select',
                'question_en': 'What type of loading?',
                'question_he': 'איזה סוג פתח?',
                'options': [
                    ('top', 'Top loading', 'פתח עליון'),
                    ('front', 'Front loading', 'פתח קדמי'),
                ]
            },
            {
                'code': 'ac_type',
                'name_en': 'AC Type',
                'name_he': 'סוג מזגן',
                'input_type': 'select',
                'question_en': 'What type of air conditioner?',
                'question_he': 'איזה סוג מזגן?',
                'options': [
                    ('window', 'Window unit', 'חלון'),
                    ('split', 'Split/Wall unit', 'עילי/ספליט'),
                    ('floor', 'Floor/Portable', 'רצפתי/נייד'),
                    ('central', 'Mini central', 'מיני מרכזי'),
                ]
            },
            {
                'code': 'oven_type',
                'name_en': 'Oven Type',
                'name_he': 'סוג תנור',
                'input_type': 'select',
                'question_en': 'What type of oven?',
                'question_he': 'איזה סוג תנור?',
                'options': [
                    ('builtin', 'Built-in', 'בנוי'),
                    ('standalone', 'Freestanding', 'עומד'),
                    ('wide', 'Wide (90cm)', 'רחב (90 ס"מ)'),
                ]
            },
            {
                'code': 'piano_type',
                'name_en': 'Piano Type',
                'name_he': 'סוג פסנתר',
                'input_type': 'select',
                'question_en': 'What type of piano?',
                'question_he': 'איזה סוג פסנתר?',
                'options': [
                    ('upright', 'Upright', 'זקוף'),
                    ('grand', 'Grand', 'כנף'),
                    ('digital', 'Digital/Electric', 'חשמלי'),
                ]
            },
            {
                'code': 'wardrobe_type',
                'name_en': 'Wardrobe Type',
                'name_he': 'סוג ארון',
                'input_type': 'select',
                'question_en': 'What type of wardrobe?',
                'question_he': 'איזה סוג ארון?',
                'options': [
                    ('hinged', 'Hinged doors', 'דלתות רגילות'),
                    ('sliding', 'Sliding doors', 'דלתות הזזה'),
                    ('walkin', 'Walk-in/Built-in', 'מובנה/הליכה'),
                ]
            },
        ]

        attributes = {}
        for idx, data in enumerate(attributes_data):
            attr, created = ItemAttribute.objects.update_or_create(
                code=data['code'],
                defaults={
                    'name_en': data['name_en'],
                    'name_he': data['name_he'],
                    'input_type': data['input_type'],
                    'question_en': data['question_en'],
                    'question_he': data['question_he'],
                    'display_order': idx,
                    'is_active': True,
                }
            )
            attributes[data['code']] = attr

            for opt_idx, (value, name_en, name_he) in enumerate(data['options']):
                ItemAttributeOption.objects.update_or_create(
                    attribute=attr,
                    value=value,
                    defaults={
                        'name_en': name_en,
                        'name_he': name_he,
                        'display_order': opt_idx,
                        'is_active': True,
                    }
                )

        self.stdout.write(f'  Created {len(attributes)} attributes')
        return attributes

    def _create_categories(self, attributes):
        """Create categories with their attribute links."""
        self.stdout.write('Creating categories...')

        categories_data = [
            {
                'name_en': 'Bedroom',
                'name_he': 'חדר שינה',
                'icon': 'bed',
                'attributes': ['door_count', 'bed_size', 'drawer_count', 'wardrobe_type', 'size_category'],
            },
            {
                'name_en': 'Living Room',
                'name_he': 'סלון',
                'icon': 'sofa',
                'attributes': ['sofa_type', 'size_category'],
            },
            {
                'name_en': 'Dining Room',
                'name_he': 'פינת אוכל',
                'icon': 'utensils',
                'attributes': ['table_seats', 'size_category'],
            },
            {
                'name_en': 'Kitchen',
                'name_he': 'מטבח',
                'icon': 'kitchen',
                'attributes': ['size_category'],
            },
            {
                'name_en': 'Kids Room',
                'name_he': 'חדר ילדים',
                'icon': 'child',
                'attributes': ['bed_size', 'door_count', 'size_category'],
            },
            {
                'name_en': 'Office',
                'name_he': 'משרד/עבודה',
                'icon': 'briefcase',
                'attributes': ['size_category', 'drawer_count'],
            },
            {
                'name_en': 'Large Appliances',
                'name_he': 'מוצרי חשמל גדולים',
                'icon': 'plug',
                'attributes': ['fridge_size', 'washer_type', 'oven_type'],
            },
            {
                'name_en': 'Small Appliances',
                'name_he': 'מוצרי חשמל קטנים',
                'icon': 'blender',
                'attributes': ['size_category'],
            },
            {
                'name_en': 'Climate Control',
                'name_he': 'מיזוג ואקלים',
                'icon': 'snowflake',
                'attributes': ['ac_type', 'size_category'],
            },
            {
                'name_en': 'Electronics',
                'name_he': 'אלקטרוניקה',
                'icon': 'tv',
                'attributes': ['tv_size', 'size_category'],
            },
            {
                'name_en': 'Outdoor & Garden',
                'name_he': 'גינה ומרפסת',
                'icon': 'tree',
                'attributes': ['size_category'],
            },
            {
                'name_en': 'Fitness',
                'name_he': 'כושר וספורט',
                'icon': 'dumbbell',
                'attributes': ['size_category'],
            },
            {
                'name_en': 'Special Items',
                'name_he': 'פריטים מיוחדים',
                'icon': 'star',
                'attributes': ['piano_type', 'size_category'],
            },
            {
                'name_en': 'Storage',
                'name_he': 'אחסון',
                'icon': 'box',
                'attributes': ['size_category'],
            },
            {
                'name_en': 'Bathroom',
                'name_he': 'אמבטיה',
                'icon': 'bath',
                'attributes': ['size_category'],
            },
        ]

        categories = {}
        for idx, data in enumerate(categories_data):
            cat, created = ItemCategory.objects.update_or_create(
                name_en=data['name_en'],
                defaults={
                    'name_he': data['name_he'],
                    'icon': data['icon'],
                    'display_order': idx,
                    'is_active': True,
                }
            )
            categories[data['name_en']] = cat

            for attr_idx, attr_code in enumerate(data['attributes']):
                if attr_code in attributes:
                    ItemCategoryAttribute.objects.update_or_create(
                        category=cat,
                        attribute=attributes[attr_code],
                        defaults={
                            'is_required': True,
                            'display_order': attr_idx,
                        }
                    )

        self.stdout.write(f'  Created {len(categories)} categories')
        return categories

    def _create_items(self, categories, attributes):
        """Create all items - both generic (with variants) and simple items."""
        self.stdout.write('Creating items...')

        item_count = 0
        variant_count = 0

        # ===== BEDROOM =====
        bedroom = categories['Bedroom']

        # Wardrobe - Generic with variants (only door_count attribute)
        wardrobe = self._create_generic_item(
            category=bedroom,
            name_en='Clothes Closet',
            name_he='ארון בגדים',
            weight_class='heavy',
            requires_assembly=True,
            base_price=Decimal('300.00'),
            attributes=[attributes['door_count']],
        )
        item_count += 1
        for doors, price in [('2', 280), ('3', 380), ('4', 480), ('5', 580), ('6', 680)]:
            self._create_variant(wardrobe, {'door_count': doors},
                f'Closet {doors} Doors', f'ארון {doors} דלתות', Decimal(price))
            variant_count += 1

        # Sliding Wardrobe (only door_count attribute)
        sliding_wardrobe = self._create_generic_item(
            category=bedroom,
            name_en='Sliding Door Closet',
            name_he='ארון הזזה',
            weight_class='extra_heavy',
            requires_assembly=True,
            base_price=Decimal('450.00'),
            attributes=[attributes['door_count']],
        )
        item_count += 1
        for doors, price in [('2', 450), ('3', 550), ('4', 650)]:
            self._create_variant(sliding_wardrobe, {'door_count': doors},
                f'Sliding Closet {doors} Doors', f'ארון הזזה {doors} דלתות', Decimal(price))
            variant_count += 1

        # Bed - Generic with variants (only bed_size attribute)
        bed = self._create_generic_item(
            category=bedroom,
            name_en='Bed Frame',
            name_he='מיטה',
            weight_class='heavy',
            requires_assembly=True,
            base_price=Decimal('200.00'),
            attributes=[attributes['bed_size']],
        )
        item_count += 1
        for size, name_he, price in [
            ('single', 'מיטת יחיד', 180),
            ('single_plus', 'מיטת נוער', 220),
            ('double', 'מיטה זוגית', 300),
            ('queen', 'מיטה זוגית רחבה', 380),
            ('king', 'מיטת קינג', 450),
        ]:
            self._create_variant(bed, {'bed_size': size},
                f'Bed {size.replace("_", " ").title()}', name_he, Decimal(price))
            variant_count += 1

        # Dresser - Generic with variants (only drawer_count attribute)
        dresser = self._create_generic_item(
            category=bedroom,
            name_en='Dresser',
            name_he='שידת מגירות',
            weight_class='medium',
            requires_assembly=False,
            base_price=Decimal('150.00'),
            attributes=[attributes['drawer_count']],
        )
        item_count += 1
        for drawers, name_he, price in [
            ('1', 'שידה מגירה אחת', 80),
            ('2', 'שידה 2 מגירות', 100),
            ('3', 'שידה 3 מגירות', 130),
            ('4', 'שידה 4 מגירות', 160),
            ('5', 'שידה 5 מגירות', 190),
            ('6+', 'שידה 6 מגירות ומעלה', 220),
        ]:
            self._create_variant(dresser, {'drawer_count': drawers},
                f'Dresser {drawers} Drawers', name_he, Decimal(price))
            variant_count += 1

        # Simple bedroom items
        simple_bedroom = [
            ('Nightstand', 'שידת לילה', 'light', False, 60),
            ('Mattress Single', 'מזרן יחיד', 'medium', False, 80),
            ('Mattress Double', 'מזרן זוגי', 'heavy', False, 150),
            ('Vanity Table', 'שולחן איפור', 'medium', True, 120),
            ('Mirror Large', 'מראה גדולה', 'medium', False, 80, True),
            ('Clothes Rack', 'מתלה בגדים', 'light', False, 50),
            ('Blanket Box', 'ארגז מצעים', 'medium', False, 70),
        ]
        for item in simple_bedroom:
            self._create_simple_item(bedroom, *item)
            item_count += 1

        # ===== LIVING ROOM =====
        living = categories['Living Room']

        # Sofa - Generic with variants (only sofa_type attribute)
        sofa = self._create_generic_item(
            category=living,
            name_en='Sofa',
            name_he='ספה',
            weight_class='heavy',
            requires_assembly=False,
            base_price=Decimal('250.00'),
            attributes=[attributes['sofa_type']],
        )
        item_count += 1
        for stype, name_he, price in [
            ('2_seater', 'ספה דו מושבית', 220),
            ('3_seater', 'ספה תלת מושבית', 300),
            ('corner_small', 'ספה פינתית קטנה', 400),
            ('corner_large', 'ספה פינתית גדולה', 550),
            ('modular', 'ספה מודולרית', 600),
        ]:
            self._create_variant(sofa, {'sofa_type': stype},
                f'Sofa {stype.replace("_", " ").title()}', name_he, Decimal(price))
            variant_count += 1

        # TV Cabinet - Generic (only size_category attribute)
        tv_cabinet = self._create_generic_item(
            category=living,
            name_en='Media Console',
            name_he='מזנון טלוויזיה',
            weight_class='heavy',
            requires_assembly=True,
            base_price=Decimal('180.00'),
            attributes=[attributes['size_category']],
        )
        item_count += 1
        for size, name_he, price in [
            ('small', 'מזנון קטן', 120),
            ('medium', 'מזנון בינוני', 180),
            ('large', 'מזנון גדול', 250),
        ]:
            self._create_variant(tv_cabinet, {'size_category': size},
                f'Media Console {size.title()}', name_he, Decimal(price))
            variant_count += 1

        # Bookshelf - Generic (only size_category attribute)
        bookshelf = self._create_generic_item(
            category=living,
            name_en='Bookshelf',
            name_he='ספרייה',
            weight_class='heavy',
            requires_assembly=True,
            base_price=Decimal('200.00'),
            attributes=[attributes['size_category']],
        )
        item_count += 1
        for size, name_he, price in [
            ('small', 'כוננית קטנה', 120),
            ('medium', 'ספרייה בינונית', 200),
            ('large', 'ספרייה גדולה', 300),
            ('xl', 'ספרייה קיר', 400),
        ]:
            self._create_variant(bookshelf, {'size_category': size},
                f'Bookshelf {size.title()}', name_he, Decimal(price))
            variant_count += 1

        # Simple living room items
        simple_living = [
            ('Armchair', 'כורסה', 'medium', False, 100),
            ('Recliner', 'כורסת טלוויזיה', 'heavy', False, 150),
            ('Coffee Table', 'שולחן סלון', 'medium', False, 80),
            ('Side Table', 'שולחן צד', 'light', False, 40),
            ('Display Cabinet', 'ויטרינה', 'heavy', True, 200, True),
            ('Floor Lamp', 'מנורת עמידה', 'light', False, 40),
            ('Ottoman', 'הדום', 'light', False, 50),
            ('Bean Bag', 'פוף', 'light', False, 40),
            ('Rug Large', 'שטיח גדול', 'medium', False, 60),
            ('Rug Small', 'שטיח קטן', 'light', False, 30),
            ('Wall Unit', 'קיר מדפים', 'heavy', True, 250),
        ]
        for item in simple_living:
            self._create_simple_item(living, *item)
            item_count += 1

        # ===== DINING ROOM =====
        dining = categories['Dining Room']

        # Dining Table - Generic (only table_seats attribute)
        dining_table = self._create_generic_item(
            category=dining,
            name_en='Dining Table',
            name_he='שולחן אוכל',
            weight_class='heavy',
            requires_assembly=True,
            base_price=Decimal('200.00'),
            attributes=[attributes['table_seats']],
        )
        item_count += 1
        for seats, name_he, price in [
            ('4', 'שולחן ל-4', 180),
            ('6', 'שולחן ל-6', 250),
            ('8', 'שולחן ל-8', 350),
            ('10', 'שולחן ל-10', 450),
            ('12+', 'שולחן ל-12+', 550),
        ]:
            self._create_variant(dining_table, {'table_seats': seats},
                f'Dining Table {seats} Seats', name_he, Decimal(price))
            variant_count += 1

        # Simple dining items
        simple_dining = [
            ('Dining Chair', 'כיסא אוכל', 'light', False, 35),
            ('Bar Stool', 'כיסא בר', 'light', False, 40),
            ('Sideboard', 'מזנון אוכל', 'heavy', True, 200),
            ('China Cabinet', 'ארון כלים', 'heavy', True, 250, True),
            ('Bar Cart', 'עגלת משקאות', 'medium', False, 80),
        ]
        for item in simple_dining:
            self._create_simple_item(dining, *item)
            item_count += 1

        # ===== KITCHEN =====
        kitchen = categories['Kitchen']
        simple_kitchen = [
            ('Kitchen Island', 'אי מטבח', 'extra_heavy', True, 350),
            ('Kitchen Cart', 'עגלת שירות', 'medium', False, 100),
            ('Kitchen Table', 'שולחן מטבח', 'medium', True, 120),
            ('High Chair', 'כיסא גבוה', 'light', False, 50),
            ('Spice Rack', 'ארונית תבלינים', 'light', True, 60),
            ('Kitchen Cabinet', 'ארון מטבח', 'heavy', True, 180),
            ('Pantry Unit', 'ארון שירות מטבח', 'heavy', True, 200),
        ]
        for item in simple_kitchen:
            self._create_simple_item(kitchen, *item)
            item_count += 1

        # ===== KIDS ROOM =====
        kids = categories['Kids Room']

        # Kids Bed - Generic (only bed_size attribute)
        kids_bed = self._create_generic_item(
            category=kids,
            name_en='Kids Bed',
            name_he='מיטת ילדים',
            weight_class='medium',
            requires_assembly=True,
            base_price=Decimal('180.00'),
            attributes=[attributes['bed_size']],
        )
        item_count += 1
        for size, name_he, price in [
            ('single', 'מיטת ילדים', 150),
            ('single_plus', 'מיטת נוער', 200),
        ]:
            self._create_variant(kids_bed, {'bed_size': size},
                f'Kids Bed {size.replace("_", " ").title()}', name_he, Decimal(price))
            variant_count += 1

        simple_kids = [
            ('Bunk Bed', 'מיטת קומותיים', 'heavy', True, 350),
            ('Kids Wardrobe', 'ארון ילדים', 'heavy', True, 280),
            ('Study Desk', 'שולחן כתיבה', 'medium', True, 150),
            ('Desk Chair', 'כיסא כתיבה', 'light', False, 60),
            ('Toy Box', 'ארגז צעצועים', 'medium', False, 80),
            ('Kids Shelf', 'כוורת ילדים', 'medium', True, 120),
            ('Changing Table', 'שידת החתלה', 'medium', True, 150),
            ('Crib', 'מיטת תינוק', 'medium', True, 180),
            ('Baby Dresser', 'שידת תינוק', 'medium', False, 150),
        ]
        for item in simple_kids:
            self._create_simple_item(kids, *item)
            item_count += 1

        # ===== OFFICE =====
        office = categories['Office']
        simple_office = [
            ('Computer Desk', 'שולחן מחשב', 'medium', True, 130),
            ('Executive Desk', 'שולחן עבודה גדול', 'heavy', True, 200),
            ('Office Chair', 'כיסא משרדי', 'medium', False, 80),
            ('Executive Chair', 'כורסת מנהלים', 'medium', False, 120),
            ('Filing Cabinet', 'ארון תיקים', 'heavy', False, 150),
            ('Drawer Unit', 'מגירון', 'medium', False, 80),
            ('Office Bookshelf', 'כוננית משרד', 'heavy', True, 180),
            ('Safe Small', 'כספת קטנה', 'extra_heavy', False, 200),
            ('Safe Large', 'כספת גדולה', 'extra_heavy', False, 350),
            ('Whiteboard', 'לוח מחיק', 'light', False, 40),
        ]
        for item in simple_office:
            self._create_simple_item(office, *item)
            item_count += 1

        # ===== LARGE APPLIANCES =====
        appliances = categories['Large Appliances']

        # Refrigerator - Generic (only fridge_size attribute)
        fridge = self._create_generic_item(
            category=appliances,
            name_en='Refrigerator',
            name_he='מקרר',
            weight_class='extra_heavy',
            requires_assembly=False,
            requires_special_handling=True,
            base_price=Decimal('200.00'),
            attributes=[attributes['fridge_size']],
        )
        item_count += 1
        for size, name_he, price in [
            ('mini', 'מקרר מיני בר', 100),
            ('small', 'מקרר קטן', 180),
            ('medium', 'מקרר בינוני', 250),
            ('large', 'מקרר גדול', 350),
            ('side_by_side', 'מקרר דלת ליד דלת', 450),
        ]:
            self._create_variant(fridge, {'fridge_size': size},
                f'Refrigerator {size.replace("_", " ").title()}', name_he, Decimal(price))
            variant_count += 1

        # Washing Machine - Generic (only washer_type attribute)
        washer = self._create_generic_item(
            category=appliances,
            name_en='Washing Machine',
            name_he='מכונת כביסה',
            weight_class='extra_heavy',
            requires_assembly=False,
            base_price=Decimal('150.00'),
            attributes=[attributes['washer_type']],
        )
        item_count += 1
        for wtype, name_he, price in [
            ('top', 'מכונת כביסה פתח עליון', 130),
            ('front', 'מכונת כביסה פתח קדמי', 160),
        ]:
            self._create_variant(washer, {'washer_type': wtype},
                f'Washer {wtype.title()} Load', name_he, Decimal(price))
            variant_count += 1

        # Oven - Generic (only oven_type attribute)
        oven = self._create_generic_item(
            category=appliances,
            name_en='Oven',
            name_he='תנור אפייה',
            weight_class='heavy',
            requires_assembly=False,
            base_price=Decimal('150.00'),
            attributes=[attributes['oven_type']],
        )
        item_count += 1
        for otype, name_he, price in [
            ('builtin', 'תנור בנוי', 120),
            ('standalone', 'תנור עומד', 180),
            ('wide', 'תנור רחב', 220),
        ]:
            self._create_variant(oven, {'oven_type': otype},
                f'Oven {otype.title()}', name_he, Decimal(price))
            variant_count += 1

        simple_appliances = [
            ('Dryer', 'מייבש כביסה', 'extra_heavy', False, 160),
            ('Dishwasher', 'מדיח כלים', 'extra_heavy', False, 180),
            ('Freezer', 'מקפיא', 'extra_heavy', False, 200),
            ('Cooktop', 'כיריים', 'heavy', False, 100),
            ('Range Hood', 'קולט אדים', 'medium', False, 80),
            ('Washer Dryer Combo', 'מכונת כביסה ומייבש', 'extra_heavy', False, 200),
        ]
        for item in simple_appliances:
            self._create_simple_item(appliances, *item)
            item_count += 1

        # ===== SMALL APPLIANCES =====
        small_app = categories['Small Appliances']
        simple_small = [
            ('Microwave', 'מיקרוגל', 'medium', False, 50),
            ('Toaster Oven', 'טוסטר אובן', 'light', False, 40),
            ('Coffee Machine', 'מכונת קפה', 'light', False, 40),
            ('Water Dispenser Floor', 'מתקן מים עומד', 'heavy', False, 100),
            ('Water Dispenser Counter', 'מתקן מים שולחני', 'medium', False, 60),
            ('Vacuum Cleaner', 'שואב אבק', 'medium', False, 50),
            ('Robot Vacuum', 'שואב רובוט', 'light', False, 40),
            ('Air Fryer', 'סיר טיגון', 'light', False, 35),
            ('Mixer Stand', 'מיקסר עומד', 'medium', False, 50),
            ('Espresso Machine', 'מכונת אספרסו', 'medium', False, 60),
        ]
        for item in simple_small:
            self._create_simple_item(small_app, *item)
            item_count += 1

        # ===== CLIMATE =====
        climate = categories['Climate Control']

        # AC - Generic (only ac_type attribute)
        ac = self._create_generic_item(
            category=climate,
            name_en='Air Conditioner',
            name_he='מזגן',
            weight_class='heavy',
            requires_assembly=False,
            requires_special_handling=True,
            base_price=Decimal('180.00'),
            attributes=[attributes['ac_type']],
        )
        item_count += 1
        for actype, name_he, price in [
            ('window', 'מזגן חלון', 120),
            ('split', 'מזגן עילי', 200),
            ('floor', 'מזגן נייד', 150),
            ('central', 'מיני מרכזי', 280),
        ]:
            self._create_variant(ac, {'ac_type': actype},
                f'AC {actype.title()}', name_he, Decimal(price))
            variant_count += 1

        simple_climate = [
            ('Fan Standing', 'מאוורר עמידה', 'light', False, 40),
            ('Fan Ceiling', 'מאוורר תקרה', 'medium', False, 80),
            ('Heater Electric', 'תנור חימום', 'medium', False, 60),
            ('Radiator', 'רדיאטור', 'heavy', False, 100),
            ('Fireplace Electric', 'אח חשמלי', 'heavy', False, 150),
            ('Dehumidifier', 'מסיר לחות', 'medium', False, 60),
            ('Air Purifier', 'מטהר אוויר', 'light', False, 50),
        ]
        for item in simple_climate:
            self._create_simple_item(climate, *item)
            item_count += 1

        # ===== ELECTRONICS =====
        electronics = categories['Electronics']

        # TV - Generic (only tv_size attribute)
        tv = self._create_generic_item(
            category=electronics,
            name_en='Television',
            name_he='טלוויזיה',
            weight_class='medium',
            requires_assembly=False,
            is_fragile=True,
            base_price=Decimal('100.00'),
            attributes=[attributes['tv_size']],
        )
        item_count += 1
        for size, name_he, price in [
            ('small', 'טלוויזיה עד 42"', 80),
            ('medium', 'טלוויזיה 43-55"', 120),
            ('large', 'טלוויזיה 56-70"', 180),
            ('xl', 'טלוויזיה 75"+', 250),
        ]:
            self._create_variant(tv, {'tv_size': size},
                f'TV {size.title()}', name_he, Decimal(price))
            variant_count += 1

        simple_electronics = [
            ('Computer Desktop', 'מחשב שולחני', 'medium', False, 80),
            ('Monitor', 'מסך מחשב', 'light', False, 50, True),
            ('Printer', 'מדפסת', 'medium', False, 50),
            ('Printer Large', 'מדפסת משרדית', 'heavy', False, 100),
            ('Projector', 'מקרן', 'light', False, 60, True),
            ('Home Theater', 'מערכת קולנוע', 'heavy', False, 150),
            ('Stereo System', 'מערכת סטריאו', 'medium', False, 100),
            ('Gaming Console', 'קונסולת משחקים', 'light', False, 40),
            ('Speaker Floor', 'רמקול רצפתי', 'medium', False, 60),
        ]
        for item in simple_electronics:
            self._create_simple_item(electronics, *item)
            item_count += 1

        # ===== OUTDOOR =====
        outdoor = categories['Outdoor & Garden']
        simple_outdoor = [
            ('Garden Table', 'שולחן גינה', 'heavy', False, 120),
            ('Garden Chair', 'כיסא גינה', 'light', False, 30),
            ('Garden Set', 'סט ישיבה גינה', 'heavy', False, 250),
            ('Lounge Chair', 'מיטת שיזוף', 'medium', False, 80),
            ('Umbrella Large', 'שמשייה גדולה', 'medium', False, 60),
            ('BBQ Grill', 'גריל/מנגל', 'heavy', False, 150),
            ('BBQ Built-in', 'מנגל בנוי', 'extra_heavy', False, 300),
            ('Planter Large', 'עציץ גדול', 'heavy', False, 80),
            ('Swing Chair', 'נדנדת גינה', 'heavy', True, 180),
            ('Outdoor Storage', 'ארון גינה', 'heavy', True, 200),
            ('Hammock', 'ערסל', 'light', False, 40),
            ('Trampoline', 'טרמפולינה', 'heavy', True, 200),
            ('Pool Equipment', 'ציוד בריכה', 'heavy', False, 150),
        ]
        for item in simple_outdoor:
            self._create_simple_item(outdoor, *item)
            item_count += 1

        # ===== FITNESS =====
        fitness = categories['Fitness']
        simple_fitness = [
            ('Treadmill', 'הליכון', 'extra_heavy', False, 300),
            ('Exercise Bike', 'אופני כושר', 'heavy', False, 150),
            ('Elliptical', 'אליפטיקל', 'extra_heavy', False, 280),
            ('Weight Bench', 'ספסל משקולות', 'heavy', True, 120),
            ('Weight Rack', 'מתקן משקולות', 'extra_heavy', True, 200),
            ('Rowing Machine', 'מכונת חתירה', 'heavy', False, 180),
            ('Home Gym', 'מולטי טריינר', 'extra_heavy', True, 400),
            ('Yoga Mat', 'מזרן כושר', 'light', False, 20),
            ('Punching Bag', 'שק איגרוף', 'heavy', True, 100),
            ('Spin Bike', 'אופני ספינינג', 'heavy', False, 150),
        ]
        for item in simple_fitness:
            self._create_simple_item(fitness, *item)
            item_count += 1

        # ===== SPECIAL ITEMS =====
        special = categories['Special Items']

        # Piano - Generic (only piano_type attribute)
        piano = self._create_generic_item(
            category=special,
            name_en='Piano',
            name_he='פסנתר',
            weight_class='extra_heavy',
            requires_assembly=False,
            requires_special_handling=True,
            base_price=Decimal('600.00'),
            attributes=[attributes['piano_type']],
        )
        item_count += 1
        for ptype, name_he, price in [
            ('upright', 'פסנתר זקוף', 500),
            ('grand', 'פסנתר כנף', 1200),
            ('digital', 'פסנתר חשמלי', 200),
        ]:
            self._create_variant(piano, {'piano_type': ptype},
                f'Piano {ptype.title()}', name_he, Decimal(price))
            variant_count += 1

        simple_special = [
            ('Pool Table', 'שולחן ביליארד', 'extra_heavy', True, 600),
            ('Snooker Table', 'שולחן סנוקר', 'extra_heavy', True, 700),
            ('Ping Pong Table', 'שולחן טניס', 'heavy', True, 200),
            ('Foosball Table', 'שולחן כדורגל', 'heavy', False, 150),
            ('Aquarium Large', 'אקווריום גדול', 'extra_heavy', False, 300, True),
            ('Aquarium Small', 'אקווריום קטן', 'medium', False, 100, True),
            ('Wine Cabinet', 'ארון יין', 'heavy', False, 200),
            ('Grandfather Clock', 'שעון עומד', 'heavy', False, 250, True),
            ('Antique Furniture', 'רהיט עתיק', 'heavy', False, 300, True),
            ('Artwork Large', 'יצירת אמנות גדולה', 'medium', False, 150, True),
            ('Chandelier', 'נברשת', 'medium', True, 200, True),
            ('Statue', 'פסל', 'heavy', False, 150, True),
            ('Sewing Machine', 'מכונת תפירה', 'medium', False, 80),
            ('Massage Chair', 'כורסת עיסוי', 'extra_heavy', False, 250),
        ]
        for item in simple_special:
            self._create_simple_item(special, *item)
            item_count += 1

        # ===== STORAGE =====
        storage = categories['Storage']
        simple_storage = [
            ('Storage Shelf', 'מדפים', 'medium', True, 80),
            ('Metal Shelf Unit', 'מדפים מתכת', 'heavy', True, 120),
            ('Storage Cabinet', 'ארון אחסון', 'heavy', True, 150),
            ('Plastic Bins', 'ארגזי פלסטיק', 'light', False, 30),
            ('Boxes Set', 'סט קרטונים', 'light', False, 30),
            ('Wardrobe Box', 'קרטון לבגדים', 'light', False, 40),
            ('Tool Cabinet', 'ארון כלים', 'heavy', False, 150),
            ('Shoe Rack', 'מתקן נעליים', 'light', True, 50),
            ('Coat Rack', 'מתלה מעילים', 'light', False, 40),
        ]
        for item in simple_storage:
            self._create_simple_item(storage, *item)
            item_count += 1

        # ===== BATHROOM =====
        bathroom = categories['Bathroom']
        simple_bathroom = [
            ('Bathroom Cabinet', 'ארון אמבטיה', 'heavy', True, 150),
            ('Bathroom Mirror', 'מראת אמבטיה', 'medium', True, 80, True),
            ('Towel Cabinet', 'ארון מגבות', 'medium', True, 100),
            ('Laundry Basket Large', 'סל כביסה גדול', 'light', False, 30),
            ('Bathroom Shelf', 'מדף אמבטיה', 'light', True, 40),
            ('Bathroom Scale', 'משקל אמבטיה', 'light', False, 20),
        ]
        for item in simple_bathroom:
            self._create_simple_item(bathroom, *item)
            item_count += 1

        self.stdout.write(f'  Created {item_count} items and {variant_count} variants')

    def _create_generic_item(self, category, name_en, name_he, weight_class,
                            requires_assembly, base_price, is_fragile=False,
                            requires_special_handling=False, attributes=None):
        """Create a generic item that has variants with specific attributes."""
        item, _ = ItemType.objects.update_or_create(
            name_en=name_en,
            category=category,
            is_generic=True,
            parent_type__isnull=True,
            defaults={
                'name_he': name_he,
                'weight_class': weight_class,
                'requires_assembly': requires_assembly,
                'is_fragile': is_fragile,
                'requires_special_handling': requires_special_handling,
                'default_base_price': base_price,
                'is_custom': False,
                'is_active': True,
            }
        )

        # Create item-type-specific attribute links
        if attributes:
            # Clear existing attributes for this item
            ItemTypeAttribute.objects.filter(item_type=item).delete()
            for idx, attr in enumerate(attributes):
                ItemTypeAttribute.objects.create(
                    item_type=item,
                    attribute=attr,
                    is_required=True,
                    display_order=idx,
                )

        return item

    def _create_variant(self, parent, attribute_values, name_en, name_he, price):
        """Create a variant of a generic item."""
        ItemType.objects.update_or_create(
            name_en=name_en,
            parent_type=parent,
            defaults={
                'name_he': name_he,
                'category': parent.category,
                'attribute_values': attribute_values,
                'weight_class': parent.weight_class,
                'requires_assembly': parent.requires_assembly,
                'is_fragile': parent.is_fragile,
                'requires_special_handling': parent.requires_special_handling,
                'default_base_price': price,
                'is_generic': False,
                'is_custom': False,
                'is_active': True,
            }
        )

    def _create_simple_item(self, category, name_en, name_he, weight_class,
                           requires_assembly, price, is_fragile=False):
        """Create a simple (non-generic) item."""
        ItemType.objects.update_or_create(
            name_en=name_en,
            category=category,
            is_generic=False,
            parent_type__isnull=True,
            defaults={
                'name_he': name_he,
                'weight_class': weight_class,
                'requires_assembly': requires_assembly,
                'is_fragile': is_fragile,
                'default_base_price': Decimal(price),
                'is_custom': False,
                'is_active': True,
            }
        )
