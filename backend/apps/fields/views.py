from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .models import FootballFields, FieldTypes

# ===============================
# GET ALL FIELDS
# ===============================
@csrf_exempt
def get_football_fields(request):

    fields = FootballFields.objects.select_related('field_type').all()

    data = []

    for field in fields:
        data.append({
            "id": str(field.id),
            "field_name": field.field_name,
            "field_type": field.field_type.name if field.field_type else None,
            "location": field.location,
            "price_per_hour": float(field.price_per_hour) if field.price_per_hour else 0,
            "is_available": field.is_available,
            "created_at": field.created_at,
            "image": field.image.url if field.image else None,  # admin
            "image_url": request.build_absolute_uri(field.image.url) if field.image else None,  # frontend
        })

    return JsonResponse({
        "fields": data
    })


# ===============================
# GET FIELD DETAIL
# ===============================
@csrf_exempt
def get_football_field_detail(request, id):

    try:
        field = FootballFields.objects.select_related('field_type').get(id=id)

        data = {
            "id": str(field.id),
            "field_name": field.field_name,
            "field_type": field.field_type.name if field.field_type else None,
            "location": field.location,
            "price_per_hour": float(field.price_per_hour) if field.price_per_hour else 0,
            "is_available": field.is_available,
            "created_at": field.created_at,
            "image": field.image.url if field.image else None,  # admin
            "image_url": request.build_absolute_uri(field.image.url) if field.image else None,  # frontend
        }

        return JsonResponse(data)

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