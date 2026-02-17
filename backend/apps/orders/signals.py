"""
Signals for the orders app.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Order, OrderItem


@receiver(pre_save, sender=Order)
def calculate_order_total(sender, instance, **kwargs):
    """Calculate total price before saving order."""
    instance.calculate_total()


@receiver(post_save, sender=OrderItem)
def update_order_subtotal(sender, instance, **kwargs):
    """Update order subtotal when item is saved."""
    order = instance.order
    items_total = sum(item.total_price for item in order.items.all())
    if order.items_subtotal != items_total:
        order.items_subtotal = items_total
        order.save(update_fields=['items_subtotal', 'total_price', 'updated_at'])


@receiver(pre_save, sender=OrderItem)
def calculate_item_total(sender, instance, **kwargs):
    """Calculate item total before saving."""
    instance.calculate_total()
