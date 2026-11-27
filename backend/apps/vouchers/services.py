from decimal import Decimal
from datetime import timedelta
import uuid
from django.utils import timezone
from .models import Voucher, CustomerVoucher


def award_completion_voucher(booking):
    """
    Tự động tặng voucher cho khách hàng khi đơn đặt sân chuyển sang trạng thái 'completed'.
    Đảm bảo tính bất biến (idempotent): Một booking chỉ được tặng voucher 1 lần duy nhất.
    """
    if not booking or not booking.customer:
        print("[Voucher] Booking does not have customer. Skipping voucher.")
        return None

    # Chỉ tặng voucher cho đơn có trạng thái hoàn thành (Completed)
    if str(booking.status or '').strip().lower() not in ['completed', 'hoàn thành']:
        print(f"[Voucher] Booking {booking.id} status is '{booking.status}', not 'Completed'. Skipping.")
        return None

    # Kiểm tra xem booking này đã từng tặng voucher chưa
    if CustomerVoucher.objects.filter(source_booking=booking).exists():
        print(f"[Voucher] Booking {booking.id} already awarded a voucher. Skipping.")
        return None

    # Lấy hoặc tạo voucher mặc định cho chương trình tri ân hoàn thành đặt sân
    reward_voucher = Voucher.objects.filter(is_system_reward=True, is_active=True).first()
    if not reward_voucher:
        reward_voucher = Voucher.objects.create(
            code='THANKS10',
            title='Ưu đãi tri ân - Giảm 10% đặt sân',
            description='Voucher tặng khi hoàn thành trận đấu, áp dụng cho lần đặt sân tiếp theo.',
            discount_type='percent',
            discount_value=Decimal('10.00'),
            max_discount=Decimal('50000.00'),
            min_booking_price=Decimal('100000.00'),
            expiry_days=30,
            is_system_reward=True,
            is_active=True
        )

    # Sinh mã voucher cá nhân hóa dạng FB-XXXXXX
    unique_suffix = uuid.uuid4().hex[:6].upper()
    personalized_code = f"FB-{unique_suffix}"
    valid_until = timezone.now() + timedelta(days=reward_voucher.expiry_days)

    customer_voucher = CustomerVoucher.objects.create(
        customer=booking.customer,
        voucher=reward_voucher,
        code=personalized_code,
        source_booking=booking,
        valid_until=valid_until,
        is_used=False
    )
    print(f"[Voucher] Awarded voucher {personalized_code} to customer {booking.customer.id}")

    return customer_voucher


def calculate_discount(voucher, total_price, field_price=None, service_price=0):
    """
    Tính số tiền được giảm dựa theo voucher và phạm vi áp dụng (applicable_to).
    - 'field_only': Chỉ áp dụng giảm trên tiền thuê sân
    - 'all': Áp dụng trên toàn bộ tiền sân + dịch vụ
    """
    scope = getattr(voucher, 'applicable_to', 'all') or 'all'
    if scope == 'field_only' and field_price is not None:
        target_price = Decimal(str(field_price or 0))
    else:
        target_price = Decimal(str(total_price or 0))

    if target_price <= 0:
        return Decimal('0')

    if voucher.discount_type == 'percent':
        raw_discount = (target_price * Decimal(str(voucher.discount_value))) / Decimal('100')
        if voucher.max_discount and raw_discount > Decimal(str(voucher.max_discount)):
            return Decimal(str(voucher.max_discount))
        return raw_discount
    else:  # 'fixed'
        fixed_val = Decimal(str(voucher.discount_value))
        return min(fixed_val, target_price)


