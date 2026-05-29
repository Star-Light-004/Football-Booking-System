from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
import uuid
from django.contrib.auth.hashers import check_password
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Customers


# ================= REGISTER =================
@api_view(['POST'])
def register(request):
    data = request.data

    phone = data.get('phone')
    fullname = data.get('fullname')
    email = data.get('email')
    password = data.get('password')  # ⚠️ phải có

    if Customers.objects.filter(phone=phone).exists():
        return Response({"error": "Số điện thoại đã tồn tại"}, status=400)
        
    if email and Customers.objects.filter(email=email).exists():
        return Response({"error": "Email đã tồn tại"}, status=400)

    from django.contrib.auth.hashers import make_password
    hashed_password = make_password(password)

    Customers.objects.create(
        full_name=fullname,
        phone=phone,
        email=email,
        password_hash=hashed_password,   # ⚠️ thêm
        created_at=timezone.now()
    )

    return Response({
        "message": "Đăng ký thành công"
    })


# ================= LOGIN =================
@api_view(['POST'])
def login(request):
    data = request.data

    identifier = data.get('identifier')  # email hoặc phone
    password = data.get('password')

    # ❌ kiểm tra thiếu dữ liệu
    if not identifier or not password:
        return Response({"error": "Thiếu dữ liệu"}, status=400)

    # ✅ tìm user theo email hoặc phone
    user = Customers.objects.filter(email=identifier).first() \
        or Customers.objects.filter(phone=identifier).first()

    if not user:
        return Response({"error": "Tài khoản không tồn tại"}, status=404)

    # ✅ check password
    if not check_password(password, user.password_hash):
        return Response({"error": "Sai mật khẩu"}, status=400)

    # ✅ đăng nhập thành công
    return Response({
        "message": "Đăng nhập thành công",
        "user": {
            "id": str(user.id),
            "fullname": user.full_name,
            "email": user.email,
            "phone": user.phone
        }
    })





@api_view(['GET'])
def get_users(request):
    users = Customers.objects.all()

    from .serializers import CustomersSerializer
    serializer = CustomersSerializer(users, many=True)
    return Response(serializer.data)



@api_view(['GET'])
def get_profile(request):
    user_id = request.GET.get('user_id')

    if not user_id:
        return Response({"error": "Thiếu user_id"}, status=400)

    try:
        user_uuid = uuid.UUID(user_id)  # 👈 validate UUID
        user = Customers.objects.get(id=user_uuid)
    except ValueError:
        return Response({"error": "user_id không hợp lệ"}, status=400)
    except Customers.DoesNotExist:
        return Response({"error": "User không tồn tại"}, status=404)

    from .serializers import ProfileSerializer
    serializer = ProfileSerializer(user)
    return Response(serializer.data)

@api_view(['PUT'])
def update_user(request, user_id):
    try:
        user = Customers.objects.get(id=user_id)
        data = request.data
        if "fullname" in data:
            user.full_name = data["fullname"]
        if "email" in data:
            user.email = data["email"]
        if "phone" in data:
            user.phone = data["phone"]
        user.save()
        return Response({"message": "Cập nhật thành công"})
    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['DELETE'])
def delete_user(request, user_id):
    try:
        user = Customers.objects.get(id=user_id)
        user.delete()
        return Response({"message": "Xóa thành công"})
    except Customers.DoesNotExist:
        return Response({"error": "Không tìm thấy user"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)