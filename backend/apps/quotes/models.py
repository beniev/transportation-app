"""
Models for the quotes app.
Handles quote generation, templates, and digital signatures.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal

from apps.core.models import TimeStampedModel


class QuoteTemplate(TimeStampedModel):
    """
    Customizable quote templates for movers.
    Allows movers to brand their quotes.
    """
    mover = models.ForeignKey(
        'accounts.MoverProfile',
        on_delete=models.CASCADE,
        related_name='quote_templates',
        verbose_name=_('mover')
    )
    name = models.CharField(
        _('template name'),
        max_length=100
    )
    is_default = models.BooleanField(
        _('is default'),
        default=False
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True
    )

    # Header content
    header_text = models.TextField(
        _('header text'),
        blank=True
    )
    header_text_he = models.TextField(
        _('header text (Hebrew)'),
        blank=True
    )

    # Footer content
    footer_text = models.TextField(
        _('footer text'),
        blank=True
    )
    footer_text_he = models.TextField(
        _('footer text (Hebrew)'),
        blank=True
    )

    # Terms and conditions
    terms_and_conditions = models.TextField(
        _('terms and conditions'),
        blank=True
    )
    terms_and_conditions_he = models.TextField(
        _('terms and conditions (Hebrew)'),
        blank=True
    )

    # Styling
    primary_color = models.CharField(
        _('primary color'),
        max_length=7,
        default='#3b82f6'
    )
    secondary_color = models.CharField(
        _('secondary color'),
        max_length=7,
        default='#1e40af'
    )
    logo_position = models.CharField(
        _('logo position'),
        max_length=20,
        choices=[
            ('top-left', 'Top Left'),
            ('top-center', 'Top Center'),
            ('top-right', 'Top Right'),
        ],
        default='top-right'
    )
    show_company_details = models.BooleanField(
        _('show company details'),
        default=True
    )
    show_item_breakdown = models.BooleanField(
        _('show item breakdown'),
        default=True
    )
    show_pricing_factors = models.BooleanField(
        _('show pricing factors'),
        default=False
    )

    class Meta:
        db_table = 'quote_templates'
        verbose_name = _('quote template')
        verbose_name_plural = _('quote templates')

    def __str__(self):
        return f"{self.mover.company_name} - {self.name}"

    def save(self, *args, **kwargs):
        # Ensure only one default template per mover
        if self.is_default:
            QuoteTemplate.objects.filter(
                mover=self.mover,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Quote(TimeStampedModel):
    """
    Quote document generated from an order.
    Can be edited, sent, and signed.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        SENT = 'sent', _('Sent')
        VIEWED = 'viewed', _('Viewed')
        ACCEPTED = 'accepted', _('Accepted')
        REJECTED = 'rejected', _('Rejected')
        EXPIRED = 'expired', _('Expired')

    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='quotes',
        verbose_name=_('order')
    )
    template = models.ForeignKey(
        QuoteTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotes',
        verbose_name=_('template')
    )
    version = models.PositiveIntegerField(
        _('version'),
        default=1
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )

    # Quote number for reference
    quote_number = models.CharField(
        _('quote number'),
        max_length=50,
        unique=True
    )

    # Validity
    validity_days = models.PositiveIntegerField(
        _('validity days'),
        default=7
    )
    valid_until = models.DateField(
        _('valid until'),
        null=True,
        blank=True
    )

    # Content (can be customized from order)
    items_data = models.JSONField(
        _('items data'),
        default=list,
        help_text=_('Snapshot of order items at quote creation')
    )
    pricing_data = models.JSONField(
        _('pricing data'),
        default=dict,
        help_text=_('Snapshot of pricing breakdown')
    )

    # Custom fields
    custom_notes = models.TextField(
        _('custom notes'),
        blank=True
    )
    custom_notes_he = models.TextField(
        _('custom notes (Hebrew)'),
        blank=True
    )
    discount_description = models.CharField(
        _('discount description'),
        max_length=255,
        blank=True
    )

    # Final amounts
    subtotal = models.DecimalField(
        _('subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    discount_amount = models.DecimalField(
        _('discount amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        _('total amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # Sending
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True
    )
    sent_to_email = models.EmailField(
        _('sent to email'),
        blank=True
    )
    viewed_at = models.DateTimeField(
        _('viewed at'),
        null=True,
        blank=True
    )

    # PDF
    pdf_file = models.FileField(
        _('PDF file'),
        upload_to='quotes/pdfs/',
        blank=True,
        null=True
    )
    pdf_generated_at = models.DateTimeField(
        _('PDF generated at'),
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'quotes'
        verbose_name = _('quote')
        verbose_name_plural = _('quotes')
        ordering = ['-created_at']

    def __str__(self):
        return f"Quote {self.quote_number}"

    def save(self, *args, **kwargs):
        if not self.quote_number:
            # Generate quote number
            import datetime
            today = datetime.date.today()
            prefix = f"Q{today.strftime('%Y%m%d')}"
            last_quote = Quote.objects.filter(
                quote_number__startswith=prefix
            ).order_by('-quote_number').first()

            if last_quote:
                last_num = int(last_quote.quote_number[-4:])
                new_num = last_num + 1
            else:
                new_num = 1

            self.quote_number = f"{prefix}{new_num:04d}"

        super().save(*args, **kwargs)


class QuoteItem(TimeStampedModel):
    """
    Individual line items in a quote.
    Allows customization from original order items.
    """
    quote = models.ForeignKey(
        Quote,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('quote')
    )
    name = models.CharField(
        _('item name'),
        max_length=255
    )
    name_he = models.CharField(
        _('item name (Hebrew)'),
        max_length=255,
        blank=True
    )
    description = models.TextField(
        _('description'),
        blank=True
    )
    quantity = models.PositiveIntegerField(
        _('quantity'),
        default=1
    )
    unit_price = models.DecimalField(
        _('unit price'),
        max_digits=10,
        decimal_places=2
    )
    total_price = models.DecimalField(
        _('total price'),
        max_digits=12,
        decimal_places=2
    )
    display_order = models.PositiveIntegerField(
        _('display order'),
        default=0
    )

    class Meta:
        db_table = 'quote_items'
        verbose_name = _('quote item')
        verbose_name_plural = _('quote items')
        ordering = ['display_order']

    def __str__(self):
        return f"{self.quantity}x {self.name}"


class Signature(TimeStampedModel):
    """
    Digital signature for quotes.
    Premium feature.
    """
    quote = models.OneToOneField(
        Quote,
        on_delete=models.CASCADE,
        related_name='signature',
        verbose_name=_('quote')
    )
    signature_data = models.TextField(
        _('signature data'),
        help_text=_('Base64 encoded signature image')
    )
    signer_name = models.CharField(
        _('signer name'),
        max_length=255
    )
    signer_email = models.EmailField(
        _('signer email')
    )
    signer_phone = models.CharField(
        _('signer phone'),
        max_length=20,
        blank=True
    )
    signer_id_number = models.CharField(
        _('signer ID number'),
        max_length=20,
        blank=True
    )
    signed_at = models.DateTimeField(
        _('signed at'),
        auto_now_add=True
    )
    ip_address = models.GenericIPAddressField(
        _('IP address'),
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        _('user agent'),
        blank=True
    )

    # Verification
    verification_code = models.CharField(
        _('verification code'),
        max_length=20,
        unique=True
    )

    class Meta:
        db_table = 'signatures'
        verbose_name = _('signature')
        verbose_name_plural = _('signatures')

    def __str__(self):
        return f"Signature by {self.signer_name} for {self.quote.quote_number}"

    def save(self, *args, **kwargs):
        if not self.verification_code:
            import uuid
            self.verification_code = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)
