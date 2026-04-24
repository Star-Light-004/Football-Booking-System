from rest_framework.decorators import api_view
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from .models import Bookings

import uuid
from datetime import datetime

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

        return Response({
            "message": "Đặt sân thành công",
            "booking_id": str(booking.id)
        })

    except Exception as e:
        print("ERROR:", e) 
        return Response({"error": str(e)}, status=400)
    

@api_view(['GET'])
def get_bookings(request):
    bookings = Bookings.objects.select_related('customer', 'field').all()

    data = []
    for b in bookings:
        data.append({
            "id": str(b.id),
            "name": b.customer.full_name,
            "phone": b.customer.phone,
            "field": b.field.field_name,
            "date": b.booking_date,
            "time": f"{b.start_time} - {b.end_time}",
            "price": float(b.total_price),
            "status": b.status
        })

    return Response(data)


@api_view(['GET'])
def get_user_bookings(request, user_id):
    bookings = Bookings.objects.filter(customer_id=user_id)

    data = []
    for b in bookings:
        data.append({
            "id": str(b.id),
            "fieldName": b.field.field_name,
            "fieldAddress": b.field.location,
            "bookingDate": b.booking_date,
            "timeSlot": f"{b.start_time} - {b.end_time}",
            "customerName": b.customer.full_name,
            "phone": b.customer.phone if hasattr(b.customer, "phone") else None,
            "price": float(b.total_price),
            "status": b.status,
            "image": b.field.image.url if b.field.image else None,
        })

    return Response(data)


@api_view(['GET'])
def lookup_booking(request):
    try:
        phone = request.GET.get('phone')
        date = request.GET.get('date')

        # convert date string -> date object
        date_obj = parse_date(date) if date else None

        bookings = Bookings.objects.all()

        if phone:
            bookings = bookings.filter(customer__phone=phone)

        if date_obj:
            bookings = bookings.filter(booking_date=date_obj)

        data = []
        for b in bookings:
            data.append({
                    "id": str(b.id),

                    # sân
                    "fieldName": b.field.field_name,
                    "fieldAddress": b.field.location,
                    "fieldImage": b.field.image.url if b.field.image else None,

                    # booking
                    "bookingDate": b.booking_date,
                    "timeSlot": f"{b.start_time} - {b.end_time}",
                    "customerName": b.customer.full_name,
                    "phone": b.customer.phone,
                    "price": float(b.total_price),
                    "status": b.status,
                })
        return Response(data)

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