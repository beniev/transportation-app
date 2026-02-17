"""
Signals for the accounts app.
Handles automatic profile creation when users are created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, MoverProfile, CustomerProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create the appropriate profile when a user is created.
    Movers get MoverProfile, customers get CustomerProfile.
    """
    if created:
        if instance.user_type == User.UserType.MOVER:
            MoverProfile.objects.create(
                user=instance,
                company_name=instance.get_full_name() or instance.email.split('@')[0]
            )
        elif instance.user_type == User.UserType.CUSTOMER:
            CustomerProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save the profile when user is saved.
    """
    if instance.user_type == User.UserType.MOVER:
        if hasattr(instance, 'mover_profile'):
            instance.mover_profile.save()
    elif instance.user_type == User.UserType.CUSTOMER:
        if hasattr(instance, 'customer_profile'):
            instance.customer_profile.save()
