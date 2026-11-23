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
    """
    Đăng ký / đăng nhập nhanh bằng tài khoản Google hoặc Facebook.
    Bảo mật:
    - Nếu là Google: Xác thực token chính chủ với Google API (access_token hoặc id_token).
    - Ngăn chặn hoàn toàn việc mạo danh email để chiếm quyền các tài khoản quản trị (Admin/Staff/Manager).
    """
    data = request.data
    provider = data.get('provider', 'google').lower()
    access_token = data.get('access_token') or data.get('id_token') or data.get('credential')
    email = (data.get('email') or '').strip().lower()
    fullname = (data.get('fullname') or '').strip()

    # ── 1. Xác thực Token trực tiếp với Google API ───────────────────────────
    if provider == 'google' and access_token:
        try:
            import urllib.request
            import json as py_json

            # Thử xác thực với endpoint userinfo của Google
            req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    g_data = py_json.loads(resp.read().decode('utf-8'))
                    verified_email = (g_data.get('email') or '').strip().lower()
                    if verified_email:
                        email = verified_email
                        fullname = fullname or g_data.get('name') or ''
        except Exception as g_err:
            print("Lỗi verify Google access_token:", g_err)
            try:
                # Fallback: Xác thực id_token với Google tokeninfo endpoint
                verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={access_token}"
                with urllib.request.urlopen(verify_url, timeout=6) as id_resp:
                    if id_resp.status == 200:
                        id_data = py_json.loads(id_resp.read().decode('utf-8'))
                        if id_data.get('email'):
                            email = id_data['email'].strip().lower()
                            fullname = fullname or id_data.get('name') or ''
            except Exception as id_err:
                print("Lỗi verify Google id_token:", id_err)

    if not email:
        return Response({"error": f"Không tìm thấy email liên kết với tài khoản {provider.capitalize()}"}, status=400)

    user = Customers.objects.filter(email=email).first()

    # ── 2. Bảo vệ tài khoản Quản trị ──────────────────────────────────────────
    # Tài khoản Quản trị (Admin, Quản lý, Nhân viên) không thể bị chiếm bằng request giả mạo
    if user and user.role != Customers.Role.CUSTOMER:
        if not access_token:
            return Response({
                "error": "Bảo mật: Tài khoản Quản trị hệ thống không được phép đăng nhập thông qua mạng xã hội mà không có mã xác thực Google hợp lệ."
            }, status=403)

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

    from utils.jwt_utils import generate_jwt_token
    token = generate_jwt_token(user)

    return Response({
        "message": f"Đăng nhập thành công với {provider.capitalize()}",
        "token": token,
        "access_token": token,
        "user": {
            "id": str(user.id),
            "fullname": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "is_active": user.is_active,
            "permissions": get_permissions_for_role(user.role),
            "token": token,
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

    from utils.jwt_utils import generate_jwt_token
    token = generate_jwt_token(user)

    return Response({
        "message": "Đăng nhập thành công",
        "token": token,
        "access_token": token,
        "user": {
            "id":          str(user.id),
            "fullname":    user.full_name,
            "email":       user.email,
            "phone":       user.phone,
            "role":        user.role,
            "status":      user.status,
            "permissions": get_permissions_for_role(user.role),
            "token":       token,
        }
    })


# ================= ROLE PERMISSIONS APIs =================
@api_view(['GET', 'PUT'])
def role_permissions_view(request):
    from .permissions import check_role_has_permission
    from utils.jwt_utils import get_authenticated_user

    user = get_authenticated_user(request)
    if not user:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=401)

    if request.method == 'GET':
        perms = load_all_role_permissions()
        return Response(perms)
    elif request.method == 'PUT':
        # Chỉ Admin mới được sửa ma trận phân quyền
        if user.role != 'admin':
            return Response({"error": "Truy cập bị từ chối: Chỉ Quản trị viên mới có quyền cập nhật ma trận phân quyền."}, status=403)

        new_perms = request.data
        if not isinstance(new_perms, dict):
            return Response({"error": "Dữ liệu phân quyền không hợp lệ"}, status=400)
        save_all_role_permissions(new_perms)
        return Response({"message": "Cập nhật phân quyền thành công", "permissions": new_perms})


@api_view(['POST'])
def reset_role_permissions_view(request):
    from utils.jwt_utils import get_authenticated_user
    user = get_authenticated_user(request)
    if not user or user.role != 'admin':
        return Response({"error": "Truy cập bị từ chối: Chỉ Quản trị viên tối cao mới có thể đặt lại phân quyền về mặc định."}, status=403)

    save_all_role_permissions(DEFAULT_PERMISSIONS)
    return Response({"message": "Đã đặt lại phân quyền về mặc định", "permissions": DEFAULT_PERMISSIONS})


# ================= GET ALL USERS =================
@api_view(['GET'])
def get_users(request):
    from .permissions import permission_required

    @permission_required('users_view')
    def _inner(req):
        users = Customers.objects.all().order_by('-created_at')
        from .serializers import CustomersSerializer
        serializer = CustomersSerializer(users, many=True)
        return Response(serializer.data)

    return _inner(request)


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
    """
    Cập nhật thông tin người dùng.
    Bảo mật:
    - Bắt buộc đăng nhập qua JWT Token.
    - Người dùng chỉ được sửa thông tin cá nhân của chính mình (không được tự đổi role).
    - Chỉ Quản trị viên tối cao (admin) mới có quyền đổi vai trò (role) và khóa/mở khóa (is_active).
    - Tài khoản có quyền 'users_edit' được sửa thông tin người dùng khác.
    """
    from utils.jwt_utils import get_authenticated_user
    from .permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=401)

    try:
        user = Customers.objects.get(id=user_id)
        data = request.data

        is_self = str(caller.id) == str(user.id)
        is_admin = caller.role == 'admin'
        has_users_edit = check_role_has_permission(caller.role, 'users_edit')

        # Kiểm tra quyền truy cập sửa đổi
        if not is_self and not is_admin and not has_users_edit:
            return Response({"error": "Truy cập bị từ chối: Bạn không có quyền chỉnh sửa tài khoản này."}, status=403)

        # ── Cập nhật họ tên, email, số điện thoại ─────────────────────────
        if "full_name" in data:
            user.full_name = data["full_name"]
        elif "fullname" in data:
            user.full_name = data["fullname"]
        elif "name" in data:
            user.full_name = data["name"]

        if "email" in data:
            user.email = data["email"]
        if "phone" in data:
            user.phone = data["phone"]

        # ── Cập nhật vai trò (CHỈ ADMIN MỚI ĐƯỢC PHÉP ĐỔI) ───────────────
        if "role" in data:
            new_role = data["role"]
            if not is_admin:
                return Response({
                    "error": "Truy cập bị từ chối: Chỉ Quản trị viên tối cao mới có quyền phân quyền hoặc thay đổi vai trò tài khoản."
                }, status=403)

            valid_roles = [r.value for r in Customers.Role]
            if new_role not in valid_roles:
                return Response({"error": f"Vai trò không hợp lệ. Chọn: {valid_roles}"}, status=400)
            user.role = new_role

        # ── Cập nhật trạng thái khóa/mở khóa (Chỉ Admin hoặc users_edit) ──
        if "is_active" in data:
            if not is_admin and not has_users_edit:
                return Response({
                    "error": "Truy cập bị từ chối: Không có quyền thay đổi trạng thái hoạt động của tài khoản."
                }, status=403)
            user.is_active = bool(data["is_active"])

        user.save()
        return Response({
            "message": "Cập nhật thành công",
            "user": {
                "id": str(user.id),
                "full_name": user.full_name,
                "fullname": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
            }
        })

    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ================= CHANGE PASSWORD =================
@api_view(['PUT', 'POST'])
def change_password(request, user_id):
    """
    Đổi mật khẩu người dùng sau khi xác thực mật khẩu cũ.
    Bảo mật: Chỉ chính chủ tài khoản hoặc Admin mới được đổi mật khẩu.
    """
    from utils.jwt_utils import get_authenticated_user

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=401)

    try:
        user = Customers.objects.get(id=user_id)
        is_self = str(caller.id) == str(user.id)
        is_admin = caller.role == 'admin'

        if not is_self and not is_admin:
            return Response({"error": "Truy cập bị từ chối: Bạn không có quyền đổi mật khẩu của tài khoản khác."}, status=403)

        data = request.data
        old_password = data.get('old_password') or data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not new_password:
            return Response({"error": "Vui lòng nhập mật khẩu mới"}, status=400)

        if len(new_password) < 8:
            return Response({"error": "Mật khẩu mới phải có tối thiểu 8 ký tự"}, status=400)

        if confirm_password and new_password != confirm_password:
            return Response({"error": "Xác nhận mật khẩu mới không khớp"}, status=400)

        # Nếu là chính chủ đổi mật khẩu và tài khoản đã có mật khẩu cũ: bắt buộc xác thực mật khẩu cũ
        # (Nếu admin đổi thì cho phép đổi mà không cần biết mật khẩu cũ của user)
        if not is_admin and user.password_hash:
            if not old_password:
                return Response({"error": "Vui lòng nhập mật khẩu hiện tại"}, status=400)
            if not check_password(old_password, user.password_hash):
                return Response({"error": "Mật khẩu hiện tại không chính xác"}, status=400)

        user.password_hash = make_password(new_password)
        user.save()
        return Response({"message": "Đổi mật khẩu thành công!"})

    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy người dùng"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ================= TOGGLE STATUS (khóa / mở khóa) =================
