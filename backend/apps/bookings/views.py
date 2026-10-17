from rest_framework.decorators import api_view
from django.utils.dateparse import parse_date, parse_time
from rest_framework.response import Response
from .models import Bookings

import uuid
from datetime import datetime

from apps.fields.models import FootballFields

@api_view(['POST'])
def create_booking(request):
    data = request.data

    try:
        booking_date = parse_date(str(data.get("booking_date", "")))
        start_time = parse_time(str(data.get("start_time", "")))
        end_time = parse_time(str(data.get("end_time", "")))

        if not booking_date or not start_time or not end_time:
            return Response({"error": "Ngày và khung giờ đặt sân không hợp lệ"}, status=400)

        start_datetime = datetime.combine(booking_date, start_time)
        end_datetime = datetime.combine(booking_date, end_time)
        if (end_datetime - start_datetime).total_seconds() != 60 * 60:
            return Response({"error": "Mỗi lượt đặt sân phải có thời lượng đúng 60 phút"}, status=400)

        customer_id = data.get("customer_id")
        if not customer_id or str(customer_id).lower() in ("null", "undefined", ""):
            guest_phone = str(data.get("guest_phone") or data.get("phone") or "").strip()
            guest_name = str(data.get("guest_name") or data.get("name") or "Khách vãng lai").strip()
            guest_email = str(data.get("guest_email") or data.get("email") or "").strip()

            if not guest_phone:
                return Response({"error": "Vui lòng cung cấp số điện thoại liên hệ để đặt sân"}, status=400)

            from apps.users.models import Customers
            customer = Customers.objects.filter(phone=guest_phone).first()
            if not customer:
                customer = Customers.objects.create(
                    id=uuid.uuid4(),
                    full_name=guest_name,
                    phone=guest_phone,
                    email=guest_email,
                    user=None,
                    password_hash=None,
                    created_at=datetime.now()
                )
            elif guest_name and customer.full_name in ("Khách vãng lai", "", None):
                customer.full_name = guest_name
                customer.save(update_fields=["full_name"])

            customer_id = customer.id

        notes_val = data.get("notes") or ""

        # 🔹 Xử lý áp dụng Voucher nếu có
        voucher_code_input = data.get("voucher_code")
        discount_amount = data.get("discount_amount") or 0
        applied_cust_voucher = None

        if voucher_code_input:
            try:
                from apps.vouchers.models import CustomerVoucher
                from apps.vouchers.services import validate_voucher_for_customer
                v_res = validate_voucher_for_customer(
                    code=voucher_code_input,
                    customer_id=customer_id,
                    total_price=data.get("total_price")
                )
                if v_res.get("valid"):
                    discount_amount = v_res.get("discount_amount", 0)
                    if v_res.get("customer_voucher_id"):
                        applied_cust_voucher = CustomerVoucher.objects.filter(id=v_res["customer_voucher_id"]).first()
            except Exception as v_val_err:
                print("Lỗi kiểm tra voucher:", v_val_err)

        booking = Bookings.objects.create(
            id=uuid.uuid4(),  

            customer_id=customer_id,
            field_id=data.get("field_id"),

            booking_date=booking_date,
            start_time=start_time,
            end_time=end_time,

            total_price=data.get("total_price"),
            discount_amount=discount_amount,
            voucher_code=voucher_code_input if voucher_code_input else None,
            status="Confirmed",
            notes=notes_val,
            created_at=datetime.now()
        )

        # Đánh dấu voucher đã dùng
        if applied_cust_voucher:
            from django.utils import timezone
            applied_cust_voucher.is_used = True
            applied_cust_voucher.used_at = timezone.now()
            applied_cust_voucher.used_booking = booking
            applied_cust_voucher.discount_amount = discount_amount
            applied_cust_voucher.save()

        # 🔹 Tăng số lượt đặt cho sân này
        try:
            field = FootballFields.objects.get(id=data.get("field_id"))
            if field.booking_count is None:
                field.booking_count = 1
            else:
                field.booking_count += 1
            field.save()
        except Exception as field_err:
            print("Lỗi tăng booking_count:", field_err)

        # 🔹 Cập nhật trạng thái TimeSlot thành 'booked'
        try:
            from apps.timeslots.models import TimeSlots
            TimeSlots.objects.filter(
                field_id=data.get("field_id"),
                slot_date=data.get("booking_date"),
                start_time=data.get("start_time")
            ).update(status='booked')
        except Exception as ts_err:
            print("Lỗi update status timeslot:", ts_err)

        # 🔹 Lưu dịch vụ thêm nếu có
        services_data = data.get("services", [])
        if services_data:
            from apps.servicesadd.models import BookingServices
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

        return Response({
            "message": "Đặt sân thành công",
            "booking_id": str(booking.id),
            "booking_id_short": str(booking.id)[:8].upper()
        })

    except Exception as e:
        print("ERROR:", e) 
        return Response({"error": str(e)}, status=400)
    

@api_view(['GET'])
def get_bookings(request):
    bookings = Bookings.objects.select_related('customer', 'field').all().order_by('-booking_date', 'start_time')

    from .serializers import BookingsSerializer
    serializer = BookingsSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_user_bookings(request, user_id):
    from apps.reviews.models import Reviews
    bookings = Bookings.objects.filter(customer_id=user_id).order_by('-created_at')

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

        bookings = Bookings.objects.all().order_by('-created_at')

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
            status__in=['Confirmed', 'Pending', 'Checked_in']
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

