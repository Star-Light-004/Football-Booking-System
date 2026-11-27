from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import Voucher, CustomerVoucher
from .serializers import VoucherSerializer, AdminVoucherSerializer, CustomerVoucherSerializer
from .services import validate_voucher_for_customer, award_completion_voucher


@api_view(['GET'])
@permission_classes([AllowAny])
def get_customer_vouchers(request):
    """
    Lấy danh sách kho voucher của khách hàng.
    Query params: customer_id (bắt buộc), filter (active | used | expired | all)
    """
    customer_id = request.query_params.get('customer_id')
    if not customer_id:
        return Response({'error': 'Thiếu tham số customer_id'}, status=status.HTTP_400_BAD_REQUEST)

    filter_type = request.query_params.get('filter', 'all')
    # Chỉ lấy các voucher hợp lệ được sinh ra từ đơn đặt sân đã hoàn thành (source_booking ở trạng thái Completed)
    queryset = CustomerVoucher.objects.select_related('voucher', 'source_booking').filter(
        customer_id=customer_id,
        source_booking__isnull=False,
        source_booking__status__in=['Completed', 'completed', 'hoàn thành']
    )

    now = timezone.now()
    if filter_type == 'active':
        queryset = queryset.filter(is_used=False, valid_until__gt=now, voucher__is_active=True)
    elif filter_type == 'used':
        queryset = queryset.filter(is_used=True)
    elif filter_type == 'expired':
        queryset = queryset.filter(is_used=False, valid_until__lte=now)

    serializer = CustomerVoucherSerializer(queryset, many=True)
    
    # Thống kê nhanh: chỉ tính các voucher từ đơn hoàn thành
    active_count = CustomerVoucher.objects.filter(
        customer_id=customer_id,
        source_booking__isnull=False,
        source_booking__status__in=['Completed', 'completed', 'hoàn thành'],
        is_used=False,
        valid_until__gt=now,
        voucher__is_active=True
    ).count()

    return Response({
        'vouchers': serializer.data,
        'active_count': active_count
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_voucher(request):
    """
    Kiểm tra và tính toán giảm giá cho mã voucher.
    Body: { "code": "...", "customer_id": "...", "total_price": 300000 }
    """
    data = request.data or {}
    code = data.get('code')
    customer_id = data.get('customer_id')
    total_price = data.get('total_price', 0)
    field_price = data.get('field_price')
    service_price = data.get('service_price', 0)

    if not code:
        return Response({'error': 'Vui lòng cung cấp mã giảm giá'}, status=status.HTTP_400_BAD_REQUEST)

    result = validate_voucher_for_customer(
        code=code,
        customer_id=customer_id,
        total_price=total_price,
        field_price=field_price,
        service_price=service_price
    )
    
    if not result.get('valid'):
        return Response({'error': result.get('error', 'Mã giảm giá không hợp lệ')}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_vouchers(request):
    """
    Lấy danh sách các voucher công khai đang hoạt động (không phải voucher quà tặng cá nhân).
    """
    vouchers = Voucher.objects.filter(is_active=True, is_system_reward=False)
    serializer = VoucherSerializer(vouchers, many=True)
    return Response(serializer.data)


# ═════════════════════════════════════════════════════════════════════════════
# 🔹 ADMIN CRUD VOUCHER APIS
# ═════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def admin_get_all_vouchers(request):
    """
    API Admin: Lấy toàn bộ danh sách voucher + số liệu thống kê
    Bảo mật: Yêu cầu quyền 'vouchers_view' hoặc vai trò 'admin'.
    """
    from utils.jwt_utils import get_authenticated_user
    from apps.users.permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'vouchers_view'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền xem chính sách voucher."}, status=status.HTTP_403_FORBIDDEN)

    vouchers = Voucher.objects.all().order_by('-created_at')
    serializer = AdminVoucherSerializer(vouchers, many=True)

    total_vouchers = vouchers.count()
    active_vouchers = vouchers.filter(is_active=True).count()
    system_rewards = vouchers.filter(is_system_reward=True).count()
    
    try:
        from apps.bookings.models import Bookings
        completed_voucher_bookings = Bookings.objects.filter(
            voucher_code__isnull=False,
            status='Completed'
        ).exclude(voucher_code='').count()
        direct_cv_used = CustomerVoucher.objects.filter(
            is_used=True
        ).exclude(used_booking__status='Completed').count()
        total_used_count = completed_voucher_bookings + direct_cv_used
    except Exception:
        total_used_count = CustomerVoucher.objects.filter(is_used=True).count()

    return Response({
        'vouchers': serializer.data,
        'stats': {
            'total': total_vouchers,
            'active': active_vouchers,
            'system_rewards': system_rewards,
            'total_used': total_used_count,
        }
    })


@api_view(['POST'])
def admin_create_voucher(request):
    """
    API Admin: Tạo mới một voucher
    Bảo mật: Yêu cầu quyền 'vouchers_create' hoặc vai trò 'admin'.
    """
    from utils.jwt_utils import get_authenticated_user
    from apps.users.permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'vouchers_create'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền tạo mới voucher."}, status=status.HTTP_403_FORBIDDEN)

    data = request.data or {}
    code = str(data.get('code', '')).strip().upper()
    title = str(data.get('title', '')).strip()

    if not code:
        return Response({'error': 'Mã voucher không được để trống'}, status=status.HTTP_400_BAD_REQUEST)
    if not title:
        return Response({'error': 'Tiêu đề voucher không được để trống'}, status=status.HTTP_400_BAD_REQUEST)

    if Voucher.objects.filter(code__iexact=code).exists():
        return Response({'error': f'Mã voucher "{code}" đã tồn tại trên hệ thống'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        discount_value = float(data.get('discount_value', 0))
        if discount_value <= 0:
            return Response({'error': 'Giá trị giảm giá phải lớn hơn 0'}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = data.get('discount_type', 'percent')
        if discount_type == 'percent' and discount_value > 100:
            return Response({'error': 'Phần trăm giảm giá không thể vượt quá 100%'}, status=status.HTTP_400_BAD_REQUEST)

        max_discount = data.get('max_discount')
        max_discount_val = float(max_discount) if max_discount not in (None, '') else None

        min_booking_price = data.get('min_booking_price')
        min_booking_price_val = float(min_booking_price) if min_booking_price not in (None, '') else 0

        expiry_days = int(data.get('expiry_days', 30))
        usage_limit = data.get('usage_limit')
        usage_limit_val = int(usage_limit) if usage_limit not in (None, '', 'null') else None

        is_system_reward = bool(data.get('is_system_reward', False))
        is_active = bool(data.get('is_active', True))
        applicable_to = data.get('applicable_to', 'all')
        if applicable_to not in ('field_only', 'all'):
            applicable_to = 'all'
        description = data.get('description', '')

        voucher = Voucher.objects.create(
            code=code,
            title=title,
            description=description,
            discount_type=discount_type,
            discount_value=discount_value,
            max_discount=max_discount_val,
            min_booking_price=min_booking_price_val,
            applicable_to=applicable_to,
            expiry_days=expiry_days,
            usage_limit=usage_limit_val,
            is_system_reward=is_system_reward,
            is_active=is_active
        )

        serializer = AdminVoucherSerializer(voucher)
        return Response({
            'message': 'Tạo voucher thành công',
            'voucher': serializer.data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': f'Lỗi tạo voucher: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
def admin_update_voucher(request, voucher_id):
    """
    API Admin: Cập nhật thông tin voucher
    Bảo mật: Yêu cầu quyền 'vouchers_edit' hoặc vai trò 'admin'.
    """
    from utils.jwt_utils import get_authenticated_user
    from apps.users.permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'vouchers_edit'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền cập nhật voucher."}, status=status.HTTP_403_FORBIDDEN)

    try:
        voucher = Voucher.objects.get(id=voucher_id)
    except Voucher.DoesNotExist:
        return Response({'error': 'Không tìm thấy voucher'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data or {}
    code = data.get('code')
    if code:
        code_clean = str(code).strip().upper()
        if code_clean != voucher.code and Voucher.objects.filter(code__iexact=code_clean).exclude(id=voucher_id).exists():
            return Response({'error': f'Mã voucher "{code_clean}" đã được sử dụng'}, status=status.HTTP_400_BAD_REQUEST)
        voucher.code = code_clean

    if 'title' in data:
        voucher.title = str(data['title']).strip()
    if 'description' in data:
        voucher.description = data['description']
    if 'discount_type' in data:
        voucher.discount_type = data['discount_type']
    if 'discount_value' in data:
        voucher.discount_value = float(data['discount_value'])
    if 'max_discount' in data:
        val = data['max_discount']
        voucher.max_discount = float(val) if val not in (None, '') else None
    if 'min_booking_price' in data:
        val = data['min_booking_price']
        voucher.min_booking_price = float(val) if val not in (None, '') else 0
    if 'expiry_days' in data:
        voucher.expiry_days = int(data['expiry_days'])
    if 'usage_limit' in data:
        val = data['usage_limit']
        voucher.usage_limit = int(val) if val not in (None, '', 'null') else None
    if 'applicable_to' in data:
        val = data['applicable_to']
        voucher.applicable_to = val if val in ('field_only', 'all') else 'all'
    if 'is_system_reward' in data:
        voucher.is_system_reward = bool(data['is_system_reward'])
    if 'is_active' in data:
        voucher.is_active = bool(data['is_active'])

    try:
        voucher.save()
        serializer = AdminVoucherSerializer(voucher)
        return Response({
            'message': 'Cập nhật voucher thành công',
            'voucher': serializer.data
        })
    except Exception as e:
        return Response({'error': f'Lỗi cập nhật voucher: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def admin_delete_voucher(request, voucher_id):
    """
    API Admin: Xóa voucher
    Bảo mật: Yêu cầu quyền 'vouchers_delete' hoặc vai trò 'admin'.
    """
    from utils.jwt_utils import get_authenticated_user
    from apps.users.permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'vouchers_delete'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền xóa voucher."}, status=status.HTTP_403_FORBIDDEN)

    try:
        voucher = Voucher.objects.get(id=voucher_id)
        used_count = voucher.customer_instances.filter(is_used=True).count()
        if used_count > 0:
            voucher.is_active = False
            voucher.save()
            return Response({
                'message': f'Voucher đã có {used_count} lượt sử dụng nên đã được chuyển sang trạng thái "Ngưng hoạt động" để bảo toàn lịch sử giao dịch.',
                'deactivated': True
            })

        voucher.delete()
        return Response({'message': 'Xóa voucher thành công'})
    except Voucher.DoesNotExist:
        return Response({'error': 'Không tìm thấy voucher'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Lỗi xóa voucher: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def admin_get_customer_vouchers(request):
    """
    API Admin: Lấy danh sách lịch sử tất cả các mã voucher cá nhân (mã con) đã cấp cho khách hàng.
    Bảo mật: Yêu cầu quyền 'vouchers_view' hoặc vai trò 'admin'.
    """
    from utils.jwt_utils import get_authenticated_user
    from apps.users.permissions import check_role_has_permission

    caller = get_authenticated_user(request)
    if not caller:
        return Response({"error": "Yêu cầu đăng nhập: Vui lòng cung cấp JWT Token hợp lệ."}, status=status.HTTP_401_UNAUTHORIZED)
    if caller.role != 'admin' and not check_role_has_permission(caller.role, 'vouchers_view'):
        return Response({"error": "Truy cập bị từ chối: Tài khoản không có quyền xem lịch sử voucher."}, status=status.HTTP_403_FORBIDDEN)

    from .serializers import AdminCustomerVoucherSerializer
    from django.db.models import Q
    from django.utils import timezone
    qs = CustomerVoucher.objects.select_related('customer', 'voucher', 'source_booking', 'used_booking').all().order_by('-created_at')

    voucher_id = request.GET.get('voucher_id')
    if voucher_id:
        qs = qs.filter(voucher_id=voucher_id)

    status_filter = request.GET.get('status')
    if status_filter == 'used':
        qs = qs.filter(is_used=True)
    elif status_filter == 'active':
        qs = qs.filter(is_used=False, valid_until__gte=timezone.now())
    elif status_filter == 'expired':
        qs = qs.filter(is_used=False, valid_until__lt=timezone.now())

    search = request.GET.get('search')
    if search:
        search = search.strip()
        qs = qs.filter(
            Q(code__icontains=search) |
            Q(customer__full_name__icontains=search) |
            Q(customer__phone__icontains=search)
        )

    serializer = AdminCustomerVoucherSerializer(qs, many=True)
    return Response({
        'issued_vouchers': serializer.data,
        'total': qs.count()
    })
