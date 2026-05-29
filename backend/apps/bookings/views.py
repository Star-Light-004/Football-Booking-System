from rest_framework.decorators import api_view
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from .models import Bookings

import uuid
from datetime import datetime

from apps.fields.models import FootballFields

@api_view(['POST'])
def create_booking(request):
    data = request.data

    try:
        booking = Bookings.objects.create(
            id=uuid.uuid4(),  

            customer_id=data.get("customer_id"),
            field_id=data.get("field_id"),

            booking_date=data.get("booking_date"),
            start_time=data.get("start_time"),
            end_time=data.get("end_time"),

            total_price=data.get("total_price"),
            status="Confirmed",
            created_at=datetime.now()
        )

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
    bookings = Bookings.objects.select_related('customer', 'field').all()

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
            status__in=['Confirmed', 'Pending']
        )

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
        
        if data.get("status"):
            booking.status = data["status"]
        if data.get("booking_date"):
            booking.booking_date = data["booking_date"]
        if data.get("start_time"):
            booking.start_time = data["start_time"]
        if data.get("end_time"):
            booking.end_time = data["end_time"]
        if data.get("total_price") is not None and data.get("total_price") != "":
            booking.total_price = data["total_price"]
            
        booking.save()

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
        booking.delete()
        return Response({"message": "Xóa thành công"})
    except Bookings.DoesNotExist:
        return Response({"error": "Không tìm thấy booking"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)