"""
Custom account adapter for handling user registration with user_type.
"""
from allauth.account.adapter import DefaultAccountAdapter
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom adapter that saves additional user fields during registration.
    """

    def save_user(self, request, user, form, commit=True):
        """
        Save user with custom fields from the registration form.
        This is called BEFORE post_save signal, so user_type is set correctly
        before profiles are created.
        """
        import logging
        logger = logging.getLogger(__name__)

        # Get custom fields from the cleaned data
        # form.cleaned_data comes from the serializer's get_cleaned_data()
        data = form.cleaned_data if hasattr(form, 'cleaned_data') else {}
        logger.info(f"CustomAccountAdapter.save_user: form has cleaned_data={hasattr(form, 'cleaned_data')}, data={data}")

        # Set user_type BEFORE calling super().save_user() and commit
        # This ensures the signal will see the correct user_type
        user.user_type = data.get('user_type', User.UserType.CUSTOMER)
        user.first_name = data.get('first_name', '')
        user.last_name = data.get('last_name', '')
        user.phone = data.get('phone', '')
        user.preferred_language = data.get('preferred_language', User.Language.HEBREW)

        # Now call parent's save_user which will save with correct user_type
        user = super().save_user(request, user, form, commit=commit)

        logger.info(f"CustomAccountAdapter.save_user: User saved - email={user.email}, user_type={user.user_type}")

        return user
