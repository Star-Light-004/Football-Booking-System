from rest_framework.decorators import api_view
from django.utils.dateparse import parse_date, parse_time
from rest_framework.response import Response
from .models import Bookings, TournamentRequests

import uuid
from datetime import datetime

from apps.fields.models import FootballFields

@api_view(['POST'])
def create_booking(request):
    data = request.data

    try:
        booking_date = parse_date(str(data.get("booking_date", "")))
        if not booking_date:
            return Response({"error": "Ngày đặt sân không hợp lệ"}, status=400)

        # 🔹 Hỗ trợ danh sách nhiều khung giờ (tối đa 3) hoặc khung giờ đơn lẻ
        slots_input = data.get("slots") or data.get("time_slots") or []
        if not slots_input:
            start_str = data.get("start_time")
            end_str = data.get("end_time")
            if start_str and end_str:
                slots_input = [{
                    "start_time": start_str,
                    "end_time": end_str,
                    "price": data.get("price") or data.get("total_price")
                }]

        if not slots_input:
            return Response({"error": "Vui lòng chọn ít nhất một khung giờ đặt sân"}, status=400)

        # 🔹 1. RÀNG BUỘC: Khi đặt chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân
        if len(slots_input) > 3:
            return Response({
                "error": "Chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân"
            }, status=400)

        # Chuẩn hóa và kiểm tra từng khung giờ
        parsed_slots = []
        for s in slots_input:
            st = parse_time(str(s.get("start_time", "")))
            et = parse_time(str(s.get("end_time", "")))
            if not st or not et:
                return Response({"error": f"Khung giờ {s.get('start_time')} - {s.get('end_time')} không hợp lệ"}, status=400)

            start_dt = datetime.combine(booking_date, st)
            end_dt = datetime.combine(booking_date, et)
            if (end_dt - start_dt).total_seconds() != 60 * 60:
                return Response({
                    "error": f"Mỗi lượt đặt sân phải có thời lượng đúng 60 phút ({st.strftime('%H:%M')} - {et.strftime('%H:%M')})"
                }, status=400)

            parsed_slots.append({
                "start_time": st,
                "end_time": et,
                "price": s.get("price")
            })

        # Kiểm tra trùng lặp trong chính danh sách gửi lên
        unique_starts = set(s["start_time"] for s in parsed_slots)
        if len(unique_starts) != len(parsed_slots):
            return Response({"error": "Các khung giờ đặt không được trùng nhau"}, status=400)

        # Sắp xếp các khung giờ theo thứ tự thời gian
        parsed_slots.sort(key=lambda s: s["start_time"])

        # Kiểm tra không cho phép đặt khung giờ đã qua hoặc đang diễn ra trong ngày
        now = datetime.now()
        today = now.date()
        if booking_date < today:
            return Response({"error": "Không thể đặt sân cho ngày trong quá khứ"}, status=400)

        for s in parsed_slots:
            st = s["start_time"]
            if booking_date == today and st.hour <= now.hour:
                return Response({
                    "error": f"Khung giờ {st.strftime('%H:%M')} đã qua hoặc đang diễn ra, không thể đặt."
                }, status=400)

        field_id = data.get("field_id")
        if not field_id:
            return Response({"error": "Vui lòng chọn sân bóng"}, status=400)

        # 🔹 Xác định khách hàng
        customer_id = data.get("customer_id")
        guest_phone = str(data.get("guest_phone") or data.get("phone") or "").strip()
        from apps.users.models import Customers

        customer = None
        if customer_id and str(customer_id).lower() not in ("null", "undefined", ""):
            customer = Customers.objects.filter(id=customer_id).first()
        if not customer and guest_phone:
            customer = Customers.objects.filter(phone=guest_phone).first()

        if not customer:
            if not guest_phone:
                return Response({"error": "Vui lòng cung cấp số điện thoại liên hệ để đặt sân"}, status=400)

            guest_name = str(data.get("guest_name") or data.get("name") or "Khách vãng lai").strip()
            guest_email = str(data.get("guest_email") or data.get("email") or "").strip()
            customer = Customers.objects.create(
                id=uuid.uuid4(),
                full_name=guest_name,
                phone=guest_phone,
                email=guest_email,
                password_hash=None,
                created_at=datetime.now()
            )
        elif guest_phone and not customer_id:
            guest_name = str(data.get("guest_name") or data.get("name") or "").strip()
            if guest_name and customer.full_name in ("Khách vãng lai", "", None):
                customer.full_name = guest_name
                customer.save(update_fields=["full_name"])

        customer_id = customer.id

        # ── BẢO MẬT & ĐỒNG THỜI: Bọc toàn bộ kiểm tra và tạo đơn trong transaction.atomic()
        # kết hợp select_for_update() để khóa hàng, chống Race Condition khi 2 người cùng đặt 1 sân tại 1 tích tắc.
        from django.db import transaction
        with transaction.atomic():
            # Khóa hàng sân bóng để tuần tự hóa các yêu cầu đặt sân trên cùng sân này
            field_obj = FootballFields.objects.select_for_update().get(id=field_id)

            # Khóa cả các dòng TimeSlots tương ứng nếu có
            try:
                from apps.timeslots.models import TimeSlots
                list(TimeSlots.objects.select_for_update().filter(
                    field_id=field_id,
                    slot_date=booking_date,
                    start_time__in=[s["start_time"] for s in parsed_slots]
                ))
            except Exception:
                pass

            # 🔹 2. RÀNG BUỘC: Khách hàng chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân
            # Đếm số khung giờ khách hàng đã đặt trước đó tại sân này trong ngày (trừ các đơn đã hủy)
            active_statuses = ['Confirmed', 'Pending', 'Checked_in', 'Completed']
            existing_same_field_bks = Bookings.objects.filter(
                customer_id=customer_id,
                field_id=field_id,
                booking_date=booking_date,
                status__in=active_statuses
            )
            existing_count = existing_same_field_bks.count()
            if existing_count + len(parsed_slots) > 3:
                return Response({
                    "error": f"Bạn chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân. Bạn đã đặt {existing_count} khung giờ tại sân này trong ngày {booking_date.strftime('%d/%m/%Y')}."
                }, status=400)

            # 🔹 3. RÀNG BUỘC: Đã đặt khung giờ nào ở sân này thì không được đặt tiếp ở khung giờ đó ở sân khác
            for slot in parsed_slots:
                other_field_conflict = Bookings.objects.filter(
                    customer_id=customer_id,
                    booking_date=booking_date,
                    start_time__lt=slot["end_time"],
                    end_time__gt=slot["start_time"],
                    status__in=active_statuses
                ).exclude(field_id=field_id).select_related('field').first()

                if other_field_conflict:
                    f_name = other_field_conflict.field.field_name if other_field_conflict.field else "sân khác"
                    st_str = slot["start_time"].strftime("%H:%M")
                    et_str = slot["end_time"].strftime("%H:%M")
                    return Response({
                        "error": f"Bạn đã đặt khung giờ {st_str} - {et_str} tại {f_name} trong ngày {booking_date.strftime('%d/%m/%Y')}. Không thể đặt tiếp khung giờ đó ở sân này."
                    }, status=400)

            # 🔹 4. Kiểm tra xem các khung giờ này đã có ai khác đặt trước tại sân này chưa
            for slot in parsed_slots:
                slot_already_booked = Bookings.objects.filter(
                    field_id=field_id,
                    booking_date=booking_date,
                    start_time__lt=slot["end_time"],
                    end_time__gt=slot["start_time"],
                    status__in=active_statuses
                ).exists()
                if slot_already_booked:
                    st_str = slot["start_time"].strftime("%H:%M")
                    et_str = slot["end_time"].strftime("%H:%M")
                    return Response({
                        "error": f"Khung giờ {st_str} - {et_str} tại sân này đã có người đặt. Vui lòng chọn khung giờ khác."
                    }, status=400)

            # 🔹 Kiểm tra các slot đã chọn có bị khóa / bảo trì không
            try:
                for s in parsed_slots:
                    ts_check = TimeSlots.objects.filter(
                        field_id=field_id,
                        slot_date=booking_date,
                        start_time=s["start_time"]
                    ).first()
                    if ts_check and str(ts_check.status).strip().lower() == 'blocked':
                        return Response({
                            "error": f"Khung giờ {s['start_time'].strftime('%H:%M')} - {s['end_time'].strftime('%H:%M')} tại sân này hiện đang bị khóa hoặc bảo trì."
                        }, status=400)
            except Exception as e:
                print("Lỗi kiểm tra slot blocked:", e)

            notes_val = data.get("notes") or ""

            # 🔹 Kiểm tra tồn kho cho các dịch vụ đi kèm (nếu có)
            services_data = data.get("services", [])
            if services_data:
                from apps.servicesadd.models import ServicesAdd
                for s in services_data:
                    s_id = s.get('service_id')
                    qty = int(s.get('quantity', 1))
                    service_obj = ServicesAdd.objects.filter(id=s_id).first()
                    if service_obj and qty > service_obj.stock:
                        return Response({
                            "error": f"Dịch vụ '{service_obj.name}' chỉ còn {service_obj.stock} sản phẩm trong kho (bạn đã chọn {qty}). Vui lòng không chọn quá số lượng tồn kho."
                        }, status=400)

            # 🔹 Xử lý áp dụng Voucher nếu có
            voucher_code_input = data.get("voucher_code")
            discount_amount = float(data.get("discount_amount") or 0)
            applied_cust_voucher = None

            if voucher_code_input:
                try:
                    from apps.vouchers.models import CustomerVoucher
                    from apps.vouchers.services import validate_voucher_for_customer
                    v_res = validate_voucher_for_customer(
                        code=voucher_code_input,
                        customer_id=customer_id,
                        total_price=data.get("total_price"),
                        field_price=data.get("field_price") or data.get("price"),
                        service_price=data.get("totalServicePrice") or data.get("total_service_price") or 0
                    )
                    if v_res.get("valid"):
                        discount_amount = float(v_res.get("discount_amount", 0))
                        if v_res.get("customer_voucher_id"):
                            applied_cust_voucher = CustomerVoucher.objects.filter(id=v_res["customer_voucher_id"]).first()
                except Exception as v_val_err:
                    print("Lỗi kiểm tra voucher:", v_val_err)

            # 🔹 Tính toán giá cho từng khung giờ
            total_price_all = float(data.get("total_price") or 0)
            default_slot_rate = float(field_obj.price_per_hour or 350000)

            # Phân bổ giá vào từng booking record để tổng giá bằng total_price_all
            slot_prices = []
            for s in parsed_slots:
                sp = s.get("price")
                slot_prices.append(float(sp) if sp is not None else default_slot_rate)

            # Tính tổng giá gốc các slot
            sum_slots_base = sum(slot_prices)
            created_bookings = []
            group_id = str(uuid.uuid4()) if len(parsed_slots) > 1 else None

            payment_method_input = str(data.get("payment_method") or "").strip().lower()
            status_input = data.get("status")
            if status_input:
                initial_status = status_input
            elif payment_method_input in ['qr', 'deposit', 'vietqr', 'online']:
                initial_status = "Pending"
            elif payment_method_input == 'cash':
                initial_status = "Confirmed"
            else:
                initial_status = "Confirmed" if (data.get("is_admin") or data.get("created_by_admin")) else "Pending"

            for idx, s in enumerate(parsed_slots):
                b_id = uuid.uuid4()
                b_notes = notes_val
                if group_id:
                    b_notes = f"{notes_val} [Mã nhóm: {group_id}]".strip()
                    if idx > 0:
                        b_notes += f" [Gộp cùng #{str(created_bookings[0].id)[:8].upper()}]"

                # Phân bổ giá: Đơn đầu tiên gánh toàn bộ chiết khấu voucher và dịch vụ phụ, các đơn sau theo giá slot
                if len(parsed_slots) == 1:
                    b_price = total_price_all
                elif idx == 0:
                    rem_slots_price = sum(slot_prices[1:])
                    b_price = max(0, total_price_all - rem_slots_price)
                else:
                    b_price = slot_prices[idx]

                booking = Bookings.objects.create(
                    id=b_id,
                    customer_id=customer_id,
                    field_id=field_id,
                    booking_date=booking_date,
                    start_time=s["start_time"],
                    end_time=s["end_time"],
                    total_price=b_price,
                    discount_amount=discount_amount if idx == 0 else 0,
                    voucher_code=voucher_code_input if (idx == 0 and voucher_code_input) else None,
                    status=initial_status,
                    notes=b_notes,
                    created_at=datetime.now()
                )
                created_bookings.append(booking)

            primary_booking = created_bookings[0]

            # Đánh dấu voucher đã dùng (cho đơn chính)
            if applied_cust_voucher:
                from django.utils import timezone
                applied_cust_voucher.is_used = True
                applied_cust_voucher.used_at = timezone.now()
                applied_cust_voucher.used_booking = primary_booking
                applied_cust_voucher.discount_amount = discount_amount
                applied_cust_voucher.save()

            # 🔹 Tăng số lượt đặt cho sân này
            try:
                if field_obj.booking_count is None:
                    field_obj.booking_count = len(parsed_slots)
                else:
                    field_obj.booking_count += len(parsed_slots)
                field_obj.save()
            except Exception as field_err:
                print("Lỗi tăng booking_count:", field_err)

            # 🔹 Cập nhật trạng thái TimeSlot thành 'booked' cho tất cả các slot đã chọn
            try:
                for s in parsed_slots:
                    TimeSlots.objects.filter(
                        field_id=field_id,
                        slot_date=booking_date,
                        start_time=s["start_time"]
                    ).update(status='booked')
            except Exception as ts_err:
                print("Lỗi update status timeslot:", ts_err)

            # 🔹 Lưu dịch vụ thêm nếu có (gắn vào đơn chính)
            services_data = data.get("services", [])
            if services_data:
                from apps.servicesadd.models import BookingServices
                for s in services_data:
                    BookingServices.objects.create(
                        id=uuid.uuid4(),
                        booking_id=primary_booking.id,
                        service_id=s['service_id'],
                        quantity=s['quantity'],
                        total_price=s.get('total_price', 0),
                        shoe_size=s.get('shoe_size'),
                        status='active'
                    )

                # Nếu đơn được tạo với trạng thái Completed ngay từ đầu, trừ tồn kho
                if str(primary_booking.status).strip().lower() in ['completed', 'hoàn thành']:
                    from apps.servicesadd.views import sync_booking_services_stock
                    sync_booking_services_stock(primary_booking, primary_booking.status)

            return Response({
                "message": "Đặt sân thành công",
                "booking_id": str(primary_booking.id),
                "booking_id_short": str(primary_booking.id)[:8].upper(),
                "booking_ids": [str(b.id) for b in created_bookings],
                "slots_count": len(created_bookings)
            })

    except Exception as e:
        print("ERROR:", e)
        return Response({"error": str(e)}, status=400)
    

