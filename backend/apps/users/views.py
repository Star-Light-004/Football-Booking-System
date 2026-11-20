from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
import uuid
from django.contrib.auth.hashers import check_password, make_password

import json
import os
from django.conf import settings
from .models import Customers, RolePermission

ROLE_PERMISSIONS_FILE = os.path.join(settings.BASE_DIR, 'role_permissions.json')

DEFAULT_PERMISSIONS = {
    'customer': [
        'bookings_view', 'bookings_create',
    ],
    'field_owner': [
        'dashboard_view',
        'fields_view', 'fields_create', 'fields_edit', 'fields_delete',
        'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
        'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete',
        'services_view', 'services_create', 'services_edit', 'services_delete',
        'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete',
        'users_view', 'users_create', 'users_edit',
        'revenue_view', 'revenue_export',
        'maintenance_manage', 'cleaning_manage',
        'settings_manage',
    ],
    'field_manager': [
        'dashboard_view',
        'fields_view', 'fields_edit',
        'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
        'timeslots_view', 'timeslots_create', 'timeslots_edit',
        'services_view', 'services_create', 'services_edit',
        'vouchers_view', 'vouchers_create', 'vouchers_edit',
        'users_view',
        'revenue_view',
        'maintenance_manage', 'cleaning_manage',
    ],
    'receptionist': [
        'dashboard_view',
        'fields_view',
        'bookings_view', 'bookings_create', 'bookings_edit',
        'timeslots_view',
        'services_view',
        'vouchers_view',
        'users_view',
    ],
    'cashier': [
        'dashboard_view',
        'bookings_view', 'bookings_edit',
        'revenue_view', 'revenue_export',
        'services_view',
        'vouchers_view',
    ],
    'cleaner': [
        'dashboard_view',
        'cleaning_manage',
    ],
    'service_staff': [
        'dashboard_view',
        'services_view', 'services_create', 'services_edit',
        'bookings_view',
    ],
    'maintenance': [
        'dashboard_view',
        'fields_view',
        'maintenance_manage',
    ],
    'admin': [
        'dashboard_view',
        'fields_view', 'fields_create', 'fields_edit', 'fields_delete',
        'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
        'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete',
        'services_view', 'services_create', 'services_edit', 'services_delete',
        'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete',
        'users_view', 'users_create', 'users_edit', 'users_delete',
        'revenue_view', 'revenue_export',
        'maintenance_manage', 'cleaning_manage',
        'settings_manage',
    ],
}


