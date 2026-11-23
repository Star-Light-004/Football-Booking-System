from functools import wraps
from rest_framework.response import Response
from utils.jwt_utils import get_authenticated_user

MODULE_PREFIX_MAP = {
    'dashboard': ['dashboard', 'dashboard_view'],
    'fields': ['fields', 'fields_view', 'fields_create', 'fields_edit', 'fields_delete'],
    'bookings': ['bookings', 'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel'],
    'users': ['users', 'users_view', 'users_create', 'users_edit', 'users_delete'],
    'revenue': ['revenue', 'revenue_view', 'revenue_export'],
    'timeslots': ['timeslots', 'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete'],
    'services': ['services', 'services_view', 'services_create', 'services_edit', 'services_delete'],
    'vouchers': ['vouchers', 'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete'],
    'maintenance': ['maintenance', 'maintenance_manage'],
    'cleaning': ['cleaning', 'cleaning_manage'],
}


def check_role_has_permission(role, required_permission):
    """Kiểm tra một role có permission cụ thể hay không."""
    if not role:
        return False
    if role == 'admin':
        return True

    from .views import get_permissions_for_role
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


def require_role(*allowed_roles):
    """
    Decorator kiểm tra vai trò người dùng xác thực qua JWT.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = get_authenticated_user(request)
            if not user:
                return Response({
                    "error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ để thực hiện thao tác này."
                }, status=401)

            # Admin luôn được phép
            if user.role == 'admin':
                request.authenticated_user = user
                return view_func(request, *args, **kwargs)

            if user.role not in allowed_roles:
                return Response({
                    "error": f"Truy cập bị từ chối: Yêu cầu vai trò {', '.join(allowed_roles)} (Vai trò hiện tại: {user.role})."
                }, status=403)

            request.authenticated_user = user
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def permission_required(permission_key):
    """
    Decorator cho Django REST Framework API views để kiểm tra quyền của request.
    Xác thực chữ ký JWT trước khi lấy vai trò của người dùng.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = get_authenticated_user(request)
            if not user:
                return Response({
                    "error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ để thực hiện thao tác này."
                }, status=401)

            # Gán user đã xác thực vào request
            request.authenticated_user = user

            # Admin có toàn quyền
            if user.role == 'admin':
                return view_func(request, *args, **kwargs)

            if not check_role_has_permission(user.role, permission_key):
                return Response(
                    {
                        "error": "Truy cập bị từ chối: Tài khoản không có quyền thao tác tính năng này.",
                        "required_permission": permission_key,
                        "current_role": user.role,
                    },
                    status=403
                )

            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