@api_view(['PUT'])
def update_booking(request, booking_id):
    try:
        booking = Bookings.objects.get(id=booking_id)
        data = request.data

        # Lưu giá trị cũ trước khi cập nhật
        old_date = booking.booking_date
        old_start_time = booking.start_time
        old_status = booking.status

        new_date = data.get("booking_date", booking.booking_date)
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

        # Không cho phép hai đơn đang hoạt động cùng chiếm một khoảng giờ của sân.
        # Kiểm tra ở server để tránh bị vượt qua nếu người dùng gọi API trực tiếp.
        if str(new_status).lower() in ['confirmed', 'pending', 'checked_in']:
            conflicting_booking = Bookings.objects.filter(
                field_id=booking.field_id,
                booking_date=new_date,
                start_time__lt=new_end_time,
                end_time__gt=new_start_time,
                status__in=['Confirmed', 'Pending', 'Checked_in']
            ).exclude(id=booking.id).exists()
            if conflicting_booking:
                return Response({"error": "Khung giờ này đã có lịch đặt."}, status=400)
        
        if data.get("status"):
            booking.status = data["status"]
        if data.get("booking_date"):
            booking.booking_date = new_date
        if data.get("start_time"):
            booking.start_time = new_start_time
        if data.get("end_time"):
            booking.end_time = new_end_time
        if data.get("total_price") is not None and data.get("total_price") != "":
            booking.total_price = data["total_price"]
            
        booking.save()

        # 🔹 Tạo thông báo khi khách hàng hủy đơn
        if str(new_status).lower() in ['cancelled', 'canceled'] and str(old_status).lower() not in ['cancelled', 'canceled']:
            try:
                from apps.notifications.models import Notification
                from apps.users.models import Admin

                # Tìm admin để gửi thông báo
                admins = Admin.objects.filter(role='admin').first()
                if admins:
                    # Lấy customer tương ứng với admin user (nếu có)
                    try:
                        admin_customer = Customers.objects.filter(user=admins).first()
                        if admin_customer:
                            Notification.objects.create(
                                user=admin_customer,
                                booking=booking,
                                notification_type='booking_cancelled',
                                title=f'Khách hàng hủy đơn #{str(booking.id)[:8].upper()}',
                                message=f'Khách hàng {booking.customer.full_name} đã hủy đơn đặt sân tại {booking.field.field_name} vào ngày {booking.booking_date}'
                            )
                    except Exception as notif_err:
                        print("Lỗi tạo thông báo cho admin:", notif_err)
            except Exception as notif_err:
                print("Lỗi tạo thông báo hủy đơn:", notif_err)

            # 🔹 Hoàn lại Voucher cho khách nếu đơn này có áp dụng voucher
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

        # 🔹 Cập nhật TimeSlot status khi sửa booking
        # Mở lại giờ cũ nếu giờ thay đổi
        if (new_start_time != old_start_time or new_date != old_date):
            from apps.timeslots.models import TimeSlots
            try:
                TimeSlots.objects.filter(
                    field_id=booking.field_id,
                    slot_date=old_date,
                    start_time=old_start_time
                ).update(status='available')
            except Exception as ts_err:
                print("Lỗi mở lại timeslot cũ:", ts_err)

        # Khóa giờ mới nếu trạng thái là active
        if str(new_status).lower() in ['confirmed', 'pending', 'checked_in']:
            from apps.timeslots.models import TimeSlots
            try:
                TimeSlots.objects.filter(
                    field_id=booking.field_id,
                    slot_date=new_date,
                    start_time=new_start_time
                ).update(status='booked')
            except Exception as ts_err:
                print("Lỗi khóa timeslot mới:", ts_err)
        elif str(new_status).lower() in ['cancelled', 'canceled']:
            from apps.timeslots.models import TimeSlots
            try:
                TimeSlots.objects.filter(
                    field_id=booking.field_id,
                    slot_date=new_date,
                    start_time=new_start_time
                ).update(status='available')
            except Exception as ts_err:
                print("Lỗi mở lại timeslot khi hủy:", ts_err)

        # Update services
        if "services" in data:
            services_data = data["services"]
            from apps.servicesadd.models import BookingServices
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

        return Response({"message": "Cập nhật thành công"})
    except Bookings.DoesNotExist:
        return Response({"error": "Không tìm thấy booking"}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=400)

@api_view(['DELETE'])
def delete_booking(request, booking_id):
    try:
        booking = Bookings.objects.get(id=booking_id)

        # 🔹 Mở lại TimeSlot khi xóa booking
        try:
            from apps.timeslots.models import TimeSlots
            TimeSlots.objects.filter(
                field_id=booking.field_id,
                slot_date=booking.booking_date,
                start_time=booking.start_time
            ).update(status='available')
        except Exception as ts_err:
            print("Lỗi mở lại timeslot khi xóa:", ts_err)

        booking.delete()
        return Response({"message": "Xóa thành công"})
    except Bookings.DoesNotExist:
        return Response({"error": "Không tìm thấy booking"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
