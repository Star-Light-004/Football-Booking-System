from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.shortcuts import get_object_or_404
from django.db.models.deletion import ProtectedError
from django.http import FileResponse
from django.conf import settings
from django.db import IntegrityError
import os
from django.db.models import Avg
from .models import FootballFields, FieldTypes
from apps.reviews.models import Reviews
from rest_framework.decorators import api_view

# ===============================
# GET ALL FIELDS
# ===============================
@csrf_exempt
def get_football_fields(request):
    try:
        show_all_param = request.GET.get('show_all')
        referer = request.headers.get('Referer', '')
        is_admin_request = (
            '/admin' in referer or 
            'facility' in referer or 
            'maintenance' in referer or
            'cleaning' in referer or
            (request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'role', '') in ['admin', 'manager', 'staff']))
        )
        show_all = show_all_param in ['true', 'True', '1', True] or request.GET.get('all') in ['true', '1'] or (show_all_param is None and is_admin_request)
        date_param = request.GET.get('date')
        only_with_slots = request.GET.get('only_with_slots') == 'true'
        include_field_id = request.GET.get('include_field_id')

        query = FootballFields.objects.select_related('field_type')
        fields = list(query.all() if show_all else query.filter(is_available=True))

        # 🔹 Tính mức giá thấp nhất trong các khung giờ của ngày được chọn
        from apps.timeslots.models import TimeSlots
        from django.db.models import Min
        from datetime import datetime
        from django.utils.dateparse import parse_date

        target_date = parse_date(str(date_param)) if date_param else None
        now = datetime.now()
        effective_date = target_date if target_date else now.date()

        # Lọc các slot của ngày đó có giá > 0
        slots_on_date = TimeSlots.objects.filter(
            slot_date=effective_date,
            price__gt=0
        )

        # Lấy danh sách field_id có tạo khung giờ trong ngày đó
        fields_with_slots = set(
            TimeSlots.objects.filter(slot_date=effective_date)
            .values_list('field_id', flat=True)
        )

        date_mins = dict(
            slots_on_date.values('field_id')
            .annotate(min_p=Min('price'))
            .values_list('field_id', 'min_p')
        )

        # Nếu yêu cầu chỉ lấy các sân đang có khung giờ trong ngày đó
        if only_with_slots:
            fields = [
                f for f in fields
                if f.id in fields_with_slots or (include_field_id and str(f.id) == str(include_field_id))
            ]

        for f in fields:
            min_p = date_mins.get(f.id)
            if min_p is not None and float(min_p) > 0:
                f.annotated_min_price = float(min_p)
            else:
                f.annotated_min_price = float(f.price_per_hour or 0)

        from .serializers import FootballFieldsSerializer
        serializer = FootballFieldsSerializer(
            fields,
            many=True,
            context={"request": request}
        )

        return JsonResponse({"fields": serializer.data})

    except Exception as e:
        import traceback
        print(" ERROR:", str(e))
        print(traceback.format_exc())

        return JsonResponse({
            "error": str(e),
            "detail": traceback.format_exc()
        }, status=500)


# ===============================
# GET FIELD DETAIL
# ===============================
@csrf_exempt
def get_football_field_detail(request, id):

    try:
        field = FootballFields.objects.select_related('field_type').get(id=id)
        
        # 🔹 Tính điểm đánh giá trung bình từ reviews
        avg_rating = Reviews.objects.filter(field_id=id).aggregate(Avg('rating'))['rating__avg']
        field.avg_from_reviews = avg_rating

        # 🔹 Tính mức giá thấp nhất trong các slot hôm nay còn hiệu lực
        from apps.timeslots.models import TimeSlots
        from django.db.models import Min
        from datetime import datetime

        now = datetime.now()
        today = now.date()
        current_time = now.time()

        min_slot = TimeSlots.objects.filter(
            field_id=id,
            slot_date=today,
            status='available',
            price__gt=0,
            start_time__gte=current_time
        ).aggregate(Min('price'))['price__min']

        if min_slot is not None and float(min_slot) > 0:
            field.annotated_min_price = float(min_slot)
        else:
            field.annotated_min_price = float(field.price_per_hour or 0)

        from .serializers import FootballFieldsSerializer
        serializer = FootballFieldsSerializer(field, context={'request': request})
        return JsonResponse(serializer.data)

    except FootballFields.DoesNotExist:
        return JsonResponse({
            "error": "Không tìm thấy sân"
        }, status=404)


