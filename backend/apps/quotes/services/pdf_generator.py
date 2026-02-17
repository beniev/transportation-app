"""
PDF generator service for quotes.
Creates styled PDF documents from quote data.
"""
import io
from datetime import datetime
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.utils.translation import get_language
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


class QuotePDFGenerator:
    """
    Generates PDF documents for quotes with RTL support for Hebrew.
    """

    def __init__(self, quote):
        self.quote = quote
        self.template = quote.template
        self.order = quote.order
        self.mover = self.order.mover
        self.language = get_language() or 'he'
        self.is_rtl = self.language == 'he'

        # Page settings
        self.page_width, self.page_height = A4
        self.margin = 2 * cm

        # Colors from template or defaults
        if self.template:
            self.primary_color = colors.HexColor(self.template.primary_color)
            self.secondary_color = colors.HexColor(self.template.secondary_color)
        else:
            self.primary_color = colors.HexColor('#3b82f6')
            self.secondary_color = colors.HexColor('#1e40af')

        self._setup_styles()

    def _setup_styles(self):
        """Setup paragraph styles for the PDF."""
        self.styles = getSampleStyleSheet()

        # Title style
        self.styles.add(ParagraphStyle(
            name='QuoteTitle',
            fontSize=24,
            leading=28,
            alignment=TA_CENTER,
            textColor=self.primary_color,
            spaceAfter=20
        ))

        # Header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontSize=14,
            leading=18,
            textColor=self.secondary_color,
            spaceBefore=15,
            spaceAfter=10,
            alignment=TA_RIGHT if self.is_rtl else TA_LEFT
        ))

        # Normal text RTL
        self.styles.add(ParagraphStyle(
            name='NormalRTL',
            fontSize=10,
            leading=14,
            alignment=TA_RIGHT if self.is_rtl else TA_LEFT
        ))

        # Small text
        self.styles.add(ParagraphStyle(
            name='Small',
            fontSize=8,
            leading=10,
            textColor=colors.gray,
            alignment=TA_RIGHT if self.is_rtl else TA_LEFT
        ))

        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            fontSize=8,
            leading=10,
            textColor=colors.gray,
            alignment=TA_CENTER
        ))

    def generate(self) -> bytes:
        """Generate the PDF and return as bytes."""
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )

        # Build story
        story = []

        # Header section
        story.extend(self._build_header())

        # Quote info section
        story.extend(self._build_quote_info())

        # Customer info section
        story.extend(self._build_customer_info())

        # Addresses section
        story.extend(self._build_addresses())

        # Items table
        story.extend(self._build_items_table())

        # Pricing breakdown
        story.extend(self._build_pricing())

        # Notes section
        story.extend(self._build_notes())

        # Terms and conditions
        story.extend(self._build_terms())

        # Signature area
        story.extend(self._build_signature_area())

        # Footer
        story.extend(self._build_footer())

        doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _build_header(self):
        """Build the header section with logo and company details."""
        elements = []

        # Company name as title
        company_name = self.mover.company_name
        elements.append(Paragraph(company_name, self.styles['QuoteTitle']))

        # Template header text if available
        if self.template:
            header_text = (
                self.template.header_text_he if self.is_rtl
                else self.template.header_text
            )
            if header_text:
                elements.append(Paragraph(header_text, self.styles['NormalRTL']))

        # Horizontal line
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=self.primary_color,
            spaceAfter=15
        ))

        return elements

    def _build_quote_info(self):
        """Build quote number and validity information."""
        elements = []

        title = 'הצעת מחיר' if self.is_rtl else 'Quote'
        elements.append(Paragraph(
            f"<b>{title}</b>: {self.quote.quote_number}",
            self.styles['SectionHeader']
        ))

        # Quote details table
        date_label = 'תאריך' if self.is_rtl else 'Date'
        valid_label = 'בתוקף עד' if self.is_rtl else 'Valid Until'
        version_label = 'גרסה' if self.is_rtl else 'Version'

        data = [
            [date_label, self.quote.created_at.strftime('%d/%m/%Y')],
            [valid_label, self.quote.valid_until.strftime('%d/%m/%Y') if self.quote.valid_until else '-'],
            [version_label, str(self.quote.version)]
        ]

        if self.is_rtl:
            data = [[row[1], row[0]] for row in data]

        table = Table(data, colWidths=[5*cm, 5*cm])
        table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if self.is_rtl else 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

        return elements

    def _build_customer_info(self):
        """Build customer information section."""
        elements = []

        customer = self.order.customer
        title = 'פרטי לקוח' if self.is_rtl else 'Customer Details'
        elements.append(Paragraph(title, self.styles['SectionHeader']))

        name_label = 'שם' if self.is_rtl else 'Name'
        phone_label = 'טלפון' if self.is_rtl else 'Phone'
        email_label = 'אימייל' if self.is_rtl else 'Email'

        customer_name = f"{customer.user.first_name} {customer.user.last_name}".strip()
        if not customer_name:
            customer_name = customer.user.email

        data = [
            [name_label, customer_name],
            [phone_label, customer.user.phone or '-'],
            [email_label, customer.user.email]
        ]

        if self.is_rtl:
            data = [[row[1], row[0]] for row in data]

        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if self.is_rtl else 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

        return elements

    def _build_addresses(self):
        """Build origin and destination addresses section."""
        elements = []

        title = 'פרטי ההובלה' if self.is_rtl else 'Moving Details'
        elements.append(Paragraph(title, self.styles['SectionHeader']))

        origin_label = 'מוצא' if self.is_rtl else 'Origin'
        dest_label = 'יעד' if self.is_rtl else 'Destination'
        floor_label = 'קומה' if self.is_rtl else 'Floor'
        elevator_label = 'מעלית' if self.is_rtl else 'Elevator'
        yes = 'כן' if self.is_rtl else 'Yes'
        no = 'לא' if self.is_rtl else 'No'

        origin_elevator = yes if self.order.origin_has_elevator else no
        dest_elevator = yes if self.order.destination_has_elevator else no

        data = [
            ['', dest_label, origin_label] if self.is_rtl else ['', origin_label, dest_label],
            [
                'כתובת' if self.is_rtl else 'Address',
                self.order.destination_address or '-',
                self.order.origin_address or '-'
            ] if self.is_rtl else [
                'Address',
                self.order.origin_address or '-',
                self.order.destination_address or '-'
            ],
            [
                floor_label,
                str(self.order.destination_floor or 0),
                str(self.order.origin_floor or 0)
            ] if self.is_rtl else [
                floor_label,
                str(self.order.origin_floor or 0),
                str(self.order.destination_floor or 0)
            ],
            [
                elevator_label,
                dest_elevator,
                origin_elevator
            ] if self.is_rtl else [
                elevator_label,
                origin_elevator,
                dest_elevator
            ],
        ]

        table = Table(data, colWidths=[3*cm, 6*cm, 6*cm])
        table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if self.is_rtl else 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

        return elements

    def _build_items_table(self):
        """Build the items breakdown table."""
        elements = []

        # Check if we should show items breakdown
        show_items = True
        if self.template and not self.template.show_item_breakdown:
            show_items = False

        if not show_items:
            return elements

        title = 'פירוט פריטים' if self.is_rtl else 'Items Breakdown'
        elements.append(Paragraph(title, self.styles['SectionHeader']))

        # Headers
        if self.is_rtl:
            headers = ['סה"כ', 'מחיר', 'כמות', 'פריט']
        else:
            headers = ['Item', 'Quantity', 'Price', 'Total']

        data = [headers]

        # Get items from quote
        for item in self.quote.items.all():
            item_name = item.name_he if self.is_rtl and item.name_he else item.name
            if self.is_rtl:
                row = [
                    f'₪{item.total_price:,.2f}',
                    f'₪{item.unit_price:,.2f}',
                    str(item.quantity),
                    item_name
                ]
            else:
                row = [
                    item_name,
                    str(item.quantity),
                    f'₪{item.unit_price:,.2f}',
                    f'₪{item.total_price:,.2f}'
                ]
            data.append(row)

        table = Table(data, colWidths=[3.5*cm, 3*cm, 3*cm, 6*cm])
        table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if self.is_rtl else 'LEFT'),
            ('ALIGN', (0, 0), (2, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), self.primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

        return elements

    def _build_pricing(self):
        """Build the pricing summary section."""
        elements = []

        title = 'סיכום מחיר' if self.is_rtl else 'Price Summary'
        elements.append(Paragraph(title, self.styles['SectionHeader']))

        subtotal_label = 'סכום ביניים' if self.is_rtl else 'Subtotal'
        discount_label = 'הנחה' if self.is_rtl else 'Discount'
        total_label = 'סה"כ לתשלום' if self.is_rtl else 'Total'

        data = []

        # Subtotal
        if self.is_rtl:
            data.append([f'₪{self.quote.subtotal:,.2f}', subtotal_label])
        else:
            data.append([subtotal_label, f'₪{self.quote.subtotal:,.2f}'])

        # Discount if any
        if self.quote.discount_amount > 0:
            discount_text = f'-₪{self.quote.discount_amount:,.2f}'
            if self.quote.discount_description:
                discount_label = f'{discount_label} ({self.quote.discount_description})'
            if self.is_rtl:
                data.append([discount_text, discount_label])
            else:
                data.append([discount_label, discount_text])

        # Total
        if self.is_rtl:
            data.append([f'₪{self.quote.total_amount:,.2f}', f'<b>{total_label}</b>'])
        else:
            data.append([f'<b>{total_label}</b>', f'₪{self.quote.total_amount:,.2f}'])

        # Convert to paragraphs for bold support
        data = [[Paragraph(str(cell), self.styles['NormalRTL']) for cell in row] for row in data]

        table = Table(data, colWidths=[5*cm, 5*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if self.is_rtl else 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, -1), (-1, -1), 2, self.primary_color),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f3f4f6')),
        ]))

        # Align table to the left (or right for RTL)
        from reportlab.platypus import KeepTogether
        elements.append(table)
        elements.append(Spacer(1, 20))

        return elements

    def _build_notes(self):
        """Build custom notes section."""
        elements = []

        notes = (
            self.quote.custom_notes_he if self.is_rtl and self.quote.custom_notes_he
            else self.quote.custom_notes
        )

        if not notes:
            return elements

        title = 'הערות' if self.is_rtl else 'Notes'
        elements.append(Paragraph(title, self.styles['SectionHeader']))
        elements.append(Paragraph(notes, self.styles['NormalRTL']))
        elements.append(Spacer(1, 15))

        return elements

    def _build_terms(self):
        """Build terms and conditions section."""
        elements = []

        terms = None
        if self.template:
            terms = (
                self.template.terms_and_conditions_he if self.is_rtl
                else self.template.terms_and_conditions
            )

        if not terms:
            return elements

        title = 'תנאים והגבלות' if self.is_rtl else 'Terms and Conditions'
        elements.append(Paragraph(title, self.styles['SectionHeader']))
        elements.append(Paragraph(terms, self.styles['Small']))
        elements.append(Spacer(1, 20))

        return elements

    def _build_signature_area(self):
        """Build signature area for the quote."""
        elements = []

        # Check if quote has a signature
        if hasattr(self.quote, 'signature') and self.quote.signature:
            sig = self.quote.signature

            title = 'חתימה' if self.is_rtl else 'Signature'
            elements.append(Paragraph(title, self.styles['SectionHeader']))

            signed_by = 'נחתם על ידי' if self.is_rtl else 'Signed by'
            signed_at = 'תאריך חתימה' if self.is_rtl else 'Signed at'
            verification = 'קוד אימות' if self.is_rtl else 'Verification Code'

            elements.append(Paragraph(
                f"{signed_by}: {sig.signer_name}",
                self.styles['NormalRTL']
            ))
            elements.append(Paragraph(
                f"{signed_at}: {sig.signed_at.strftime('%d/%m/%Y %H:%M')}",
                self.styles['NormalRTL']
            ))
            elements.append(Paragraph(
                f"{verification}: {sig.verification_code}",
                self.styles['Small']
            ))
        else:
            # Empty signature area
            title = 'חתימת לקוח' if self.is_rtl else 'Customer Signature'
            elements.append(Paragraph(title, self.styles['SectionHeader']))
            elements.append(Spacer(1, 30))
            elements.append(HRFlowable(
                width="50%",
                thickness=1,
                color=colors.black,
                spaceAfter=5
            ))

            date_label = 'תאריך' if self.is_rtl else 'Date'
            name_label = 'שם מלא' if self.is_rtl else 'Full Name'
            elements.append(Paragraph(
                f"{name_label}: _______________ {date_label}: _______________",
                self.styles['Small']
            ))

        elements.append(Spacer(1, 20))

        return elements

    def _build_footer(self):
        """Build the footer section."""
        elements = []

        # Template footer if available
        if self.template:
            footer_text = (
                self.template.footer_text_he if self.is_rtl
                else self.template.footer_text
            )
            if footer_text:
                elements.append(Spacer(1, 20))
                elements.append(Paragraph(footer_text, self.styles['Footer']))

        # Generated timestamp
        generated = 'נוצר ב' if self.is_rtl else 'Generated on'
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(
            f"{generated}: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            self.styles['Footer']
        ))

        return elements
