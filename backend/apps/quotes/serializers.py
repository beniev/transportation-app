"""
Serializers for the quotes app.
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import QuoteTemplate, Quote, QuoteItem, Signature


class QuoteTemplateSerializer(serializers.ModelSerializer):
    """Serializer for quote templates."""

    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'is_default', 'is_active',
            'header_text', 'header_text_he',
            'footer_text', 'footer_text_he',
            'terms_and_conditions', 'terms_and_conditions_he',
            'primary_color', 'secondary_color', 'logo_position',
            'show_company_details', 'show_item_breakdown', 'show_pricing_factors',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Automatically set the mover from the request
        validated_data['mover'] = self.context['request'].user.mover_profile
        return super().create(validated_data)


class QuoteItemSerializer(serializers.ModelSerializer):
    """Serializer for quote items."""

    class Meta:
        model = QuoteItem
        fields = [
            'id', 'name', 'name_he', 'description',
            'quantity', 'unit_price', 'total_price', 'display_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Auto-calculate total price if not provided
        if 'total_price' not in data or data['total_price'] is None:
            quantity = data.get('quantity', 1)
            unit_price = data.get('unit_price', 0)
            data['total_price'] = quantity * unit_price
        return data


class SignatureSerializer(serializers.ModelSerializer):
    """Serializer for digital signatures."""

    class Meta:
        model = Signature
        fields = [
            'id', 'signature_data', 'signer_name', 'signer_email',
            'signer_phone', 'signer_id_number', 'signed_at',
            'verification_code', 'created_at'
        ]
        read_only_fields = ['id', 'signed_at', 'verification_code', 'created_at']


class QuoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for quote lists."""

    customer_name = serializers.SerializerMethodField()
    order_number = serializers.CharField(source='order.id', read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'version', 'status',
            'customer_name', 'order_number',
            'total_amount', 'valid_until',
            'sent_at', 'viewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        customer = obj.order.customer
        name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        return name or customer.user.email


class QuoteDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single quote view."""

    items = QuoteItemSerializer(many=True, read_only=True)
    signature = SignatureSerializer(read_only=True)
    template = QuoteTemplateSerializer(read_only=True)
    template_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    origin_address = serializers.CharField(source='order.origin_address', read_only=True)
    destination_address = serializers.CharField(source='order.destination_address', read_only=True)
    is_signed = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'version', 'status',
            'order', 'template', 'template_id',
            'customer_name', 'customer_email', 'customer_phone',
            'origin_address', 'destination_address',
            'validity_days', 'valid_until',
            'items_data', 'pricing_data',
            'custom_notes', 'custom_notes_he',
            'discount_description', 'discount_amount',
            'subtotal', 'total_amount',
            'sent_at', 'sent_to_email', 'viewed_at',
            'pdf_file', 'pdf_url', 'pdf_generated_at',
            'items', 'signature', 'is_signed',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'quote_number', 'version',
            'sent_at', 'viewed_at',
            'pdf_file', 'pdf_generated_at',
            'created_at', 'updated_at'
        ]

    def get_customer_name(self, obj):
        customer = obj.order.customer
        name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        return name or customer.user.email

    def get_customer_email(self, obj):
        return obj.order.customer.user.email

    def get_customer_phone(self, obj):
        return obj.order.customer.user.phone

    def get_is_signed(self, obj):
        return hasattr(obj, 'signature') and obj.signature is not None

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None

    def validate_template_id(self, value):
        if value:
            request = self.context.get('request')
            if request and hasattr(request.user, 'mover_profile'):
                if not QuoteTemplate.objects.filter(
                    id=value,
                    mover=request.user.mover_profile
                ).exists():
                    raise serializers.ValidationError("Template not found")
        return value

    def update(self, instance, validated_data):
        template_id = validated_data.pop('template_id', None)
        if template_id:
            instance.template_id = template_id
        return super().update(instance, validated_data)


class QuoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating quotes from orders."""

    items = QuoteItemSerializer(many=True, required=False)
    template_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Quote
        fields = [
            'order', 'template_id', 'validity_days',
            'custom_notes', 'custom_notes_he',
            'discount_description', 'discount_amount',
            'items'
        ]

    def validate_order(self, value):
        request = self.context.get('request')
        if request and hasattr(request.user, 'mover_profile'):
            if value.mover != request.user.mover_profile:
                raise serializers.ValidationError("Order does not belong to you")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        template_id = validated_data.pop('template_id', None)

        order = validated_data['order']

        # Set template
        if template_id:
            validated_data['template_id'] = template_id
        else:
            # Try to get default template
            default_template = QuoteTemplate.objects.filter(
                mover=order.mover,
                is_default=True,
                is_active=True
            ).first()
            if default_template:
                validated_data['template'] = default_template

        # Calculate version
        existing_quotes = Quote.objects.filter(order=order).count()
        validated_data['version'] = existing_quotes + 1

        # Set validity date
        validity_days = validated_data.get('validity_days', 7)
        validated_data['valid_until'] = timezone.now().date() + timedelta(days=validity_days)

        # Snapshot items and pricing from order
        validated_data['items_data'] = self._snapshot_items(order)
        validated_data['pricing_data'] = self._snapshot_pricing(order)

        # Calculate totals
        subtotal = order.total_price or 0
        discount = validated_data.get('discount_amount', 0)
        validated_data['subtotal'] = subtotal
        validated_data['total_amount'] = subtotal - discount

        # Create quote
        quote = Quote.objects.create(**validated_data)

        # Create quote items
        if items_data:
            for item_data in items_data:
                QuoteItem.objects.create(quote=quote, **item_data)
        else:
            # Create items from order items
            for idx, order_item in enumerate(order.items.all()):
                QuoteItem.objects.create(
                    quote=quote,
                    name=order_item.item_type.name_en if order_item.item_type else 'Item',
                    name_he=order_item.item_type.name_he if order_item.item_type else 'פריט',
                    quantity=order_item.quantity,
                    unit_price=order_item.calculated_price or 0,
                    total_price=(order_item.calculated_price or 0) * order_item.quantity,
                    display_order=idx
                )

        return quote

    def _snapshot_items(self, order):
        """Create a snapshot of order items."""
        items = []
        for item in order.items.all():
            items.append({
                'id': str(item.id),
                'name': item.item_type.name_en if item.item_type else 'Item',
                'name_he': item.item_type.name_he if item.item_type else 'פריט',
                'quantity': item.quantity,
                'requires_assembly': item.requires_assembly,
                'requires_disassembly': item.requires_disassembly,
                'is_fragile': item.is_fragile,
                'calculated_price': str(item.calculated_price) if item.calculated_price else '0'
            })
        return items

    def _snapshot_pricing(self, order):
        """Create a snapshot of pricing breakdown."""
        return {
            'base_price': str(order.base_price) if order.base_price else '0',
            'total_price': str(order.total_price) if order.total_price else '0',
            'distance_km': str(order.distance_km) if order.distance_km else '0',
            'origin_floor': order.origin_floor,
            'destination_floor': order.destination_floor,
            'origin_has_elevator': order.origin_has_elevator,
            'destination_has_elevator': order.destination_has_elevator
        }


class SignQuoteSerializer(serializers.Serializer):
    """Serializer for signing a quote."""

    signature_data = serializers.CharField(
        help_text="Base64 encoded signature image"
    )
    signer_name = serializers.CharField(max_length=255)
    signer_email = serializers.EmailField()
    signer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    signer_id_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        quote = self.context.get('quote')
        if quote and quote.status not in [Quote.Status.SENT, Quote.Status.VIEWED]:
            raise serializers.ValidationError(
                "Quote must be sent or viewed to be signed"
            )
        if quote and hasattr(quote, 'signature') and quote.signature:
            raise serializers.ValidationError("Quote is already signed")
        return data

    def create(self, validated_data):
        quote = self.context['quote']
        request = self.context.get('request')

        # Get IP and user agent
        ip_address = None
        user_agent = ''
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        signature = Signature.objects.create(
            quote=quote,
            ip_address=ip_address,
            user_agent=user_agent,
            **validated_data
        )

        # Update quote status
        quote.status = Quote.Status.ACCEPTED
        quote.save()

        return signature


class SendQuoteSerializer(serializers.Serializer):
    """Serializer for sending a quote to customer."""

    email = serializers.EmailField(required=False)
    regenerate_pdf = serializers.BooleanField(default=False)

    def validate_email(self, value):
        if not value:
            quote = self.context.get('quote')
            if quote:
                value = quote.order.customer.user.email
        return value
