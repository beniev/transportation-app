# Generated manually for item attributes and variants system

import django.core.validators
import django.db.models.deletion
import uuid
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("movers", "0001_initial"),
    ]

    operations = [
        # Create ItemAttribute model
        migrations.CreateModel(
            name="ItemAttribute",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "name_en",
                    models.CharField(max_length=255, verbose_name="name (English)"),
                ),
                (
                    "name_he",
                    models.CharField(max_length=255, verbose_name="name (Hebrew)"),
                ),
                (
                    "description_en",
                    models.TextField(blank=True, verbose_name="description (English)"),
                ),
                (
                    "description_he",
                    models.TextField(blank=True, verbose_name="description (Hebrew)"),
                ),
                (
                    "code",
                    models.CharField(
                        help_text='Unique identifier (e.g., "door_count", "bed_size")',
                        max_length=50,
                        unique=True,
                        verbose_name="code",
                    ),
                ),
                (
                    "input_type",
                    models.CharField(
                        choices=[
                            ("select", "Select"),
                            ("number", "Number"),
                            ("boolean", "Boolean"),
                        ],
                        default="select",
                        max_length=20,
                        verbose_name="input type",
                    ),
                ),
                (
                    "question_en",
                    models.CharField(
                        help_text='Question to ask user (e.g., "How many doors?")',
                        max_length=255,
                        verbose_name="question (English)",
                    ),
                ),
                (
                    "question_he",
                    models.CharField(
                        help_text='Question in Hebrew (e.g., "כמה דלתות לארון?")',
                        max_length=255,
                        verbose_name="question (Hebrew)",
                    ),
                ),
                (
                    "display_order",
                    models.IntegerField(default=0, verbose_name="display order"),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
            ],
            options={
                "verbose_name": "item attribute",
                "verbose_name_plural": "item attributes",
                "db_table": "item_attributes",
                "ordering": ["display_order", "code"],
            },
        ),
        # Create ItemAttributeOption model
        migrations.CreateModel(
            name="ItemAttributeOption",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "name_en",
                    models.CharField(max_length=255, verbose_name="name (English)"),
                ),
                (
                    "name_he",
                    models.CharField(max_length=255, verbose_name="name (Hebrew)"),
                ),
                (
                    "description_en",
                    models.TextField(blank=True, verbose_name="description (English)"),
                ),
                (
                    "description_he",
                    models.TextField(blank=True, verbose_name="description (Hebrew)"),
                ),
                (
                    "value",
                    models.CharField(
                        help_text='The actual value stored (e.g., "2", "3", "large")',
                        max_length=50,
                        verbose_name="value",
                    ),
                ),
                (
                    "display_order",
                    models.IntegerField(default=0, verbose_name="display order"),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "attribute",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="options",
                        to="movers.itemattribute",
                        verbose_name="attribute",
                    ),
                ),
            ],
            options={
                "verbose_name": "item attribute option",
                "verbose_name_plural": "item attribute options",
                "db_table": "item_attribute_options",
                "ordering": ["attribute", "display_order", "value"],
                "unique_together": {("attribute", "value")},
            },
        ),
        # Create ItemCategoryAttribute model
        migrations.CreateModel(
            name="ItemCategoryAttribute",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "is_required",
                    models.BooleanField(
                        default=True,
                        help_text="Whether this attribute must be specified for items in this category",
                        verbose_name="required",
                    ),
                ),
                (
                    "display_order",
                    models.IntegerField(default=0, verbose_name="display order"),
                ),
                (
                    "attribute",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="category_links",
                        to="movers.itemattribute",
                        verbose_name="attribute",
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="category_attributes",
                        to="movers.itemcategory",
                        verbose_name="category",
                    ),
                ),
            ],
            options={
                "verbose_name": "category attribute",
                "verbose_name_plural": "category attributes",
                "db_table": "item_category_attributes",
                "ordering": ["category", "display_order"],
                "unique_together": {("category", "attribute")},
            },
        ),
        # Create ItemTypeSuggestion model
        migrations.CreateModel(
            name="ItemTypeSuggestion",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "name_en",
                    models.CharField(max_length=100, verbose_name="name (English)"),
                ),
                (
                    "name_he",
                    models.CharField(max_length=100, verbose_name="name (Hebrew)"),
                ),
                (
                    "description_en",
                    models.TextField(blank=True, verbose_name="description (English)"),
                ),
                (
                    "description_he",
                    models.TextField(blank=True, verbose_name="description (Hebrew)"),
                ),
                (
                    "suggested_price",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Suggested base price in ILS",
                        max_digits=10,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.00"))
                        ],
                        verbose_name="suggested price",
                    ),
                ),
                (
                    "weight_class",
                    models.CharField(
                        choices=[
                            ("light", "Light"),
                            ("medium", "Medium"),
                            ("heavy", "Heavy"),
                            ("extra_heavy", "Extra Heavy"),
                        ],
                        default="medium",
                        max_length=20,
                        verbose_name="weight class",
                    ),
                ),
                (
                    "requires_assembly",
                    models.BooleanField(default=False, verbose_name="requires assembly"),
                ),
                (
                    "is_fragile",
                    models.BooleanField(default=False, verbose_name="is fragile"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        default="pending",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "admin_notes",
                    models.TextField(
                        blank=True,
                        help_text="Notes from admin about the decision",
                        verbose_name="admin notes",
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="suggestions",
                        to="movers.itemcategory",
                        verbose_name="category",
                    ),
                ),
                (
                    "created_item",
                    models.ForeignKey(
                        blank=True,
                        help_text="The item type created from this suggestion (if approved)",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="source_suggestion",
                        to="movers.itemtype",
                        verbose_name="created item",
                    ),
                ),
                (
                    "suggested_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="item_suggestions",
                        to="accounts.moverprofile",
                        verbose_name="suggested by",
                    ),
                ),
            ],
            options={
                "verbose_name": "item type suggestion",
                "verbose_name_plural": "item type suggestions",
                "db_table": "item_type_suggestions",
                "ordering": ["-created_at"],
            },
        ),
        # Add new fields to ItemType
        migrations.AddField(
            model_name="itemtype",
            name="parent_type",
            field=models.ForeignKey(
                blank=True,
                help_text="For variants, the generic parent item",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="variants",
                to="movers.itemtype",
                verbose_name="parent type",
            ),
        ),
        migrations.AddField(
            model_name="itemtype",
            name="attribute_values",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='For variants, the attribute values (e.g., {"door_count": "3"})',
                verbose_name="attribute values",
            ),
        ),
        migrations.AddField(
            model_name="itemtype",
            name="is_generic",
            field=models.BooleanField(
                default=False,
                help_text="Whether this item requires clarification to resolve to a specific variant",
                verbose_name="is generic",
            ),
        ),
        migrations.AddField(
            model_name="itemtype",
            name="is_custom",
            field=models.BooleanField(
                default=False,
                help_text="Whether this is a custom item not in the standard catalog",
                verbose_name="is custom",
            ),
        ),
    ]