def validate_voucher_for_customer(code, customer_id=None, total_price=0, field_price=None, service_price=0):
    """
    Kiểm tra tính hợp lệ của mã voucher khi khách hàng nhập/chọn lúc đặt sân.
    """
    if not code:
        return {"valid": False, "error": "Vui lòng nhập mã giảm giá"}

    code_clean = str(code).strip().upper()
    price_dec = Decimal(str(total_price or 0))
    field_dec = Decimal(str(field_price)) if field_price is not None else None

    # 1. Tìm trong CustomerVoucher (voucher cá nhân)
    cust_voucher = None
    if customer_id:
        cust_voucher = CustomerVoucher.objects.select_related('voucher', 'customer').filter(
            code__iexact=code_clean,
            customer_id=customer_id
        ).first()

    # Nếu không tìm theo customer_id, thử tìm mã cá nhân bất kỳ để check
    if not cust_voucher:
        cust_voucher = CustomerVoucher.objects.select_related('voucher', 'customer').filter(
            code__iexact=code_clean
        ).first()

    if cust_voucher:
        # Kiểm tra khách sở hữu nếu có customer_id
        if customer_id and str(cust_voucher.customer_id) != str(customer_id):
            return {"valid": False, "error": "Mã voucher này không thuộc về tài khoản của bạn"}

        if cust_voucher.is_used:
            return {"valid": False, "error": "Mã giảm giá này đã được sử dụng"}

        if cust_voucher.is_expired:
            return {"valid": False, "error": "Mã giảm giá này đã hết hạn sử dụng"}

        voucher = cust_voucher.voucher
        if not voucher.is_active:
            return {"valid": False, "error": "Mã giảm giá này hiện đang tạm khóa"}

        # Kiểm tra điều kiện tối thiểu
        check_min_price = field_dec if (getattr(voucher, 'applicable_to', 'all') == 'field_only' and field_dec is not None) else price_dec
        if check_min_price < voucher.min_booking_price:
            scope_desc = "tiền thuê sân" if getattr(voucher, 'applicable_to', 'all') == 'field_only' else "đơn đặt sân"
            return {
                "valid": False,
                "error": f"Giá trị {scope_desc} phải tối thiểu {int(voucher.min_booking_price):,}đ để dùng voucher này"
            }

        discount = calculate_discount(voucher, price_dec, field_dec, service_price)
        final_price = max(Decimal('0'), price_dec - discount)
        scope = getattr(voucher, 'applicable_to', 'all') or 'all'
        scope_note = " (chỉ áp dụng tiền sân)" if scope == 'field_only' else ""

        return {
            "valid": True,
            "code": cust_voucher.code,
            "title": voucher.title,
            "discount_type": voucher.discount_type,
            "discount_value": float(voucher.discount_value),
            "discount_amount": float(discount),
            "final_price": float(final_price),
            "applicable_to": scope,
            "applicable_label": "Chỉ giảm giá giờ sân" if scope == 'field_only' else "Giảm cả giờ sân + dịch vụ",
            "customer_voucher_id": str(cust_voucher.id),
            "valid_until": cust_voucher.valid_until.strftime('%Y-%m-%d %H:%M'),
            "message": f"Áp dụng mã thành công! Giảm {int(discount):,}đ{scope_note}"
        }

    # 2. Nếu không phải mã cá nhân, tìm trong Voucher dùng chung (Public Voucher)
    public_voucher = Voucher.objects.filter(code__iexact=code_clean, is_active=True).first()
    if public_voucher:
        if public_voucher.is_system_reward:
            return {
                "valid": False,
                "error": "Mã này là phần thưởng cá nhân. Vui lòng sử dụng mã riêng trong kho voucher của bạn"
            }

        if public_voucher.usage_limit and public_voucher.usage_limit > 0:
            from apps.bookings.models import Bookings
            used_count = Bookings.objects.filter(
                voucher_code__iexact=public_voucher.code,
                status__in=['Completed', 'Confirmed', 'Checked_in']
            ).count()
            if used_count >= public_voucher.usage_limit:
                return {
                    "valid": False,
                    "error": f"Mã giảm giá này đã hết số lượng sử dụng ({public_voucher.usage_limit}/{public_voucher.usage_limit} lượt)"
                }

        check_min_price = field_dec if (getattr(public_voucher, 'applicable_to', 'all') == 'field_only' and field_dec is not None) else price_dec
        if check_min_price < public_voucher.min_booking_price:
            scope_desc = "tiền thuê sân" if getattr(public_voucher, 'applicable_to', 'all') == 'field_only' else "đơn đặt sân"
            return {
                "valid": False,
                "error": f"Giá trị {scope_desc} phải tối thiểu {int(public_voucher.min_booking_price):,}đ"
            }

        discount = calculate_discount(public_voucher, price_dec, field_dec, service_price)
        final_price = max(Decimal('0'), price_dec - discount)
        scope = getattr(public_voucher, 'applicable_to', 'all') or 'all'
        scope_note = " (chỉ áp dụng tiền sân)" if scope == 'field_only' else ""

        return {
            "valid": True,
            "code": public_voucher.code,
            "title": public_voucher.title,
            "discount_type": public_voucher.discount_type,
            "discount_value": float(public_voucher.discount_value),
            "discount_amount": float(discount),
            "final_price": float(final_price),
            "applicable_to": scope,
            "applicable_label": "Chỉ giảm giá giờ sân" if scope == 'field_only' else "Giảm cả giờ sân + dịch vụ",
            "customer_voucher_id": None,
            "message": f"Áp dụng mã thành công! Giảm {int(discount):,}đ{scope_note}"
        }

    return {"valid": False, "error": "Mã giảm giá không tồn tại hoặc đã hết hạn"}
