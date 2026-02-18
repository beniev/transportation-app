# Generated manually for Review model

import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_moverprofile_approval_onboarding"),
        ("orders", "0004_add_date_flexibility"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Review",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "rating",
                    models.PositiveIntegerField(
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ],
                        verbose_name="rating",
                    ),
                ),
                (
                    "text",
                    models.TextField(blank=True, verbose_name="review text"),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviews_given",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="customer",
                    ),
                ),
                (
                    "mover",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviews",
                        to="accounts.moverprofile",
                        verbose_name="mover",
                    ),
                ),
                (
                    "order",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="review",
                        to="orders.order",
                        verbose_name="order",
                    ),
                ),
            ],
            options={
                "verbose_name": "review",
                "verbose_name_plural": "reviews",
                "db_table": "reviews",
                "ordering": ["-created_at"],
            },
        ),
    ]