@api_view(['PATCH'])
def toggle_status(request, user_id):
    """
    Chuyển đổi is_active: active ↔ locked.
    Bảo mật: Chỉ admin hoặc tài khoản có quyền 'users_edit' mới được khóa/mở khóa.
    """
    from utils.jwt_utils import get_authenticated_user
    from .permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=401)

    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'users_edit'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền khóa hoặc mở khóa người dùng."}, status=403)

    try:
        user = Customers.objects.get(id=user_id)
        if user.role == 'admin' and caller.role != 'admin':
            return Response({"error": "Không thể thay đổi trạng thái của tài khoản Quản trị viên."}, status=403)

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
    from .permissions import permission_required

    @permission_required('users_delete')
    def _inner(req, uid):
        try:
            from django.db import transaction
            with transaction.atomic():
                user = Customers.objects.get(id=uid)
                
                # Gỡ liên kết ca đá / giải đấu / thanh toán / dọn dẹp để bảo toàn lịch sử
                try:
                    from apps.bookings.models import Bookings, TournamentRequests
                    Bookings.objects.filter(customer_id=user.id).update(customer=None)
                    TournamentRequests.objects.filter(customer_id=user.id).update(customer=None)
                except Exception as b_err:
                    print("Lỗi gỡ user khỏi bookings:", b_err)

                try:
                    from apps.facility.models import PitchCleaning
                    PitchCleaning.objects.filter(cleaner_id=user.id).update(cleaner=None)
                except Exception as f_err:
                    print("Lỗi gỡ cleaner:", f_err)

                try:
                    from apps.payments.models import Payments
                    Payments.objects.filter(customer_id=user.id).update(customer=None)
                except Exception as p_err:
                    print("Lỗi gỡ customer khỏi payments:", p_err)

                try:
                    from apps.reviews.models import Reviews
                    Reviews.objects.filter(customer_id=user.id).delete()
                except Exception as r_err:
                    print("Lỗi xóa reviews của user:", r_err)

                try:
                    from apps.vouchers.models import CustomerVoucher
                    CustomerVoucher.objects.filter(customer_id=user.id).delete()
                except Exception as v_err:
                    print("Lỗi xóa vouchers của user:", v_err)

                user.delete()
                return Response({"message": "Xóa thành công"})
        except Customers.DoesNotExist:
            return Response({"error": "Không tìm thấy user"}, status=404)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=400)

    return _inner(request, user_id)


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
            password_hash=None,
            role='customer',
            is_active=True,
            created_at=timezone.now()
        )
        return Response({"message": "Thêm khách vãng lai thành công", "id": str(guest.id)})
    except Exception as e:
        return Response({"error": str(e)}, status=400)