def load_all_role_permissions():
    """Lấy danh sách quyền của tất cả role từ DB, fallback sang file JSON hoặc DEFAULT_PERMISSIONS."""
    perms = {k: list(v) for k, v in DEFAULT_PERMISSIONS.items()}
    try:
        db_records = RolePermission.objects.all()
        if db_records.exists():
            for rec in db_records:
                perms[rec.role] = rec.permissions
            return perms
    except Exception:
        pass

    if os.path.exists(ROLE_PERMISSIONS_FILE):
        try:
            with open(ROLE_PERMISSIONS_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    perms.update(saved)
                    return perms
        except Exception:
            pass

    return perms


def save_all_role_permissions(new_perms):
    """Lưu ma trận phân quyền vào cả file JSON và DB."""
    try:
        with open(ROLE_PERMISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(new_perms, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Lỗi lưu file role_permissions.json:", e)

    try:
        for role_name, p_list in new_perms.items():
            RolePermission.objects.update_or_create(
                role=role_name,
                defaults={'permissions': p_list}
            )
    except Exception as e:
        print("Lỗi lưu DB RolePermission:", e)


def get_permissions_for_role(role):
    """Lấy danh sách quyền cho role."""
    if role == 'admin':
        return list(DEFAULT_PERMISSIONS['admin'])
    all_perms = load_all_role_permissions()
    return all_perms.get(role, [])


# ================= REGISTER =================
@api_view(['POST'])
def register(request):
    data = request.data

    phone    = (data.get('phone') or '').strip()
    fullname = (data.get('fullname') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password')

    if not phone or not fullname or not password:
        return Response({"error": "Vui lòng điền đầy đủ các trường thông tin bắt buộc"}, status=400)

    # ── Kiểm tra định dạng dữ liệu (Validation) ─────────────────────────────
    import re
    if len(fullname) < 2:
        return Response({"error": "Họ và tên phải có tối thiểu 2 ký tự"}, status=400)

    if email:
        if not re.match(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', email):
            return Response({"error": "Gmail phải có đuôi @gmail.com (ví dụ: example@gmail.com)"}, status=400)

    # Chuẩn hóa và kiểm tra số điện thoại Việt Nam (10 số, đầu 03, 05, 07, 08, 09)
    clean_phone = re.sub(r'[\s\.\-\(\)]', '', phone)
    if clean_phone.startswith('+84'):
        clean_phone = '0' + clean_phone[3:]
    if not re.match(r'^(0[35789])[0-9]{8}$', clean_phone):
        return Response({"error": "Số điện thoại không hợp lệ (phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)"}, status=400)

    if len(password) < 8:
        return Response({"error": "Mật khẩu phải có tối thiểu 8 ký tự"}, status=400)

    if Customers.objects.filter(phone=clean_phone).exists():
        return Response({"error": "Số điện thoại này đã có người đăng ký"}, status=400)

    if email and Customers.objects.filter(email=email).exists():
        return Response({"error": "Gmail này đã có người đăng ký"}, status=400)

    Customers.objects.create(
        full_name=fullname,
        phone=clean_phone,
        email=email,
        password_hash=make_password(password),
        role=Customers.Role.CUSTOMER,   # mặc định: khách hàng
        is_active=True,
        created_at=timezone.now()
    )

    return Response({"message": "Đăng ký thành công"})


# ================= CHECK USER EXISTS =================
@api_view(['GET'])
def check_user_exists(request):
    """Kiểm tra số điện thoại hoặc gmail đã được đăng ký trước đó hay chưa."""
    phone = (request.query_params.get('phone') or '').strip()
    email = (request.query_params.get('email') or '').strip().lower()

    response_data = {
        'phone_exists': False,
        'email_exists': False
    }

    import re
    if phone:
        clean_phone = re.sub(r'[\s\.\-\(\)]', '', phone)
        if clean_phone.startswith('+84'):
            clean_phone = '0' + clean_phone[3:]
        if Customers.objects.filter(phone=clean_phone).exists():
            response_data['phone_exists'] = True

    if email:
        if Customers.objects.filter(email=email).exists():
            response_data['email_exists'] = True

    return Response(response_data)


# ================= SOCIAL AUTH (GOOGLE & FACEBOOK) =================
@api_view(['POST'])
def social_auth(request):
    """Đăng ký / đăng nhập nhanh bằng tài khoản Google hoặc Facebook."""
    data = request.data
    provider = data.get('provider', 'google')
    email = (data.get('email') or '').strip().lower()
    fullname = (data.get('fullname') or '').strip()

    if not email:
        return Response({"error": f"Không tìm thấy email liên kết với tài khoản {provider.capitalize()}"}, status=400)

    user = Customers.objects.filter(email=email).first()

    if not user:
        user = Customers.objects.create(
            full_name=fullname or f"Khách hàng {provider.capitalize()}",
            email=email,
            phone=data.get('phone') or '',
            role=Customers.Role.CUSTOMER,
            is_active=True,
            created_at=timezone.now()
        )
    else:
        if not user.is_active:
            return Response({"error": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."}, status=403)
        if fullname and not user.full_name:
            user.full_name = fullname
            user.save()

    return Response({
        "message": f"Đăng nhập thành công với {provider.capitalize()}",
        "user": {
            "id": str(user.id),
            "fullname": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "is_active": user.is_active,
        }
    })


# ================= LOGIN =================
@api_view(['POST'])
def login(request):
    data = request.data

    identifier = data.get('identifier')   # email hoặc phone
    password   = data.get('password')

    if not identifier or not password:
        return Response({"error": "Vui lòng nhập tài khoản và mật khẩu"}, status=400)

    user = (
        Customers.objects.filter(email=identifier).first()
        or Customers.objects.filter(phone=identifier).first()
    )

    # Bảo mật: Không thông báo cụ thể tài khoản không tồn tại hay sai mật khẩu
    # để tránh tấn công dò quét tài khoản (User Enumeration).
    if not user or not check_password(password, user.password_hash):
        return Response({"error": "Tài khoản hoặc mật khẩu không chính xác"}, status=400)

    # ── Kiểm tra tài khoản bị khóa ──────────────────────────────────────────
    if not user.is_active:
        return Response({"error": "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."}, status=403)

    return Response({
        "message": "Đăng nhập thành công",
        "user": {
            "id":          str(user.id),
            "fullname":    user.full_name,
            "email":       user.email,
            "phone":       user.phone,
            "role":        user.role,
            "status":      user.status,
            "permissions": get_permissions_for_role(user.role),
        }
    })


# ================= ROLE PERMISSIONS APIs =================
@api_view(['GET', 'PUT'])
def role_permissions_view(request):
    if request.method == 'GET':
        perms = load_all_role_permissions()
        return Response(perms)
    elif request.method == 'PUT':
        new_perms = request.data
        if not isinstance(new_perms, dict):
            return Response({"error": "Dữ liệu phân quyền không hợp lệ"}, status=400)
        save_all_role_permissions(new_perms)
        return Response({"message": "Cập nhật phân quyền thành công", "permissions": new_perms})


@api_view(['POST'])
def reset_role_permissions_view(request):
    save_all_role_permissions(DEFAULT_PERMISSIONS)
    return Response({"message": "Đã đặt lại phân quyền về mặc định", "permissions": DEFAULT_PERMISSIONS})


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


# ================= CREATE GUEST USER =================
@api_view(['POST'])
def create_guest_user(request):
    """Tạo hồ sơ khách vãng lai (không cần mật khẩu đăng nhập)."""
    try:
        data = request.data
        phone = str(data.get('phone', '')).strip()
        fullname = str(data.get('fullname', '')).strip() or 'Khách vãng lai'
        email = str(data.get('email', '')).strip()

        if not phone:
            return Response({"error": "Vui lòng nhập số điện thoại"}, status=400)

        existing = Customers.objects.filter(phone=phone).first()
        if existing:
            return Response({"error": "Số điện thoại này đã tồn tại trong hệ thống"}, status=400)

        guest = Customers.objects.create(
            id=uuid.uuid4(),
            full_name=fullname,
            phone=phone,
            email=email,
            user=None,
            password_hash=None,
            role='customer',
            is_active=True,
            created_at=timezone.now()
        )
        return Response({"message": "Thêm khách vãng lai thành công", "id": str(guest.id)})
    except Exception as e:
        return Response({"error": str(e)}, status=400)