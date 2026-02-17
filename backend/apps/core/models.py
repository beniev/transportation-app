"""
Core models for the transportation app.
Contains abstract base models used by all apps.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """
    Abstract base model with UUID primary key and created/updated timestamps.
    All models in the app should inherit from this.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']


class TranslatableModel(models.Model):
    """
    Abstract model for bilingual content (Hebrew + English).
    Provides name and description in both languages.
    """
    name_en = models.CharField(
        _('name (English)'),
        max_length=255
    )
    name_he = models.CharField(
        _('name (Hebrew)'),
        max_length=255
    )
    description_en = models.TextField(
        _('description (English)'),
        blank=True
    )
    description_he = models.TextField(
        _('description (Hebrew)'),
        blank=True
    )

    class Meta:
        abstract = True

    def get_name(self, language: str = 'en') -> str:
        """Get name in the specified language."""
        if language == 'he':
            return self.name_he or self.name_en
        return self.name_en or self.name_he

    def get_description(self, language: str = 'en') -> str:
        """Get description in the specified language."""
        if language == 'he':
            return self.description_he or self.description_en
        return self.description_en or self.description_he

    def __str__(self):
        return self.name_en or self.name_he
