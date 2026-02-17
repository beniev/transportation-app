"""
Custom permission classes for the application.
"""
from rest_framework import permissions


class IsMover(permissions.BasePermission):
    """
    Permission class that only allows movers to access the view.
    """
    message = "You must be a mover to perform this action."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'mover' and
            hasattr(request.user, 'mover_profile')
        )


class IsCustomer(permissions.BasePermission):
    """
    Permission class that only allows customers to access the view.
    """
    message = "You must be a customer to perform this action."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'customer'
        )


class IsOwnerOrMover(permissions.BasePermission):
    """
    Permission class that allows access to the owner of an object or a mover.
    """
    def has_object_permission(self, request, view, obj):
        # Movers can access
        if request.user.user_type == 'mover':
            # Check if the object belongs to this mover
            if hasattr(obj, 'mover'):
                return obj.mover == request.user.mover_profile
            if hasattr(obj, 'order') and hasattr(obj.order, 'mover'):
                return obj.order.mover == request.user.mover_profile
            return True

        # Customers can access their own objects
        if request.user.user_type == 'customer':
            if hasattr(obj, 'customer'):
                return obj.customer == request.user.customer_profile
            if hasattr(obj, 'order') and hasattr(obj.order, 'customer'):
                return obj.order.customer == request.user.customer_profile

        return False


class IsOwner(permissions.BasePermission):
    """
    Permission class that only allows owners of an object to access it.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        if hasattr(obj, 'mover'):
            return obj.mover.user == request.user
        return False


class IsMoverOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows movers full access, others read-only.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'mover'
        )


class IsAdminOrMover(permissions.BasePermission):
    """
    Permission class that allows admins and movers to access.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.user_type == 'mover')
        )