@api_view(['GET'])
def get_bookings(request):
    from django.db.models import Prefetch
    from apps.payments.models import Payments
    from apps.servicesadd.models import BookingServices

    prefetch_payments = Prefetch(
        'payments_set',
        queryset=Payments.objects.order_by('-payment_date', '-id'),
        to_attr='prefetched_payments'
    )
    prefetch_services = Prefetch(
        'booking_services',
        queryset=BookingServices.objects.select_related('service'),
        to_attr='prefetched_services'
    )

    bookings = Bookings.objects.select_related('customer', 'field').prefetch_related(
        prefetch_payments,
        prefetch_services
    ).all().order_by('-booking_date', 'start_time')

    from .serializers import BookingsSerializer
    serializer = BookingsSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_user_bookings(request, user_id):
    from django.db.models import Prefetch
    from apps.payments.models import Payments

    prefetch_payments = Prefetch(
        'payments_set',
        queryset=Payments.objects.order_by('-payment_date', '-id'),
        to_attr='prefetched_payments'
    )

    bookings = Bookings.objects.filter(customer_id=user_id).select_related('customer', 'field', 'reviews').prefetch_related(
        prefetch_payments
    ).order_by('-booking_date', 'start_time')

    from .serializers import UserBookingsSerializer
    serializer = UserBookingsSerializer(bookings, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def lookup_booking(request):
    try:
        phone = request.GET.get('phone')
        date = request.GET.get('date')
        booking_id = request.GET.get('booking_id')

        # convert date string -> date object
        date_obj = parse_date(date) if date else None

        from django.db.models import Prefetch
        from apps.payments.models import Payments

        prefetch_payments = Prefetch(
            'payments_set',
            queryset=Payments.objects.order_by('-payment_date', '-id'),
            to_attr='prefetched_payments'
        )

        bookings = Bookings.objects.select_related('customer', 'field', 'reviews').prefetch_related(
            prefetch_payments
        ).order_by('-created_at')

        # Ưu tiên tìm theo mã đặt sân nếu có
        if booking_id:
            clean_id = booking_id.replace('#', '').replace('BK', '').strip()
            if clean_id:
                bookings = bookings.filter(id__istartswith=clean_id)
            else:
                # Nếu chỉ nhập tiền tố mà không có số, có thể tìm theo phone/date
                if phone:
                    bookings = bookings.filter(customer__phone=phone)
                if date_obj:
                    bookings = bookings.filter(booking_date=date_obj)
        else:
            # Nếu không có mã đặt sân, tìm theo phone và date
            if phone:
                bookings = bookings.filter(customer__phone=phone)
            if date_obj:
                bookings = bookings.filter(booking_date=date_obj)

        from .serializers import LookupBookingSerializer
        serializer = LookupBookingSerializer(bookings, many=True, context={'request': request})
        return Response(serializer.data)

    except Exception as e:
        print("LOOKUP ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_booked_slots(request):
    """
    Trả về danh sách khung giờ đã được đặt (start_time - end_time)
    cho một sân và ngày cụ thể.
    Query params: field_id, date (YYYY-MM-DD)
    """
    try:
        field_id = request.GET.get('field_id')
        date_str = request.GET.get('date')

        if not field_id or not date_str:
            return Response({"error": "Thiếu field_id hoặc date"}, status=400)

        date_obj = parse_date(date_str)
        if not date_obj:
            return Response({"error": "Định dạng ngày không hợp lệ"}, status=400)

        bookings = Bookings.objects.filter(
            field_id=field_id,
            booking_date=date_obj,
            status__in=['Confirmed', 'Pending', 'Checked_in', 'Completed', 'paid', 'Paid', 'completed']
        )
        # Khi sửa một đơn, khung giờ hiện tại của chính đơn đó vẫn được phép chọn.
        exclude_booking_id = request.GET.get('exclude_booking_id')
        if exclude_booking_id:
            bookings = bookings.exclude(id=exclude_booking_id)

        booked_slots = []
        for b in bookings:
            start = b.start_time.strftime('%H:%M')
            end   = b.end_time.strftime('%H:%M')
            booked_slots.append(f"{start} - {end}")

        return Response({"booked_slots": booked_slots})

    except Exception as e:
        print("GET_BOOKED_SLOTS ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_customer_booking_limits(request):
    """
    Trả về:
    1. same_field_booked_count: Số khung giờ khách đã đặt tại sân này trong ngày
    2. same_field_slots: Danh sách giờ ['08:00 - 09:00', ...] đã đặt tại sân này
    3. other_field_slots: Danh sách khung giờ khách đã đặt tại các sân khác trong ngày
    """
    try:
        field_id = request.GET.get('field_id')
        date_str = request.GET.get('date')
        customer_id = request.GET.get('customer_id')
        phone = request.GET.get('phone')

        if not date_str:
            return Response({"error": "Thiếu date"}, status=400)

        date_obj = parse_date(date_str)
        if not date_obj:
            return Response({"error": "Định dạng ngày không hợp lệ"}, status=400)

        from apps.users.models import Customers
        customer = None
        if customer_id and str(customer_id).lower() not in ("null", "undefined", ""):
            customer = Customers.objects.filter(id=customer_id).first()
        if not customer and phone:
            customer = Customers.objects.filter(phone=str(phone).strip()).first()

        if not customer:
            return Response({
                "same_field_booked_count": 0,
                "same_field_slots": [],
                "other_field_slots": [],
                "max_slots_per_day": 3
            })

        active_statuses = ['Confirmed', 'Pending', 'Checked_in', 'Completed']

        # 1. Các khung giờ tại sân này
        same_field_slots = []
        same_field_count = 0
        if field_id:
            same_bookings = Bookings.objects.filter(
                customer=customer,
                field_id=field_id,
                booking_date=date_obj,
                status__in=active_statuses
            )
            same_field_count = same_bookings.count()
            for b in same_bookings:
                same_field_slots.append(f"{b.start_time.strftime('%H:%M')} - {b.end_time.strftime('%H:%M')}")

        # 2. Các khung giờ tại các sân khác
        other_field_slots = []
        other_bookings = Bookings.objects.filter(
            customer=customer,
            booking_date=date_obj,
            status__in=active_statuses
        )
        if field_id:
            other_bookings = other_bookings.exclude(field_id=field_id)

        other_bookings = other_bookings.select_related('field')
        for b in other_bookings:
            other_field_slots.append({
                "time": f"{b.start_time.strftime('%H:%M')} - {b.end_time.strftime('%H:%M')}",
                "start_time": b.start_time.strftime('%H:%M'),
                "end_time": b.end_time.strftime('%H:%M'),
                "field_name": b.field.field_name if b.field else "Sân khác",
                "field_id": str(b.field_id)
            })

        return Response({
            "same_field_booked_count": same_field_count,
            "same_field_slots": same_field_slots,
            "other_field_slots": other_field_slots,
            "max_slots_per_day": 3
        })
    except Exception as e:
        print("CUSTOMER_LIMITS ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'PUT', 'POST', 'PATCH'])
def update_booking(request, booking_id):
    try:
        booking = Bookings.objects.select_related('field', 'customer').get(id=booking_id)
        if request.method == 'GET':
            from .serializers import UserBookingsSerializer
            return Response(UserBookingsSerializer(booking, context={'request': request}).data)

        data = request.data

        # Lưu giá trị cũ trước khi cập nhật
        old_date = booking.booking_date
        old_start_time = booking.start_time
        old_status = booking.status
        old_field_id = booking.field_id
        old_field = booking.field

        new_field_id = data.get("field_id", booking.field_id)
        try:
            target_field = FootballFields.objects.get(id=new_field_id)
        except FootballFields.DoesNotExist:
            return Response({"error": "Sân bóng không tồn tại."}, status=404)

        new_date_val = data.get("booking_date")
        if new_date_val:
            parsed_d = parse_date(str(new_date_val))
            new_date = parsed_d if parsed_d else booking.booking_date
        else:
            new_date = booking.booking_date

        new_start_time = data.get("start_time", booking.start_time)
        new_end_time = data.get("end_time", booking.end_time)
        new_status = data.get("status", booking.status)

        parsed_start_time = parse_time(str(new_start_time))
        parsed_end_time = parse_time(str(new_end_time))
        if not parsed_start_time or not parsed_end_time or parsed_start_time >= parsed_end_time:
            return Response({"error": "Khoảng thời gian đặt sân không hợp lệ."}, status=400)

        # Quy tắc: Khách hàng chỉ có thể hủy đơn khi ở trạng thái 'Chờ xác nhận' (Pending) hoặc 'Đã xác nhận' (Confirmed)
        if str(new_status).lower() in ['cancelled', 'canceled']:
            curr_status = str(booking.status).lower()
            if curr_status in ['checked_in', 'completed', 'hoàn thành', 'đã check-in']:
                return Response(
                    {"error": "Không thể hủy đơn đặt sân khi đã check-in hoặc đã hoàn thành."},
                    status=400
                )

        date_disp = new_date.strftime('%d/%m/%Y') if hasattr(new_date, 'strftime') else str(new_date)
        from apps.timeslots.models import TimeSlots

        # 🔹 1. ĐIỀU KIỆN: Sân mới/hiện tại PHẢI CÓ MỞ SLOT trong khung giờ đó
        target_slot = TimeSlots.objects.filter(
            field_id=new_field_id,
            slot_date=new_date,
            start_time=parsed_start_time
        ).first()

        if not target_slot:
            return Response({
                "error": f"Sân {target_field.field_name} chưa mở slot trong khung giờ {parsed_start_time.strftime('%H:%M')} - {parsed_end_time.strftime('%H:%M')} ngày {date_disp}."
            }, status=400)

        if str(target_slot.status).strip().lower() == 'blocked':
            return Response({
                "error": f"Khung giờ {parsed_start_time.strftime('%H:%M')} - {parsed_end_time.strftime('%H:%M')} tại sân {target_field.field_name} đang bị khóa hoặc bảo trì."
            }, status=400)

        # 🔹 2. ĐIỀU KIỆN: Sân đó CHƯA CÓ AI ĐẶT trong khung giờ đó
        active_statuses = ['Confirmed', 'Pending', 'Checked_in', 'Completed', 'paid', 'Paid', 'completed']
        if str(new_status).lower() in ['confirmed', 'pending', 'checked_in']:
            # Kiểm tra xem có đơn khác đang hoạt động chiếm khung giờ này không
            conflicting_booking = Bookings.objects.filter(
                field_id=new_field_id,
                booking_date=new_date,
                start_time__lt=parsed_end_time,
                end_time__gt=parsed_start_time,
                status__in=active_statuses
            ).exclude(id=booking.id).exists()
            if conflicting_booking:
                return Response({
                    "error": f"Sân {target_field.field_name} đã có người đặt trong khung giờ {parsed_start_time.strftime('%H:%M')} - {parsed_end_time.strftime('%H:%M')} ngày {date_disp}."
                }, status=400)

            # Kiểm tra trạng thái slot trong bảng TimeSlots (nếu đổi sân hoặc đổi giờ/ngày)
            is_same_slot_and_field = (
                str(new_field_id) == str(old_field_id) and
                new_date == old_date and
                parsed_start_time == old_start_time
            )
            if not is_same_slot_and_field and str(target_slot.status).strip().lower() == 'booked':
                return Response({
                    "error": f"Khung giờ này tại sân {target_field.field_name} đã được người khác đặt trước."
                }, status=400)

            # 🔹 Kiểm tra quy tắc 3 khung giờ/ngày/sân đối với khách hàng này
            same_field_count = Bookings.objects.filter(
                customer_id=booking.customer_id,
                field_id=new_field_id,
                booking_date=new_date,
                status__in=active_statuses
            ).exclude(id=booking.id).count()
            if same_field_count >= 3:
                return Response({
                    "error": f"Khách hàng chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân (đã có {same_field_count} khung giờ)."
                }, status=400)

            # 🔹 Kiểm tra quy tắc không đặt tiếp khung giờ đó ở sân khác
            other_conflict = Bookings.objects.filter(
                customer_id=booking.customer_id,
                booking_date=new_date,
                start_time__lt=parsed_end_time,
                end_time__gt=parsed_start_time,
                status__in=active_statuses
            ).exclude(field_id=new_field_id).exclude(id=booking.id).select_related('field').first()
            if other_conflict:
                f_name = other_conflict.field.field_name if other_conflict.field else "sân khác"
                return Response({
                    "error": f"Khách hàng đã đặt khung giờ này tại {f_name} trong ngày {date_disp}. Không thể đặt trùng giờ ở sân khác."
                }, status=400)
        
        field_changed = str(new_field_id) != str(old_field_id)
        time_changed = (parsed_start_time != old_start_time or new_date != old_date)

        if field_changed:
            booking.field_id = new_field_id
            booking.field = target_field
        if data.get("status"):
            booking.status = new_status
        if new_date:
            booking.booking_date = new_date
        if parsed_start_time:
            booking.start_time = parsed_start_time
        if parsed_end_time:
            booking.end_time = parsed_end_time
        if data.get("total_price") is not None and data.get("total_price") != "":
            booking.total_price = data["total_price"]
            
        booking.save()

        # 🔹 Hoàn lại Voucher cho khách nếu đơn này có áp dụng voucher
        if str(new_status).lower() in ['cancelled', 'canceled'] and str(old_status).lower() not in ['cancelled', 'canceled']:
            try:
                from apps.vouchers.models import CustomerVoucher
                CustomerVoucher.objects.filter(used_booking=booking).update(
                    is_used=False,
                    used_at=None,
                    used_booking=None,
                    discount_amount=0
                )
                print(f"🔄 Đã hoàn lại voucher cho đơn hủy #{booking.id}")
            except Exception as v_refund_err:
                print("Lỗi hoàn lại voucher khi hủy đơn:", v_refund_err)

        # 🔹 Cập nhật TimeSlot status khi sửa booking / đổi sân
        # Mở lại giờ cũ ở sân cũ nếu đổi sân hoặc đổi giờ/ngày
        if field_changed or time_changed:
            try:
                TimeSlots.objects.filter(
                    field_id=old_field_id,
                    slot_date=old_date,
                    start_time=old_start_time
                ).update(status='available')
            except Exception as ts_err:
                print("Lỗi mở lại timeslot cũ:", ts_err)

        # Khóa giờ mới ở sân mới nếu trạng thái là active
        if str(new_status).lower() in ['confirmed', 'pending', 'checked_in']:
            try:
                TimeSlots.objects.filter(
                    field_id=new_field_id,
                    slot_date=new_date,
                    start_time=parsed_start_time
                ).update(status='booked')
            except Exception as ts_err:
                print("Lỗi khóa timeslot mới:", ts_err)
        elif str(new_status).lower() in ['cancelled', 'canceled']:
            try:
                TimeSlots.objects.filter(
                    field_id=new_field_id,
                    slot_date=new_date,
                    start_time=parsed_start_time
                ).update(status='available')
            except Exception as ts_err:
                print("Lỗi mở lại timeslot khi hủy:", ts_err)

        # 🔹 Cập nhật booking_count cho sân cũ và sân mới nếu đổi sân
        if field_changed:
            try:
                if old_field and old_field.booking_count and old_field.booking_count > 0:
                    old_field.booking_count -= 1
                    old_field.save(update_fields=['booking_count'])
                target_field.booking_count = (target_field.booking_count or 0) + 1
                target_field.save(update_fields=['booking_count'])
            except Exception as bc_err:
                print("Lỗi update booking_count:", bc_err)

            # Ghi nhật ký đổi sân vào BookingLogs
            try:
                from .models import BookingLogs
                BookingLogs.objects.create(
                    id=uuid.uuid4(),
                    booking=booking,
                    action="CHANGE_FIELD",
                    performed_by="Quản trị viên",
                    old_value=str(old_field.field_name if old_field else old_field_id),
                    new_value=str(target_field.field_name),
                    description=f"Đổi sân từ {old_field.field_name if old_field else old_field_id} sang {target_field.field_name}",
                    timestamp=datetime.now()
                )
            except Exception as log_err:
                print("Lỗi ghi log đổi sân:", log_err)

        # Update services
        if "services" in data:
            services_data = data["services"]
            from apps.servicesadd.models import ServicesAdd, BookingServices
            from apps.servicesadd.views import refund_booking_services_stock

            # Kiểm tra tồn kho trước khi cập nhật
            for s in services_data:
                s_id = s.get('service_id')
                qty = int(s.get('quantity', 1))
                service_obj = ServicesAdd.objects.filter(id=s_id).first()
                if service_obj:
                    # Tồn kho khả dụng = tồn kho hiện tại + số lượng đã trừ của dịch vụ này trong đơn nếu có
                    old_deducted = BookingServices.objects.filter(
                        booking=booking, service_id=s_id, status='deducted'
                    ).first()
                    effective_stock = service_obj.stock + (old_deducted.quantity if old_deducted else 0)
                    if qty > effective_stock:
                        return Response({
                            "error": f"Dịch vụ '{service_obj.name}' chỉ còn {effective_stock} sản phẩm trong kho (bạn đã chọn {qty}). Vui lòng không chọn quá số lượng tồn kho."
                        }, status=400)

            # Hoàn lại tồn kho cho các dịch vụ cũ nếu đã bị trừ trước đó
            refund_booking_services_stock(booking)

            BookingServices.objects.filter(booking_id=booking.id).delete()
            for s in services_data:
                BookingServices.objects.create(
                    id=uuid.uuid4(),
                    booking_id=booking.id,
                    service_id=s['service_id'],
                    quantity=s['quantity'],
                    total_price=s.get('total_price', 0),
                    shoe_size=s.get('shoe_size'),
                    status='active'
                )

        # 🔹 Đồng bộ tồn kho dịch vụ theo trạng thái đơn (trừ kho nếu Hoàn thành, hoàn kho nếu Hủy)
        from apps.servicesadd.views import sync_booking_services_stock
        sync_booking_services_stock(booking, new_status, old_status)

        return Response({"message": "Cập nhật thành công"})
    except Bookings.DoesNotExist:
        return Response({"error": "Không tìm thấy booking"}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=400)

@api_view(['DELETE', 'POST'])
def delete_booking(request, booking_id):
    try:
        from django.db import transaction
        with transaction.atomic():
            booking = Bookings.objects.get(id=booking_id)

            # 🔹 1. Hoàn lại tồn kho dịch vụ nếu đơn đã bị trừ kho trước đó
            try:
                from apps.servicesadd.views import refund_booking_services_stock
                refund_booking_services_stock(booking)
            except Exception as stock_err:
                print("Lỗi hoàn lại tồn kho khi xóa booking:", stock_err)

            # 🔹 2. Mở lại TimeSlot khi xóa booking
            try:
                from apps.timeslots.models import TimeSlots
                TimeSlots.objects.filter(
                    field_id=booking.field_id,
                    slot_date=booking.booking_date,
                    start_time=booking.start_time
                ).update(status='available')
            except Exception as ts_err:
                print("Lỗi mở lại timeslot khi xóa:", ts_err)

            # 🔹 3. Giảm booking_count của sân nếu có
            try:
                if booking.field and hasattr(booking.field, 'booking_count') and booking.field.booking_count and booking.field.booking_count > 0:
                    booking.field.booking_count -= 1
                    booking.field.save()
            except Exception as fc_err:
                print("Lỗi giảm booking_count:", fc_err)

            # 🔹 4. Xóa các bản ghi thanh toán liên quan
            try:
                from apps.payments.models import Payments
                Payments.objects.filter(booking_id=booking.id).delete()
            except Exception as pay_err:
                print("Lỗi xóa payment liên quan:", pay_err)

            # 🔹 5. Xóa các dịch vụ đã gắn với đơn
            try:
                from apps.servicesadd.models import BookingServices
                BookingServices.objects.filter(booking_id=booking.id).delete()
            except Exception as bs_err:
                print("Lỗi xóa booking_services:", bs_err)

            # 🔹 6. Xóa nhật ký đặt sân liên quan
            try:
                from apps.bookings.models import BookingLogs
                BookingLogs.objects.filter(booking_id=booking.id).delete()
            except Exception as log_err:
                print("Lỗi xóa booking_logs:", log_err)

            # 🔹 7. Xóa đánh giá liên quan
            try:
                from apps.reviews.models import Reviews
                Reviews.objects.filter(booking_id=booking.id).delete()
            except Exception as rev_err:
                print("Lỗi xóa reviews:", rev_err)

            # 🔹 8. Hoàn lại voucher cho khách hàng nếu đơn này có áp dụng voucher
            try:
                from apps.vouchers.models import CustomerVoucher
                CustomerVoucher.objects.filter(used_booking_id=booking.id).update(
                    used_booking=None, is_used=False, used_at=None, discount_amount=0
                )
                CustomerVoucher.objects.filter(source_booking_id=booking.id).update(
                    source_booking=None
                )
            except Exception as vc_err:
                print("Lỗi hoàn lại voucher:", vc_err)

            # 🔹 9. Gỡ liên kết ca đá trong vệ sinh & đồ thất lạc
            try:
                from apps.facility.models import PitchCleaning, LostFoundItem
                PitchCleaning.objects.filter(booking_id=booking.id).update(booking=None)
                LostFoundItem.objects.filter(booking_id=booking.id).update(booking=None)
            except Exception as fac_err:
                print("Lỗi gỡ facility records:", fac_err)

            booking.delete()
            return Response({"message": "Xóa thành công"})
    except Bookings.DoesNotExist:
        return Response({"error": "Không tìm thấy booking"}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=400)


# ═══════════════════════════════════════════════════════════════
# ─── TOURNAMENT REQUESTS APIS (ĐẶT GIẢI ĐẤU DÀI NGÀY) ─────────
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
def create_tournament_request(request):
    try:
        data = request.data
        contact_name = str(data.get("contact_name") or "").strip()
        contact_phone = str(data.get("contact_phone") or "").strip()
        tournament_name = str(data.get("tournament_name") or "").strip()
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if not contact_name or not contact_phone or not tournament_name or not start_date or not end_date:
            return Response({"error": "Vui lòng điền đầy đủ họ tên, SĐT, tên giải đấu và thời gian dự kiến!"}, status=400)

        # Validate ngày bắt đầu & kết thúc không được ở quá khứ
        from datetime import date, datetime
        today = date.today()
        try:
            sd = datetime.strptime(str(start_date)[:10], "%Y-%m-%d").date()
            ed = datetime.strptime(str(end_date)[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError) as date_err:
            return Response({"error": "Định dạng ngày bắt đầu hoặc kết thúc không hợp lệ (YYYY-MM-DD)!"}, status=400)

        if sd < today:
            return Response({"error": "Ngày bắt đầu giải đấu không được là ngày đã qua trong quá khứ!"}, status=400)
        if ed < sd:
            return Response({"error": "Ngày kết thúc giải đấu phải bằng hoặc sau ngày bắt đầu!"}, status=400)

        from apps.users.models import Customers
        customer = None
        customer_id = data.get("customer_id")
        if customer_id:
            customer = Customers.objects.filter(id=customer_id).first()
        elif contact_phone:
            customer = Customers.objects.filter(phone=contact_phone).first()

        selected_fields_info = data.get("selected_fields_info", "")
        if isinstance(selected_fields_info, list):
            import json
            selected_fields_info = json.dumps(selected_fields_info, ensure_ascii=False)

        services_requested = data.get("services_requested", "")
        if isinstance(services_requested, list):
            import json
            services_requested = json.dumps(services_requested, ensure_ascii=False)

        payment_method = data.get("payment_method") or "full"
        total_budget = float(data.get("estimated_budget") or 0)
        deposit_amount = round(total_budget * 0.5) if payment_method == 'deposit' else 0
        remaining_amount = round(total_budget - deposit_amount) if payment_method == 'deposit' else 0

        req = TournamentRequests.objects.create(
            id=uuid.uuid4(),
            customer=customer,
            contact_name=contact_name,
            contact_phone=contact_phone,
            contact_email=data.get("contact_email") or "",
            tournament_name=tournament_name,
            organization=data.get("organization") or "",
            start_date=start_date,
            end_date=end_date,
            expected_teams=int(data.get("expected_teams") or 8),
            selected_fields_info=selected_fields_info,
            time_slots_info=data.get("time_slots_info") or "",
            services_requested=services_requested,
            estimated_budget=data.get("estimated_budget") or None,
            notes=data.get("notes") or "",
            admin_notes=data.get("admin_notes") or "",
            status=data.get("status") or "Pending",
            payment_method=payment_method,
            payment_status=data.get("payment_status") or "Unpaid",
            deposit_amount=deposit_amount,
            paid_amount=data.get("paid_amount") or 0,
            remaining_amount=remaining_amount,
            transaction_id=data.get("transaction_id") or ""
        )

        from .serializers import TournamentRequestsSerializer
        serializer_data = TournamentRequestsSerializer(req).data

        return Response({
            "success": True,
            "message": "Gửi yêu cầu tổ chức giải đấu thành công! Ban quản trị sẽ liên hệ sớm nhất để tư vấn và hỗ trợ giữ sân.",
            "request_id": str(req.id),
            "request_id_short": f"#TR-{str(req.id)[:8].upper()}",
            "data": serializer_data
        }, status=201)
    except Exception as e:
        print("CREATE_TOURNAMENT_REQUEST ERROR:", e)
        return Response({"error": f"Lỗi gửi yêu cầu giải đấu: {str(e)}"}, status=500)


@api_view(['GET'])
def get_tournament_requests(request):
    try:
        status_filter = request.GET.get("status")
        search = request.GET.get("search", "").strip()
        customer_id = request.GET.get("customer_id")
        phone = request.GET.get("phone")

        qs = TournamentRequests.objects.select_related('customer').all().order_by('-created_at')

        if customer_id:
            from django.db.models import Q
            from apps.users.models import Customers
            c_obj = Customers.objects.filter(id=customer_id).first()
            if c_obj and c_obj.phone:
                qs = qs.filter(Q(customer_id=customer_id) | Q(contact_phone=c_obj.phone))
            else:
                qs = qs.filter(customer_id=customer_id)
        elif phone:
            qs = qs.filter(contact_phone=phone)

        if status_filter and status_filter.lower() != "all":
            qs = qs.filter(status__iexact=status_filter)

        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(tournament_name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(contact_phone__icontains=search) |
                Q(organization__icontains=search)
            )

        from .serializers import TournamentRequestsSerializer
        serializer = TournamentRequestsSerializer(qs, many=True)
        return Response(serializer.data)
    except Exception as e:
        print("GET_TOURNAMENT_REQUESTS ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'PUT', 'PATCH'])
def update_tournament_request(request, pk):
    try:
        req = TournamentRequests.objects.filter(id=pk).first()
        if not req:
            return Response({"error": "Không tìm thấy yêu cầu giải đấu!"}, status=404)

        from .serializers import TournamentRequestsSerializer
        if request.method == 'GET':
            return Response(TournamentRequestsSerializer(req).data)

        data = request.data
        if "status" in data:
            req.status = data["status"]
        if "admin_notes" in data:
            req.admin_notes = data["admin_notes"]
        if "estimated_budget" in data:
            req.estimated_budget = data["estimated_budget"] if data["estimated_budget"] != "" else None
        if "tournament_name" in data and str(data["tournament_name"]).strip():
            req.tournament_name = str(data["tournament_name"]).strip()
        if "organization" in data:
            req.organization = data["organization"]
        if "contact_name" in data and str(data["contact_name"]).strip():
            req.contact_name = str(data["contact_name"]).strip()
        if "contact_phone" in data and str(data["contact_phone"]).strip():
            req.contact_phone = str(data["contact_phone"]).strip()
        if "contact_email" in data:
            req.contact_email = data["contact_email"]
        if "start_date" in data or "end_date" in data:
            from datetime import date, datetime
            today = date.today()
            new_start = data.get("start_date") or req.start_date
            new_end = data.get("end_date") or req.end_date
            try:
                sd = datetime.strptime(str(new_start)[:10], "%Y-%m-%d").date()
                ed = datetime.strptime(str(new_end)[:10], "%Y-%m-%d").date()
                if "start_date" in data and sd < today:
                    return Response({"error": "Ngày bắt đầu giải đấu không được cập nhật về ngày trong quá khứ!"}, status=400)
                if ed < sd:
                    return Response({"error": "Ngày kết thúc giải đấu phải bằng hoặc sau ngày bắt đầu!"}, status=400)
                req.start_date = sd
                req.end_date = ed
            except (ValueError, TypeError) as date_err:
                return Response({"error": "Định dạng ngày không hợp lệ (YYYY-MM-DD)!"}, status=400)
        if "expected_teams" in data and data["expected_teams"]:
            req.expected_teams = int(data["expected_teams"])
        if "time_slots_info" in data:
            req.time_slots_info = data["time_slots_info"]
        if "notes" in data:
            req.notes = data["notes"]
        if "payment_status" in data:
            req.payment_status = data["payment_status"]
        if "payment_method" in data:
            req.payment_method = data["payment_method"]
        if "paid_amount" in data:
            req.paid_amount = data["paid_amount"] if data["paid_amount"] != "" else 0
        if "remaining_amount" in data:
            req.remaining_amount = data["remaining_amount"] if data["remaining_amount"] != "" else 0
        if "deposit_amount" in data:
            req.deposit_amount = data["deposit_amount"] if data["deposit_amount"] != "" else 0
        if "transaction_id" in data:
            req.transaction_id = data["transaction_id"]
        if "payment_date" in data:
            req.payment_date = data["payment_date"]
        if "services_requested" in data:
            req.services_requested = data["services_requested"]
        if "selected_fields_info" in data:
            req.selected_fields_info = data["selected_fields_info"]

        req.save()
        return Response(TournamentRequestsSerializer(req).data)
    except Exception as e:
        print("UPDATE_TOURNAMENT_REQUEST ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def cancel_tournament_request(request, pk):
    try:
        req = TournamentRequests.objects.filter(id=pk).first()
        if not req:
            return Response({"error": "Không tìm thấy yêu cầu giải đấu!"}, status=404)

        if req.status in ["Approved", "Completed"]:
            return Response({"error": "Phiếu đặt giải đấu đã được duyệt hoặc hoàn thành, không thể tự hủy. Vui lòng liên hệ ban quản lý!"}, status=400)

        if req.status in ["Cancelled", "Rejected"]:
            return Response({"error": "Phiếu đặt giải đấu này đã được hủy trước đó."}, status=400)

        import datetime
        reason = (request.data.get("reason") or "").strip()
        now_str = datetime.datetime.now().strftime("%H:%M %d/%m/%Y")
        cancel_entry = f"[Khách hàng hủy lúc {now_str}]"
        if reason:
            cancel_entry += f" Lý do: {reason}"

        if req.admin_notes:
            req.admin_notes = f"{req.admin_notes}\n{cancel_entry}"
        else:
            req.admin_notes = cancel_entry

        req.status = "Cancelled"
        req.save()

        from .serializers import TournamentRequestsSerializer
        return Response({
            "success": True,
            "message": "Đã hủy phiếu đăng ký giải đấu thành công!",
            "data": TournamentRequestsSerializer(req).data
        })
    except Exception as e:
        print("CANCEL_TOURNAMENT_REQUEST ERROR:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['DELETE', 'POST'])
def delete_tournament_request(request, pk):
    try:
        req = TournamentRequests.objects.filter(id=pk).first()
        if not req:
            return Response({"error": "Không tìm thấy yêu cầu giải đấu!"}, status=404)
        req.delete()
        return Response({"message": "Xóa yêu cầu giải đấu thành công!"})
    except Exception as e:
        print("DELETE_TOURNAMENT_REQUEST ERROR:", e)
        return Response({"error": str(e)}, status=500)


