from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status
from .models import TimeSlots
from apps.fields.models import FootballFields
from datetime import date, timedelta, time
from decimal import Decimal

# ── Bảng giá theo khung giờ ─────────────────────────────────────────────────
# Bỏ khung 10:00-14:00 (buổi trưa ít người thuê)
# 6:00-10:00 sáng sớm rẻ nhất, 14:00+ tăng dần, 18:00-20:00 cao điểm đắt nhất
HOURLY_PRICES = {
    6:  80_000,
    7:  80_000,
    8:  100_000,
    9:  100_000,
    # 10:00-14:00 bỏ qua (buổi trưa)
    14: 150_000,
    15: 150_000,
    16: 180_000,
    17: 200_000,
    18: 250_000,   # cao điểm
    19: 270_000,   # cao điểm
    20: 270_000,   # cao điểm
    21: 250_000,
}


@api_view(['GET', 'POST'])
def timeslot_list(request):
    if request.method == 'GET':
        slots = TimeSlots.objects.select_related('field').all().order_by('-slot_date', 'start_time')
        from .serializers import TimeSlotsSerializer
        serializer = TimeSlotsSerializer(slots, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        data = request.data
        try:
            slot = TimeSlots.objects.create(
                field_id=data.get('field_id'),
                slot_date=data.get('slot_date'),
                start_time=data.get('start_time'),
                end_time=data.get('end_time'),
                price=data.get('price'),
                status=data.get('status', 'available')
            )
            return Response({"message": "Tạo thành công", "id": str(slot.id)})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


@api_view(['PUT', 'DELETE'])
def timeslot_detail(request, pk):
    try:
        slot = TimeSlots.objects.get(pk=pk)
    except TimeSlots.DoesNotExist:
        return Response({"error": "Không tìm thấy"}, status=404)

    if request.method == 'PUT':
        data = request.data
        slot.slot_date = data.get('slot_date', slot.slot_date)
        slot.start_time = data.get('start_time', slot.start_time)
        slot.end_time = data.get('end_time', slot.end_time)
        slot.price = data.get('price', slot.price)
        slot.status = data.get('status', slot.status)
        slot.save()
        return Response({"message": "Cập nhật thành công"})

    if request.method == 'DELETE':
        slot.delete()
        return Response({"message": "Xóa thành công"})


@api_view(['GET'])
def get_timeslots_by_field(request):
    try:
        field_id = request.GET.get('field_id')
        date_param = request.GET.get('date')

        if not field_id or not date_param:
            return Response({"error": "Missing field_id or date"}, status=400)

        slots = TimeSlots.objects.filter(field_id=field_id, slot_date=date_param).order_by('start_time')

        from .serializers import TimeSlotSimpleSerializer
        serializer = TimeSlotSimpleSerializer(slots, many=True)
        return Response(serializer.data)
    except Exception as e:
        import traceback
        return Response({"error": str(e), "traceback": traceback.format_exc()}, status=500)


@api_view(['POST'])
def generate_slots(request):
    """
    Tự động tạo slot giờ 6:00-22:00 cho tất cả sân trong N ngày tới.
    Body: { "days": 30 }  (mặc định 30 ngày)
    Bỏ qua slot đã tồn tại (unique_together).
    """
    days = int(request.data.get('days', 30))
    days = max(1, min(days, 90))  # giới hạn 1-90 ngày

    fields = FootballFields.objects.filter(is_available=True)
    if not fields.exists():
        return Response({"error": "Không có sân nào đang hoạt động"}, status=400)

    today = date.today()
    slots_to_create = []
    skipped_count = 0

    for delta in range(days):
        slot_date = today + timedelta(days=delta)
        for hour, price in HOURLY_PRICES.items():
            start = time(hour, 0)
            end = time(hour + 1, 0)
            for field in fields:
                exists = TimeSlots.objects.filter(
                    field=field,
                    slot_date=slot_date,
                    start_time=start
                ).exists()
                if exists:
                    skipped_count += 1
                    continue
                slots_to_create.append(TimeSlots(
                    field=field,
                    slot_date=slot_date,
                    start_time=start,
                    end_time=end,
                    price=Decimal(price),
                    status='available'
                ))

    created_count = 0
    if slots_to_create:
        TimeSlots.objects.bulk_create(slots_to_create, ignore_conflicts=True)
        created_count = len(slots_to_create)

    return Response({
        "message": f"Đã tạo {created_count} slot mới, bỏ qua {skipped_count} slot đã tồn tại.",
        "created": created_count,
        "skipped": skipped_count
    }, status=http_status.HTTP_201_CREATED)


@api_view(['DELETE'])
def delete_all_slots(request):
    """
    Xóa TOÀN BỘ slot trong DB. Cẩn thận!
    Query param: ?field_id=... (tùy chọn, nếu muốn xóa theo sân)
    """
    field_id = request.GET.get('field_id')
    if field_id:
        count, _ = TimeSlots.objects.filter(field_id=field_id).delete()
        return Response({"message": f"Đã xóa {count} slot của sân.", "deleted": count})
    else:
        count, _ = TimeSlots.objects.all().delete()
        return Response({"message": f"Đã xóa toàn bộ {count} slot.", "deleted": count})
