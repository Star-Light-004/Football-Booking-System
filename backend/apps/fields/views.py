from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.db.models import Avg
from .models import FootballFields, FieldTypes
from apps.reviews.models import Reviews

# ===============================
# GET ALL FIELDS
# ===============================
@csrf_exempt
def get_football_fields(request):
    try:
        show_all = request.GET.get('show_all') == 'true'

        query = FootballFields.objects.select_related('field_type')

        if show_all:
            fields = query.all()
        else:
            fields = query.filter(is_available=True)

        from .serializers import FootballFieldsSerializer
        serializer = FootballFieldsSerializer(
            fields,
            many=True,
            context={'request': request}
        )

        return JsonResponse({
            "fields": serializer.data
        })

    except Exception as e:
        return JsonResponse({
            "error": str(e)
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
            image = request.FILES.get("image")  # nhận file ảnh

            field_type = FieldTypes.objects.get(
                name=field_type_name
            )

            field = FootballFields.objects.create(
                field_name=field_name,
                field_type=field_type,
                location=location,
                price_per_hour=price_per_hour,
                image=image,
                description=request.POST.get("description"),
                phone=request.POST.get("phone"),
                booking_count=request.POST.get("booking_count", 0),
                rating_avg=request.POST.get("rating_avg", 0),
                is_available=True
            )

            return JsonResponse({
                "message": "Thêm sân thành công",
                "id": str(field.id),
                "image": field.image.url if field.image else None,  # admin
                "image_url": request.build_absolute_uri(field.image.url) if field.image else None,  # frontend
            })

        except Exception as e:
            return JsonResponse({
                "error": str(e)
            }, status=400)


# ===============================
# UPDATE FIELD
# ===============================
@csrf_exempt
def update_football_field(request, id):
    if request.method == "PUT":
        try:
            # parse body JSON
            try:
                body = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Body không hợp lệ"}, status=400)

            field = FootballFields.objects.get(id=id)

            # cập nhật các trường
            field.field_name = body.get("field_name", field.field_name)
            field.location = body.get("location", field.location)
            field.price_per_hour = body.get("price_per_hour", field.price_per_hour)
            field.is_available = body.get("is_available", field.is_available)
            field.description = body.get("description", field.description)
            field.phone = body.get("phone", field.phone)
            field.booking_count = body.get("booking_count", field.booking_count)
            field.rating_avg = body.get("rating_avg", field.rating_avg)

            # cập nhật field_type nếu có
            field_type_name = body.get("field_type")
            if field_type_name:
                try:
                    field.field_type = FieldTypes.objects.get(name=field_type_name)
                except FieldTypes.DoesNotExist:
                    return JsonResponse({"error": "Loại sân không tồn tại"}, status=400)

            field.save()

            return JsonResponse({
                "message": "Cập nhật thành công",
                "image": field.image.url if field.image else None,  # admin
                "image_url": request.build_absolute_uri(field.image.url) if field.image else None,  # frontend
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
    if request.method == "DELETE":
        try:
            field = FootballFields.objects.get(id=id)
            field.delete()
            return JsonResponse({"message": "Xóa sân thành công"})
        except FootballFields.DoesNotExist:
            return JsonResponse({"error": "Không tìm thấy sân"}, status=404)