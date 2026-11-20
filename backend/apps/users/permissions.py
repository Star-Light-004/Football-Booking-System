from functools import wraps
from rest_framework.response import Response
from .views import get_permissions_for_role

MODULE_PREFIX_MAP = {
    'dashboard': ['dashboard', 'dashboard_view'],
    'fields': ['fields', 'fields_view', 'fields_create', 'fields_edit', 'fields_delete'],
    'bookings': ['bookings', 'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel'],
    'users': ['users', 'users_view', 'users_create', 'users_edit', 'users_delete'],
    'revenue': ['revenue', 'revenue_view', 'revenue_export'],
    'timeslots': ['timeslots', 'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete'],
    'services': ['services', 'services_view', 'services_create', 'services_edit', 'services_delete'],
    'vouchers': ['vouchers', 'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete'],
    'settings': ['settings', 'settings_manage'],
    'maintenance': ['maintenance', 'maintenance_manage'],
    'cleaning': ['cleaning', 'cleaning_manage'],
}


def check_role_has_permission(role, required_permission):
    """Kiểm tra một role có permission cụ thể hay không."""
    if not role:
        return False
    if role == 'admin':
        return True

    perms = get_permissions_for_role(role)
    if not isinstance(perms, list):
        return False

    if required_permission in perms:
        return True

    # Kiểm tra theo module prefix
    if required_permission in MODULE_PREFIX_MAP:
        allowed = MODULE_PREFIX_MAP[required_permission]
        return any(p in allowed for p in perms)

    for mod, actions in MODULE_PREFIX_MAP.items():
        if required_permission in actions and mod in perms:
            return True

    return False


def permission_required(permission_key):
    """
    Decorator cho Django REST Framework API views để kiểm tra quyền của request.
    Đọc role từ HTTP header 'X-User-Role' hoặc request.user.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # 1. Lấy role từ HTTP Header hoặc request.user
            role = (
                request.META.get('HTTP_X_USER_ROLE')
                or getattr(getattr(request, 'user', None), 'role', None)
            )

            # Nếu không truyền role (ví dụ client gọi public hoặc hệ thống nội bộ), cho phép hoặc kiểm tra nếu view yêu cầu
            if not role:
                return view_func(request, *args, **kwargs)

            if not check_role_has_permission(role, permission_key):
                return Response(
                    {
                        "error": "Truy cập bị từ chối: Tài khoản không có quyền thao tác tính năng này.",
                        "required_permission": permission_key,
                        "current_role": role,
                    },
                    status=403
                )

            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

