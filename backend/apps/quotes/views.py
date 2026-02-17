"""
Views for the quotes app.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
from django.core.files.base import ContentFile
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsMover, IsOwnerOrMover
from .models import QuoteTemplate, Quote, QuoteItem, Signature
from .serializers import (
    QuoteTemplateSerializer,
    QuoteListSerializer,
    QuoteDetailSerializer,
    QuoteCreateSerializer,
    QuoteItemSerializer,
    SignQuoteSerializer,
    SendQuoteSerializer,
    SignatureSerializer
)
from .services.pdf_generator import QuotePDFGenerator


class QuoteTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quote templates.
    Movers can create and manage their own templates.
    """
    serializer_class = QuoteTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        return QuoteTemplate.objects.filter(
            mover=self.request.user.mover_profile
        ).order_by('-is_default', '-created_at')

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a template as the default."""
        template = self.get_object()
        template.is_default = True
        template.save()  # save() method handles unsetting other defaults
        return Response({'status': 'Template set as default'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template."""
        template = self.get_object()

        # Create a copy
        template.pk = None
        template.id = None
        template.name = f"{template.name} (Copy)"
        template.is_default = False
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quotes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if hasattr(user, 'mover_profile'):
            # Mover sees their quotes
            return Quote.objects.filter(
                order__mover=user.mover_profile
            ).select_related('order', 'template').prefetch_related('items')
        elif hasattr(user, 'customer_profile'):
            # Customer sees quotes for their orders
            return Quote.objects.filter(
                order__customer=user.customer_profile
            ).select_related('order', 'template').prefetch_related('items')

        return Quote.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return QuoteListSerializer
        elif self.action == 'create':
            return QuoteCreateSerializer
        return QuoteDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMover()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate or regenerate PDF for a quote."""
        quote = self.get_object()

        # Generate PDF
        generator = QuotePDFGenerator(quote)
        pdf_bytes = generator.generate()

        # Save to file field
        filename = f"quote_{quote.quote_number}.pdf"
        quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
        quote.pdf_generated_at = timezone.now()
        quote.save()

        serializer = QuoteDetailSerializer(quote, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download the PDF file."""
        quote = self.get_object()

        # Generate if not exists
        if not quote.pdf_file:
            generator = QuotePDFGenerator(quote)
            pdf_bytes = generator.generate()

            filename = f"quote_{quote.quote_number}.pdf"
            quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
            quote.pdf_generated_at = timezone.now()
            quote.save()

        # Return PDF response
        response = HttpResponse(quote.pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="quote_{quote.quote_number}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def preview_pdf(self, request, pk=None):
        """Preview PDF in browser."""
        quote = self.get_object()

        # Generate fresh PDF for preview
        generator = QuotePDFGenerator(quote)
        pdf_bytes = generator.generate()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="quote_{quote.quote_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send quote to customer via email."""
        quote = self.get_object()

        serializer = SendQuoteSerializer(
            data=request.data,
            context={'quote': quote, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get('email') or quote.order.customer.user.email
        regenerate = serializer.validated_data.get('regenerate_pdf', False)

        # Generate/regenerate PDF if needed
        if not quote.pdf_file or regenerate:
            generator = QuotePDFGenerator(quote)
            pdf_bytes = generator.generate()

            filename = f"quote_{quote.quote_number}.pdf"
            quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
            quote.pdf_generated_at = timezone.now()

        # Update quote status and send info
        quote.status = Quote.Status.SENT
        quote.sent_at = timezone.now()
        quote.sent_to_email = email
        quote.save()

        # TODO: Actually send email via notification service
        # This will be implemented in the notifications app

        return Response({
            'status': 'Quote sent successfully',
            'sent_to': email,
            'sent_at': quote.sent_at
        })

    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        """Mark quote as viewed by customer."""
        quote = self.get_object()

        if quote.status == Quote.Status.SENT:
            quote.status = Quote.Status.VIEWED
            quote.viewed_at = timezone.now()
            quote.save()

        return Response({'status': 'Quote marked as viewed'})

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Sign a quote digitally (premium feature)."""
        quote = self.get_object()

        # Check if mover has premium subscription
        # TODO: Implement subscription check

        serializer = SignQuoteSerializer(
            data=request.data,
            context={'quote': quote, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        signature = serializer.save()

        # Regenerate PDF with signature
        generator = QuotePDFGenerator(quote)
        pdf_bytes = generator.generate()

        filename = f"quote_{quote.quote_number}_signed.pdf"
        quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
        quote.pdf_generated_at = timezone.now()
        quote.save()

        return Response({
            'status': 'Quote signed successfully',
            'verification_code': signature.verification_code,
            'signed_at': signature.signed_at
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a quote."""
        quote = self.get_object()

        if quote.status in [Quote.Status.SENT, Quote.Status.VIEWED]:
            quote.status = Quote.Status.REJECTED
            quote.save()
            return Response({'status': 'Quote rejected'})

        return Response(
            {'error': 'Quote cannot be rejected in current status'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def create_new_version(self, request, pk=None):
        """Create a new version of the quote."""
        original_quote = self.get_object()

        # Create new quote with incremented version
        new_quote = Quote.objects.create(
            order=original_quote.order,
            template=original_quote.template,
            version=original_quote.version + 1,
            status=Quote.Status.DRAFT,
            validity_days=original_quote.validity_days,
            valid_until=timezone.now().date() + timezone.timedelta(days=original_quote.validity_days),
            items_data=original_quote.items_data,
            pricing_data=original_quote.pricing_data,
            custom_notes=original_quote.custom_notes,
            custom_notes_he=original_quote.custom_notes_he,
            subtotal=original_quote.subtotal,
            discount_amount=original_quote.discount_amount,
            discount_description=original_quote.discount_description,
            total_amount=original_quote.total_amount
        )

        # Copy items
        for item in original_quote.items.all():
            QuoteItem.objects.create(
                quote=new_quote,
                name=item.name,
                name_he=item.name_he,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                display_order=item.display_order
            )

        serializer = QuoteDetailSerializer(new_quote, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuoteItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quote items.
    """
    serializer_class = QuoteItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsMover]

    def get_queryset(self):
        quote_id = self.kwargs.get('quote_pk')
        return QuoteItem.objects.filter(
            quote_id=quote_id,
            quote__order__mover=self.request.user.mover_profile
        )

    def perform_create(self, serializer):
        quote_id = self.kwargs.get('quote_pk')
        quote = get_object_or_404(
            Quote,
            id=quote_id,
            order__mover=self.request.user.mover_profile
        )
        serializer.save(quote=quote)

    @action(detail=False, methods=['post'])
    def reorder(self, request, quote_pk=None):
        """Reorder items by providing a list of item IDs in order."""
        item_ids = request.data.get('item_ids', [])

        quote = get_object_or_404(
            Quote,
            id=quote_pk,
            order__mover=request.user.mover_profile
        )

        for idx, item_id in enumerate(item_ids):
            QuoteItem.objects.filter(
                id=item_id,
                quote=quote
            ).update(display_order=idx)

        return Response({'status': 'Items reordered'})


class PublicQuoteView(viewsets.GenericViewSet):
    """
    Public endpoints for customers to view and interact with quotes.
    No authentication required - uses quote number and verification.
    """
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Quote.objects.all()

    @action(detail=False, methods=['get'], url_path='view/(?P<quote_number>[^/.]+)')
    def view_quote(self, request, quote_number=None):
        """View a quote by quote number (for customer email links)."""
        quote = get_object_or_404(Quote, quote_number=quote_number)

        # Mark as viewed if sent
        if quote.status == Quote.Status.SENT:
            quote.status = Quote.Status.VIEWED
            quote.viewed_at = timezone.now()
            quote.save()

        serializer = QuoteDetailSerializer(quote, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pdf/(?P<quote_number>[^/.]+)')
    def download_public_pdf(self, request, quote_number=None):
        """Download PDF by quote number."""
        quote = get_object_or_404(Quote, quote_number=quote_number)

        # Generate if not exists
        if not quote.pdf_file:
            generator = QuotePDFGenerator(quote)
            pdf_bytes = generator.generate()

            filename = f"quote_{quote.quote_number}.pdf"
            quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
            quote.pdf_generated_at = timezone.now()
            quote.save()

        response = HttpResponse(quote.pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="quote_{quote.quote_number}.pdf"'
        return response

    @action(detail=False, methods=['post'], url_path='sign/(?P<quote_number>[^/.]+)')
    def sign_public(self, request, quote_number=None):
        """Sign a quote publicly (from email link)."""
        quote = get_object_or_404(Quote, quote_number=quote_number)

        serializer = SignQuoteSerializer(
            data=request.data,
            context={'quote': quote, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        signature = serializer.save()

        # Regenerate PDF with signature
        generator = QuotePDFGenerator(quote)
        pdf_bytes = generator.generate()

        filename = f"quote_{quote.quote_number}_signed.pdf"
        quote.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
        quote.pdf_generated_at = timezone.now()
        quote.save()

        return Response({
            'status': 'Quote signed successfully',
            'verification_code': signature.verification_code
        })

    @action(detail=False, methods=['get'], url_path='verify/(?P<verification_code>[^/.]+)')
    def verify_signature(self, request, verification_code=None):
        """Verify a signature by verification code."""
        signature = get_object_or_404(Signature, verification_code=verification_code)

        return Response({
            'valid': True,
            'quote_number': signature.quote.quote_number,
            'signer_name': signature.signer_name,
            'signed_at': signature.signed_at,
            'quote_total': signature.quote.total_amount
        })
