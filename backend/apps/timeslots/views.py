from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status
from .models import TimeSlots
from apps.fields.models import FootballFields
from datetime import date, timedelta, time
from decimal import Decimal

HOURLY_PRICES = {
    6:  80_000,
    7:  80_000,
    8:  100_000,
    9:  100_000,
    10: 150_000,
    15: 150_000,
    16: 180_000,
    17: 200_000,
    18: 250_000,
    19: 270_000,
    20: 270_000,
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
            return Response({"message": "Tao thanh cong", "id": str(slot.id)})
        except Exception as e:
            return Response([], status=200)


@api_view(['PUT', 'DELETE'])
def timeslot_detail(request, pk):
    try:
        slot = TimeSlots.objects.get(pk=pk)
    except TimeSlots.DoesNotExist:
        return Response([], status=200)

    if request.method == 'PUT':
        data = request.data
        slot.slot_date = data.get('slot_date', slot.slot_date)
        slot.start_time = data.get('start_time', slot.start_time)
        slot.end_time = data.get('end_time', slot.end_time)
        slot.price = data.get('price', slot.price)
        slot.status = data.get('status', slot.status)
        slot.save()
        return Response({"message": "Cap nhat thanh cong"})

    if request.method == 'DELETE':
        slot.delete()
        return Response({"message": "Xoa thanh cong"})


@api_view(['GET'])
def get_timeslots_by_field(request):
    try:
        field_id = request.GET.get('field_id')
        date_param = request.GET.get('date')

        if not field_id or not date_param:
            return Response([], status=200)

        slots = TimeSlots.objects.filter(
            field__id=field_id,
            slot_date=date_param
        ).order_by('start_time')

        from .serializers import TimeSlotSimpleSerializer
        serializer = TimeSlotSimpleSerializer(slots, many=True)

        return Response(serializer.data or [])

    except Exception:
        return Response([], status=200)


@api_view(['POST'])
def generate_slots(request):
    try:
        days = int(request.data.get('days', 30))
    except (ValueError, TypeError):
        days = 30
    days = max(1, min(days, 90))

    # 1. Lọc sân bóng áp dụng
    field_id = request.data.get('field_id')
    field_ids = request.data.get('field_ids')

    fields = FootballFields.objects.filter(is_available=True)
    if field_id and str(field_id).strip().lower() not in ['all', '', 'null', 'none']:
        fields = fields.filter(id=field_id)
    elif field_ids and isinstance(field_ids, list) and len(field_ids) > 0:
        fields = fields.filter(id__in=field_ids)

    if not fields.exists():
        return Response({"error": "Không có sân bóng nào phù hợp hoặc đang hoạt động"}, status=http_status.HTTP_400_BAD_REQUEST)

    # 2. Lấy cấu hình khung giờ & giá (slot_configs hoặc custom hourly_prices)
    slot_configs = request.data.get('slot_configs')
    hourly_prices = request.data.get('hourly_prices')

    time_rules = []
    if slot_configs and isinstance(slot_configs, list):
        for item in slot_configs:
            if not item.get('enabled', True):
                continue
            try:
                if 'start_time' in item and 'end_time' in item:
                    st_str = str(item['start_time']).strip()
                    et_str = str(item['end_time']).strip()
                    st_parts = [int(p) for p in st_str.split(':')[:2]]
                    et_parts = [int(p) for p in et_str.split(':')[:2]]
                    start = time(st_parts[0], st_parts[1])
                    end = time(et_parts[0], et_parts[1])
                elif 'hour' in item:
                    h = int(item['hour'])
                    start = time(h, 0)
                    end = time((h + 1) % 24, 0)
                else:
                    continue
                p = Decimal(str(item.get('price', 100000)))
                time_rules.append((start, end, p))
            except Exception:
                continue

    elif hourly_prices and isinstance(hourly_prices, dict):
        for h_str, p_val in hourly_prices.items():
            try:
                h = int(h_str)
                start = time(h, 0)
                end = time((h + 1) % 24, 0)
                p = Decimal(str(p_val))
                time_rules.append((start, end, p))
            except Exception:
                continue

    if not time_rules:
        # Mặc định theo HOURLY_PRICES
        for hour, price in HOURLY_PRICES.items():
            time_rules.append((time(hour, 0), time(hour + 1, 0), Decimal(str(price))))

    today = date.today()
    slots_to_create = []
    skipped_count = 0

    for delta in range(days):
        slot_date = today + timedelta(days=delta)
        for start, end, price in time_rules:
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
                    price=price,
                    status='available'
                ))

    if slots_to_create:
        TimeSlots.objects.bulk_create(slots_to_create, ignore_conflicts=True)

    return Response({
        "message": "Tạo khung giờ tự động thành công!",
        "created": len(slots_to_create),
        "skipped": skipped_count,
        "days": days,
        "fields_count": fields.count()
    }, status=http_status.HTTP_201_CREATED)


@api_view(['DELETE'])
def delete_all_slots(request):
    field_id = request.GET.get('field_id')

    if field_id:
        count, _ = TimeSlots.objects.filter(field_id=field_id).delete()
        return Response({"deleted": count})

    count, _ = TimeSlots.objects.all().delete()
    return Response({"deleted": count})