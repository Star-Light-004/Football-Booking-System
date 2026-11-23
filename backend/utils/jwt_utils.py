import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions

ALGORITHM = 'HS256'
ACCESS_TOKEN_LIFETIME_DAYS = 7


def generate_jwt_token(user):
    """
    Sinh JWT access_token cho đối tượng Customers.
    Thời hạn mặc định: 7 ngày.
    """
    now = datetime.utcnow()
    payload = {
        'user_id': str(user.id),
        'role': getattr(user, 'role', 'customer'),
        'email': getattr(user, 'email', ''),
        'fullname': getattr(user, 'full_name', '') or getattr(user, 'fullname', ''),
        'iat': now,
        'exp': now + timedelta(days=ACCESS_TOKEN_LIFETIME_DAYS),
        'token_type': 'access',
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    return token


def decode_jwt_token(token):
    """
    Giải mã và xác thực chữ ký JWT.
    Trả về payload nếu hợp lệ, None nếu hết hạn hoặc không hợp lệ.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


class JWTAuthentication(BaseAuthentication):
    """
    DRF Authentication Backend cho JWT Token.
    Đọc token từ header: Authorization: Bearer <token>
    Hỗ trợ tương thích ngược: Nếu token không hợp lệ hoặc là phiên cũ, trả về None
    để request không bị ngắt đột ngột bằng 403 và cho phép fallback sang X-User-Id.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        payload = decode_jwt_token(token)
        if not payload:
            return None

        user_id = payload.get('user_id')
        if not user_id:
            return None

        try:
            from apps.users.models import Customers
            user = Customers.objects.filter(id=user_id, is_active=True).first()
            if not user:
                return None
            return (user, token)
        except Exception:
            return None


def get_authenticated_user(request):
    """
    Hàm helper lấy thông tin user hiện tại:
    1. Ưu tiên lấy từ JWT Token trong Authorization: Bearer <token>
    2. Nếu không có token, hỗ trợ tương thích ngược qua X-User-Id
    """
    auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            payload = decode_jwt_token(parts[1])
            if payload and payload.get('user_id'):
                from apps.users.models import Customers
                user = Customers.objects.filter(id=payload['user_id'], is_active=True).first()
                if user:
                    return user

    # Fallback tương thích ngược phiên cũ
    fallback_id = request.headers.get('X-User-Id')
    if fallback_id:
        from apps.users.models import Customers
        return Customers.objects.filter(id=fallback_id, is_active=True).first()

    return None

