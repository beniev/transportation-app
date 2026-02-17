"""
Admin configuration for the accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User, MoverProfile, CustomerProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for User model."""
    list_display = ['email', 'first_name', 'last_name', 'user_type', 'is_active', 'date_joined']
    list_filter = ['user_type', 'is_active', 'is_staff', 'email_verified', 'phone_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone')}),
        (_('Settings'), {'fields': ('user_type', 'preferred_language')}),
        (_('Verification'), {'fields': ('email_verified', 'phone_verified')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'user_type'),
        }),
    )


@admin.register(MoverProfile)
class MoverProfileAdmin(admin.ModelAdmin):
    """Admin configuration for MoverProfile model."""
    list_display = ['company_name', 'user', 'city', 'is_verified', 'is_active', 'rating', 'completed_orders']
    list_filter = ['is_verified', 'is_active', 'city']
    search_fields = ['company_name', 'company_name_he', 'user__email', 'city']
    readonly_fields = ['rating', 'total_reviews', 'completed_orders', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    """Admin configuration for CustomerProfile model."""
    list_display = ['user', 'total_orders', 'spam_score', 'created_at']
    list_filter = ['spam_score']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['total_orders', 'spam_score', 'created_at', 'updated_at']
    ordering = ['-created_at']