# ===============================
# CREATE FIELD
# ===============================
@csrf_exempt
def create_football_field(request):
    if request.method == "POST":
        try:
            field_name = request.POST.get("field_name")
            field_type_name = request.POST.get("field_type")
            location = request.POST.get("location")
            price_per_hour = request.POST.get("price_per_hour")
            image = request.FILES.get("image")
            sub_image_1 = request.FILES.get("sub_image_1")
            sub_image_2 = request.FILES.get("sub_image_2")
            sub_image_3 = request.FILES.get("sub_image_3")

            field_type, _ = FieldTypes.objects.get_or_create(name=field_type_name)

            field = FootballFields.objects.create(
                field_name=field_name,
                field_type=field_type,
                location=location,
                price_per_hour=price_per_hour,
                image=image,
                sub_image_1=sub_image_1,
                sub_image_2=sub_image_2,
                sub_image_3=sub_image_3,
                description=request.POST.get("description"),
                phone=request.POST.get("phone"),
                booking_count=request.POST.get("booking_count", 0),
                rating_avg=request.POST.get("rating_avg", 0),
                latitude=request.POST.get("latitude") if request.POST.get("latitude") else None,
                longitude=request.POST.get("longitude") if request.POST.get("longitude") else None,
                is_available=True
            )

            return JsonResponse({
                "message": "Thêm sân thành công",
                "id": str(field.id),
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


# ===============================
# UPDATE FIELD
# ===============================
@csrf_exempt
@api_view(["PUT", "POST"])
def update_football_field(request, id):
    try:
        field = FootballFields.objects.get(id=id)
        data = request.data

        if "field_name" in data:
            field.field_name = data.get("field_name")
        if "location" in data:
            field.location = data.get("location")
        if "price_per_hour" in data:
            field.price_per_hour = data.get("price_per_hour")
        if "is_available" in data:
            val = data.get("is_available")
            if isinstance(val, str):
                field.is_available = val.lower() in ["true", "1"]
            else:
                field.is_available = bool(val)
        if "description" in data:
            field.description = data.get("description")
        if "phone" in data:
            field.phone = data.get("phone")
        if "booking_count" in data:
            field.booking_count = data.get("booking_count")
        if "rating_avg" in data:
            field.rating_avg = data.get("rating_avg")
        if "latitude" in data:
            field.latitude = data.get("latitude") or None
        if "longitude" in data:
            field.longitude = data.get("longitude") or None

        # cập nhật field_type nếu có
        field_type_name = data.get("field_type")
        if field_type_name:
            field.field_type, _ = FieldTypes.objects.get_or_create(name=field_type_name)

        # Cập nhật hình ảnh chính và ảnh phụ nếu người dùng tải lên
        if "image" in request.FILES:
            field.image = request.FILES["image"]
        if "sub_image_1" in request.FILES:
            field.sub_image_1 = request.FILES["sub_image_1"]
        if "sub_image_2" in request.FILES:
            field.sub_image_2 = request.FILES["sub_image_2"]
        if "sub_image_3" in request.FILES:
            field.sub_image_3 = request.FILES["sub_image_3"]

        field.save()

        return JsonResponse({
            "message": "Cập nhật thành công",
            "image": field.image.url if field.image else None,  # admin
            "image_url": request.build_absolute_uri(field.image.url) if field.image else None,  # frontend
            "sub_image_1": field.sub_image_1.url if field.sub_image_1 else None,
            "sub_image_2": field.sub_image_2.url if field.sub_image_2 else None,
            "sub_image_3": field.sub_image_3.url if field.sub_image_3 else None,
        })

    except FootballFields.DoesNotExist:
        return JsonResponse({"error": "Không tìm thấy sân"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# ===============================
# DELETE FIELD
# ===============================
@csrf_exempt
def delete_football_field(request, id):
    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        from django.db import transaction
        with transaction.atomic():
            field = get_object_or_404(FootballFields, id=id)

            # Kiểm tra xem sân có lịch đặt không
            from apps.bookings.models import Bookings
            if Bookings.objects.filter(field=field).exists():
                return JsonResponse(
                    {"error": "Sân đang có lịch đặt của khách, không thể xóa để bảo toàn dữ liệu."},
                    status=400
                )

            # Xóa các ràng buộc con không có booking
            try:
                from apps.timeslots.models import TimeSlots
                TimeSlots.objects.filter(field=field).delete()
            except Exception as ts_err:
                print("Lỗi xóa timeslots của sân:", ts_err)

            try:
                from apps.fields.models import FieldSchedules
                FieldSchedules.objects.filter(field=field).delete()
            except Exception as fs_err:
                print("Lỗi xóa field schedules của sân:", fs_err)

            try:
                from apps.facility.models import PitchCleaning, MaintenanceIssue, LostFoundItem
                PitchCleaning.objects.filter(field=field).delete()
                MaintenanceIssue.objects.filter(field=field).delete()
                LostFoundItem.objects.filter(field=field).update(field=None)
            except Exception as fac_err:
                print("Lỗi dọn dẹp facility records của sân:", fac_err)

            try:
                from apps.reviews.models import Reviews
                Reviews.objects.filter(field=field).delete()
            except Exception as r_err:
                print("Lỗi xóa reviews của sân:", r_err)

            field.delete()
            return JsonResponse({"message": "Xóa sân thành công"})

    except ProtectedError:
        return JsonResponse(
            {"error": "Sân đang có dữ liệu ràng buộc, không thể xóa"},
            status=400
        )

    except IntegrityError:
        return JsonResponse(
            {"error": "Lỗi ràng buộc dữ liệu (FK constraint)"},
            status=400
        )

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse(
            {
                "error": str(e),
                "detail": traceback.format_exc()
            },
            status=500
        )
    



@csrf_exempt
def seed_field_types(request):
    if request.method == "GET":
        FieldTypes.objects.get_or_create(name="Sân 5")
        FieldTypes.objects.get_or_create(name="Sân 7")
        FieldTypes.objects.get_or_create(name="Sân 11")

        return JsonResponse({"message": "seed done"})

def check_media(request):
    file_path = os.path.join(
        settings.MEDIA_ROOT,
        "fields",
        "san-bong-nhan-tao.png"
    )

    return JsonResponse({
        "MEDIA_ROOT": str(settings.MEDIA_ROOT),
        "file_path": file_path,
        "exists": os.path.exists(file_path),
        "DEBUG": settings.DEBUG,
    })

def test_image(request):
    return FileResponse(
        open(
            os.path.join(
                settings.MEDIA_ROOT,
                "fields",
                "san-bong-nhan-tao.png"
            ),
            "rb"
        ),
        content_type="image/png"
    )

def debug_media(request):
    media_root = settings.MEDIA_ROOT

    return JsonResponse({
        "MEDIA_ROOT": str(media_root),
        "exists_MEDIA_ROOT": os.path.exists(media_root),
        "fields_folder": os.path.join(media_root, "fields"),
        "exists_fields": os.path.exists(os.path.join(media_root, "fields")),
        "files": os.listdir(os.path.join(media_root, "fields")) 
                 if os.path.exists(os.path.join(media_root, "fields")) else []
    })

def debug_path(request):
    return JsonResponse({
        "BASE_DIR": str(settings.BASE_DIR),
        "MEDIA_ROOT": str(settings.MEDIA_ROOT),
        "media_exists": os.path.exists(settings.MEDIA_ROOT),
        "fields_exists": os.path.exists(os.path.join(settings.MEDIA_ROOT, "fields")),
        "sample_file": os.path.exists(os.path.join(settings.MEDIA_ROOT, "fields", "san-bong-nhan-tao.png")),
    })