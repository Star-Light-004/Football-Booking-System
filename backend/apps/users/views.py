from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
import uuid
from django.contrib.auth.hashers import check_password, make_password

from .models import Customers


# ================= REGISTER =================
@api_view(['POST'])
def register(request):
    data = request.data

    phone    = data.get('phone')
    fullname = data.get('fullname')
    email    = data.get('email')
    password = data.get('password')

    if not phone or not fullname or not password:
        return Response({"error": "Thiếu dữ liệu bắt buộc"}, status=400)

    if Customers.objects.filter(phone=phone).exists():
        return Response({"error": "Số điện thoại đã tồn tại"}, status=400)

    if email and Customers.objects.filter(email=email).exists():
        return Response({"error": "Email đã tồn tại"}, status=400)

    Customers.objects.create(
        full_name=fullname,
        phone=phone,
        email=email,
        password_hash=make_password(password),
        role=Customers.Role.CUSTOMER,   # mặc định: khách hàng
        is_active=True,
        created_at=timezone.now()
    )

    return Response({"message": "Đăng ký thành công"})


# ================= LOGIN =================
@api_view(['POST'])
def login(request):
    data = request.data

    identifier = data.get('identifier')   # email hoặc phone
    password   = data.get('password')

    if not identifier or not password:
        return Response({"error": "Thiếu dữ liệu"}, status=400)

    user = (
        Customers.objects.filter(email=identifier).first()
        or Customers.objects.filter(phone=identifier).first()
    )

    if not user:
        return Response({"error": "Tài khoản không tồn tại"}, status=404)

    # ── Kiểm tra tài khoản bị khóa ──────────────────────────────────────────
    if not user.is_active:
        return Response({"error": "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."}, status=403)

    if not check_password(password, user.password_hash):
        return Response({"error": "Sai mật khẩu"}, status=400)

    return Response({
        "message": "Đăng nhập thành công",
        "user": {
            "id":       str(user.id),
            "fullname": user.full_name,
            "email":    user.email,
            "phone":    user.phone,
            "role":     user.role,
            "status":   user.status,
        }
    })


# ================= GET ALL USERS =================
@api_view(['GET'])
def get_users(request):
    users = Customers.objects.all().order_by('-created_at')

    from .serializers import CustomersSerializer
    serializer = CustomersSerializer(users, many=True)
    return Response(serializer.data)


# ================= GET PROFILE =================
@api_view(['GET'])
def get_profile(request):
    user_id = request.GET.get('user_id')

    if not user_id:
        return Response({"error": "Thiếu user_id"}, status=400)

    try:
        user_uuid = uuid.UUID(user_id)
        user = Customers.objects.get(id=user_uuid)
    except ValueError:
        return Response({"error": "user_id không hợp lệ"}, status=400)
    except Customers.DoesNotExist:
        return Response({"error": "User không tồn tại"}, status=404)

    from .serializers import ProfileSerializer
    serializer = ProfileSerializer(user)
    return Response(serializer.data)


# ================= UPDATE USER =================
@api_view(['PUT'])
def update_user(request, user_id):
    try:
        user = Customers.objects.get(id=user_id)
        data = request.data

        if "fullname" in data:
            user.full_name = data["fullname"]
        if "email" in data:
            user.email = data["email"]
        if "phone" in data:
            user.phone = data["phone"]

        # ── Cập nhật vai trò ──────────────────────────────────────────────
        if "role" in data:
            valid_roles = [r.value for r in Customers.Role]
            if data["role"] not in valid_roles:
                return Response({"error": f"Vai trò không hợp lệ. Chọn: {valid_roles}"}, status=400)
            user.role = data["role"]

        # ── Cập nhật trạng thái ───────────────────────────────────────────
        if "is_active" in data:
            user.is_active = bool(data["is_active"])

        user.save()
        return Response({"message": "Cập nhật thành công"})

    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ================= TOGGLE STATUS (khóa / mở khóa) =================
@api_view(['PATCH'])
def toggle_status(request, user_id):
    """Chuyển đổi is_active: active ↔ locked."""
    try:
        user = Customers.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        return Response({
            "message": "Mở khóa thành công" if user.is_active else "Khóa tài khoản thành công",
            "is_active": user.is_active,
            "status":    user.status,
        })
    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ================= DELETE USER =================
@api_view(['DELETE'])
def delete_user(request, user_id):
    try:
        user = Customers.objects.get(id=user_id)
        user.delete()
        return Response({"message": "Xóa thành công"})
    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)